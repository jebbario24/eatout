# EatOut — Node/Express + built Vite client, for Cloudflare Containers.
# Cloudflare builds this image for linux/amd64 during `wrangler deploy`.

# ---- builder: install everything, build client + server bundle ----
FROM node:22-bookworm-slim AS builder
# node-gyp toolchain for native deps (bcrypt)
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# vite build -> dist/public ; esbuild bundle -> dist/index.js
RUN npm run build
# drop devDependencies, keep compiled native modules for the prod deps
RUN npm prune --omit=dev

# ---- runner: just node + prod node_modules + dist ----
FROM node:22-bookworm-slim AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080
# Sync the database schema before the server starts, every boot. This is what
# was missing when a deploy shipped code expecting new columns/tables that
# hadn't been migrated yet: the app crashed on every request touching them and
# the health check timed out.
#
# dist/ensureSchema.js (see server/ensureSchema.ts) runs a fixed list of
# idempotent, additive-only DDL statements — CREATE TABLE IF NOT EXISTS / ADD
# COLUMN IF NOT EXISTS — never anything ambiguous. `drizzle-kit push --force`
# was tried here first and had to be reverted: it does live interactive
# diffing, and --force only auto-approves data-loss confirmations, not the
# separate "did you rename X to Y?" prompt — which throws immediately in a
# TTY-less container instead of hanging. If a future schema change genuinely
# needs a rename/drop, add it by hand (or run `drizzle-kit push` locally)
# rather than trusting an unattended process with it.
CMD ["sh", "-c", "node dist/ensureSchema.js && node dist/index.js"]
