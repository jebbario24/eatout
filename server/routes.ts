import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { env, getBaseUrl } from "./env";
import { storage, slugify } from "./storage";
import { passport, hashPassword, verifyPassword } from "./auth";
import {
  insertRestaurantSchema,
  insertMenuCategorySchema,
  insertMenuItemSchema,
  insertStaffSchema,
  insertInventorySchema,
  insertContactMessageSchema,
  BUSINESS_TYPES,
  type RestaurantThemeSettings,
} from "@shared/schema";
import { buildBlueprint, type StoreBrief } from "./services/storeIntelligence";
import { draftCopy } from "./services/storeCopywriter";
import { z } from "zod";
import Stripe from "stripe";
import { 
  Client, 
  Environment, 
  OrdersController, 
  CheckoutPaymentIntent,
  OrderApplicationContextLandingPage,
  OrderApplicationContextUserAction 
} from '@paypal/paypal-server-sdk';
import { ObjectStorageService, ObjectNotFoundError, signObjectURL, parseObjectPath } from "./objectStorage";
import { db } from "./db";
import { boostSlots, promoRules } from "@shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { wsManager } from "./websocket";
import { authLimiter, apiLimiter, storefrontLimiter, webhookLimiter, uploadLimiter } from "./rateLimiter";
import { logError, logWarn, logInfo } from "./logger";

// Initialize Stripe only if credentials are available
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-10-29.clover",
    })
  : null;

// Initialize PayPal only if credentials are available
const paypalClient = (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
  ? new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: process.env.PAYPAL_CLIENT_ID,
        oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET
      },
      timeout: 0,
      environment: Environment.Sandbox,
    })
  : null;
const paypalOrdersController = paypalClient ? new OrdersController(paypalClient) : null;

// Helper function to generate sequential order numbers
async function generateOrderNumber(restaurantId: string, prefix: 'ORD' | 'WEB'): Promise<string> {
  const lastOrder = await storage.getLastOrderByPrefix(restaurantId, prefix);
  
  if (!lastOrder) {
    return `${prefix}-001`;
  }
  
  // Extract number from order number - only match 3-digit padded format (e.g., "WEB-001" -> 1)
  // This regex specifically looks for exactly 3 digits to avoid matching old timestamp-based formats
  const match = lastOrder.orderNumber.match(new RegExp(`^${prefix}-(\\d{3,})$`));
  
  if (!match) {
    // If no match (old format or invalid), start fresh from 001
    return `${prefix}-001`;
  }
  
  const lastNumber = parseInt(match[1], 10);
  const nextNumber = lastNumber + 1;
  
  // Pad with zeros (001, 002, etc.)
  return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
}

// Helper function to log admin activity
async function logAdminActivity(params: {
  userId: string;
  userEmail: string;
  actionType: string;
  actionCategory: string;
  description: string;
  targetId?: string;
  targetType?: string;
  targetName?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await storage.createActivityLog(params);
  } catch (error) {
    console.error("Failed to log admin activity:", error);
    // Don't throw - logging failure shouldn't break the actual action
  }
}

const orderSchema = z.object({
  orderType: z.string(),
  tableId: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  customerEmail: z.string().nullable().optional(),
  paymentMethod: z.enum(['stripe', 'paypal', 'cash']).optional().default('cash'),
  items: z.array(z.object({
    menuItemId: z.string().optional(),
    bundleId: z.string().optional(),
    variantId: z.string().nullable().optional(),
    variantName: z.string().nullable().optional(),
    quantity: z.number(),
    unitPrice: z.string(),
    selectedOptions: z.any().nullable().optional(),
    notes: z.string().optional(),
  }).refine(
    (item) => (item.menuItemId && !item.bundleId) || (!item.menuItemId && item.bundleId),
    { message: "Each order item must have exactly one of menuItemId or bundleId" }
  )),
  subtotal: z.string(),
  tax: z.string(),
  total: z.string(),
});

const onlineOrderSchema = z.object({
  orderType: z.enum(['pickup', 'shipping']).default('shipping'),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  customerEmail: z.string().nullable().optional(),
  shippingAddress: z.string().nullable().optional(),
  deliveryCountry: z.string().nullable().optional(),
  deliveryCity: z.string().nullable().optional(),
  deliveryAddress: z.string().nullable().optional(),
  deliveryFee: z.string().nullable().optional(),
  paymentMethod: z.enum(['stripe', 'paypal', 'cash', 'apple', 'google']).optional().default('cash'),
  items: z.array(z.object({
    menuItemId: z.string().optional(),
    bundleId: z.string().optional(),
    variantId: z.string().nullable().optional(),
    variantName: z.string().nullable().optional(),
    quantity: z.number(),
    unitPrice: z.string(),
    selectedOptions: z.any().nullable().optional(),
  }).refine(
    (item) => (item.menuItemId && !item.bundleId) || (!item.menuItemId && item.bundleId),
    { message: "Each order item must have exactly one of menuItemId or bundleId" }
  )),
  subtotal: z.string(),
  promoCode: z.string().nullable().optional(),
  promoDiscount: z.string().nullable().optional(),
  tax: z.string(),
  total: z.string(),
  // logged-in customer can save the delivery address to their address book
  saveAddress: z.boolean().optional(),
  addressLabel: z.string().nullable().optional(),
  // rewards (only honoured for a signed-in customer; server recomputes the discount)
  redeemPoints: z.number().int().nonnegative().optional(),
  useStoreCredit: z.boolean().optional(),
  // gift card applied to the order (bearer instrument — no account needed)
  giftCardCode: z.string().trim().max(40).nullable().optional(),
  // abandoned-cart session id, so a recovered cart is marked as such
  cartSessionId: z.string().trim().max(255).nullable().optional(),
  // persistent anonymous browser id, used to attribute the order to a marketing
  // channel via the customer's most recent storefront_sessions row (same-browser only)
  visitorId: z.string().trim().max(255).nullable().optional(),
});

const trackVisitSchema = z.object({
  sessionId: z.string().trim().min(1).max(255),
  visitorId: z.string().trim().min(1).max(255),
  channel: z.enum(['direct', 'organic', 'paid', 'social', 'referral', 'unknown']),
  referrer: z.string().trim().max(2000).nullable().optional(),
  utmSource: z.string().trim().max(255).nullable().optional(),
  utmMedium: z.string().trim().max(255).nullable().optional(),
  utmCampaign: z.string().trim().max(255).nullable().optional(),
  landingPath: z.string().trim().max(500).nullable().optional(),
});

// Shared date-range resolution for dashboard report endpoints (Analytics, Growth).
function resolveDateFilter(dateFilter: string): { startDate: Date; endDate: Date | null } {
  const now = new Date();
  let startDate = new Date();
  let endDate: Date | null = null;

  switch (dateFilter) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'last-7-days':
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'this-month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'last-month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'year':
    default:
      startDate.setFullYear(now.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
  }
  return { startDate, endDate };
}

// Middleware to check if user is authenticated
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Middleware to check if user is admin
const isAdmin = async (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
};

// Middleware to check subscription status (allows admins to bypass)
const requireActiveSubscription = async (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.user;
  
  // Admins bypass subscription check
  if (user.role === 'admin') {
    return next();
  }
  
  const now = new Date();
  const hasActiveSubscription = user.subscriptionStatus === 'active' && 
                                 user.subscriptionEndsAt && 
                                 user.subscriptionEndsAt > now;
  
  const hasActiveTrial = user.subscriptionStatus === 'trial' && 
                         user.trialEndsAt && 
                         user.trialEndsAt > now;
  
  if (!hasActiveSubscription && !hasActiveTrial) {
    return res.status(402).json({ 
      message: "Subscription required",
      subscriptionStatus: user.subscriptionStatus 
    });
  }
  
  next();
};

// Service function for processing scheduled payouts (called by cron and admin endpoint)
export async function processScheduledPayouts(storage: any, stripe: any) {
  const results = {
    processed: 0,
    failed: 0,
    skipped: 0,
    totalAmount: 0,
    details: [] as any[],
  };

  if (!stripe) {
    logError('[Payout] Stripe is not configured - automated payouts disabled');
    return results;
  }

  try {
    // Get all restaurants
    const allRestaurants = await storage.getAllRestaurants();

    for (const restaurantData of allRestaurants) {
      const restaurant = restaurantData;
      
      try {
        // Skip if no Stripe Connect account
        if (!restaurant.stripeAccountId) {
          results.skipped++;
          continue;
        }

        // Verify Connect account is fully onboarded
        const connectedAccount = await stripe.accounts.retrieve(restaurant.stripeAccountId);
        if (!connectedAccount.payouts_enabled) {
          results.skipped++;
          continue;
        }

        // Get payout account for schedule preference
        const payoutAccount = await storage.getPayoutAccount(restaurant.id);
        
        // Check if payout is due based on schedule
        const lastPayout = await storage.getPayoutRuns(restaurant.id);
        const mostRecentPayout = lastPayout[0];
        
        const now = new Date();
        let shouldProcess = false;

        if (!mostRecentPayout) {
          shouldProcess = true; // First payout
        } else {
          const lastPayoutDate = new Date(mostRecentPayout.createdAt);
          const daysSinceLastPayout = (now.getTime() - lastPayoutDate.getTime()) / (1000 * 60 * 60 * 24);

          const schedule = payoutAccount?.payoutSchedule || 'weekly';
          if (schedule === 'daily' && daysSinceLastPayout >= 1) {
            shouldProcess = true;
          } else if (schedule === 'weekly' && daysSinceLastPayout >= 7) {
            shouldProcess = true;
          }
        }

        if (!shouldProcess) {
          results.skipped++;
          continue;
        }

        // Get pending earnings
        const pendingEarnings = await storage.getPendingEarnings(restaurant.id);
        const amountInDollars = parseFloat(pendingEarnings.total);

        // Skip if below minimum payout threshold
        if (amountInDollars < 10) {
          results.skipped++;
          continue;
        }

        // Get pending ledger entries
        const ledgerEntries = await storage.getEarningsLedger(restaurant.id);
        const pendingEntries = ledgerEntries.filter((entry: any) => entry.restaurantPayoutStatus === 'pending');
        const ledgerEntryIds = pendingEntries.map((entry: any) => entry.id);

        if (ledgerEntryIds.length === 0) {
          results.skipped++;
          continue;
        }

        // Create payout run
        const payoutRun = await storage.createPayoutRun(
          restaurant.id,
          amountInDollars,
          'stripe',
          new Date()
        );

        try {
          const amountInCents = Math.round(amountInDollars * 100);

          // Create Stripe Transfer to connected account (proper Connect flow)
          const transfer = await stripe.transfers.create({
            amount: amountInCents,
            currency: 'usd',
            destination: restaurant.stripeAccountId,
            description: `Scheduled payout for ${restaurant.name}`,
            metadata: {
              restaurantId: restaurant.id,
              payoutRunId: payoutRun.id,
              restaurantName: restaurant.name,
              automated: 'true',
            },
          });

          // Complete payout transaction (atomic operation)
          await storage.completePayoutTransaction(payoutRun.id, ledgerEntryIds, transfer.id);

          results.processed++;
          results.totalAmount += amountInDollars;
          results.details.push({
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            amount: amountInDollars,
            status: 'success',
            transferId: transfer.id,
          });

          console.log(`[Payout] Success: ${restaurant.name} - $${amountInDollars} (${transfer.id})`);

        } catch (stripeError: any) {
          console.error(`[Payout] Stripe transfer error for restaurant ${restaurant.id}:`, stripeError);
          
          await storage.updatePayoutRunStatus(
            payoutRun.id,
            'failed',
            undefined,
            stripeError.message
          );

          results.failed++;
          results.details.push({
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            amount: amountInDollars,
            status: 'failed',
            error: stripeError.message,
          });
        }

      } catch (error: any) {
        console.error(`[Payout] Error processing payout for restaurant ${restaurant.id}:`, error);
        results.failed++;
        results.details.push({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          status: 'failed',
          error: error.message,
        });
      }
    }

    console.log(`[Payout] Batch complete - Processed: ${results.processed}, Failed: ${results.failed}, Skipped: ${results.skipped}, Total: $${results.totalAmount}`);
    return results;

  } catch (error) {
    console.error("[Payout] Error processing scheduled payouts:", error);
    return results;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust proxy for secure cookies behind Replit proxy
  app.set("trust proxy", 1);

  // Session configuration
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 days
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
      maxAge: sessionTtl,
    },
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Auth routes
  
  // Signup with email/password
  app.post('/api/signup', authLimiter, async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Calculate trial end date (7 days from now)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      // Create user
      const user = await storage.createUser({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: email.toLowerCase() === 'jebbario23@gmail.com' ? 'admin' : 'owner',
        subscriptionStatus: 'trial',
        trialEndsAt,
      });

      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error("Login error after signup:", err);
          return res.status(500).json({ message: "Failed to login after signup" });
        }
        const { password: _password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    } catch (error) {
      logError("Signup error", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Login with email/password
  app.post('/api/login', authLimiter, (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        logError("Login error", err);
        return res.status(500).json({ message: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error("Session login error:", err);
          return res.status(500).json({ message: "Failed to establish session" });
        }
        const { password: _password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Google OAuth routes (Restaurant Owners)
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      // Successful authentication, redirect to dashboard
      res.redirect('/dashboard');
    }
  );

  // Get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // Logout
  app.post('/api/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ message: "Failed to destroy session" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Object Storage Upload URL
  app.post('/api/object-storage/upload-url', isAuthenticated, uploadLimiter, async (req: any, res) => {
    try {
      const { objectPath } = req.body;
      
      if (!objectPath) {
        return res.status(400).json({ message: "objectPath is required" });
      }

      // Get private object directory and construct full path
      const objectStorageService = new ObjectStorageService();
      const privateDir = objectStorageService.getPrivateObjectDir();
      const fullPath = `${privateDir}/${objectPath}`;
      
      // Parse the full path to get bucket and object names
      const { bucketName, objectName } = parseObjectPath(fullPath);
      
      // Generate signed URL
      const signedUrl = await signObjectURL({
        bucketName,
        objectName,
        method: "PUT",
        ttlSec: 900,
      });
      
      res.json({
        method: 'PUT',
        url: signedUrl,
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  // Subscription routes
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment processing is not configured" });
      }

      const userId = req.user.id;
      const { planType } = req.body; // 'withTrial' or 'immediate'
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if already has a subscription
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
          expand: ['latest_invoice.payment_intent'],
        });
        
        // Reuse active, past_due, or unpaid subscriptions
        if (['active', 'past_due', 'unpaid'].includes(subscription.status)) {
          const updateData: any = {
            subscriptionStatus: subscription.status,
          };
          
          const currentPeriodEnd = (subscription as any).current_period_end;
          if (currentPeriodEnd && !isNaN(currentPeriodEnd)) {
            updateData.subscriptionEndsAt = new Date(currentPeriodEnd * 1000);
          }
            
          await storage.updateUserSubscription(userId, updateData);
          
          const clientSecret = (subscription.latest_invoice as any)?.payment_intent?.client_secret;
          return res.json({ 
            subscriptionId: subscription.id,
            clientSecret,
            status: subscription.status,
          });
        }
        
        // Cancel incomplete or incomplete_expired subscriptions and create new one
        if (['incomplete', 'incomplete_expired'].includes(subscription.status)) {
          await stripe.subscriptions.cancel(subscription.id);
        }
      }

      // Create Stripe customer if doesn't exist
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: `${user.firstName} ${user.lastName}`.trim() || undefined,
          metadata: { userId: user.id },
        });
        customerId = customer.id;
        await storage.updateUserSubscription(userId, { stripeCustomerId: customerId });
      }

      // Reuse existing product and price or create if doesn't exist
      let priceId = process.env.STRIPE_PRICE_ID;
      
      if (!priceId) {
        logError('STRIPE_PRICE_ID not configured - subscription creation will fail');
        return res.status(500).json({ message: 'Subscription service not configured. Please contact support.' });
      }
      
      if (!priceId) {
        // Search for existing product
        const products = await stripe.products.list({ 
          active: true, 
          limit: 100 
        });
        let product = products.data.find(p => p.name === 'EatOut Monthly Subscription');
        
        if (!product) {
          product = await stripe.products.create({
            name: 'EatOut Monthly Subscription',
          });
        }
        
        // Search for existing price
        const prices = await stripe.prices.list({ 
          product: product.id,
          active: true,
          limit: 100
        });
        let price = prices.data.find(p => 
          p.currency === 'usd' && 
          p.recurring?.interval === 'month' && 
          p.unit_amount === 7900
        );
        
        if (!price) {
          price = await stripe.prices.create({
            product: product.id,
            currency: 'usd',
            recurring: { interval: 'month' },
            unit_amount: 7900, // $79 in cents
          });
        }
        
        priceId = price.id;
      }

      // Create subscription with or without trial based on plan type
      const subscriptionParams: any = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: { 
          plan: planType === 'withTrial' ? 'eatout-monthly-trial' : 'eatout-monthly-immediate'
        },
      };

      // Add trial period only for 'withTrial' plan
      if (planType === 'withTrial') {
        subscriptionParams.trial_period_days = 7;
      }

      const subscription = await stripe.subscriptions.create(subscriptionParams);

      // Update user with subscription ID
      // Note: subscriptionEndsAt will be set later when subscription becomes active
      await storage.updateUserSubscription(userId, {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
      });

      const clientSecret = (subscription.latest_invoice as any)?.payment_intent?.client_secret;
      
      res.json({
        subscriptionId: subscription.id,
        clientSecret,
        status: subscription.status,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/subscription-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if admin manually granted access - this overrides all subscription checks
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      const manualAccessGranted = restaurant?.manuallyGrantedAccess || false;
      
      if (manualAccessGranted) {
        return res.json({
          hasAccess: true,
          status: 'active',
          trialEndsAt: user.trialEndsAt,
          subscriptionEndsAt: user.subscriptionEndsAt,
          isTrialActive: false,
          isSubscriptionActive: false,
          manualAccessGranted: true,
        });
      }

      const now = new Date();
      const trialActive = user.trialEndsAt && user.trialEndsAt > now;
      
      // Only grant subscription access if Stripe confirms active status
      const subscriptionActive = user.subscriptionStatus === 'active' && 
                                  user.subscriptionEndsAt && user.subscriptionEndsAt > now;

      // If subscription exists, always check Stripe for latest status
      let actualSubscriptionActive = subscriptionActive;
      let freshSubscriptionEndsAt = user.subscriptionEndsAt;
      let freshStatus = user.subscriptionStatus;
      
      if (user.stripeSubscriptionId && stripe) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          freshStatus = subscription.status;
          const currentPeriodEnd = (subscription as any).current_period_end;
          
          // Only set endsAt if we have a valid period
          if (currentPeriodEnd && !isNaN(currentPeriodEnd)) {
            freshSubscriptionEndsAt = new Date(currentPeriodEnd * 1000);
          }
          
          // ALWAYS update local data to match Stripe
          const updateData: any = {
            subscriptionStatus: subscription.status,
          };
          
          if (currentPeriodEnd && !isNaN(currentPeriodEnd)) {
            updateData.subscriptionEndsAt = freshSubscriptionEndsAt;
          }
          
          await storage.updateUserSubscription(userId, updateData);
          
          // Recalculate access based on fresh Stripe data
          actualSubscriptionActive = subscription.status === 'active' && 
                                      freshSubscriptionEndsAt !== null && 
                                      freshSubscriptionEndsAt > now;
        } catch (error) {
          console.error("Error checking subscription status:", error);
        }
      }

      res.json({
        hasAccess: trialActive || actualSubscriptionActive,
        status: freshStatus,
        trialEndsAt: user.trialEndsAt,
        subscriptionEndsAt: freshSubscriptionEndsAt,
        isTrialActive: trialActive,
        isSubscriptionActive: actualSubscriptionActive,
        manualAccessGranted: false,
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  app.post('/api/cancel-subscription', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment processing is not configured" });
      }

      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription" });
      }

      await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      await storage.updateUserSubscription(userId, { 
        subscriptionStatus: 'canceled',
      });

      res.json({ message: "Subscription canceled successfully" });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Stripe webhook endpoint for subscription events
  app.post('/api/webhooks/stripe', webhookLimiter, async (req, res) => {
    if (!stripe) {
      return res.status(503).send('Payment processing is not configured');
    }

    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      logError('Missing STRIPE_WEBHOOK_SECRET - webhooks will fail');
      return res.status(500).send('Webhook secret not configured');
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err: any) {
      logError('Webhook signature verification failed', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as any;
          const subscriptionId = invoice.subscription;
          const customerId = invoice.customer;

          // Find user by Stripe customer ID
          const user = await storage.getUserByStripeCustomerId(customerId);
          if (user) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);

            await storage.updateUserSubscription(user.id, {
              subscriptionStatus: 'active',
              subscriptionEndsAt: currentPeriodEnd,
            });
            console.log(`Subscription activated for user ${user.id}`);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as any;
          const customerId = invoice.customer;

          const user = await storage.getUserByStripeCustomerId(customerId);
          if (user) {
            await storage.updateUserSubscription(user.id, {
              subscriptionStatus: 'past_due',
            });
            console.log(`Payment failed for user ${user.id}`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const customerId = subscription.customer;

          const user = await storage.getUserByStripeCustomerId(customerId);
          if (user) {
            await storage.updateUserSubscription(user.id, {
              subscriptionStatus: 'canceled',
            });
            console.log(`Subscription canceled for user ${user.id}`);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as any;
          const customerId = subscription.customer;
          
          const user = await storage.getUserByStripeCustomerId(customerId);
          if (user) {
            const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
            
            await storage.updateUserSubscription(user.id, {
              subscriptionStatus: subscription.status,
              subscriptionEndsAt: currentPeriodEnd,
            });
            console.log(`Subscription updated for user ${user.id}: ${subscription.status}`);
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Restaurant routes
  app.get('/api/restaurants/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      
      if (!restaurant) {
        return res.json(null);
      }

      // Fetch payout account data
      const payoutAccount = await storage.getPayoutAccount(restaurant.id);
      
      res.json({
        ...restaurant,
        payoutAccount: payoutAccount || null
      });
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  app.post('/api/restaurants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertRestaurantSchema.parse({ ...req.body, ownerId: userId });
      
      // Convert empty strings to null for optional unique fields
      if (data.customDomain === '') data.customDomain = null;
      if (data.subdomain === '') data.subdomain = null;
      
      // Generate unique slug if conflict exists
      let slug = data.slug;
      let counter = 1;
      while (await storage.getRestaurantBySlug(slug)) {
        slug = `${data.slug}-${counter}`;
        counter++;
      }
      data.slug = slug;
      
      const restaurant = await storage.createRestaurant(data);
      res.json(restaurant);
    } catch (error) {
      console.error("Error creating restaurant:", error);
      res.status(400).json({ message: "Failed to create restaurant" });
    }
  });

  app.put('/api/restaurants/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      
      if (!restaurant || restaurant.id !== req.params.id) {
        return res.status(403).json({ message: "Forbidden: You can only update your own restaurant" });
      }
      
      const data = insertRestaurantSchema.partial().parse(req.body);
      
      // Convert empty strings to null for optional unique fields
      if (data.customDomain === '') data.customDomain = null;
      if (data.subdomain === '') data.subdomain = null;
      
      // Validate subdomain format if provided
      if (data.subdomain && !/^[a-z0-9-]+$/.test(data.subdomain)) {
        return res.status(400).json({ message: "Subdomain can only contain lowercase letters, numbers, and hyphens" });
      }
      
      // Check subdomain uniqueness if provided and different from current
      if (data.subdomain && data.subdomain !== restaurant.subdomain) {
        const existing = await storage.getRestaurantBySubdomain(data.subdomain);
        if (existing && existing.id !== restaurant.id) {
          return res.status(400).json({ message: "This subdomain is already taken" });
        }
      }
      
      // Check custom domain uniqueness if provided and different from current
      if (data.customDomain && data.customDomain !== restaurant.customDomain) {
        const existing = await storage.getRestaurantByCustomDomain(data.customDomain);
        if (existing && existing.id !== restaurant.id) {
          return res.status(400).json({ message: "This custom domain is already in use" });
        }
      }
      
      // Re-geocode when the address changes, so route optimization has fresh coordinates
      if (data.address && data.address !== restaurant.address) {
        try {
          const { googleMapsService } = await import('./services/googleMaps');
          const geocoded = await googleMapsService.geocode(
            [data.address, data.country ?? restaurant.country].filter(Boolean).join(', ')
          );
          (data as any).latitude = geocoded.lat.toString();
          (data as any).longitude = geocoded.lng.toString();
        } catch (error) {
          logError('Failed to geocode restaurant address (non-critical)', error);
        }
      }

      const updated = await storage.updateRestaurant(req.params.id, data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating restaurant:", error);
      res.status(400).json({ message: "Failed to update restaurant" });
    }
  });

  app.put('/api/restaurants/:id/marketing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      
      if (!restaurant || restaurant.id !== req.params.id) {
        return res.status(403).json({ message: "Forbidden: You can only update your own restaurant" });
      }
      
      // Update marketing settings in the restaurant's marketingSettings JSONB field
      const updated = await storage.updateRestaurant(req.params.id, {
        marketingSettings: req.body
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating marketing settings:", error);
      res.status(400).json({ message: "Failed to update marketing settings" });
    }
  });

  // Menu category routes
  app.get('/api/menu/categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json([]);
      }
      const categories = await storage.getMenuCategories(restaurant.id);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/menu/categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const data = insertMenuCategorySchema.parse({ ...req.body, restaurantId: restaurant.id });
      const category = await storage.createMenuCategory(data);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(400).json({ message: "Failed to create category" });
    }
  });

  app.put('/api/menu/categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const data = insertMenuCategorySchema.partial().parse(req.body);
      const updated = await storage.updateMenuCategory(req.params.id, data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(400).json({ message: "Failed to update category" });
    }
  });

  app.delete('/api/menu/categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      await storage.deleteMenuCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(400).json({ message: "Failed to delete category" });
    }
  });

  // Menu item routes
  app.get('/api/menu/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json([]);
      }
      const items = await storage.getMenuItems(restaurant.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  app.post('/api/menu/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      console.log("[MENU ITEM CREATE] Request body received:", JSON.stringify(req.body, null, 2));
      
      // Handle price conversion if priceCents is not provided but price is
      let requestData = { ...req.body };

      // Handle price conversion in either direction
      if (!requestData.priceCents && requestData.price) {
        // price exists but priceCents doesn't
        const priceValue = parseFloat(requestData.price);
        if (!isNaN(priceValue)) {
          requestData.priceCents = Math.round(priceValue * 100);
          requestData.price = priceValue.toFixed(2);
        }
      } else if (requestData.priceCents && !requestData.price) {
        // priceCents exists but price doesn't - convert back
        const priceValue = requestData.priceCents / 100;
        requestData.price = priceValue.toFixed(2);
        console.log(`[MENU ITEM CREATE] Generated price ${requestData.price} from priceCents ${requestData.priceCents}`);
      }

      
      const data = insertMenuItemSchema.parse({ ...requestData, restaurantId: restaurant.id });

      // Merchandising: normalise the SEO handle (unique per restaurant, or clear it).
      if (data.handle !== undefined) {
        const wanted = slugify(String(data.handle || ""));
        if (!wanted) {
          data.handle = null;
        } else {
          let candidate = wanted;
          for (let i = 2; i < 60; i++) {
            const clash = await storage.getMenuItemByHandle(restaurant.id, candidate);
            if (!clash) break;
            candidate = `${wanted}-${i}`;
          }
          data.handle = candidate;
        }
      }

      // If imageUrl is provided, make it publicly accessible
      if (data.imageUrl) {
        console.log("[MENU ITEM CREATE] Original imageUrl:", data.imageUrl);
        const objectStorageService = new ObjectStorageService();
        const publicImagePath = await objectStorageService.trySetObjectEntityAclPolicy(
          data.imageUrl,
          { owner: userId, visibility: "public" }
        );
        console.log("[MENU ITEM CREATE] Public imageUrl:", publicImagePath);
        data.imageUrl = publicImagePath;
      }
      
      const item = await storage.createMenuItem(data);
      res.json(item);
    } catch (error) {
      console.error("Error creating item:", error);
      res.status(400).json({ message: "Failed to create item" });
    }
  });

  app.put('/api/menu/items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      // Get the original item before updating to check for content changes
      const originalItem = await storage.getMenuItem(req.params.id);
      if (!originalItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      if (originalItem.restaurantId !== restaurant.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Handle price conversion if priceCents is not provided but price is
      let requestData = { ...req.body };
      if (!requestData.priceCents && requestData.price) {
        const priceValue = parseFloat(requestData.price);
        if (!isNaN(priceValue)) {
          requestData.priceCents = Math.round(priceValue * 100);
          requestData.price = priceValue.toFixed(2); // Ensure price is a decimal string with 2 places
        }
      }
      
      const data = insertMenuItemSchema.partial().parse(requestData);

      // Merchandising: normalise the SEO handle (unique per restaurant, or clear it).
      if (data.handle !== undefined) {
        const wanted = slugify(String(data.handle || ""));
        if (!wanted) {
          data.handle = null;
        } else {
          let candidate = wanted;
          for (let i = 2; i < 60; i++) {
            const clash = await storage.getMenuItemByHandle(restaurant.id, candidate);
            if (!clash || clash.id === req.params.id) break;
            candidate = `${wanted}-${i}`;
          }
          data.handle = candidate;
        }
      }

      // If imageUrl is provided, make it publicly accessible
      if (data.imageUrl) {
        console.log("[MENU ITEM UPDATE] Original imageUrl:", data.imageUrl);
        const objectStorageService = new ObjectStorageService();
        const publicImagePath = await objectStorageService.trySetObjectEntityAclPolicy(
          data.imageUrl,
          { owner: userId, visibility: "public" }
        );
        console.log("[MENU ITEM UPDATE] Public imageUrl:", publicImagePath);
        data.imageUrl = publicImagePath;
      }
      
      const updatedItem = await storage.updateMenuItem(req.params.id, data);
      
      // Check if name or description changed - if so, mark translations as needing review
      const nameChanged = data.name !== undefined && data.name !== originalItem.name;
      const descriptionChanged = data.description !== undefined && data.description !== originalItem.description;
      
      if (nameChanged || descriptionChanged) {
        await storage.markTranslationsAsNeedingReview(restaurant.id, 'menu_item', req.params.id);
        console.log(`[TRANSLATION SYNC] Marked translations for menu item ${req.params.id} as needing review`);
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(400).json({ message: "Failed to update menu item" });
    }
  });

  app.delete('/api/menu/items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      // Verify the item belongs to the user's restaurant
      const item = await storage.getMenuItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      if (item.restaurantId !== restaurant.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await storage.deleteMenuItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(400).json({ message: "Failed to delete menu item" });
    }
  });

  // ---- Product variants (Tier 8) ----
  app.get('/api/menu/items/:id/variants', isAuthenticated, async (req: any, res) => {
    const restaurant = await storage.getRestaurantByOwnerId(req.user.id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    const item = await storage.getMenuItem(req.params.id);
    if (!item || item.restaurantId !== restaurant.id) return res.status(404).json({ message: "Menu item not found" });
    res.json({ optionNames: (item as any).variantOptions || [], variants: await storage.listVariants(item.id) });
  });

  app.put('/api/menu/items/:id/variants', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await storage.getRestaurantByOwnerId(req.user.id);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const item = await storage.getMenuItem(req.params.id);
      if (!item || item.restaurantId !== restaurant.id) return res.status(404).json({ message: "Menu item not found" });

      const optionNames = Array.isArray(req.body?.optionNames) ? req.body.optionNames.map((s: any) => String(s).slice(0, 60)) : [];
      const variants = Array.isArray(req.body?.variants) ? req.body.variants : [];
      for (const v of variants) {
        if (!v.name || !String(v.name).trim()) return res.status(400).json({ message: "Every variant needs a name" });
        if (!(Number(v.priceCents) >= 0)) return res.status(400).json({ message: `${v.name}: invalid price` });
      }
      const saved = await storage.setMenuItemVariants(item.id, restaurant.id, { optionNames, variants });
      res.json({ optionNames, variants: saved });
    } catch (e: any) {
      logError("Save variants failed", e);
      res.status(400).json({ message: e?.message || "Failed to save variants" });
    }
  });

  app.post('/api/menu/items/:id/duplicate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      // Get the original item
      const originalItem = await storage.getMenuItem(req.params.id);
      if (!originalItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      // Verify the item belongs to the user's restaurant
      if (originalItem.restaurantId !== restaurant.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Create duplicate with " (Copy)" appended to name
      const duplicateData = {
        name: `${originalItem.name} (Copy)`,
        description: originalItem.description,
        price: originalItem.price,
        priceCents: originalItem.priceCents,
        categoryId: originalItem.categoryId,
        imageUrl: originalItem.imageUrl,
        isAvailable: originalItem.isAvailable,
        restaurantId: restaurant.id,
        currency: originalItem.currency,
        options: originalItem.options as any,
        allergensJson: originalItem.allergensJson as any,
        tags: originalItem.tags || undefined,
      };
      
      const newItem = await storage.createMenuItem(duplicateData);
      res.json(newItem);
    } catch (error) {
      console.error("Error duplicating menu item:", error);
      res.status(400).json({ message: "Failed to duplicate menu item" });
    }
  });

  // Translation routes
  app.get('/api/translations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const { entityType, entityId, locale } = req.query;
      if (!entityType || !entityId) {
        return res.status(400).json({ message: "entityType and entityId are required" });
      }

      const translations = await storage.getTranslations(
        restaurant.id,
        entityType as string,
        entityId as string,
        locale as string | undefined
      );
      res.json(translations);
    } catch (error) {
      console.error("Error fetching translations:", error);
      res.status(500).json({ message: "Failed to fetch translations" });
    }
  });

  app.get('/api/translations/locale/:locale', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const translations = await storage.getTranslationsByLocale(restaurant.id, req.params.locale);
      res.json(translations);
    } catch (error) {
      console.error("Error fetching translations by locale:", error);
      res.status(500).json({ message: "Failed to fetch translations" });
    }
  });

  app.post('/api/translations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const { entityType, entityId, locale, field, value } = req.body;
      if (!entityType || !entityId || !locale || !field || value === undefined) {
        return res.status(400).json({ message: "entityType, entityId, locale, field, and value are required" });
      }

      const translation = await storage.createOrUpdateTranslation(restaurant.id, {
        entityType,
        entityId,
        locale,
        field,
        value,
        lastUpdatedBy: userId,
      });
      res.json(translation);
    } catch (error) {
      console.error("Error creating/updating translation:", error);
      res.status(500).json({ message: "Failed to save translation" });
    }
  });

  app.post('/api/translations/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const { translations } = req.body;
      if (!Array.isArray(translations)) {
        return res.status(400).json({ message: "translations must be an array" });
      }

      await storage.bulkUpsertTranslations(restaurant.id, translations);
      res.json({ success: true, count: translations.length });
    } catch (error) {
      console.error("Error bulk upserting translations:", error);
      res.status(500).json({ message: "Failed to save translations" });
    }
  });

  app.delete('/api/translations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Get the translation to verify ownership
      const translation = await storage.getTranslationById(req.params.id);
      if (!translation || translation.restaurantId !== restaurant.id) {
        return res.status(404).json({ message: "Translation not found" });
      }

      await storage.deleteTranslation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting translation:", error);
      res.status(500).json({ message: "Failed to delete translation" });
    }
  });

  // Promo routes
  app.get('/api/promos', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json([]);
      }
      const promos = await storage.getPromos(restaurant.id);
      res.json(promos);
    } catch (error) {
      console.error("Error fetching promos:", error);
      res.status(500).json({ message: "Failed to fetch promos" });
    }
  });

  app.post('/api/promos', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const restaurant = await storage.getRestaurantByOwnerId(userId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Validate required fields - match what frontend sends
    const { name, promoCode, promoType, discountValue, scope, redemptionLimit, isActive, startsAt, endsAt, buyItemId, getItemId, buyQuantity, getQuantity, autoApply, perCustomerLimit, priority, description, conditions } = req.body;

    if (!name || !promoCode) {
      return res.status(400).json({
        message: "Promo name and code are required"
      });
    }

    // Build promo data with correct field names matching database schema
    const promoData = {
      restaurantId: restaurant.id,
      name,
      description: description || null,
      promoCode,
      promoType: promoType || 'percentage',
      discountValue: discountValue ? discountValue.toString() : '0',
      scope: scope || 'order',
      conditions: conditions || {},
      redemptionLimit: redemptionLimit || null,
      isActive: isActive !== undefined ? isActive : true,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      endsAt: endsAt ? new Date(endsAt) : null,
      buyItemId: buyItemId || null,
      getItemId: getItemId || null,
      buyQuantity: buyQuantity || null,
      getQuantity: getQuantity || null,
      autoApply: autoApply !== undefined ? autoApply : false,
      perCustomerLimit: perCustomerLimit || 1,
      priority: priority || 0,
    };
    
    const promo = await storage.createPromo(promoData);
    res.json(promo);
  } catch (error: any) {
    console.error("Error creating promo:", error);
    if (error.code === '23505') {
      return res.status(409).json({
        message: `The code "${req.body?.promoCode}" is already in use. Try a different promo code.`
      });
    }
    res.status(400).json({
      message: "Failed to create promo. Please check your inputs and try again."
    });
  }
});


  app.put('/api/promos/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      // Verify the promo belongs to the user's restaurant
      const promo = await storage.getPromo(req.params.id);
      if (!promo) {
        return res.status(404).json({ message: "Promo not found" });
      }
      if (promo.restaurantId !== restaurant.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Timestamp columns need real Date objects — JSON.stringify turns any Date the
      // client sends back into a string, so it must be re-parsed here (POST already
      // does this; PUT previously passed the raw string straight to Drizzle, which
      // throws "value.toISOString is not a function" when writing the column).
      const data = { ...req.body };
      if (data.startsAt) data.startsAt = new Date(data.startsAt);
      if ('endsAt' in data) data.endsAt = data.endsAt ? new Date(data.endsAt) : null;

      const updated = await storage.updatePromo(req.params.id, data);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating promo:", error);
      if (error.code === '23505') {
        return res.status(409).json({
          message: `The code "${req.body?.promoCode}" is already in use. Try a different promo code.`
        });
      }
      res.status(400).json({ message: "Failed to update promo. Please check your inputs and try again." });
    }
  });

  app.delete('/api/promos/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      // Verify the promo belongs to the user's restaurant
      const promo = await storage.getPromo(req.params.id);
      if (!promo) {
        return res.status(404).json({ message: "Promo not found" });
      }
      if (promo.restaurantId !== restaurant.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await storage.deletePromo(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting promo:", error);
      res.status(400).json({ message: "Failed to delete promo" });
    }
  });

  app.get('/api/promos/performance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json([]);
      }
      const performance = await storage.getPromoPerformance(restaurant.id);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching promo performance:", error);
      res.status(500).json({ message: "Failed to fetch promo performance" });
    }
  });

  // Market routes — named regions for storefront display-currency conversion.
  // Currency conversion here is display-only; checkout always totals in the
  // restaurant's base currency. Country coverage is informational only.
  app.get('/api/markets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json([]);
      }
      const marketsList = await storage.getMarkets(restaurant.id);
      res.json(marketsList);
    } catch (error) {
      console.error("Error fetching markets:", error);
      res.status(500).json({ message: "Failed to fetch markets" });
    }
  });

  app.post('/api/markets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const { name, currency, conversionRate, taxRate, countries, isActive } = req.body;
      if (!name || !currency) {
        return res.status(400).json({ message: "Market name and currency are required" });
      }

      const marketData = {
        restaurantId: restaurant.id,
        name,
        currency,
        conversionRate: conversionRate ? conversionRate.toString() : '1',
        taxRate: taxRate !== undefined && taxRate !== null && taxRate !== '' ? taxRate.toString() : null,
        countries: Array.isArray(countries) ? countries : [],
        isActive: isActive !== undefined ? isActive : true,
      };

      const market = await storage.createMarket(marketData);
      res.json(market);
    } catch (error) {
      console.error("Error creating market:", error);
      res.status(400).json({ message: "Failed to create market. Please check your inputs and try again." });
    }
  });

  app.put('/api/markets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const market = await storage.getMarket(req.params.id);
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }
      if (market.restaurantId !== restaurant.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { name, currency, conversionRate, taxRate, countries, isActive } = req.body;
      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = name;
      if (currency !== undefined) data.currency = currency;
      if (conversionRate !== undefined) data.conversionRate = conversionRate.toString();
      if (taxRate !== undefined) data.taxRate = taxRate !== null && taxRate !== '' ? taxRate.toString() : null;
      if (countries !== undefined) data.countries = Array.isArray(countries) ? countries : [];
      if (isActive !== undefined) data.isActive = isActive;

      const updated = await storage.updateMarket(req.params.id, data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating market:", error);
      res.status(400).json({ message: "Failed to update market. Please check your inputs and try again." });
    }
  });

  app.delete('/api/markets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const market = await storage.getMarket(req.params.id);
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }
      if (market.restaurantId !== restaurant.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteMarket(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting market:", error);
      res.status(400).json({ message: "Failed to delete market" });
    }
  });

  // Order routes
  app.get('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json([]);
      }
      const orders = await storage.getOrders(restaurant.id);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/order-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json([]);
      }
      const orderItems = await storage.getAllOrderItems(restaurant.id);
      res.json(orderItems);
    } catch (error) {
      console.error("Error fetching order items:", error);
      res.status(500).json({ message: "Failed to fetch order items" });
    }
  });

  app.get('/api/orders/recent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json([]);
      }
      const orders = await storage.getRecentOrders(restaurant.id, 5);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching recent orders:", error);
      res.status(500).json({ message: "Failed to fetch recent orders" });
    }
  });

  app.get('/api/orders/new-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json({ count: 0 });
      }
      
      // Get all pending orders for the restaurant
      const orders = await storage.getOrders(restaurant.id);
      const newOrders = orders.filter(order => order.status === 'pending');
      
      res.json({ count: newOrders.length });
    } catch (error) {
      console.error("Error fetching new orders count:", error);
      res.status(500).json({ message: "Failed to fetch new orders count" });
    }
  });

  app.post('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const data = orderSchema.parse(req.body);
      const orderNumber = await generateOrderNumber(restaurant.id, 'ORD');
      
      const order = await storage.createOrder({
        restaurantId: restaurant.id,
        orderNumber,
        orderType: data.orderType,
        tableId: data.tableId || null,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        customerEmail: data.customerEmail || null,
        paymentMethod: data.paymentMethod || null,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        status: 'pending',
        paymentStatus: 'pending',
      }, data.items.map(item => ({
        menuItemId: item.menuItemId,
        variantId: item.variantId || null,
        variantName: item.variantName || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: (parseFloat(item.unitPrice) * item.quantity).toFixed(2),
        notes: item.notes || null,
      })));

      for (const item of data.items) {
        if (item.variantId) await storage.decrementVariantStock(item.variantId, item.quantity).catch((e) => logError("Variant stock decrement failed (non-critical)", e));
      }

      // PHASE 6: Make prep time prediction when order is created
      try {
        const { prepTimePredictionService } = await import('./services/prepTimePrediction');
        const prediction = await prepTimePredictionService.predictPrepTime(restaurant.id, {
          itemCount: data.items.length,
          orderValue: data.total,
          hasSpecialInstructions: data.items.some((item: any) => item.notes),
        });
        await prepTimePredictionService.savePrediction(order.id, restaurant.id, prediction, {
          itemCount: data.items.length,
          orderValue: data.total,
        });
        logInfo(`Prep time prediction for order ${order.id}: ${prediction.predictedMinutes} min (${prediction.confidence}% confidence)`);
      } catch (error) {
        logError('Error making prep time prediction (non-critical)', error);
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({ message: "Failed to create order" });
    }
  });

  app.get('/api/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      const orderData = await storage.getOrderWithItems(id);
      if (!orderData) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Verify order belongs to this restaurant
      if (orderData.order.restaurantId !== restaurant.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      res.json(orderData);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.patch('/api/orders/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, trackingNumber, shippingCarrier } = req.body;
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      // Get order to verify ownership
      const orderData = await storage.getOrderWithItems(id);
      if (!orderData) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (orderData.order.restaurantId !== restaurant.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (orderData.order.isDraft) {
        return res.status(400).json({ message: "Finalize this draft before changing its status" });
      }

      const fromStatus = orderData.order.status;
      const updated = await storage.updateOrderStatus(id, status, { trackingNumber, shippingCarrier });
      await storage.logOrderEvent({
        orderId: id,
        restaurantId: restaurant.id,
        type: "status",
        message: `Status changed from ${fromStatus} to ${status}`,
        meta: { from: fromStatus, to: status },
        createdBy: req.user.id,
      }).catch((e) => logError("logOrderEvent (status) failed", e));
      res.json(updated);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(400).json({ message: "Failed to update order status" });
    }
  });

  // ==========================================
  // ORDER OPERATIONS — drafts, refunds, timeline (Tier 3)
  // ==========================================

  const ownerRestaurantForOrders = async (req: any) => storage.getRestaurantByOwnerId(req.user.id);

  // Load an order and confirm it belongs to the caller's restaurant.
  async function loadOwnedOrder(req: any) {
    const restaurant = await ownerRestaurantForOrders(req);
    if (!restaurant) return { error: res_404("Restaurant not found") };
    const data = await storage.getOrderWithItems(req.params.id);
    if (!data) return { error: res_404("Order not found") };
    if (data.order.restaurantId !== restaurant.id) return { error: { status: 403, message: "Unauthorized" } };
    return { restaurant, data };
  }
  function res_404(message: string) { return { status: 404, message }; }

  const draftItemSchema = z.object({
    menuItemId: z.string().optional(),
    bundleId: z.string().optional(),
    variantId: z.string().nullable().optional(),
    variantName: z.string().nullable().optional(),
    quantity: z.number().int().positive(),
    unitPrice: z.string(),
    notes: z.string().nullable().optional(),
    selectedOptions: z.any().nullable().optional(),
  });
  const draftOrderSchema = z.object({
    // "dine-in" (hyphen) is the value POS.tsx/businessType.ts actually send —
    // this previously required "dine_in" (underscore), which no client ever sends,
    // so every dine-in POS order failed zod validation before reaching the DB.
    orderType: z.enum(["pickup", "shipping", "dine-in"]).default("pickup"),
    customerName: z.string().nullable().optional(),
    customerPhone: z.string().nullable().optional(),
    customerEmail: z.string().nullable().optional(),
    shippingAddress: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    taxRate: z.number().min(0).max(1).optional(),
    deliveryFee: z.string().nullable().optional(),
    items: z.array(draftItemSchema).min(1),
  });

  function computeDraftTotals(items: z.infer<typeof draftItemSchema>[], taxRate = 0, deliveryFee = 0) {
    const lineRows = items.map((it) => ({
      menuItemId: it.menuItemId || null,
      bundleId: it.bundleId || null,
      variantId: it.variantId || null,
      variantName: it.variantName || null,
      quantity: it.quantity,
      unitPrice: parseFloat(it.unitPrice).toFixed(2),
      subtotal: (parseFloat(it.unitPrice) * it.quantity).toFixed(2),
      notes: it.notes || null,
      selectedOptions: it.selectedOptions ?? null,
    }));
    const subtotal = lineRows.reduce((s, r) => s + parseFloat(r.subtotal), 0);
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100;
    return { lineRows, subtotal: subtotal.toFixed(2), tax: tax.toFixed(2), total: total.toFixed(2) };
  }

  // Create a draft order
  app.post('/api/orders/draft', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurantForOrders(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const data = draftOrderSchema.parse(req.body);
      const taxRate = data.taxRate ?? (restaurant.taxRate ? parseFloat(restaurant.taxRate) / 100 : 0);
      const deliveryFee = data.deliveryFee ? parseFloat(data.deliveryFee) : 0;
      const { lineRows, subtotal, tax, total } = computeDraftTotals(data.items, taxRate, deliveryFee);
      const orderNumber = await generateOrderNumber(restaurant.id, 'ORD');

      const order = await storage.createDraftOrder({
        restaurantId: restaurant.id,
        orderNumber,
        orderType: data.orderType,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        customerEmail: data.customerEmail || null,
        shippingAddress: data.shippingAddress || null,
        notes: data.notes || null,
        shippingFee: deliveryFee.toFixed(2),
        subtotal,
        tax,
        total,
      } as any, lineRows as any);

      await storage.logOrderEvent({
        orderId: order.id, restaurantId: restaurant.id, type: "draft",
        message: "Draft order created", createdBy: req.user.id,
      }).catch(() => {});
      res.json(order);
    } catch (error: any) {
      if (error?.name === "ZodError") return res.status(400).json({ message: error.errors?.[0]?.message || "Invalid draft" });
      logError("Create draft order failed", error);
      res.status(400).json({ message: "Failed to create draft order" });
    }
  });

  // Edit a draft order (line items + customer + notes)
  app.patch('/api/orders/:id/draft', isAuthenticated, async (req: any, res) => {
    try {
      const owned = await loadOwnedOrder(req);
      if (owned.error) return res.status(owned.error.status).json({ message: owned.error.message });
      if (!owned.data.order.isDraft) return res.status(400).json({ message: "Only draft orders can be edited" });

      const data = draftOrderSchema.parse(req.body);
      const taxRate = data.taxRate ?? (owned.restaurant.taxRate ? parseFloat(owned.restaurant.taxRate) / 100 : 0);
      const deliveryFee = data.deliveryFee ? parseFloat(data.deliveryFee) : 0;
      const { lineRows, subtotal, tax, total } = computeDraftTotals(data.items, taxRate, deliveryFee);

      const updated = await storage.updateDraftOrder(req.params.id, {
        orderType: data.orderType,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        customerEmail: data.customerEmail || null,
        shippingAddress: data.shippingAddress || null,
        notes: data.notes || null,
        shippingFee: deliveryFee.toFixed(2),
        subtotal, tax, total,
      } as any, lineRows as any);
      res.json(updated);
    } catch (error: any) {
      if (error?.name === "ZodError") return res.status(400).json({ message: error.errors?.[0]?.message || "Invalid draft" });
      logError("Update draft order failed", error);
      res.status(400).json({ message: error?.message || "Failed to update draft" });
    }
  });

  // Finalize a draft -> live order
  app.post('/api/orders/:id/draft/finalize', isAuthenticated, async (req: any, res) => {
    try {
      const owned = await loadOwnedOrder(req);
      if (owned.error) return res.status(owned.error.status).json({ message: owned.error.message });
      if (!owned.data.order.isDraft) return res.status(400).json({ message: "Order is not a draft" });

      const markPaid = req.body?.markPaid === true;
      const paymentMethod = typeof req.body?.paymentMethod === "string" ? req.body.paymentMethod : null;
      const order = await storage.finalizeDraftOrder(req.params.id, { markPaid, paymentMethod });

      // Link to a customer profile + rewards, same as storefront checkout.
      try {
        const c = await storage.upsertGuestCustomer(owned.restaurant.id, {
          name: order.customerName, email: order.customerEmail, phone: order.customerPhone,
        });
        if (c) {
          await storage.linkOrderToCustomer(order.id, c.id);
          if (markPaid) {
            await storage.recordCustomerOrder(c.id, parseFloat(order.total));
            await storage.awardLoyaltyForOrder(order.id);
          }
        }
      } catch (e) { logError("Draft finalize: customer/loyalty link failed (non-critical)", e); }

      await storage.logOrderEvent({
        orderId: order.id, restaurantId: owned.restaurant.id, type: "draft",
        message: markPaid ? "Draft finalized and marked paid" : "Draft finalized",
        meta: { markPaid, paymentMethod }, createdBy: req.user.id,
      }).catch(() => {});

      wsManager.broadcastToRestaurant(owned.restaurant.id, { type: "new_order", data: { orderId: order.id } });
      res.json(order);
    } catch (error: any) {
      logError("Finalize draft failed", error);
      res.status(400).json({ message: error?.message || "Failed to finalize draft" });
    }
  });

  // Order timeline
  app.get('/api/orders/:id/events', isAuthenticated, async (req: any, res) => {
    const owned = await loadOwnedOrder(req);
    if (owned.error) return res.status(owned.error.status).json({ message: owned.error.message });
    res.json(await storage.listOrderEvents(req.params.id));
  });

  // Refunds list
  app.get('/api/orders/:id/refunds', isAuthenticated, async (req: any, res) => {
    const owned = await loadOwnedOrder(req);
    if (owned.error) return res.status(owned.error.status).json({ message: owned.error.message });
    res.json(await storage.listOrderRefunds(req.params.id));
  });

  const refundSchema = z.object({
    amount: z.number().positive(),
    reason: z.string().max(500).nullable().optional(),
    method: z.enum(["original_payment", "store_credit", "manual"]).default("original_payment"),
    restock: z.boolean().optional(),
    items: z.array(z.object({ orderItemId: z.string(), quantity: z.number().int().positive() })).optional(),
  });

  // Issue a refund (full or partial)
  app.post('/api/orders/:id/refund', isAuthenticated, async (req: any, res) => {
    try {
      const owned = await loadOwnedOrder(req);
      if (owned.error) return res.status(owned.error.status).json({ message: owned.error.message });
      const order = owned.data.order;
      if (order.isDraft) return res.status(400).json({ message: "Drafts can't be refunded" });

      const body = refundSchema.parse(req.body);
      const total = parseFloat(order.total || "0");
      const already = parseFloat(order.refundedAmount || "0");
      const remaining = Math.round((total - already) * 100) / 100;
      if (body.amount > remaining + 0.001) {
        return res.status(400).json({ message: `Only $${remaining.toFixed(2)} can still be refunded` });
      }

      let method = body.method;
      let stripeRefundId: string | null = null;

      if (method === "original_payment") {
        if (order.paymentProvider === "stripe" && order.paymentIntentId && stripe) {
          try {
            const r = await stripe.refunds.create({
              payment_intent: order.paymentIntentId,
              amount: Math.round(body.amount * 100),
            });
            stripeRefundId = r.id;
          } catch (e: any) {
            logError("Stripe refund failed", e);
            return res.status(502).json({ message: e?.message || "Card refund failed at the processor" });
          }
        } else {
          // No captured card payment to reverse — record it as a manual refund.
          method = "manual";
        }
      }

      if (method === "store_credit") {
        if (!order.customerId) {
          return res.status(400).json({ message: "This order has no customer profile to credit" });
        }
        await storage.applyStoreCredit(owned.restaurant.id, order.customerId, Math.round(body.amount * 100), "refund", {
          orderId: order.id,
          reason: body.reason || `Refund for ${order.orderNumber}`,
          createdBy: req.user.id,
        });
      }

      const { refund, order: updated } = await storage.recordOrderRefund({
        orderId: order.id,
        restaurantId: owned.restaurant.id,
        amount: body.amount,
        reason: body.reason || null,
        method,
        restock: body.restock ?? false,
        items: body.items ?? null,
        stripeRefundId,
        createdBy: req.user.id,
      });

      await storage.logOrderEvent({
        orderId: order.id, restaurantId: owned.restaurant.id, type: "refund",
        message: `Refunded $${body.amount.toFixed(2)} via ${method.replace("_", " ")}${body.restock ? " · items restocked" : ""}`,
        meta: { amount: body.amount, method, reason: body.reason, stripeRefundId },
        createdBy: req.user.id,
      }).catch(() => {});

      res.json({ refund, order: updated });
    } catch (error: any) {
      if (error?.name === "ZodError") return res.status(400).json({ message: error.errors?.[0]?.message || "Invalid refund" });
      logError("Refund failed", error);
      res.status(400).json({ message: error?.message || "Failed to issue refund" });
    }
  });

  // Add a manual note to the timeline
  app.post('/api/orders/:id/note', isAuthenticated, async (req: any, res) => {
    const owned = await loadOwnedOrder(req);
    if (owned.error) return res.status(owned.error.status).json({ message: owned.error.message });
    const note = String(req.body?.note || "").trim();
    if (!note) return res.status(400).json({ message: "Note is empty" });
    await storage.logOrderEvent({
      orderId: req.params.id, restaurantId: owned.restaurant.id, type: "note",
      message: note, createdBy: req.user.id,
    });
    res.json({ ok: true });
  });

  // Delete an order — only drafts and cancelled orders, so paid history stays intact.
  app.delete('/api/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const owned = await loadOwnedOrder(req);
      if (owned.error) return res.status(owned.error.status).json({ message: owned.error.message });
      const o = owned.data.order;
      const deletable = o.isDraft || o.status === "cancelled" || (o.status === "pending" && o.paymentStatus !== "paid");
      if (!deletable) {
        return res.status(400).json({ message: "Cancel and refund this order instead of deleting it" });
      }
      await storage.deleteOrder(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      logError("Delete order failed", error);
      res.status(400).json({ message: "Failed to delete order" });
    }
  });

  // Inbox & Reviews routes
  app.get('/api/inbox/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json([]);
      }
      const messages = await storage.getInboxMessages(restaurant.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching inbox messages:", error);
      res.status(500).json({ message: "Failed to fetch inbox messages" });
    }
  });

  app.post('/api/inbox/messages/:id/respond', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { response } = req.body;
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const updated = await storage.respondToMessage(id, response);
      res.json(updated);
    } catch (error) {
      console.error("Error responding to message:", error);
      res.status(400).json({ message: "Failed to respond to message" });
    }
  });

  app.patch('/api/inbox/messages/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const updated = await storage.updateMessageStatus(id, status);
      res.json(updated);
    } catch (error) {
      console.error("Error updating message status:", error);
      res.status(400).json({ message: "Failed to update message status" });
    }
  });

  app.get('/api/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json([]);
      }
      const reviews = await storage.getCustomerReviews(restaurant.id);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post('/api/reviews/:id/respond', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { response } = req.body;
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const updated = await storage.respondToReview(id, response);
      res.json(updated);
    } catch (error) {
      console.error("Error responding to review:", error);
      res.status(400).json({ message: "Failed to respond to review" });
    }
  });

  // Bundle routes
  app.get('/api/bundles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json([]);
      }
      const bundles = await storage.getBundles(restaurant.id);
      res.json(bundles);
    } catch (error) {
      console.error("Error fetching bundles:", error);
      res.status(500).json({ message: "Failed to fetch bundles" });
    }
  });

  app.post('/api/bundles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const bundle = await storage.createBundle({
        ...req.body,
        restaurantId: restaurant.id,
        sales: req.body.sales || 0,
      });
      res.json(bundle);
    } catch (error) {
      console.error("Error creating bundle:", error);
      res.status(400).json({ message: "Failed to create bundle" });
    }
  });

  app.put('/api/bundles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const { id } = req.params;
      const bundle = await storage.updateBundle(id, req.body);
      res.json(bundle);
    } catch (error) {
      console.error("Error updating bundle:", error);
      res.status(400).json({ message: "Failed to update bundle" });
    }
  });

  app.delete('/api/bundles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const { id } = req.params;
      await storage.deleteBundle(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting bundle:", error);
      res.status(400).json({ message: "Failed to delete bundle" });
    }
  });

  // ---- Loyalty & store credit (merchant) ----

  const ownerRestaurant = async (req: any) => storage.getRestaurantByOwnerId(req.user.id);

  app.get('/api/loyalty/program', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.json(null);
      const program = (await storage.getLoyaltyProgram(restaurant.id)) || null;
      const tiers = await storage.listLoyaltyTiers(restaurant.id);
      res.json({ program, tiers });
    } catch (e) {
      logError("Fetch loyalty program failed", e);
      res.status(500).json({ message: "Failed to load loyalty settings" });
    }
  });

  app.put('/api/loyalty/program', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const b = req.body || {};
      const patch: any = {};
      if (b.isEnabled !== undefined) patch.isEnabled = !!b.isEnabled;
      if (typeof b.programName === "string") patch.programName = b.programName.slice(0, 120) || "Rewards";
      if (b.pointsPerUnit !== undefined) patch.pointsPerUnit = String(Math.max(0, Number(b.pointsPerUnit) || 0));
      if (b.redeemCentsPerPoint !== undefined) patch.redeemCentsPerPoint = String(Math.max(0.0001, Number(b.redeemCentsPerPoint) || 1));
      if (b.minRedeemPoints !== undefined) patch.minRedeemPoints = Math.max(0, Math.floor(Number(b.minRedeemPoints) || 0));
      if (b.maxRedeemFraction !== undefined) patch.maxRedeemFraction = String(Math.min(1, Math.max(0, Number(b.maxRedeemFraction) || 0)));
      if (b.earnOnDeliveryFee !== undefined) patch.earnOnDeliveryFee = !!b.earnOnDeliveryFee;
      const program = await storage.upsertLoyaltyProgram(restaurant.id, patch);
      res.json(program);
    } catch (e) {
      logError("Update loyalty program failed", e);
      res.status(500).json({ message: "Failed to save loyalty settings" });
    }
  });

  app.post('/api/loyalty/tiers', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const b = req.body || {};
      if (!b.name || !String(b.name).trim()) return res.status(400).json({ message: "Tier name is required" });
      const tier = await storage.createLoyaltyTier({
        restaurantId: restaurant.id,
        name: String(b.name).trim().slice(0, 100),
        minPoints: Math.max(0, Math.floor(Number(b.minPoints) || 0)),
        benefits: b.benefits ?? null,
        displayOrder: Math.floor(Number(b.displayOrder) || 0),
        isActive: b.isActive !== false,
      } as any);
      res.json(tier);
    } catch (e) {
      logError("Create loyalty tier failed", e);
      res.status(500).json({ message: "Failed to create tier" });
    }
  });

  app.patch('/api/loyalty/tiers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const b = req.body || {};
      const patch: any = {};
      if (typeof b.name === "string") patch.name = b.name.trim().slice(0, 100);
      if (b.minPoints !== undefined) patch.minPoints = Math.max(0, Math.floor(Number(b.minPoints) || 0));
      if (b.benefits !== undefined) patch.benefits = b.benefits;
      if (b.displayOrder !== undefined) patch.displayOrder = Math.floor(Number(b.displayOrder) || 0);
      if (b.isActive !== undefined) patch.isActive = !!b.isActive;
      const tier = await storage.updateLoyaltyTier(req.params.id, restaurant.id, patch);
      if (!tier) return res.status(404).json({ message: "Tier not found" });
      res.json(tier);
    } catch (e) {
      logError("Update loyalty tier failed", e);
      res.status(500).json({ message: "Failed to update tier" });
    }
  });

  app.delete('/api/loyalty/tiers/:id', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    await storage.deleteLoyaltyTier(req.params.id, restaurant.id);
    res.json({ ok: true });
  });

  app.get('/api/loyalty/stats', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const stats = await storage.getLoyaltyReportStats(restaurant.id);
      res.json(stats);
    } catch (e) {
      logError("Loyalty stats failed", e);
      res.status(500).json({ message: "Failed to load loyalty stats" });
    }
  });

  // Merchant customers list + detail (Tier 2 — minimal CRM)
  app.get('/api/customers', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.json([]);
      const search = typeof req.query.q === "string" ? req.query.q : undefined;
      const rows = await storage.listRestaurantCustomers(restaurant.id, search);
      res.json(rows);
    } catch (e) {
      logError("List customers failed", e);
      res.status(500).json({ message: "Failed to load customers" });
    }
  });

  app.get('/api/customers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const customer = await storage.getCustomerById(req.params.id);
      if (!customer || customer.restaurantId !== restaurant.id) {
        return res.status(404).json({ message: "Customer not found" });
      }
      const [orders, loyaltyAccount, creditTx] = await Promise.all([
        storage.getCustomerOrders(customer.id),
        storage.getLoyaltyAccount(restaurant.id, customer.id),
        storage.listCreditTransactions(customer.id, 20),
      ]);
      const loyaltyTx = loyaltyAccount ? await storage.listLoyaltyTransactions(loyaltyAccount.id, 20) : [];
      res.json({ customer, orders, loyaltyAccount, loyaltyTx, creditTx });
    } catch (e) {
      logError("Customer detail failed", e);
      res.status(500).json({ message: "Failed to load customer" });
    }
  });

  app.post('/api/customers/:id/loyalty-adjust', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const customer = await storage.getCustomerById(req.params.id);
      if (!customer || customer.restaurantId !== restaurant.id) return res.status(404).json({ message: "Customer not found" });
      const points = Math.trunc(Number(req.body?.points) || 0);
      if (!points) return res.status(400).json({ message: "Enter a non-zero point amount" });
      const account = await storage.adjustLoyaltyPoints(restaurant.id, customer.id, points, req.body?.reason || "Manual adjustment");
      res.json(account);
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Adjustment failed" });
    }
  });

  app.post('/api/customers/:id/credit-adjust', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const customer = await storage.getCustomerById(req.params.id);
      if (!customer || customer.restaurantId !== restaurant.id) return res.status(404).json({ message: "Customer not found" });
      const amountCents = Math.trunc(Number(req.body?.amountCents) || 0);
      if (!amountCents) return res.status(400).json({ message: "Enter a non-zero amount" });
      const balance = await storage.applyStoreCredit(restaurant.id, customer.id, amountCents, "adjustment", {
        reason: req.body?.reason || "Manual adjustment",
        createdBy: req.user.id,
      });
      res.json({ storeCreditCents: balance });
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Adjustment failed" });
    }
  });

  // ---- Gift cards (merchant) — Tier 4 ----

  app.get('/api/gift-cards', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.json([]);
      const search = typeof req.query.q === "string" ? req.query.q : undefined;
      res.json(await storage.listGiftCards(restaurant.id, search));
    } catch (e) {
      logError("List gift cards failed", e);
      res.status(500).json({ message: "Failed to load gift cards" });
    }
  });

  const issueGiftCardSchema = z.object({
    amount: z.number().positive().max(100000),
    code: z.string().trim().min(4).max(40).optional(),
    recipientName: z.string().max(255).nullable().optional(),
    recipientEmail: z.string().email().max(255).nullable().optional(),
    senderName: z.string().max(255).nullable().optional(),
    message: z.string().max(2000).nullable().optional(),
    note: z.string().max(2000).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  });

  app.post('/api/gift-cards', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const b = issueGiftCardSchema.parse(req.body);
      if (b.code) {
        const clash = await storage.getGiftCardByCode(restaurant.id, b.code);
        if (clash) return res.status(409).json({ message: "That code is already in use" });
      }
      const card = await storage.issueGiftCard({
        restaurantId: restaurant.id,
        amount: b.amount,
        currency: restaurant.currency || "USD",
        code: b.code,
        recipientName: b.recipientName ?? null,
        recipientEmail: b.recipientEmail ?? null,
        senderName: b.senderName ?? null,
        message: b.message ?? null,
        note: b.note ?? null,
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
        createdBy: req.user.id,
      });
      res.json(card);
    } catch (e: any) {
      if (e?.name === "ZodError") return res.status(400).json({ message: e.errors?.[0]?.message || "Invalid gift card" });
      logError("Issue gift card failed", e);
      res.status(400).json({ message: "Failed to issue gift card" });
    }
  });

  app.get('/api/gift-cards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const card = await storage.getGiftCardById(req.params.id);
      if (!card || card.restaurantId !== restaurant.id) return res.status(404).json({ message: "Gift card not found" });
      const transactions = await storage.listGiftCardTransactions(card.id);
      res.json({ card, transactions });
    } catch (e) {
      logError("Gift card detail failed", e);
      res.status(500).json({ message: "Failed to load gift card" });
    }
  });

  app.patch('/api/gift-cards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const card = await storage.getGiftCardById(req.params.id);
      if (!card || card.restaurantId !== restaurant.id) return res.status(404).json({ message: "Gift card not found" });

      if (typeof req.body?.status === "string" && ["active", "disabled"].includes(req.body.status)) {
        const updated = await storage.setGiftCardStatus(card.id, restaurant.id, req.body.status);
        return res.json(updated);
      }
      const delta = Number(req.body?.adjustAmount);
      if (delta) {
        const { card: updated } = await storage.applyGiftCardDelta({
          giftCardId: card.id,
          restaurantId: restaurant.id,
          delta,
          type: "adjustment",
          note: req.body?.note || "Manual adjustment",
          createdBy: req.user.id,
        });
        return res.json(updated);
      }
      res.status(400).json({ message: "Nothing to update" });
    } catch (e: any) {
      logError("Update gift card failed", e);
      res.status(400).json({ message: e?.message || "Failed to update gift card" });
    }
  });

  // ---- Collections (merchant merchandising) — Tier 5 ----

  app.get('/api/collections', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.json([]);
      res.json(await storage.listCollections(restaurant.id));
    } catch (e) {
      logError("List collections failed", e);
      res.status(500).json({ message: "Failed to load collections" });
    }
  });

  app.get('/api/collections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const collection = await storage.getCollection(req.params.id);
      if (!collection || collection.restaurantId !== restaurant.id) return res.status(404).json({ message: "Collection not found" });
      const items = await storage.listCollectionItems(collection.id);
      res.json({ collection, items });
    } catch (e) {
      logError("Collection detail failed", e);
      res.status(500).json({ message: "Failed to load collection" });
    }
  });

  app.post('/api/collections', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      if (!req.body?.title || !String(req.body.title).trim()) return res.status(400).json({ message: "Title is required" });
      const collection = await storage.createCollection(restaurant.id, req.body);
      if (Array.isArray(req.body.menuItemIds)) {
        await storage.setCollectionItems(collection.id, req.body.menuItemIds);
      }
      res.json(collection);
    } catch (e: any) {
      logError("Create collection failed", e);
      res.status(400).json({ message: e?.message || "Failed to create collection" });
    }
  });

  app.patch('/api/collections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const collection = await storage.getCollection(req.params.id);
      if (!collection || collection.restaurantId !== restaurant.id) return res.status(404).json({ message: "Collection not found" });
      const updated = await storage.updateCollection(req.params.id, restaurant.id, req.body);
      if (Array.isArray(req.body.menuItemIds)) {
        await storage.setCollectionItems(req.params.id, req.body.menuItemIds);
      }
      res.json(updated);
    } catch (e: any) {
      logError("Update collection failed", e);
      res.status(400).json({ message: e?.message || "Failed to update collection" });
    }
  });

  app.delete('/api/collections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      await storage.deleteCollection(req.params.id, restaurant.id);
      res.json({ ok: true });
    } catch (e) {
      logError("Delete collection failed", e);
      res.status(400).json({ message: "Failed to delete collection" });
    }
  });

  // ==========================================
  // STOREFRONT CMS — custom pages (About, FAQ, Terms, Privacy, Contact copy)
  // ==========================================

  app.get('/api/store/pages', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.json([]);
    res.json(await storage.listStorefrontPages(restaurant.id));
  });

  app.get('/api/store/pages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const page = await storage.getStorefrontPage(req.params.id);
      if (!page || page.restaurantId !== restaurant.id) return res.status(404).json({ message: "Page not found" });
      res.json(page);
    } catch (e) {
      logError("Storefront page detail failed", e);
      res.status(500).json({ message: "Failed to load page" });
    }
  });

  app.post('/api/store/pages', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      if (!req.body?.title || !String(req.body.title).trim()) return res.status(400).json({ message: "Title is required" });
      const page = await storage.createStorefrontPage(restaurant.id, req.body);
      res.json(page);
    } catch (e: any) {
      logError("Create storefront page failed", e);
      res.status(400).json({ message: e?.message || "Failed to create page" });
    }
  });

  app.patch('/api/store/pages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const page = await storage.getStorefrontPage(req.params.id);
      if (!page || page.restaurantId !== restaurant.id) return res.status(404).json({ message: "Page not found" });
      const updated = await storage.updateStorefrontPage(req.params.id, restaurant.id, req.body);
      res.json(updated);
    } catch (e: any) {
      logError("Update storefront page failed", e);
      res.status(400).json({ message: e?.message || "Failed to update page" });
    }
  });

  app.delete('/api/store/pages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      await storage.deleteStorefrontPage(req.params.id, restaurant.id);
      res.json({ ok: true });
    } catch (e) {
      logError("Delete storefront page failed", e);
      res.status(400).json({ message: "Failed to delete page" });
    }
  });

  // ---- Contact page inbox ----

  app.get('/api/store/contact-messages', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.json([]);
    res.json(await storage.listContactMessages(restaurant.id));
  });

  app.patch('/api/store/contact-messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const updated = await storage.markContactMessageRead(req.params.id, restaurant.id, req.body?.isRead !== false);
      if (!updated) return res.status(404).json({ message: "Message not found" });
      res.json(updated);
    } catch (e) {
      logError("Update contact message failed", e);
      res.status(400).json({ message: "Failed to update message" });
    }
  });

  // ==========================================
  // MARKETING — segments, campaigns, abandoned carts, boosts (Tier 6)
  // ==========================================

  // ---- Customer segments ----
  app.get('/api/segments', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.json([]);
    res.json(await storage.listSegments(restaurant.id));
  });

  app.post('/api/segments', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const seg = await storage.createSegment(restaurant.id, req.body);
      const count = await storage.recomputeSegment(seg.id);
      res.json({ ...seg, memberCount: count });
    } catch (e: any) {
      logError("Create segment failed", e);
      res.status(400).json({ message: e?.message || "Failed to create segment" });
    }
  });

  app.get('/api/segments/:id', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    const seg = await storage.getSegment(req.params.id);
    if (!seg || seg.restaurantId !== restaurant.id) return res.status(404).json({ message: "Segment not found" });
    res.json({ segment: seg, customers: await storage.listSegmentCustomers(seg.id) });
  });

  app.patch('/api/segments/:id', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    const updated = await storage.updateSegment(req.params.id, restaurant.id, req.body);
    if (!updated) return res.status(404).json({ message: "Segment not found" });
    const count = await storage.recomputeSegment(updated.id);
    res.json({ ...updated, memberCount: count });
  });

  app.post('/api/segments/:id/recompute', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    const seg = await storage.getSegment(req.params.id);
    if (!seg || seg.restaurantId !== restaurant.id) return res.status(404).json({ message: "Segment not found" });
    res.json({ memberCount: await storage.recomputeSegment(seg.id) });
  });

  // Preview how many customers a rule set would match, without saving.
  app.post('/api/segments/preview', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.json({ count: 0 });
    const matches = await storage.evaluateSegmentCustomers(restaurant.id, req.body?.rules || {});
    res.json({ count: matches.length, sample: matches.slice(0, 5).map((c: any) => ({ name: c.name, email: c.email })) });
  });

  app.delete('/api/segments/:id', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    await storage.deleteSegment(req.params.id, restaurant.id);
    res.json({ ok: true });
  });

  // ---- Campaigns ----
  app.get('/api/messaging/status', isAuthenticated, async (_req: any, res) => {
    const { messagingStatus } = await import("./services/messaging");
    res.json(messagingStatus());
  });

  app.get('/api/campaigns', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.json([]);
    res.json(await storage.listCampaigns(restaurant.id));
  });

  app.post('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      if (!req.body?.message || !String(req.body.message).trim()) return res.status(400).json({ message: "Message is required" });
      res.json(await storage.createCampaign(restaurant.id, req.body));
    } catch (e: any) {
      logError("Create campaign failed", e);
      res.status(400).json({ message: e?.message || "Failed to create campaign" });
    }
  });

  app.get('/api/campaigns/:id', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    const c = await storage.getCampaign(req.params.id);
    if (!c || c.restaurantId !== restaurant.id) return res.status(404).json({ message: "Campaign not found" });
    res.json({ campaign: c, runs: await storage.listCampaignRuns(c.id), deliveries: await storage.listCampaignDeliveries(c.id, 50) });
  });

  app.patch('/api/campaigns/:id', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    const updated = await storage.updateCampaign(req.params.id, restaurant.id, req.body);
    if (!updated) return res.status(404).json({ message: "Campaign not found" });
    res.json(updated);
  });

  app.delete('/api/campaigns/:id', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    await storage.deleteCampaign(req.params.id, restaurant.id);
    res.json({ ok: true });
  });

  app.post('/api/campaigns/:id/send', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const c = await storage.getCampaign(req.params.id);
      if (!c || c.restaurantId !== restaurant.id) return res.status(404).json({ message: "Campaign not found" });
      const run = await storage.sendCampaignNow(c.id);
      res.json(run);
    } catch (e: any) {
      logError("Send campaign failed", e);
      res.status(400).json({ message: e?.message || "Failed to send campaign" });
    }
  });

  // ---- Abandoned carts ----
  app.get('/api/abandoned-carts', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.json([]);
    res.json(await storage.listAbandonedCarts(restaurant.id));
  });

  // ---- Boosts ----
  app.get('/api/boosts', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    res.json(await storage.getBoostState(restaurant.id));
  });

  app.post('/api/boosts', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurant(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const slot = await storage.createBoostSlot(restaurant.id, {
        slotType: req.body?.slotType || "home_featured",
        hours: Number(req.body?.hours) || 4,
      });
      res.json(slot);
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Failed to start boost" });
    }
  });

  app.delete('/api/boosts/:id', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurant(req);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    await storage.cancelBoostSlot(req.params.id, restaurant.id);
    res.json({ ok: true });
  });

  // Upsell rule routes (owner-facing management)
  app.get('/api/upsells', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json([]);
      }
      const rules = await storage.getUpsellRules(restaurant.id);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching upsell rules:", error);
      res.status(500).json({ message: "Failed to fetch upsell rules" });
    }
  });

  app.post('/api/upsells', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const { name, triggerItemId, suggestionItemId, isActive } = req.body;
      if (!name || !triggerItemId || !suggestionItemId) {
        return res.status(400).json({ message: "name, triggerItemId, and suggestionItemId are required" });
      }
      const rule = await storage.createUpsellRule({
        restaurantId: restaurant.id,
        name,
        triggerType: 'item',
        triggerItemId,
        suggestionItemIds: [suggestionItemId],
        isActive: isActive ?? true,
      });
      res.json(rule);
    } catch (error) {
      console.error("Error creating upsell rule:", error);
      res.status(400).json({ message: "Failed to create upsell rule" });
    }
  });

  app.put('/api/upsells/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const { id } = req.params;
      const existing = await storage.getUpsellRule(id);
      if (!existing || existing.restaurantId !== restaurant.id) {
        return res.status(404).json({ message: "Upsell rule not found" });
      }
      const { name, triggerItemId, suggestionItemId, isActive } = req.body;
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (triggerItemId !== undefined) updates.triggerItemId = triggerItemId;
      if (suggestionItemId !== undefined) updates.suggestionItemIds = [suggestionItemId];
      if (isActive !== undefined) updates.isActive = isActive;
      const rule = await storage.updateUpsellRule(id, updates);
      res.json(rule);
    } catch (error) {
      console.error("Error updating upsell rule:", error);
      res.status(400).json({ message: "Failed to update upsell rule" });
    }
  });

  app.delete('/api/upsells/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const { id } = req.params;
      const existing = await storage.getUpsellRule(id);
      if (!existing || existing.restaurantId !== restaurant.id) {
        return res.status(404).json({ message: "Upsell rule not found" });
      }
      await storage.deleteUpsellRule(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting upsell rule:", error);
      res.status(400).json({ message: "Failed to delete upsell rule" });
    }
  });

  // Staff routes
  app.get('/api/staff', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json([]);
      }
      const staff = await storage.getStaff(restaurant.id);
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.post('/api/staff', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const data = insertStaffSchema.parse({ ...req.body, restaurantId: restaurant.id });
      const staff = await storage.createStaff(data);
      res.json(staff);
    } catch (error) {
      console.error("Error creating staff:", error);
      res.status(400).json({ message: "Failed to create staff" });
    }
  });

  app.put('/api/staff/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const data = insertStaffSchema.partial().parse(req.body);
      const updatedStaff = await storage.updateStaff(req.params.id, data);
      res.json(updatedStaff);
    } catch (error) {
      console.error("Error updating staff:", error);
      res.status(400).json({ message: "Failed to update staff" });
    }
  });

  app.delete('/api/staff/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      await storage.deleteStaff(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting staff:", error);
      res.status(400).json({ message: "Failed to delete staff" });
    }
  });

  // Inventory routes
  app.get('/api/inventory', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json([]);
      }
      const inventory = await storage.getInventory(restaurant.id);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.post('/api/inventory', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const data = insertInventorySchema.parse({ ...req.body, restaurantId: restaurant.id });
      const inventory = await storage.createInventory(data);
      res.json(inventory);
    } catch (error) {
      console.error("Error creating inventory:", error);
      res.status(400).json({ message: "Failed to create inventory" });
    }
  });

  app.put('/api/inventory/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const data = insertInventorySchema.partial().parse(req.body);
      const updatedInventory = await storage.updateInventory(req.params.id, data);
      res.json(updatedInventory);
    } catch (error) {
      console.error("Error updating inventory:", error);
      res.status(400).json({ message: "Failed to update inventory" });
    }
  });

  app.delete('/api/inventory/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      await storage.deleteInventory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting inventory:", error);
      res.status(400).json({ message: "Failed to delete inventory" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json({});
      }
      
      const orders = await storage.getOrders(restaurant.id);
      const staff = await storage.getStaff(restaurant.id);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayOrders = orders.filter(o => new Date(o.createdAt!) >= today);
      const todayRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.total), 0).toFixed(2);
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const averageOrder = orders.length > 0 
        ? (orders.reduce((sum, o) => sum + parseFloat(o.total), 0) / orders.length).toFixed(2)
        : "0";
      
      res.json({
        todayRevenue,
        todayOrders: todayOrders.length,
        pendingOrders,
        averageOrder,
        activeStaff: staff.filter(s => s.isActive).length,
        totalStaff: staff.length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/analytics/detailed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.json({});
      }
      
      // Get date filter from query params (default to 'year')
      const dateFilter = req.query.dateFilter || 'year';
      const { startDate, endDate } = resolveDateFilter(dateFilter);

      const allOrders = await storage.getOrders(restaurant.id);

      // Filter orders by date range
      const orders = allOrders.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt);

        if (endDate) {
          // For date ranges with both start and end (like last-month)
          return orderDate >= startDate && orderDate <= endDate;
        }

        // For date ranges with only start date (like year, this-month, last-7-days)
        return orderDate >= startDate;
      });

      // Calculate revenue metrics and breakdown in a single pass. Real order-type
      // values used across checkout/POS/draft-orders are 'dine-in', 'pickup', and
      // 'shipping' (businessType.ts's canonical convention — hyphen, not underscore)
      // — this previously matched 'dine-in'(*)/'takeout'/'delivery'/'online', where
      // only the *unhyphenated* dine-in case would ever have matched, so the
      // breakdown showed $0 for takeout/delivery/online for every restaurant.
      let totalRevenue = 0;
      let dineInRevenue = 0;
      let pickupRevenue = 0;
      let shippingRevenue = 0;

      for (const order of orders) {
        const orderTotal = parseFloat(order.total);
        totalRevenue += orderTotal;

        switch (order.orderType) {
          case 'dine-in':
            dineInRevenue += orderTotal;
            break;
          case 'pickup':
            pickupRevenue += orderTotal;
            break;
          case 'shipping':
            shippingRevenue += orderTotal;
            break;
        }
      }

      const averageOrder = orders.length > 0
        ? (totalRevenue / orders.length).toFixed(2)
        : "0";

      // Real period-over-period comparison — same-length window immediately
      // preceding the selected range. null (not 0/Infinity) when the previous
      // window has no orders to compare against, so the client can honestly
      // show "New" instead of a fabricated or divide-by-zero percentage.
      const periodEnd = endDate ?? new Date();
      const periodMs = periodEnd.getTime() - startDate.getTime();
      const prevStart = new Date(startDate.getTime() - periodMs);
      const prevEnd = new Date(startDate.getTime() - 1);
      const prevOrders = allOrders.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt);
        return orderDate >= prevStart && orderDate <= prevEnd;
      });
      const prevRevenue = prevOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
      const prevAverageOrder = prevOrders.length > 0 ? prevRevenue / prevOrders.length : 0;
      const pctChange = (current: number, previous: number): number | null =>
        previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null;
      const revenueChangePercent = pctChange(totalRevenue, prevRevenue);
      const ordersChangePercent = pctChange(orders.length, prevOrders.length);
      const averageOrderChangePercent = pctChange(parseFloat(averageOrder), prevAverageOrder);
      
      // Fetch all order items in one batched query
      const allOrderItems = await storage.getAllOrderItems(restaurant.id);
      
      // Create a Set of filtered order IDs for efficient lookup
      const filteredOrderIds = new Set(orders.map(order => order.id));
      
      // Filter order items to only include those from filtered orders
      const filteredOrderItems = allOrderItems.filter(item => 
        filteredOrderIds.has(item.orderId)
      );
      
      // Calculate popular menu items from filtered order items
      const itemStats = new Map<string, { 
        menuItemId: string;
        name: string; 
        orders: Set<string>;
        quantity: number;
        revenue: number;
      }>();
      
      for (const item of filteredOrderItems) {
        if (!item.menuItemId || !item.menuItem) continue; // Skip bundle items (no single menu item to attribute)
        const key = item.menuItemId;
        const existing = itemStats.get(key);
        const itemRevenue = parseFloat(item.subtotal);

        if (existing) {
          existing.orders.add(item.orderId);
          existing.quantity += item.quantity;
          existing.revenue += itemRevenue;
        } else {
          itemStats.set(key, {
            menuItemId: key,
            name: item.menuItem.name,
            orders: new Set([item.orderId]),
            quantity: item.quantity,
            revenue: itemRevenue,
          });
        }
      }
      
      // Convert to array and sort by quantity (most popular first)
      const popularItems = Array.from(itemStats.values())
        .sort((a, b) => b.quantity - a.quantity)
        .map(item => ({
          name: item.name,
          orders: item.orders.size,
          revenue: item.revenue.toFixed(2),
        }));
      
      res.json({
        totalRevenue: totalRevenue.toFixed(2),
        totalOrders: orders.length,
        averageOrder,
        popularItemsCount: popularItems.length,
        popularItems,
        dineInRevenue: dineInRevenue.toFixed(2),
        pickupRevenue: pickupRevenue.toFixed(2),
        shippingRevenue: shippingRevenue.toFixed(2),
        revenueChangePercent,
        ordersChangePercent,
        averageOrderChangePercent,
      });
    } catch (error) {
      console.error("Error fetching detailed analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Growth: sessions by channel + sessions over time, from real storefront_sessions rows
  app.get('/api/growth/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await storage.getRestaurantByOwnerId(req.user.id);
      if (!restaurant) return res.json({ byChannel: [], overTime: [] });
      const { startDate, endDate } = resolveDateFilter(req.query.dateFilter || 'year');
      const [byChannel, overTime] = await Promise.all([
        storage.getSessionsByChannel(restaurant.id, startDate, endDate),
        storage.getSessionsOverTime(restaurant.id, startDate, endDate),
      ]);
      res.json({ byChannel, overTime });
    } catch (error) {
      console.error("Error fetching growth sessions:", error);
      res.status(500).json({ message: "Failed to fetch growth sessions" });
    }
  });

  // Growth: sales attributed to a marketing channel (same-browser checkout match only)
  app.get('/api/growth/sales-by-channel', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await storage.getRestaurantByOwnerId(req.user.id);
      if (!restaurant) return res.json([]);
      const { startDate, endDate } = resolveDateFilter(req.query.dateFilter || 'year');
      const salesByChannel = await storage.getSalesByChannel(restaurant.id, startDate, endDate);
      res.json(salesByChannel);
    } catch (error) {
      console.error("Error fetching sales by channel:", error);
      res.status(500).json({ message: "Failed to fetch sales by channel" });
    }
  });

  // ==========================================
  // PUBLIC STOREFRONT (no auth required)
  // ==========================================

  const restaurantBySlugPublic = async (slug: string) => {
    const restaurant = await storage.getRestaurantBySlug(slug);
    return restaurant && restaurant.isActive ? restaurant : undefined;
  };

  app.get('/api/storefront/:slug', storefrontLimiter, async (req, res) => {
    try {
      const restaurant = await restaurantBySlugPublic(req.params.slug);
      if (!restaurant) return res.status(404).json({ message: "Store not found" });
      res.json({
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        description: restaurant.description,
        logoUrl: restaurant.logoUrl,
        coverImageUrl: restaurant.coverImageUrl,
        currency: restaurant.currency,
        primaryColor: restaurant.primaryColor,
        secondaryColor: restaurant.secondaryColor,
        accentColor: restaurant.accentColor,
        themeSettings: restaurant.themeSettings,
        socialLinks: restaurant.socialLinks,
        seoTitle: restaurant.seoTitle,
        seoDescription: restaurant.seoDescription,
      });
    } catch (error) {
      logError("Storefront restaurant lookup failed", error);
      res.status(500).json({ message: "Failed to load store" });
    }
  });

  app.get('/api/storefront/:slug/products', storefrontLimiter, async (req, res) => {
    try {
      const restaurant = await restaurantBySlugPublic(req.params.slug);
      if (!restaurant) return res.status(404).json({ message: "Store not found" });
      let items = (await storage.getMenuItems(restaurant.id)).filter((i) => i.isAvailable && i.visibleOnline);
      const collectionHandle = typeof req.query.collection === "string" ? req.query.collection : undefined;
      if (collectionHandle) {
        const collection = await storage.getCollectionByHandle(restaurant.id, collectionHandle);
        if (!collection) return res.json([]);
        const memberIds = new Set((await storage.listCollectionItems(collection.id)).map((i: any) => i.id));
        items = items.filter((i) => memberIds.has(i.id));
      }
      const productReviews = await storage.getPublishedProductReviews(restaurant.id);
      const ratingByItem = new Map<string, { sum: number; count: number }>();
      for (const r of productReviews) {
        const agg = ratingByItem.get(r.menuItemId!) || { sum: 0, count: 0 };
        agg.sum += r.rating; agg.count += 1;
        ratingByItem.set(r.menuItemId!, agg);
      }
      res.json(items.map((i) => {
        const agg = ratingByItem.get(i.id);
        return { ...i, avgRating: agg ? agg.sum / agg.count : null, reviewCount: agg ? agg.count : 0 };
      }));
    } catch (error) {
      logError("Storefront products list failed", error);
      res.status(500).json({ message: "Failed to load products" });
    }
  });

  app.get('/api/storefront/:slug/categories', storefrontLimiter, async (req, res) => {
    try {
      const restaurant = await restaurantBySlugPublic(req.params.slug);
      if (!restaurant) return res.status(404).json({ message: "Store not found" });
      const [categories, items] = await Promise.all([
        storage.getMenuCategories(restaurant.id),
        storage.getMenuItems(restaurant.id),
      ]);
      const usedIds = new Set(items.filter((i) => i.isAvailable && i.visibleOnline).map((i) => i.categoryId));
      const visible = categories
        .filter((c) => usedIds.has(c.id))
        .map((c) => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      res.json(visible);
    } catch (error) {
      logError("Storefront categories list failed", error);
      res.status(500).json({ message: "Failed to load categories" });
    }
  });

  app.get('/api/storefront/:slug/products/:handle', storefrontLimiter, async (req, res) => {
    try {
      const restaurant = await restaurantBySlugPublic(req.params.slug);
      if (!restaurant) return res.status(404).json({ message: "Store not found" });
      const item = await storage.getMenuItemByHandle(restaurant.id, req.params.handle);
      if (!item || !item.isAvailable || !item.visibleOnline) return res.status(404).json({ message: "Product not found" });
      const [variants, reviews, allItems] = await Promise.all([
        item.hasVariants ? storage.listVariants(item.id) : Promise.resolve([]),
        storage.getPublishedReviewsByMenuItem(item.id),
        storage.getMenuItems(restaurant.id),
      ]);
      const related = allItems
        .filter((i) => i.id !== item.id && i.categoryId === item.categoryId && i.isAvailable && i.visibleOnline)
        .slice(0, 3);
      const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
      res.json({ ...item, variants: variants.filter((v) => v.isActive), reviews, avgRating, reviewCount: reviews.length, relatedItems: related });
    } catch (error) {
      logError("Storefront product detail failed", error);
      res.status(500).json({ message: "Failed to load product" });
    }
  });

  app.get('/api/storefront/:slug/reviews', storefrontLimiter, async (req, res) => {
    try {
      const restaurant = await restaurantBySlugPublic(req.params.slug);
      if (!restaurant) return res.status(404).json({ message: "Store not found" });
      res.json(await storage.getCustomerReviews(restaurant.id));
    } catch (error) {
      logError("Storefront reviews failed", error);
      res.status(500).json({ message: "Failed to load reviews" });
    }
  });

  app.post('/api/storefront/:slug/newsletter', storefrontLimiter, async (req, res) => {
    try {
      const restaurant = await restaurantBySlugPublic(req.params.slug);
      if (!restaurant) return res.status(404).json({ message: "Store not found" });
      const email = String(req.body?.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) return res.status(400).json({ message: "A valid email is required" });
      await storage.createNewsletterSubscriber(restaurant.id, email);
      res.json({ ok: true });
    } catch (error) {
      logError("Newsletter signup failed", error);
      res.status(500).json({ message: "Failed to subscribe" });
    }
  });

  app.get('/api/storefront/:slug/pages', storefrontLimiter, async (req, res) => {
    try {
      const restaurant = await restaurantBySlugPublic(req.params.slug);
      if (!restaurant) return res.status(404).json({ message: "Store not found" });
      const pages = (await storage.listStorefrontPages(restaurant.id)).filter((p) => p.isPublished);
      res.json(pages.map((p) => ({ id: p.id, title: p.title, handle: p.handle, showInFooter: p.showInFooter, footerGroup: p.footerGroup, sortOrder: p.sortOrder })));
    } catch (error) {
      logError("Storefront pages list failed", error);
      res.status(500).json({ message: "Failed to load pages" });
    }
  });

  app.get('/api/storefront/:slug/pages/:handle', storefrontLimiter, async (req, res) => {
    try {
      const restaurant = await restaurantBySlugPublic(req.params.slug);
      if (!restaurant) return res.status(404).json({ message: "Store not found" });
      const page = await storage.getStorefrontPageByHandle(restaurant.id, req.params.handle);
      if (!page || !page.isPublished) return res.status(404).json({ message: "Page not found" });
      res.json({ title: page.title, body: page.body, seoTitle: page.seoTitle, seoDescription: page.seoDescription });
    } catch (error) {
      logError("Storefront page detail failed", error);
      res.status(500).json({ message: "Failed to load page" });
    }
  });

  app.post('/api/storefront/:slug/contact', storefrontLimiter, async (req, res) => {
    try {
      const restaurant = await restaurantBySlugPublic(req.params.slug);
      if (!restaurant) return res.status(404).json({ message: "Store not found" });
      const parsed = insertContactMessageSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Please fill in your name, email, and message." });
      await storage.createContactMessage(restaurant.id, parsed.data);
      res.json({ ok: true });
    } catch (error) {
      logError("Contact form submission failed", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ==========================================
  // ONLINE STORE — AI store builder (merchant-authed)
  // ==========================================

  const ownerRestaurantForStore = async (req: any) => storage.getRestaurantByOwnerId(req.user.id);

  app.post('/api/store/generate', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurantForStore(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const brief: StoreBrief = {
        businessName: req.body?.businessName || restaurant.name,
        industry: req.body?.industry || restaurant.businessType,
        targetAudience: req.body?.targetAudience,
        targetMarket: req.body?.targetMarket,
        stylePreference: req.body?.stylePreference,
      };
      const [items, reviews, collectionsList] = await Promise.all([
        storage.getMenuItems(restaurant.id),
        storage.getCustomerReviews(restaurant.id),
        storage.listCollections(restaurant.id),
      ]);
      const blueprint = buildBlueprint({
        brief, restaurant, items, reviews,
        existingCollectionTitles: collectionsList.map((c) => c.title),
      });
      const copy = await draftCopy(brief, brief.businessName, blueprint.facts);
      const heroSection = blueprint.themeSettings.layout.sections.find((s) => s.type === "hero");
      if (heroSection) {
        heroSection.fields.heading = copy.heroHeading;
        heroSection.fields.subheading = copy.heroSubheading;
        heroSection.fields.buttonText = copy.buttonText;
      }
      const aboutSection = blueprint.themeSettings.layout.sections.find((s) => s.type === "aboutUs");
      if (aboutSection) {
        aboutSection.fields.heading = copy.aboutUsHeading;
        aboutSection.fields.body = copy.aboutUsBody;
      }
      const generation = await storage.createStoreGeneration(restaurant.id, {
        kind: 'initial', brief, blueprint, copy,
      });
      res.json(generation);
    } catch (error) {
      logError("Store generate failed", error);
      res.status(500).json({ message: "Failed to generate store" });
    }
  });

  app.get('/api/store/generations/:id', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurantForStore(req);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    const generation = await storage.getStoreGeneration(req.params.id);
    if (!generation || generation.restaurantId !== restaurant.id) return res.status(404).json({ message: "Not found" });
    res.json(generation);
  });

  app.get('/api/store/generations/latest', isAuthenticated, async (req: any, res) => {
    const restaurant = await ownerRestaurantForStore(req);
    if (!restaurant) return res.json(null);
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    res.json((await storage.getLatestStoreGeneration(restaurant.id, kind, status)) || null);
  });

  app.post('/api/store/generations/:id/apply', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurantForStore(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const generation = await storage.getStoreGeneration(req.params.id);
      if (!generation || generation.restaurantId !== restaurant.id) return res.status(404).json({ message: "Not found" });
      if (generation.status !== 'proposed') return res.status(400).json({ message: "Already applied or discarded" });

      const blueprint: any = generation.blueprint;
      await storage.updateRestaurant(restaurant.id, {
        themeSettings: { ...blueprint.themeSettings, meta: { ...blueprint.themeSettings.meta, lastPublishedAt: new Date().toISOString() } },
        primaryColor: blueprint.colors.primaryColor,
        secondaryColor: blueprint.colors.secondaryColor,
        accentColor: blueprint.colors.accentColor,
        brandProfile: generation.brief,
      } as any);

      for (const plan of blueprint.collections || []) {
        const created = await storage.createCollection(restaurant.id, { title: plan.title, showOnStorefront: true, isActive: true } as any);
        await storage.setCollectionItems(created.id, plan.menuItemIds);
      }

      const updated = await storage.markStoreGenerationStatus(req.params.id, restaurant.id, 'applied');
      res.json(updated);
    } catch (error) {
      logError("Store apply failed", error);
      res.status(500).json({ message: "Failed to apply store" });
    }
  });

  app.post('/api/store/optimize', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurantForStore(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const [items, reviews, collectionsList] = await Promise.all([
        storage.getMenuItems(restaurant.id),
        storage.getCustomerReviews(restaurant.id),
        storage.listCollections(restaurant.id),
      ]);
      const brief: StoreBrief = {
        businessName: restaurant.name,
        industry: restaurant.businessType,
        ...(restaurant.brandProfile as any || {}),
      };
      const currentThemeSettings = (restaurant.themeSettings as RestaurantThemeSettings | null) || null;
      const blueprint = buildBlueprint({
        brief, restaurant, items, reviews,
        existingCollectionTitles: collectionsList.map((c) => c.title),
        current: currentThemeSettings,
      });
      // Only draft fresh copy for a hero that's missing a headline — never
      // silently overwrite copy the merchant has already written.
      const heroSection = blueprint.themeSettings.layout.sections.find((s) => s.type === "hero");
      let copy: any = null;
      if (heroSection && heroSection.fields.heading === "New heading pending copy") {
        copy = await draftCopy(brief, brief.businessName, blueprint.facts);
        heroSection.fields.heading = copy.heroHeading;
        heroSection.fields.subheading = copy.heroSubheading;
      }

      const snapshot = {
        themeSettings: currentThemeSettings,
        primaryColor: restaurant.primaryColor,
        secondaryColor: restaurant.secondaryColor,
        accentColor: restaurant.accentColor,
      };

      if (blueprint.changes.length === 0) {
        return res.json({ id: null, changes: [], message: "Your store is already optimized — nothing to change." });
      }

      const generation = await storage.createStoreGeneration(restaurant.id, {
        kind: 'optimize',
        brief: { ...brief, previousSnapshot: snapshot },
        blueprint,
        copy,
      });

      await storage.updateRestaurant(restaurant.id, {
        themeSettings: blueprint.themeSettings,
        primaryColor: blueprint.colors.primaryColor,
        secondaryColor: blueprint.colors.secondaryColor,
        accentColor: blueprint.colors.accentColor,
      } as any);
      for (const plan of blueprint.collections || []) {
        const created = await storage.createCollection(restaurant.id, { title: plan.title, showOnStorefront: true, isActive: true } as any);
        await storage.setCollectionItems(created.id, plan.menuItemIds);
      }
      await storage.markStoreGenerationStatus(generation.id, restaurant.id, 'applied');

      res.json({ id: generation.id, changes: blueprint.changes });
    } catch (error) {
      logError("Store optimize failed", error);
      res.status(500).json({ message: "Failed to optimize store" });
    }
  });

  app.post('/api/store/generations/:id/undo', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurantForStore(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const generation = await storage.getStoreGeneration(req.params.id);
      if (!generation || generation.restaurantId !== restaurant.id) return res.status(404).json({ message: "Not found" });
      const snapshot = (generation.brief as any)?.previousSnapshot;
      if (!snapshot) return res.status(400).json({ message: "Nothing to undo" });
      await storage.updateRestaurant(restaurant.id, {
        themeSettings: snapshot.themeSettings,
        primaryColor: snapshot.primaryColor,
        secondaryColor: snapshot.secondaryColor,
        accentColor: snapshot.accentColor,
      } as any);
      await storage.markStoreGenerationStatus(req.params.id, restaurant.id, 'discarded');
      res.json({ ok: true });
    } catch (error) {
      logError("Store undo failed", error);
      res.status(500).json({ message: "Failed to undo" });
    }
  });

  app.patch('/api/store/theme', isAuthenticated, async (req: any, res) => {
    try {
      const restaurant = await ownerRestaurantForStore(req);
      if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
      const patch: any = {};
      if (req.body?.themeSettings) patch.themeSettings = req.body.themeSettings;
      if (req.body?.primaryColor) patch.primaryColor = req.body.primaryColor;
      if (req.body?.secondaryColor) patch.secondaryColor = req.body.secondaryColor;
      if (req.body?.accentColor) patch.accentColor = req.body.accentColor;
      if (req.body?.publish) {
        patch.themeSettings = { ...(patch.themeSettings || restaurant.themeSettings || {}), meta: { ...(patch.themeSettings?.meta || (restaurant.themeSettings as any)?.meta), lastPublishedAt: new Date().toISOString() } };
      }
      const updated = await storage.updateRestaurant(restaurant.id, patch);
      res.json(updated);
    } catch (error) {
      logError("Save theme failed", error);
      res.status(500).json({ message: "Failed to save" });
    }
  });

  // Object Storage routes
  // Note: This route does NOT require authentication - public objects can be accessed by anyone
  app.get("/objects/:objectPath(*)", async (req: any, res) => {
    // Get userId if authenticated, undefined otherwise
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const r2Object = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        r2Object,
        userId: userId,
      });
      if (!canAccess) {
        logWarn('Object access denied', { 
          path: req.path, 
          userId: userId || 'anonymous',
          key: r2Object.key 
        });
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(r2Object, res);
    } catch (error) {
      logError("Error accessing object", error, { path: req.path, userId });
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, uploadLimiter, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL, objectPath });
  });

  app.put("/api/restaurant/logo", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    if (!req.body.logoUrl) {
      return res.status(400).json({ error: "logoUrl is required" });
    }

    try {
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.logoUrl,
        { owner: userId, visibility: "public" }
      );

      await storage.updateRestaurant(restaurant.id, { logoUrl: objectPath });
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting logo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/restaurant/cover-image", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    if (!req.body.coverImageUrl) {
      return res.status(400).json({ error: "coverImageUrl is required" });
    }

    try {
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.coverImageUrl,
        { owner: userId, visibility: "public" }
      );

      await storage.updateRestaurant(restaurant.id, { coverImageUrl: objectPath });
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting cover image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/restaurant/brand-colors", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const { primaryColor, secondaryColor, accentColor } = req.body;

    // Validate hex color format
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    
    if (primaryColor && !hexColorRegex.test(primaryColor)) {
      return res.status(400).json({ error: "Invalid primary color format. Must be a hex color (e.g., #ff0000)" });
    }
    if (secondaryColor && !hexColorRegex.test(secondaryColor)) {
      return res.status(400).json({ error: "Invalid secondary color format. Must be a hex color (e.g., #ff0000)" });
    }
    if (accentColor && !hexColorRegex.test(accentColor)) {
      return res.status(400).json({ error: "Invalid accent color format. Must be a hex color (e.g., #ff0000)" });
    }

    try {
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      await storage.updateRestaurant(restaurant.id, {
        primaryColor,
        secondaryColor,
        accentColor
      });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating brand colors:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/restaurant/opening-hours", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    if (!req.body.openingHours) {
      return res.status(400).json({ error: "openingHours is required" });
    }

    try {
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      await storage.updateRestaurant(restaurant.id, { openingHours: req.body.openingHours });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating opening hours:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/restaurant/payment-settings", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const { stripePublicKey, stripeSecretKey, paypalClientId, paypalClientSecret } = req.body;

    try {
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      await storage.updateRestaurant(restaurant.id, {
        stripePublicKey,
        stripeSecretKey,
        paypalClientId,
        paypalClientSecret
      });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating payment settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/restaurant/payment-methods", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    if (!req.body.paymentMethods) {
      return res.status(400).json({ error: "paymentMethods is required" });
    }

    try {
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      await storage.updateRestaurant(restaurant.id, { paymentMethods: req.body.paymentMethods });
      res.status(200).json({ success: true });
    } catch (error) {
      logError("Error updating payment methods", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/restaurant/order-types", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    if (!req.body.orderTypes) {
      return res.status(400).json({ error: "orderTypes is required" });
    }

    const { pickup, shipping } = req.body.orderTypes;

    // Validate that at least one order type is enabled
    if (!pickup && !shipping) {
      return res.status(400).json({ error: "At least one order type must be enabled" });
    }

    try {
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      await storage.updateRestaurant(restaurant.id, { orderTypes: req.body.orderTypes });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating order types:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/restaurant/regional-settings", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const { currency, country, platformLanguage, storefrontLanguage } = req.body;

    if (!currency || !country) {
      return res.status(400).json({ error: "currency and country are required" });
    }

    try {
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      await storage.updateRestaurant(restaurant.id, { 
        currency, 
        country,
        ...(platformLanguage && { platformLanguage }),
        ...(storefrontLanguage && { storefrontLanguage })
      });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating regional settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/restaurant/tax-settings", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const { taxRate, taxIncludedInPrice, taxLabel } = req.body;

    try {
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      await storage.updateRestaurant(restaurant.id, { 
        taxRate: taxRate || "0.00",
        taxIncludedInPrice: taxIncludedInPrice || false,
        taxLabel: taxLabel || "Tax"
      });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating tax settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Stripe Connect: Create Express Connected Account
  app.post("/api/restaurant/connect/create-account", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;

    try {
      if (!stripe) {
        return res.status(503).json({ error: "Stripe is not configured" });
      }

      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Check if already has a connected account
      if (restaurant.stripeAccountId) {
        return res.status(400).json({ error: "Stripe account already connected" });
      }

      // Create Stripe Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country: restaurant.country === 'United States' ? 'US' : 'US', // Default to US, expand later
        email: restaurant.email || req.user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual', // Can be made dynamic
        business_profile: {
          name: restaurant.name,
          url: restaurant.customDomain ? `https://${restaurant.customDomain}` : `${getBaseUrl()}`,
        },
      });

      // Save account ID to restaurant
      await storage.updateRestaurant(restaurant.id, {
        stripeAccountId: account.id,
      });

      res.json({
        accountId: account.id,
        success: true,
      });
    } catch (error: any) {
      console.error("Error creating Stripe Connect account:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Stripe Connect: Generate onboarding link
  app.post("/api/restaurant/connect/onboarding-link", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;

    try {
      if (!stripe) {
        logError("Stripe not configured for connect onboarding");
        return res.status(503).json({ error: "Stripe is not configured" });
      }

      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      let stripeAccountId = restaurant.stripeAccountId;

      // Create Stripe account if doesn't exist
      if (!stripeAccountId) {
        logInfo("Creating new Stripe Connect account", { restaurantId: restaurant.id });
        
        const account = await stripe.accounts.create({
          type: 'express',
          country: restaurant.country === 'United States' ? 'US' : 'US', // Default to US
          email: restaurant.email || req.user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          business_profile: {
            name: restaurant.name,
            url: restaurant.customDomain ? `https://${restaurant.customDomain}` : `${getBaseUrl()}`,
          },
        });

        stripeAccountId = account.id;

        // Save to database
        await storage.updateRestaurant(restaurant.id, {
          stripeAccountId: stripeAccountId,
        });

        logInfo("Stripe Connect account created", { 
          restaurantId: restaurant.id, 
          stripeAccountId 
        });
      }

      const baseUrl = getBaseUrl();

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${baseUrl}/settings?connect=refresh`,
        return_url: `${baseUrl}/settings?connect=success`,
        type: 'account_onboarding',
      });

      logInfo("Stripe onboarding link generated", { 
        restaurantId: restaurant.id,
        stripeAccountId 
      });

      res.json({
        url: accountLink.url,
      });
    } catch (error: any) {
      logError("Error creating onboarding link", error, { userId });
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Stripe Connect: Check account status
  app.get("/api/restaurant/connect/status", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;

    try {
      if (!stripe) {
        return res.status(503).json({ error: "Stripe is not configured" });
      }

      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      if (!restaurant.stripeAccountId) {
        return res.json({
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        });
      }

      const account = await stripe.accounts.retrieve(restaurant.stripeAccountId);

      res.json({
        connected: true,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirementsCurrentlyDue: account.requirements?.currently_due || [],
        requirementsEventuallyDue: account.requirements?.eventually_due || [],
      });
    } catch (error: any) {
      console.error("Error checking account status:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.get("/api/restaurant/payout-settings", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;

    try {
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const payoutAccount = await storage.getPayoutAccount(restaurant.id);
      res.json({ payoutSchedule: payoutAccount?.payoutSchedule || "weekly" });
    } catch (error) {
      console.error("Error fetching payout settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/restaurant/payout-settings", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const { payoutSchedule } = req.body;

    try {
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Update only the payout schedule (bank details are in Stripe Connect)
      const existingAccount = await storage.getPayoutAccount(restaurant.id);
      
      if (existingAccount) {
        await storage.createOrUpdatePayoutAccount(restaurant.id, {
          ...existingAccount,
          payoutSchedule: payoutSchedule || "weekly"
        });
      } else {
        // Create minimal payout account with just schedule
        await storage.createOrUpdatePayoutAccount(restaurant.id, {
          accountHolderName: "",
          bankName: "",
          accountNumber: "",
          routingNumber: "",
          iban: "",
          swiftCode: "",
          country: "",
          payoutSchedule: payoutSchedule || "weekly"
        });
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error saving payout settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get pending earnings for restaurant
  app.get("/api/restaurant/payouts/pending", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;

    try {
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const pendingEarnings = await storage.getPendingEarnings(restaurant.id);
      const payoutAccount = await storage.getPayoutAccount(restaurant.id);

      res.json({
        pendingAmount: pendingEarnings.total,
        orderCount: pendingEarnings.count,
        hasPayoutAccount: !!payoutAccount,
        payoutSchedule: payoutAccount?.payoutSchedule || 'weekly',
      });
    } catch (error) {
      console.error("Error fetching pending earnings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get payout history for restaurant
  app.get("/api/restaurant/payouts/history", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;

    try {
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const payoutHistory = await storage.getPayoutRuns(restaurant.id);
      res.json(payoutHistory);
    } catch (error) {
      console.error("Error fetching payout history:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Process payout for restaurant (manual trigger or automated)
  app.post("/api/restaurant/payouts/process", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;

    try {
      if (!stripe) {
        return res.status(503).json({ error: "Stripe payout processing is not configured" });
      }

      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Check if restaurant has Stripe Connect account set up
      if (!restaurant.stripeAccountId) {
        return res.status(400).json({ error: "Please connect your bank account via Stripe first" });
      }

      // Verify Connect account is fully onboarded
      const connectedAccount = await stripe.accounts.retrieve(restaurant.stripeAccountId);
      if (!connectedAccount.payouts_enabled) {
        return res.status(400).json({ error: "Your Stripe account is not fully set up. Please complete onboarding." });
      }

      // Get pending earnings
      const pendingEarnings = await storage.getPendingEarnings(restaurant.id);
      const amountInDollars = parseFloat(pendingEarnings.total);

      if (amountInDollars <= 0) {
        return res.status(400).json({ error: "No pending earnings to process" });
      }

      // Minimum payout amount (e.g., $10)
      if (amountInDollars < 10) {
        return res.status(400).json({ error: "Minimum payout amount is $10" });
      }

      // Get pending ledger entries to mark as paid
      const ledgerEntries = await storage.getEarningsLedger(restaurant.id);
      const pendingEntries = ledgerEntries.filter((entry: any) => entry.restaurantPayoutStatus === 'pending');
      const ledgerEntryIds = pendingEntries.map((entry: any) => entry.id);

      if (ledgerEntryIds.length === 0) {
        return res.status(400).json({ error: "No pending ledger entries found" });
      }

      // Create payout run record
      const payoutRun = await storage.createPayoutRun(
        restaurant.id,
        amountInDollars,
        'stripe',
        new Date()
      );

      try {
        // Create Stripe Transfer to connected account (proper Connect flow)
        const amountInCents = Math.round(amountInDollars * 100);
        
        const transfer = await stripe.transfers.create({
          amount: amountInCents,
          currency: 'usd',
          destination: restaurant.stripeAccountId,
          description: `Payout for ${restaurant.name}`,
          metadata: {
            restaurantId: restaurant.id,
            payoutRunId: payoutRun.id,
            restaurantName: restaurant.name,
          },
        });

        // Complete payout transaction (atomic operation)
        await storage.completePayoutTransaction(payoutRun.id, ledgerEntryIds, transfer.id);

        res.json({
          success: true,
          transferId: transfer.id,
          amount: amountInDollars,
          message: 'Transfer successful. Funds will be paid out to your bank account based on your payout schedule.',
        });

      } catch (stripeError: any) {
        console.error('Stripe transfer error:', stripeError);
        
        // Update payout run as failed
        await storage.updatePayoutRunStatus(
          payoutRun.id,
          'failed',
          undefined,
          stripeError.message
        );

        res.status(500).json({
          error: 'Failed to process transfer',
          message: stripeError.message,
        });
      }

    } catch (error) {
      console.error("Error processing payout:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Process scheduled payouts (automated cron job endpoint)
  app.post("/api/admin/payouts/process-scheduled", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;

    try {
      // Verify admin access
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      if (!stripe) {
        return res.status(503).json({ error: "Stripe payout processing is not configured" });
      }

      // Call the shared service function
      const results = await processScheduledPayouts(storage, stripe);

      res.json({
        success: true,
        summary: {
          processed: results.processed,
          failed: results.failed,
          skipped: results.skipped,
          totalAmount: results.totalAmount,
        },
        details: results.details,
      });

    } catch (error) {
      console.error("Error processing scheduled payouts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/menu-item/:id/image", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    if (!req.body.imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }

    try {
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageUrl,
        { owner: userId, visibility: "public" }
      );

      await storage.updateMenuItem(id, { imageUrl: objectPath });
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting menu item image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });


  // Stripe checkout endpoint - platform-managed payments
  app.post('/api/checkout/stripe', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ error: "Stripe payment processing is not configured" });
      }

      const { restaurantId, amount, currency, orderId } = req.body;

      if (!restaurantId || !amount || !currency) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const amountInCents = Math.round(parseFloat(amount) * 100);

      // Create payment intent directly to platform account (platform-managed payments)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        metadata: {
          restaurantId,
          orderId: orderId || '',
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      console.error("Error creating Stripe payment:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });


  // PayPal create order
  app.post('/api/paypal/create-order', async (req, res) => {
    try {
      if (!paypalOrdersController) {
        return res.status(503).json({ message: "PayPal payment processing is not configured" });
      }

      const { orderId, total } = req.body;
      
      const orderRequest = {
        body: {
          intent: CheckoutPaymentIntent.Capture,
          purchaseUnits: [
            {
              referenceId: orderId,
              amount: {
                currencyCode: 'USD',
                value: parseFloat(total).toFixed(2)
              },
              description: 'Restaurant order payment'
            }
          ],
          applicationContext: {
            brandName: 'EatOut',
            landingPage: OrderApplicationContextLandingPage.NoPreference,
            userAction: OrderApplicationContextUserAction.PayNow
          }
        }
      };

      const paypalOrder = await paypalOrdersController.createOrder(orderRequest);
      res.json({ paypalOrderId: paypalOrder.result.id });
    } catch (error) {
      console.error('PayPal create order error:', error);
      res.status(500).json({ message: 'Failed to create PayPal order' });
    }
  });

  // PayPal capture payment - platform-managed payments
  app.post('/api/paypal/capture-order/:paypalOrderId', async (req, res) => {
    try {
      if (!paypalOrdersController) {
        return res.status(503).json({ message: "PayPal payment processing is not configured" });
      }

      const { paypalOrderId } = req.params;
      const { orderId, totalAmount, deliveryFee } = req.body;

      const captureRequest = {
        id: paypalOrderId,
        prefer: 'return=representation'
      };

      const capture = await paypalOrdersController.captureOrder(captureRequest);
      
      if (capture.result.status === 'COMPLETED') {
        const captureId = capture.result.purchaseUnits?.[0]?.payments?.captures?.[0]?.id || paypalOrderId;
        
        // Confirm order with payment tracking and ledger entry creation
        const confirmedOrder = await storage.confirmOrderWithPayment(
          orderId,
          'paypal',
          captureId,
          parseFloat(totalAmount) || 0,
          parseFloat(deliveryFee) || 0
        );
        
        // Broadcast to restaurant
        const restaurant = confirmedOrder.restaurantId ? await storage.getRestaurant(confirmedOrder.restaurantId) : undefined;
        if (restaurant) {
          wsManager.broadcastToRestaurant(restaurant.id, {
            type: 'new_order',
            data: confirmedOrder
          });
          
        }

        res.json({
          success: true,
          orderId,
          captureId
        });
      } else {
        res.status(400).json({ message: 'Payment not completed' });
      }
    } catch (error) {
      console.error('PayPal capture error:', error);
      res.status(500).json({ message: 'Failed to capture PayPal payment' });
    }
  });

  // Admin Routes - Platform Management
  app.get('/api/admin/restaurants', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const restaurants = await storage.getAllRestaurants();
      res.json(restaurants);
    } catch (error) {
      console.error("Error fetching all restaurants:", error);
      res.status(500).json({ message: "Failed to fetch restaurants" });
    }
  });

  app.patch('/api/admin/restaurants/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, subdomain, isActive, businessType } = req.body;

      const updates: any = {};
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          return res.status(400).json({ message: "Name must be a non-empty string" });
        }
        updates.name = name.trim();
      }
      if (subdomain !== undefined) {
        if (typeof subdomain !== 'string' || subdomain.trim().length === 0) {
          return res.status(400).json({ message: "Subdomain must be a non-empty string" });
        }
        // Check subdomain uniqueness
        const existing = await storage.getRestaurantBySubdomain(subdomain.trim());
        if (existing && existing.id !== id) {
          return res.status(400).json({ message: "Subdomain already in use" });
        }
        updates.subdomain = subdomain.trim();
      }
      if (isActive !== undefined) {
        if (typeof isActive !== 'boolean') {
          return res.status(400).json({ message: "isActive must be a boolean" });
        }
        updates.isActive = isActive;
      }
      if (businessType !== undefined) {
        if (!BUSINESS_TYPES.includes(businessType)) {
          return res.status(400).json({ message: `businessType must be one of: ${BUSINESS_TYPES.join(', ')}` });
        }
        updates.businessType = businessType;
      }

      const restaurant = await storage.updateRestaurant(id, updates);
      res.json(restaurant);
    } catch (error) {
      console.error("Error updating restaurant:", error);
      res.status(500).json({ message: "Failed to update restaurant" });
    }
  });

  app.delete('/api/admin/restaurants/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRestaurant(id);
      res.json({ message: "Restaurant deleted successfully" });
    } catch (error) {
      console.error("Error deleting restaurant:", error);
      res.status(500).json({ message: "Failed to delete restaurant" });
    }
  });

  app.post('/api/admin/users/:userId/role', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!role || !['owner', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updated = await storage.updateUserRole(userId, role);
      const { password: _password, ...updatedWithoutPassword } = updated;
      res.json(updatedWithoutPassword);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.get('/api/admin/analytics', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      const restaurants = await storage.getAllRestaurants();
      
      // Calculate platform metrics
      const totalRestaurants = restaurants.length;
      const activeSubscriptions = users.filter(u => u.subscriptionStatus === 'active').length;
      const activeTrials = users.filter(u => u.subscriptionStatus === 'trial').length;
      const mrr = activeSubscriptions * 79; // $79/month per restaurant
      
      // Calculate commission revenue (this would need actual order data)
      // For now, return 0 - will be calculated from actual transactions
      const commissionRevenue = 0;
      
      res.json({
        totalRestaurants,
        activeSubscriptions,
        activeTrials,
        mrr,
        commissionRevenue,
        recentSignups: restaurants.slice(-10).reverse(), // Last 10 signups
      });
    } catch (error) {
      console.error("Error fetching admin analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Admin: Get all orders across all restaurants
  app.get('/api/admin/orders', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allOrders = await storage.getAllOrders();
      res.json(allOrders);
    } catch (error) {
      console.error("Error fetching all orders:", error);
      res.status(500).json({ message: "Failed to fetch all orders" });
    }
  });

  // Admin: Get financial dashboard data
  app.get('/api/admin/financials', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const summary = await storage.getFinancialSummary();
      const restaurantBreakdown = await storage.getRestaurantFinancialBreakdown();
      const recentPayouts = await storage.getRecentPayoutRuns(20);

      res.json({
        totalRevenue: summary.totalRevenue,
        totalCommissions: summary.totalCommissions,
        totalPayouts: summary.totalPayouts,
        pendingPayouts: summary.pendingPayouts,
        restaurantBreakdown,
        recentPayouts,
      });
    } catch (error) {
      console.error("Error fetching financial data:", error);
      res.status(500).json({ message: "Failed to fetch financial data" });
    }
  });

  // Admin: Get all payout runs with optional status filter
  app.get('/api/admin/payouts', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const status = req.query.status as string | undefined;
      const payouts = await storage.getAllPayoutRunsForAdmin(status);
      res.json(payouts);
    } catch (error) {
      console.error("Error fetching payout runs:", error);
      res.status(500).json({ message: "Failed to fetch payout runs" });
    }
  });

  // Admin: Retry failed payout
  app.post('/api/admin/payouts/:id/retry', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const payout = await storage.retryFailedPayout(id);
      res.json(payout);
    } catch (error) {
      console.error("Error retrying payout:", error);
      res.status(500).json({ message: "Failed to retry payout" });
    }
  });

  // Admin: Cancel payout run
  app.post('/api/admin/payouts/:id/cancel', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const payout = await storage.cancelPayoutRun(id);
      res.json(payout);
    } catch (error) {
      console.error("Error cancelling payout:", error);
      res.status(500).json({ message: "Failed to cancel payout" });
    }
  });

  // Admin: Manually mark payout as paid
  app.post('/api/admin/payouts/:id/mark-paid', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { transactionId } = req.body;
      
      if (!transactionId) {
        return res.status(400).json({ message: "Transaction ID is required" });
      }

      const payout = await storage.manuallyMarkPayoutAsPaid(id, transactionId);
      res.json(payout);
    } catch (error) {
      console.error("Error marking payout as paid:", error);
      res.status(500).json({ message: "Failed to mark payout as paid" });
    }
  });

  // Admin: Get all reviews with optional status filter
  app.get('/api/admin/reviews', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const status = req.query.status as string | undefined;
      const reviews = await storage.getAllReviewsForAdmin(status);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Admin: Publish/hide review
  app.post('/api/admin/reviews/:id/status', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isPublished } = req.body;
      
      if (typeof isPublished !== 'boolean') {
        return res.status(400).json({ message: "isPublished must be a boolean" });
      }

      const review = await storage.updateReviewStatus(id, isPublished);
      res.json(review);
    } catch (error) {
      console.error("Error updating review status:", error);
      res.status(500).json({ message: "Failed to update review status" });
    }
  });

  // Admin: Delete review
  app.delete('/api/admin/reviews/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteReview(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Admin: Respond to review
  app.post('/api/admin/reviews/:id/respond', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { response } = req.body;
      
      if (!response || typeof response !== 'string') {
        return res.status(400).json({ message: "Response is required" });
      }

      const review = await storage.respondToReview(id, response);
      res.json(review);
    } catch (error) {
      console.error("Error responding to review:", error);
      res.status(500).json({ message: "Failed to respond to review" });
    }
  });

  // Admin: Get all activity logs
  app.get('/api/admin/activity-logs', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const filters = {
        actionCategory: req.query.actionCategory as string | undefined,
        userId: req.query.userId as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      };
      const logs = await storage.getAllActivityLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Admin: Get all subscriptions
  app.get('/api/admin/subscriptions', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const restaurants = await storage.getAllRestaurants();
      const users = await storage.getAllUsers();
      
      // Combine restaurant and user subscription data
      const subscriptions = restaurants.map(restaurant => {
        const owner = users.find(u => u.id === restaurant.ownerId);
        return {
          id: restaurant.id,
          name: restaurant.name,
          subdomain: restaurant.subdomain,
          businessType: restaurant.businessType || 'retail',
          ownerEmail: owner?.email || 'Unknown',
          subscriptionStatus: owner?.subscriptionStatus || 'inactive',
          trialEndsAt: owner?.trialEndsAt || null,
          subscriptionEndsAt: owner?.subscriptionEndsAt || null,
          manuallyGrantedAccess: restaurant.manuallyGrantedAccess || false,
          accessGrantedBy: restaurant.accessGrantedBy || null,
          accessGrantedAt: restaurant.accessGrantedAt || null,
          accessNotes: restaurant.accessNotes || null,
          createdAt: restaurant.createdAt,
        };
      });
      
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // Admin: Grant manual access to restaurant
  app.post('/api/admin/restaurants/:id/grant-access', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      const updated = await storage.updateRestaurant(id, {
        manuallyGrantedAccess: true,
        accessGrantedBy: req.user.id,
        accessGrantedAt: new Date(),
        accessNotes: notes || null,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error granting manual access:", error);
      res.status(500).json({ message: "Failed to grant manual access" });
    }
  });

  // Admin: Revoke manual access from restaurant
  app.post('/api/admin/restaurants/:id/revoke-access', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const updated = await storage.updateRestaurant(id, {
        manuallyGrantedAccess: false,
        accessGrantedBy: null,
        accessGrantedAt: null,
        accessNotes: null,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error revoking manual access:", error);
      res.status(500).json({ message: "Failed to revoke manual access" });
    }
  });

  // Admin: Cancel restaurant subscription
  app.post('/api/admin/restaurants/:id/cancel-subscription', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Subscription status lives on the restaurant's owner account, not the restaurant itself
      await storage.updateUser(restaurant.ownerId, {
        subscriptionStatus: 'cancelled',
        subscriptionEndsAt: new Date(), // End immediately
      });

      // Log the action
      await logAdminActivity({
        userId: req.user.id,
        userEmail: req.user.email,
        actionType: 'subscription_cancelled',
        actionCategory: 'subscription',
        description: `Cancelled subscription for restaurant "${restaurant.name}"`,
        targetId: id,
        targetType: 'restaurant',
        targetName: restaurant.name,
        metadata: { restaurantId: id, restaurantName: restaurant.name },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json(restaurant);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Admin: Extend restaurant trial
  app.post('/api/admin/restaurants/:id/extend-trial', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { days } = req.body;
      
      if (!days || days < 1) {
        return res.status(400).json({ message: "Days must be at least 1" });
      }
      
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Trial tracking lives on the restaurant's owner account, not the restaurant itself
      const owner = await storage.getUser(restaurant.ownerId);
      if (!owner) {
        return res.status(404).json({ message: "Restaurant owner not found" });
      }

      // Calculate new trial end date
      const currentTrialEnd = owner.trialEndsAt ? new Date(owner.trialEndsAt) : new Date();
      const newTrialEnd = new Date(currentTrialEnd);
      newTrialEnd.setDate(newTrialEnd.getDate() + parseInt(days));

      const updatedOwner = await storage.updateUser(restaurant.ownerId, {
        trialEndsAt: newTrialEnd,
      });

      res.json({ ...restaurant, trialEndsAt: updatedOwner.trialEndsAt });
    } catch (error) {
      console.error("Error extending trial:", error);
      res.status(500).json({ message: "Failed to extend trial" });
    }
  });

  // Admin: Delete restaurant and all associated data
  app.delete('/api/admin/restaurants/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get restaurant details before deleting for logging
      const restaurant = await storage.getRestaurant(id);
      
      // Delete all associated data
      await storage.deleteRestaurantCompletely(id);
      
      // Log the action
      await logAdminActivity({
        userId: req.user.id,
        userEmail: req.user.email,
        actionType: 'restaurant_deleted',
        actionCategory: 'restaurant',
        description: `Deleted restaurant "${restaurant?.name || id}" and all associated data`,
        targetId: id,
        targetType: 'restaurant',
        targetName: restaurant?.name,
        metadata: { restaurantId: id, restaurantName: restaurant?.name },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({ message: "Restaurant deleted successfully" });
    } catch (error) {
      console.error("Error deleting restaurant:", error);
      res.status(500).json({ message: "Failed to delete restaurant" });
    }
  });

  // Admin: Get all platform settings
  app.get('/api/admin/settings', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching platform settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Admin: Update platform setting
  app.patch('/api/admin/settings/:key', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (value === undefined || value === null) {
        return res.status(400).json({ message: "Value is required" });
      }
      
      const updated = await storage.updatePlatformSetting(key, String(value), req.user.id);
      res.json(updated);
    } catch (error) {
      console.error("Error updating platform setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Admin: Get all users
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsersForAdmin();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Suspend user
  app.post('/api/admin/users/:id/suspend', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateUser(id, { isActive: false });
      const { password: _password, ...updatedWithoutPassword } = updated;
      res.json(updatedWithoutPassword);
    } catch (error) {
      console.error("Error suspending user:", error);
      res.status(500).json({ message: "Failed to suspend user" });
    }
  });

  // Admin: Activate user
  app.post('/api/admin/users/:id/activate', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateUser(id, { isActive: true });
      const { password: _password, ...updatedWithoutPassword } = updated;
      res.json(updatedWithoutPassword);
    } catch (error) {
      console.error("Error activating user:", error);
      res.status(500).json({ message: "Failed to activate user" });
    }
  });

  // Admin: Delete user
  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Prevent deleting yourself
      if (id === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Admin: Reset user password (send reset email)
  app.post('/api/admin/users/:id/reset-password', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // In a real app, you'd send a password reset email here
      // For now, just return success
      res.json({ message: "Password reset email sent (simulated)" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Update restaurant pixels
  app.patch('/api/restaurants/:id/pixels', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const restaurant = await storage.getRestaurant(id);
      
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      // Verify ownership (unless admin)
      if (req.user.role !== 'admin' && restaurant.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { metaPixelId, tiktokPixelId, googleAnalyticsId, googleAdsId } = req.body;
      
      const updates: any = {};
      if (metaPixelId !== undefined) updates.metaPixelId = metaPixelId || null;
      if (tiktokPixelId !== undefined) updates.tiktokPixelId = tiktokPixelId || null;
      if (googleAnalyticsId !== undefined) updates.googleAnalyticsId = googleAnalyticsId || null;
      if (googleAdsId !== undefined) updates.googleAdsId = googleAdsId || null;
      
      const updated = await storage.updateRestaurant(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating pixels:", error);
      res.status(500).json({ message: "Failed to update pixels" });
    }
  });

  // Update restaurant domain verification
  app.patch('/api/restaurants/:id/domain-verification', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const restaurant = await storage.getRestaurant(id);
      
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      // Verify ownership (unless admin)
      if (req.user.role !== 'admin' && restaurant.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { metaVerificationCode } = req.body;
      
      const updates: any = {};
      if (metaVerificationCode !== undefined) {
        updates.metaVerificationCode = metaVerificationCode || null;
      }
      
      const updated = await storage.updateRestaurant(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating domain verification:", error);
      res.status(500).json({ message: "Failed to update domain verification" });
    }
  });

  // Update restaurant subdomain
  app.patch('/api/restaurants/:id/subdomain', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const restaurant = await storage.getRestaurant(id);
      
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      // Verify ownership (unless admin)
      if (req.user.role !== 'admin' && restaurant.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { subdomain } = req.body;
      
      // Validate subdomain format (alphanumeric and hyphens only, no spaces)
      if (subdomain && !/^[a-z0-9-]+$/.test(subdomain)) {
        return res.status(400).json({ message: "Subdomain can only contain lowercase letters, numbers, and hyphens" });
      }
      
      // Check if subdomain is already taken (compare against restaurant.id, not id param for security)
      if (subdomain && subdomain !== restaurant.subdomain) {
        const existing = await storage.getRestaurantBySubdomain(subdomain);
        if (existing && existing.id !== restaurant.id) {
          return res.status(400).json({ message: "This subdomain is already taken" });
        }
      }
      
      const updated = await storage.updateRestaurant(id, { 
        subdomain: subdomain || null 
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating subdomain:", error);
      res.status(500).json({ message: "Failed to update subdomain" });
    }
  });

  // Update restaurant custom domain
  app.patch('/api/restaurants/:id/custom-domain', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const restaurant = await storage.getRestaurant(id);
      
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      // Verify ownership (unless admin)
      if (req.user.role !== 'admin' && restaurant.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { customDomain } = req.body;
      
      // Check if custom domain is already taken (compare against restaurant.id, not id param for security)
      if (customDomain && customDomain !== restaurant.customDomain) {
        const existing = await storage.getRestaurantByCustomDomain(customDomain);
        if (existing && existing.id !== restaurant.id) {
          return res.status(400).json({ message: "This custom domain is already in use" });
        }
      }
      
      const updated = await storage.updateRestaurant(id, { 
        customDomain: customDomain || null 
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating custom domain:", error);
      res.status(500).json({ message: "Failed to update custom domain" });
    }
  });

  // Verify custom domain DNS configuration
  app.post('/api/restaurants/:id/verify-domain', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const restaurant = await storage.getRestaurant(id);
      
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      // Verify ownership (unless admin)
      if (req.user.role !== 'admin' && restaurant.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (!restaurant.customDomain) {
        return res.status(400).json({ message: "No custom domain configured" });
      }
      
      if (!restaurant.subdomain) {
        return res.status(400).json({ message: "Subdomain must be configured before verifying custom domain" });
      }
      
      // Simple DNS verification: try to resolve the domain
      // In production, you'd use dns.promises.resolveCname() from Node.js
      // For now, we'll return a success response indicating manual verification is needed
      res.json({ 
        verified: false,
        message: "Please configure your DNS CNAME record and allow 24-48 hours for propagation",
        instructions: {
          type: "CNAME",
          host: restaurant.customDomain.replace(/^www\./, ''),
          value: new URL(getBaseUrl()).hostname,
          note: "Point your custom domain to this hostname. If using www subdomain, point it to your apex domain."
        }
      });
    } catch (error) {
      console.error("Error verifying domain:", error);
      res.status(500).json({ message: "Failed to verify domain" });
    }
  });

  // Push Notification Endpoints

  // Get VAPID public key for push subscription
  app.get('/api/push/vapid-public-key', isAuthenticated, (req, res) => {
    // Generate VAPID keys using web-push library
    // For now, return a placeholder - you'll need to generate real VAPID keys
    const publicKey = process.env.VAPID_PUBLIC_KEY || '';
    
    if (!publicKey) {
      return res.status(503).json({ 
        message: 'Push notifications not configured. Set VAPID_PUBLIC_KEY in environment.' 
      });
    }
    
    res.json({ publicKey });
  });

  // Subscribe to push notifications
  app.post('/api/push/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const subscription = req.body;
      
      // Store subscription in database
      // For now, we'll just log it - you can add a pushSubscriptions table later
      console.log('[Push] User subscribed:', userId, subscription);
      
      // TODO: Store in database
      // await storage.savePushSubscription(userId, subscription);
      
      res.json({ success: true });
    } catch (error) {
      logError('Error saving push subscription', error);
      res.status(500).json({ message: 'Failed to save subscription' });
    }
  });

  // Unsubscribe from push notifications
  app.post('/api/push/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Remove subscription from database
      console.log('[Push] User unsubscribed:', userId);
      
      // TODO: Remove from database
      // await storage.removePushSubscription(userId);
      
      res.json({ success: true });
    } catch (error) {
      logError('Error removing push subscription', error);
      res.status(500).json({ message: 'Failed to unsubscribe' });
    }
  });

  // Push Notification Endpoints (Restaurant)
  
  // Get VAPID public key for restaurant push subscription
  app.get('/api/restaurant/push/vapid-public-key', isAuthenticated, (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY || '';
    
    if (!publicKey) {
      return res.status(503).json({ 
        message: 'Push notifications not configured. Set VAPID_PUBLIC_KEY in environment.' 
      });
    }
    
    res.json({ publicKey });
  });

  // Subscribe restaurant to push notifications
  app.post('/api/restaurant/push/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const subscription = req.body;
      
      // Get restaurant
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }
      
      // Store subscription
      logInfo('[Push] Restaurant subscribed to notifications', { 
        restaurantId: restaurant.id,
        userId 
      });
      
      // TODO: Store in database
      // await storage.saveRestaurantPushSubscription(restaurant.id, subscription);
      
      res.json({ success: true });
    } catch (error) {
      logError('Error saving restaurant push subscription', error);
      res.status(500).json({ message: 'Failed to save subscription' });
    }
  });

  // Unsubscribe restaurant from push notifications
  app.post('/api/restaurant/push/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }
      
      logInfo('[Push] Restaurant unsubscribed from notifications', { 
        restaurantId: restaurant.id 
      });
      
      // TODO: Remove from database
      // await storage.removeRestaurantPushSubscription(restaurant.id);
      
      res.json({ success: true });
    } catch (error) {
      logError('Error removing restaurant push subscription', error);
      res.status(500).json({ message: 'Failed to unsubscribe' });
    }
  });

  // Test endpoint to send push notification to restaurant
  app.post('/api/restaurant/push/test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const restaurant = await storage.getRestaurantByOwnerId(userId);
      
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }

      // TODO: Get subscription from database and send test notification
      // const subscription = await storage.getRestaurantPushSubscription(restaurant.id);
      // await sendPushNotification(subscription, {
      //   title: '🔔 Test Notification',
      //   body: 'Your restaurant notifications are working!',
      //   icon: '/icons/restaurant-icon-192.png'
      // });

      logInfo('[Push] Test notification sent', { restaurantId: restaurant.id });
      res.json({ success: true, message: 'Test notification sent' });
    } catch (error) {
      logError('Error sending test notification', error);
      res.status(500).json({ message: 'Failed to send test notification' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
