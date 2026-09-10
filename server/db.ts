import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Standard node-postgres pool. Works with any Postgres (Supabase, RDS, a VPS, …).
// For Supabase, use the Session pooler connection string (host
// aws-*.pooler.supabase.com, port 5432) — it's IPv4, keeps prepared statements
// working, and is the right mode for a long-lived pool. Do NOT use the
// transaction pooler (port 6543) here; it breaks prepared statements.
const useSsl = /[?&]sslmode=require|supabase\.|render\.com|neon\.tech|rds\.amazonaws/.test(
  process.env.DATABASE_URL,
);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  // Managed Postgres providers terminate TLS with certs that aren't in Node's
  // default CA bundle; the connection is still encrypted, we just don't pin the CA.
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

// A transient network blip would otherwise surface as an unhandled 'error' on the
// pool and crash the whole process. Log it and keep running — the pool reconnects
// on the next query.
pool.on("error", (err) => {
  console.error(
    "[db] Postgres pool error (non-fatal, connection will retry):",
    err.message || err,
  );
});

export const db = drizzle(pool, { schema });
