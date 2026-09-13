// Boot-time schema safety net — run before the server starts (see Dockerfile).
//
// `drizzle-kit push` was tried here first but had to be reverted: it does live,
// interactive diffing, and when it sees an added column/table alongside a
// removed one with a similar shape it prompts "did you rename X to Y?" with no
// flag to suppress that specific prompt (only data-loss confirmations respond
// to --force). In a container with no TTY that throws:
//   "Interactive prompts require a TTY terminal ..."
// and the boot fails outright.
//
// This script replaces it with something structurally incapable of ever
// prompting: a fixed list of idempotent, additive-only DDL statements (`CREATE
// TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). It mirrors
// this project's actual, established migration pattern all along — every
// schema change so far has been a new nullable column or a new table, never a
// rename or a drop. When a future change genuinely needs a rename/drop, do
// that by hand (`drizzle-kit push` locally, or a manual statement here) rather
// than trusting an unattended process with it.
//
// Keep this list append-only, in the same order the corresponding change
// landed in shared/schema.ts, so it stays a readable changelog of prod schema
// history as well as a bootstrap script.
import pg from "pg";

const STATEMENTS: string[] = [
  // Storefront CMS grouped-footer support
  `ALTER TABLE storefront_pages ADD COLUMN IF NOT EXISTS footer_group varchar(100)`,

  // Storefront Contact page
  `CREATE TABLE IF NOT EXISTS contact_messages (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id varchar NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    email varchar(255) NOT NULL,
    subject varchar(255),
    message text NOT NULL,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_contact_messages_restaurant ON contact_messages(restaurant_id)`,

  // AI store builder
  `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS social_links jsonb`,
  `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS brand_profile jsonb`,
  `CREATE TABLE IF NOT EXISTS store_generations (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id varchar NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    kind varchar(20) NOT NULL DEFAULT 'initial',
    brief jsonb,
    blueprint jsonb NOT NULL,
    copy jsonb,
    status varchar(20) NOT NULL DEFAULT 'proposed',
    created_at timestamp DEFAULT now(),
    applied_at timestamp
  )`,
  `CREATE INDEX IF NOT EXISTS idx_store_generations_restaurant ON store_generations(restaurant_id)`,
  `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id varchar NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    email varchar(255) NOT NULL,
    created_at timestamp DEFAULT now(),
    UNIQUE (restaurant_id, email)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_restaurant ON newsletter_subscribers(restaurant_id)`,
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[ensureSchema] DATABASE_URL not set — skipping schema check.");
    return;
  }
  const useSsl = /[?&]sslmode=require|supabase\.|render\.com|neon\.tech|rds\.amazonaws/.test(
    process.env.DATABASE_URL,
  );
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
  try {
    for (const statement of STATEMENTS) {
      await pool.query(statement);
    }
    console.log(`[ensureSchema] OK — ${STATEMENTS.length} statements applied/confirmed.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[ensureSchema] FAILED:", err);
  process.exit(1);
});
