# Prive Exchange — buyer-web (Next.js 14, standalone output)
# Stages: deps → builder → { migrate (one-shot DB setup) | runner (production server) }

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS builder
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# One-shot migration + seed container (full node_modules available here).
FROM builder AS migrate
CMD ["sh", "-c", "node db/migrate.mjs && node db/seed.mjs"]

# Minimal production runner — only the standalone trace output, non-root.
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Migration scripts + SQL for RUN_MIGRATIONS=true startups (drivers pg /
# @neondatabase/serverless / @node-rs/argon2 are already traced into standalone).
COPY --from=builder --chown=nextjs:nodejs /app/db ./db
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh
USER nextjs
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
