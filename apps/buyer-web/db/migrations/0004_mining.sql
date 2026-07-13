-- Green Mining: proof-of-green-action ledger.
-- Earn rows carry positive points (kind 'action'); conversions carry negative
-- points and the PRIVE-CO2 credits minted (kind 'convert'). Balance, streak,
-- CO2 saved and the leaderboard are all derived from this one table.

CREATE TABLE IF NOT EXISTS mining_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'action',
  action_key text NOT NULL,
  label text NOT NULL,
  points integer NOT NULL,
  credits numeric(24,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mining_events_account_idx ON mining_events (account_id, created_at);
CREATE INDEX IF NOT EXISTS mining_events_action_idx ON mining_events (account_id, action_key, created_at)
