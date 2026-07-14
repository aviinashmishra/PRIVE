# Prive Exchange — buyer-web (Next.js 14, standalone output).
# Lives at the repo root so Render/other PaaS defaults (context ".", file "Dockerfile")
# work with zero configuration; docker-compose builds the same file.
# Stages: deps → builder → { migrate (one-shot DB setup) | runner (production server) }
#         contracts (hardhat compile) + anvil (EVM node) → embedded on-chain anchor

FROM node:20-alpine AS deps
WORKDIR /app
COPY apps/buyer-web/package.json apps/buyer-web/package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS builder
WORKDIR /app
COPY apps/buyer-web/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# One-shot migration + seed container (full node_modules available here).
FROM builder AS migrate
CMD ["sh", "-c", "node db/migrate.mjs && node db/seed.mjs"]

# Compile the Solidity contracts — the runner's boot deploy script (chain/deploy.mjs)
# needs the hardhat artifacts (ABI + bytecode) to stand up the embedded chain.
FROM node:20-alpine AS contracts
WORKDIR /contracts
COPY contracts/package.json contracts/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY contracts/hardhat.config.ts contracts/tsconfig.json ./
COPY contracts/src ./src
RUN npx hardhat compile

# Anvil (Foundry) — a single lightweight EVM node binary for the embedded chain.
FROM alpine:3.20 AS anvil
ARG FOUNDRY_VERSION=v1.7.1
ADD https://github.com/foundry-rs/foundry/releases/download/${FOUNDRY_VERSION}/foundry_${FOUNDRY_VERSION}_alpine_amd64.tar.gz /tmp/foundry.tar.gz
RUN tar -xzf /tmp/foundry.tar.gz -C /usr/local/bin anvil && /usr/local/bin/anvil --version

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
# Embedded on-chain anchor: anvil node + compiled artifacts + boot deploy script.
# The entrypoint starts anvil, deploys the contracts, and writes deployment.json
# to /app/chain — where lib/chain/service.ts reads it at runtime.
COPY --from=anvil /usr/local/bin/anvil /usr/local/bin/anvil
COPY --from=contracts --chown=nextjs:nodejs /contracts/artifacts/src ./chain/artifacts
COPY --chown=nextjs:nodejs apps/buyer-web/chain-runtime/deploy.mjs ./chain/deploy.mjs
RUN chown nextjs:nodejs /app/chain
COPY --chown=nextjs:nodejs apps/buyer-web/docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh
USER nextjs
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
