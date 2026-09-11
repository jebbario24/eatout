# Deploying EatOut

Target stack: **Cloudflare Containers** (Node/Express server in a container, fronted
by a Worker) · **Supabase** Postgres · **Cloudflare R2** for uploads · your domain
on Cloudflare DNS.

```
Browser ──▶ Cloudflare Worker (cloudflare/worker.ts) ──▶ Container (Dockerfile → node dist/index.js)
                                                              ├─▶ Supabase Postgres  (DATABASE_URL)
                                                              └─▶ Cloudflare R2      (R2_* )
```

The app builds and boots as a plain Node server (`npm run build` → `node dist/index.js`,
listens on `PORT`). Everything below just wraps that.

---

## 0. One-time prerequisites

| Thing | Why | Notes |
|---|---|---|
| **Cloudflare Workers Paid plan** ($5/mo) | Containers require it | Dash → Workers & Pages → Plans |
| **Supabase project** | Postgres database | free tier is fine to launch |
| **Domain on Cloudflare** | custom URL + SSL | you said you have one |
| `npm i -g wrangler` (or use `npx wrangler`) | deploy CLI | already a devDependency here |
| `wrangler login` | auth the CLI to your account | |

---

## 1. Database — Supabase

1. Create a project at supabase.com. Pick a region close to your users.
2. **Settings → Database → Connection string → "Session pooler"**. Copy it. It looks like:
   ```
   postgresql://postgres.abcdefgh:YOUR-DB-PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
   Use the **Session pooler (port 5432)** — not the Transaction pooler (6543), which
   breaks prepared statements that `pg` relies on.
3. Create the schema. From this folder, with that URL exported:
   ```bash
   DATABASE_URL="postgresql://postgres....:5432/postgres" npm run db:push
   ```
   This creates every table (users, restaurants, orders, sessions, ...). Re-run it
   after any `shared/schema.ts` change.
4. **Seed the admin user.** Admin is granted by email in `server/auth.ts`
   (`jebbario23@gmail.com`). Either sign up with that email in the live app, or
   after signing up run against Supabase:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'you@yourdomain.com';
   ```

---

## 2. Secrets — Cloudflare

`cloudflare/worker.ts` reads these from the Worker's environment and passes them
into the container. Set each one:

```bash
wrangler secret put DATABASE_URL          # Supabase session-pooler string from step 1
wrangler secret put SESSION_SECRET        # any long random string:  openssl rand -hex 32
wrangler secret put BASE_URL              # https://eatout.yourdomain.com  (no trailing slash)

# Cloudflare R2 (create a bucket + API token in Dash → R2)
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put R2_BUCKET_NAME
wrangler secret put R2_PUBLIC_URL         # the bucket's public r2.dev URL or custom domain
wrangler secret put PRIVATE_OBJECT_DIR    # value:  private

# Stripe (you have live keys)
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_PUBLISHABLE_KEY
wrangler secret put STRIPE_PRICE_ID       # the recurring price for the merchant subscription
wrangler secret put STRIPE_WEBHOOK_SECRET # from step 5 — set it after the webhook exists

# Optional — skip any you're not using yet
wrangler secret put PAYPAL_CLIENT_ID
wrangler secret put PAYPAL_CLIENT_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_MAPS_API_KEY
wrangler secret put GOOGLE_MAPS_API_KEY_SERVER
wrangler secret put VAPID_PUBLIC_KEY
wrangler secret put VAPID_PRIVATE_KEY
```

If you add or rename a secret, also add it to `CONTAINER_ENV_KEYS` in
`cloudflare/worker.ts` so it reaches the container.

---

## 3. Deploy

**Option A — from your machine** (needs Docker Desktop installed and running, for
the image build):
```bash
npm run deploy          # = wrangler deploy: builds ./Dockerfile, pushes image, deploys Worker + container
```
(`wrangler` is a pinned devDependency — run `npm install` once if this errors
with "wrangler is not recognized".)

**Option B — from GitHub** (no local Docker needed; this is what we actually used
to launch). The Cloudflare Worker **`eatout`** is wired to `jebbario24/eatout`,
branch `main`, deploy command `npx wrangler deploy` — set up under
**Workers & Pages → eatout → Settings → Builds**. Every push to `main` triggers a
remote build (Cloudflare's build runners have Docker; your machine doesn't need
it):
```bash
git add -A && git commit -m "some change"
git push origin main
```

First deploy takes a few minutes (image build). Watch it in Dash → Workers & Pages
→ eatout → Builds, or `wrangler tail` for live logs once it's running.

---

## 4. Custom domain

Dash → Workers & Pages → **eatout → Settings → Domains & Routes → Add → Custom domain**
→ `eatout.yourdomain.com`. Cloudflare provisions the cert automatically.

Make sure `BASE_URL` (step 2) matches this exactly, then re-deploy so the container
picks it up.

---

## 5. Stripe webhook

Merchant subscriptions depend on this.

1. Stripe Dashboard → Developers → **Webhooks → Add endpoint**
2. URL: `https://eatout.yourdomain.com/api/webhooks/stripe`
3. Events: at least `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_succeeded`,
   `invoice.payment_failed`.
4. Copy the **Signing secret** (`whsec_...`) → `wrangler secret put STRIPE_WEBHOOK_SECRET`
   → re-deploy.
5. Send a test event and confirm a `200` in the Stripe dashboard + in `wrangler tail`.

For **Stripe Connect** (merchant payouts): in Stripe → Connect settings, set the
redirect/return URLs to `https://eatout.yourdomain.com/settings` (or wherever the
onboarding-return route points).

---

## 6. Google OAuth (if you enable it)

Google Cloud Console → Credentials → your OAuth client → **Authorized redirect URIs**:
```
https://eatout.yourdomain.com/api/auth/google/callback
```

---

## Post-deploy smoke test

- [ ] `https://eatout.yourdomain.com` loads the landing page
- [ ] Sign up → onboarding → dashboard works (exercises DB + sessions)
- [ ] Add a product, open the storefront (`/store/<slug>`), place a **pickup** order
- [ ] Order shows in the merchant Orders page and the admin portal
- [ ] Upload a product image (exercises R2)
- [ ] Real-time: a new order pushes to the dashboard without refresh (exercises the `/ws` WebSocket through the Worker)
- [ ] Subscribe with a real card → Stripe webhook returns `200`

## Tuning

- **Cold starts:** the container sleeps after 20 min idle (`sleepAfter` in
  `cloudflare/worker.ts`). First request after that is slow (~5-15s). Raise or
  remove it once traffic is steady.
- **Memory:** `instance_type` is `basic` (1 GiB) in `wrangler.jsonc`. If the
  container OOMs under load, bump to `standard-1` (4 GiB) and re-deploy.
- **Scaling:** stays at 1 instance on purpose -- the server holds WebSocket client
  state in memory, so multiple instances wouldn't share live updates. Don't raise
  `max_instances` without moving that state out (e.g. to a pub/sub).
