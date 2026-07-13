-- Server-authoritative credit wallet. USD cash stays on accounts.usd_balance;
-- holdings carries the tonne-denominated credit balances per (account, symbol).
-- Trading, mining conversions and retirements all settle against this table.

CREATE TABLE IF NOT EXISTS holdings (
  account_id uuid NOT NULL,
  symbol text NOT NULL,
  qty numeric(24,4) NOT NULL DEFAULT 0,
  avg_cost numeric(20,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, symbol)
);

ALTER TABLE mining_events ADD COLUMN IF NOT EXISTS tx_hash text
