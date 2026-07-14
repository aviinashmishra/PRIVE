#!/bin/sh
# Runner entrypoint. With RUN_MIGRATIONS=true (e.g. on Render, where there is no
# separate migrate service), apply migrations + seed before starting the server.
# Both scripts are idempotent, so running them on every boot is safe.
set -e

if [ "$RUN_MIGRATIONS" = "true" ] && [ -n "$DATABASE_URL" ]; then
  echo "→ RUN_MIGRATIONS=true — applying migrations and seed…"
  node db/migrate.mjs
  node db/seed.mjs
fi

# Embedded on-chain anchor: when no external CHAIN_RPC_URL is configured, boot a
# local anvil node, deploy the contracts, and point the app at it — the /offset
# chain panel and /explorer stay live even on a single-container deploy (Render).
# Set CHAIN_RPC_URL to use a real network instead, or CHAIN_EMBEDDED=false to
# run fully off-chain.
if [ -z "$CHAIN_RPC_URL" ] && [ "$CHAIN_EMBEDDED" != "false" ] && command -v anvil >/dev/null 2>&1; then
  export CHAIN_RPC_URL="http://127.0.0.1:8545"
  export CHAIN_DEPLOYMENT_FILE="${CHAIN_DEPLOYMENT_FILE:-/app/chain/deployment.json}"
  echo "→ Starting embedded chain node (anvil)…"
  anvil --host 127.0.0.1 --port 8545 --chain-id 31337 \
    --state /app/chain/anvil-state.json --state-interval 60 --silent &
  if node chain/deploy.mjs; then
    echo "→ On-chain anchor online at $CHAIN_RPC_URL"
  else
    echo "⚠ Chain deploy failed — continuing without the on-chain anchor."
  fi
fi

exec node server.js
