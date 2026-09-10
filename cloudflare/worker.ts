/// <reference types="@cloudflare/workers-types" />
import { Container, getContainer } from "@cloudflare/containers";
import { env } from "cloudflare:workers";

/**
 * EatOut runs as a normal Node/Express server inside a Cloudflare Container.
 * This Worker is just the front door: it forwards every request — including
 * WebSocket upgrades — straight through to that container.
 *
 * Secrets are set on the Worker (`wrangler secret put NAME`) and handed to the
 * container process as environment variables below. Only keys with a value are
 * passed; anything unset stays unset (the server treats Stripe/Google/PayPal/
 * VAPID as optional and degrades gracefully).
 */

const CONTAINER_ENV_KEYS = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "BASE_URL",
  "PRIVATE_OBJECT_DIR",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_MAPS_API_KEY",
  "GOOGLE_MAPS_API_KEY_SERVER",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "LOG_LEVEL",
] as const;

function buildContainerEnv(): Record<string, string> {
  const out: Record<string, string> = {
    NODE_ENV: "production",
    PORT: "8080",
  };
  for (const key of CONTAINER_ENV_KEYS) {
    const value = (env as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > 0) {
      out[key] = value;
    }
  }
  return out;
}

export class EatOutContainer extends Container {
  defaultPort = 8080;
  // Scale to zero after 20 min idle to keep the bill down. The first request
  // after that pays a cold start (~5-15s). Raise this — or remove it — once
  // traffic is steady and cold starts hurt more than the cost.
  sleepAfter = "20m";
  envVars = buildContainerEnv();

  override onError(error: unknown) {
    console.error("[container] error:", error);
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    // Single pinned instance ("eatout") — the Express app keeps WebSocket
    // client state in memory, so all traffic must hit the same container.
    return getContainer(env.EATOUT_CONTAINER, "eatout").fetch(request);
  },
} satisfies ExportedHandler;
