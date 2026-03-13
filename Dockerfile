# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app

# Install dependencies first (layer cache optimization)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
# NODE_ENV=production ensures Vite builds for production (no dev overlays)
ENV NODE_ENV=production
RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# Copy built frontend + compiled backend
COPY --from=build /app/dist ./dist

# Copy all node_modules (includes drizzle-kit needed for db:push at startup)
COPY --from=build /app/node_modules ./node_modules

# Copy runtime config files
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/shared ./shared

# Create uploads directory and set ownership
RUN mkdir -p uploads && chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Run db:push to sync schema, then start the server
CMD ["sh", "-c", "npx drizzle-kit push --force && node dist/index.js"]
