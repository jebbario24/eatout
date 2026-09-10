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
CMD ["node", "dist/index.js"]
