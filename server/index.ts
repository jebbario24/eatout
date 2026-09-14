import express, { type Request, Response, NextFunction } from "express";
import { env } from "./env"; // Validate environment first
import { registerRoutes, processScheduledPayouts } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { wsManager } from "./websocket";
import Stripe from "stripe";
import cron from "node-cron";

// Initialize Stripe for cron payout processing
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-10-29.clover",
    })
  : null;

// A transient error anywhere (a flaky network call, a rejected promise no one
// awaited) would otherwise crash the entire server, taking down every in-flight
// request. Log it and keep running instead — this is a long-lived process, not a
// one-shot script.
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection (non-fatal):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception (non-fatal):', err);
});

const app = express();
// Stripe verifies webhook signatures against the exact raw request body, so this
// one route must see the unparsed bytes — mount it before the JSON parser.
app.use("/api/webhooks/stripe", express.raw({ type: "*/*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  
  // Initialize WebSocket server
  wsManager.initialize(server);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  // reusePort (SO_REUSEPORT) isn't supported on Windows and throws ENOTSUP there;
  // it's only useful on Linux-style multi-process deployments (e.g. Replit).
  const listenOptions: { port: number; host: string; reusePort?: boolean } = {
    port,
    host: "0.0.0.0",
  };
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }
  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);

    // One-time heal for products created before every menu-item create/update
    // path resolved a real handle — without one, a product is unreachable on
    // the storefront (its card link silently falls back to the homepage).
    // Cheap no-op on every boot after the first once nothing matches.
    storage.backfillMissingMenuItemHandles()
      .then((count) => { if (count > 0) log(`[Storefront] Backfilled a handle for ${count} product(s) that had none`); })
      .catch((err) => log(`[Storefront] Menu item handle backfill failed: ${err}`));

    // Setup automated payout scheduler (runs daily at 2 AM)
    cron.schedule('0 2 * * *', async () => {
      try {
        log('[Payout] Running automated payout processor...');
        const results = await processScheduledPayouts(storage, stripe);
        log(`[Payout] Automated payouts completed: Processed: ${results.processed}, Failed: ${results.failed}, Skipped: ${results.skipped}, Total: $${results.totalAmount}`);
      } catch (error) {
        log(`[Payout] Automated payout processor error: ${error}`);
      }
    }, {
      timezone: "UTC"
    });
    
    log('Automated payout scheduler initialized (runs daily at 2 AM UTC)');

    // Abandoned-cart reminders — every 15 minutes, remind idle carts once via the
    // merchant's active abandoned_cart campaign (if any).
    cron.schedule('*/15 * * * *', async () => {
      try {
        const carts = await storage.findCartsToRemind(30, 24);
        if (carts.length === 0) return;
        let reminded = 0;
        for (const cart of carts) {
          const campaign = await storage.getActiveCampaignByType(cart.restaurantId, 'abandoned_cart');
          if (!campaign) continue;
          await storage.sendCampaignNow(campaign.id, {
            audienceOverride: [{
              id: cart.customerId,
              name: cart.customerName,
              email: cart.customerEmail,
              phone: null,
            }],
          });
          await storage.markCartReminded(cart.id);
          reminded++;
        }
        if (reminded > 0) log(`[Marketing] Sent ${reminded} abandoned-cart reminder(s)`);
      } catch (error) {
        log(`[Marketing] Abandoned-cart reminder error: ${error}`);
      }
    }, { timezone: "UTC" });

    // Welcome — every 15 minutes, greet customers whose first order landed in the
    // last hour, via the merchant's active "welcome" campaign (once each).
    cron.schedule('*/15 * * * *', async () => {
      try {
        const campaigns = await storage.listActiveCampaignsByTypes(['welcome']);
        let sent = 0;
        for (const campaign of campaigns) {
          const customers = await storage.findCustomersWithFirstOrderSince(campaign.restaurantId, 1.25);
          for (const c of customers) {
            if (await storage.hasRecentDelivery(campaign.id, c.id, 3650)) continue; // once ever
            await storage.sendCampaignNow(campaign.id, { audienceOverride: [c] });
            sent++;
          }
        }
        if (sent > 0) log(`[Marketing] Sent ${sent} welcome message(s)`);
      } catch (error) {
        log(`[Marketing] Welcome trigger error: ${error}`);
      }
    }, { timezone: "UTC" });

    // Win-back — once daily, message customers who haven't ordered in 30-90 days,
    // via the merchant's active "reactivation" campaign, at most once per 30 days.
    cron.schedule('0 11 * * *', async () => {
      try {
        const campaigns = await storage.listActiveCampaignsByTypes(['reactivation']);
        let sent = 0;
        for (const campaign of campaigns) {
          const customers = await storage.findLapsedCustomers(campaign.restaurantId, 30, 90);
          for (const c of customers) {
            if (await storage.hasRecentDelivery(campaign.id, c.id, 30)) continue;
            await storage.sendCampaignNow(campaign.id, { audienceOverride: [c] });
            sent++;
          }
        }
        if (sent > 0) log(`[Marketing] Sent ${sent} win-back message(s)`);
      } catch (error) {
        log(`[Marketing] Win-back trigger error: ${error}`);
      }
    }, { timezone: "UTC" });

    // Birthdays — once daily, message customers whose birthday is today, via the
    // merchant's active "birthday" campaign, at most once per year.
    cron.schedule('0 12 * * *', async () => {
      try {
        const today = new Date();
        const mmdd = `${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
        const campaigns = await storage.listActiveCampaignsByTypes(['birthday']);
        let sent = 0;
        for (const campaign of campaigns) {
          const customers = await storage.findBirthdayCustomers(campaign.restaurantId, mmdd);
          for (const c of customers) {
            if (await storage.hasRecentDelivery(campaign.id, c.id, 300)) continue; // once per year
            await storage.sendCampaignNow(campaign.id, { audienceOverride: [c] });
            sent++;
          }
        }
        if (sent > 0) log(`[Marketing] Sent ${sent} birthday message(s)`);
      } catch (error) {
        log(`[Marketing] Birthday trigger error: ${error}`);
      }
    }, { timezone: "UTC" });

    log('Marketing scheduler initialized (abandoned-cart every 15m; welcome every 15m; win-back + birthday daily)');
  });
})();
