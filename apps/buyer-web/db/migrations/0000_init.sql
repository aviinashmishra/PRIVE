-- Prive Exchange — Phase-1 demo schema (Neon Postgres)
-- Aligned with /docs/02-data-model.md (single physical schema for the demo).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL DEFAULT 'individual',
  legal_name   TEXT NOT NULL,
  country      TEXT NOT NULL DEFAULT 'IN',
  kyc_tier     TEXT NOT NULL DEFAULT 'tier2',
  usd_balance  NUMERIC(20,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS markets (
  symbol       TEXT PRIMARY KEY,
  pair         TEXT NOT NULL,
  name         TEXT NOT NULL,
  project_type TEXT NOT NULL,
  standard     TEXT NOT NULL,
  vintage      SMALLINT NOT NULL,
  location     TEXT NOT NULL,
  country      TEXT NOT NULL,
  rating       TEXT NOT NULL,
  base_price   NUMERIC(20,2) NOT NULL,
  supply       INTEGER NOT NULL DEFAULT 0,
  retired      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID NOT NULL,
  pair         TEXT NOT NULL,
  side         TEXT NOT NULL,
  type         TEXT NOT NULL,
  price        NUMERIC(20,2) NOT NULL,
  qty          NUMERIC(24,4) NOT NULL,
  filled       NUMERIC(24,4) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'open',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_account_idx ON orders (account_id, created_at);

CREATE TABLE IF NOT EXISTS retirements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID NOT NULL,
  symbol       TEXT NOT NULL,
  name         TEXT NOT NULL,
  qty          NUMERIC(24,4) NOT NULL,
  beneficiary  TEXT NOT NULL DEFAULT 'Personal',
  cert_id      TEXT NOT NULL,
  tx_hash      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'confirmed',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retirements_account_idx ON retirements (account_id, created_at);
