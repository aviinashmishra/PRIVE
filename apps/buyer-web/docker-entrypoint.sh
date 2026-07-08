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

exec node server.js
