-- Seller projects & verification pipeline (cross-actor: seller ↔ admin)

CREATE TABLE IF NOT EXISTS projects (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_account_id  UUID NOT NULL,
  seller_name        TEXT NOT NULL,
  name               TEXT NOT NULL,
  project_type       TEXT NOT NULL,
  standard           TEXT NOT NULL,
  country            TEXT NOT NULL,
  location           TEXT NOT NULL,
  vintage            SMALLINT NOT NULL,
  expected_annual    INTEGER NOT NULL DEFAULT 0,
  price              NUMERIC(20,2) NOT NULL DEFAULT 0,
  stage              TEXT NOT NULL DEFAULT 'Submitted',
  status             TEXT NOT NULL DEFAULT 'pending',
  token_id           TEXT,
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects (status, created_at);
