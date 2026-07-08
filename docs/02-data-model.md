# 02 — Data Model

Schema-per-service Postgres (ADR-005). DDL below is **PostgreSQL 15+** and covers Phase 1.
TimescaleDB and Redis structures follow. Conventions:

- All tables have `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at`, `updated_at`
  (`timestamptz`), unless noted.
- **Money/amounts:** `NUMERIC(38,18)` for token/credit quantities and prices — never floats.
  Fiat minor units where relevant use `NUMERIC(20,2)`.
- Enums are Postgres `ENUM` types for a fixed domain; free-ish sets use `TEXT` + `CHECK`.
- Soft deletes via `deleted_at timestamptz` only where audit requires retention.
- `updated_at` maintained by a shared `set_updated_at()` trigger (defined once, attached per
  table — omitted below for brevity).

---

## Schema: `identity`

```sql
CREATE TYPE account_type   AS ENUM ('individual', 'company');
CREATE TYPE account_status AS ENUM ('active', 'frozen', 'closed', 'pending');
CREATE TYPE kyc_tier       AS ENUM ('tier0', 'tier1', 'tier2');
CREATE TYPE kyc_status     AS ENUM ('none', 'pending', 'approved', 'rejected', 'expired');

-- A login principal. An individual maps 1:1 to an account; company staff map many:1.
CREATE TABLE identity.users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          CITEXT UNIQUE,
    phone          TEXT UNIQUE,
    password_hash  TEXT,                      -- NULL if SSO/wallet-only
    sso_provider   TEXT,                      -- 'google' | 'apple' | NULL
    sso_subject    TEXT,
    wallet_address TEXT,                       -- linked self-custody wallet, if any
    display_name   TEXT,
    country        CHAR(2),                    -- ISO-3166-1 alpha-2
    date_of_birth  DATE,
    mfa_secret     TEXT,                       -- encrypted (field-level); NULL if disabled
    status         account_status NOT NULL DEFAULT 'pending',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT email_or_phone_or_wallet CHECK (
        email IS NOT NULL OR phone IS NOT NULL OR wallet_address IS NOT NULL)
);

-- The tradeable entity that owns wallets/balances. Individual = one user; company = org.
CREATE TABLE identity.accounts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type          account_type NOT NULL,
    legal_name    TEXT NOT NULL,
    country       CHAR(2) NOT NULL,
    kyc_tier      kyc_tier NOT NULL DEFAULT 'tier0',
    status        account_status NOT NULL DEFAULT 'pending',
    -- individual link (NULL for companies)
    primary_user_id UUID REFERENCES identity.users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company registration / KYB detail (1:1 with a company account).
CREATE TABLE identity.company_profiles (
    account_id          UUID PRIMARY KEY REFERENCES identity.accounts(id),
    registration_number TEXT NOT NULL,
    tax_id              TEXT,                  -- GST/VAT/EIN
    incorporation_country CHAR(2) NOT NULL,
    industry_sector     TEXT,
    annual_emissions_tco2e NUMERIC(20,2),      -- optional emissions profile
    ubo_declared        BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company staff membership + granular role (maker/checker etc.).
CREATE TYPE org_role AS ENUM ('owner','admin','trader','finance','auditor','viewer');
CREATE TABLE identity.org_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES identity.accounts(id),
    user_id    UUID NOT NULL REFERENCES identity.users(id),
    role       org_role NOT NULL,
    -- fine-grained flags override role defaults
    can_trade          BOOLEAN NOT NULL DEFAULT false,
    can_withdraw       BOOLEAN NOT NULL DEFAULT false,
    can_approve_payout BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (account_id, user_id)
);

-- KYC/KYB case, one row per verification attempt; provider = Sumsub/Onfido/HyperVerge.
CREATE TABLE identity.kyc_cases (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id    UUID NOT NULL REFERENCES identity.accounts(id),
    target_tier   kyc_tier NOT NULL,
    status        kyc_status NOT NULL DEFAULT 'pending',
    provider      TEXT NOT NULL,
    provider_ref  TEXT,                        -- external applicant/inspection id
    aml_result    TEXT,                        -- 'clear'|'hit'|'review'
    reviewer_id   UUID,                        -- admin user who decided (nullable)
    reject_reason TEXT,
    documents     JSONB NOT NULL DEFAULT '[]', -- [{type, ipfs_cid, sha256, uploaded_at}]
    submitted_at  TIMESTAMPTZ,
    decided_at    TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions & devices (anti-fraud + audit).
CREATE TABLE identity.sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES identity.users(id),
    device_fingerprint TEXT,
    ip           INET,
    user_agent   TEXT,
    refresh_token_hash TEXT NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    revoked_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON identity.kyc_cases (account_id, status);
CREATE INDEX ON identity.org_members (user_id);
CREATE INDEX ON identity.sessions (user_id) WHERE revoked_at IS NULL;
```

---

## Schema: `token` (credits, projects, registry linkage)

```sql
CREATE TYPE project_type AS ENUM (
  'afforestation','solar','wind','biogas','blue_carbon','dac','cookstove','methane_capture');
CREATE TYPE credit_standard AS ENUM ('verra_vcs','gold_standard','cdm','prive_native');
CREATE TYPE batch_status AS ENUM ('draft','pending_mint','minted','listed','exhausted');

CREATE TABLE token.projects (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_account_id UUID NOT NULL,          -- FK to identity.accounts (cross-schema, app-enforced)
    name           TEXT NOT NULL,
    project_type   project_type NOT NULL,
    standard       credit_standard NOT NULL,
    country        CHAR(2) NOT NULL,
    geo_polygon    JSONB,                      -- GeoJSON boundary for land projects
    methodology    TEXT,
    pdd_ipfs_cid   TEXT,                        -- Project Design Document
    docs           JSONB NOT NULL DEFAULT '[]',-- [{type, ipfs_cid, sha256}]
    status         TEXT NOT NULL DEFAULT 'submitted', -- verification pipeline stage
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per project-vintage batch == one ERC-1155 token id.
CREATE TABLE token.credit_batches (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     UUID NOT NULL REFERENCES token.projects(id),
    vintage_year   SMALLINT NOT NULL,
    standard       credit_standard NOT NULL,
    -- registry linkage: guarantees 1 token = 1 real, retired-elsewhere tonne
    registry_serial_start TEXT,
    registry_serial_end   TEXT,
    registry_retired_ref  TEXT,                -- proof legacy serials retired (MVP: admin-attested)
    -- on-chain identity
    onchain_token_id NUMERIC(78,0),            -- ERC-1155 id (uint256); NULL until minted
    metadata_ipfs_cid TEXT,                    -- token metadata (project, vintage, verifier…)
    metadata_sha256   BYTEA,
    total_minted   NUMERIC(38,18) NOT NULL DEFAULT 0,
    total_retired  NUMERIC(38,18) NOT NULL DEFAULT 0,
    status         batch_status NOT NULL DEFAULT 'draft',
    minted_tx_hash TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, vintage_year)
);

-- The tradable instrument (a market pair references a batch or the index token).
CREATE TABLE token.instruments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol      TEXT UNIQUE NOT NULL,          -- e.g. 'AMZN-RF25'
    batch_id    UUID REFERENCES token.credit_batches(id), -- NULL for the PRIVE-CO2 index
    kind        TEXT NOT NULL DEFAULT 'credit',-- 'credit' | 'index'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON token.credit_batches (project_id);
CREATE INDEX ON token.credit_batches (onchain_token_id);
```

---

## Schema: `ledger` (double-entry — ADR-006)

```sql
-- Assets we track balances in: quote currencies + each credit instrument.
CREATE TABLE ledger.assets (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol    TEXT UNIQUE NOT NULL,            -- 'USDT','INR','AMZN-RF25',...
    kind      TEXT NOT NULL,                   -- 'fiat' | 'stablecoin' | 'credit'
    decimals  SMALLINT NOT NULL DEFAULT 18,
    instrument_id UUID REFERENCES token.instruments(id) -- for credit assets
);

-- Every account holds one ledger_account per asset it touches.
CREATE TABLE ledger.accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_account_id UUID NOT NULL,            -- identity.accounts.id, or a platform system id
    asset_id    UUID NOT NULL REFERENCES ledger.assets(id),
    kind        TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'fee' | 'hot_wallet' | 'cold' | 'escrow'
    UNIQUE (owner_account_id, asset_id, kind)
);

-- Immutable journal. Each entry is one leg; entries with the same tx_group_id must net to 0.
CREATE TABLE ledger.entries (
    id            BIGSERIAL PRIMARY KEY,
    tx_group_id   UUID NOT NULL,               -- groups the balanced legs of one movement
    ledger_account_id UUID NOT NULL REFERENCES ledger.accounts(id),
    asset_id      UUID NOT NULL REFERENCES ledger.assets(id),
    direction     CHAR(1) NOT NULL CHECK (direction IN ('D','C')), -- debit/credit
    amount        NUMERIC(38,18) NOT NULL CHECK (amount > 0),
    reason        TEXT NOT NULL,               -- 'trade_fill','fee','deposit','hold','retire'...
    ref_type      TEXT,                        -- 'order','trade','withdrawal','retirement'
    ref_id        UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Holds (reserved funds for open orders / pending withdrawals). Released or converted to entries.
CREATE TABLE ledger.holds (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_account_id UUID NOT NULL REFERENCES ledger.accounts(id),
    amount        NUMERIC(38,18) NOT NULL CHECK (amount > 0),
    ref_type      TEXT NOT NULL,               -- 'order' | 'withdrawal' | 'retirement'
    ref_id        UUID NOT NULL,
    status        TEXT NOT NULL DEFAULT 'active', -- 'active'|'released'|'consumed'
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at   TIMESTAMPTZ
);

-- Materialized balance = SUM(credits) - SUM(debits) - active holds. Refreshed on write.
CREATE MATERIALIZED VIEW ledger.balances AS
SELECT la.id AS ledger_account_id,
       la.owner_account_id, la.asset_id,
       COALESCE(SUM(CASE WHEN e.direction='C' THEN e.amount ELSE -e.amount END),0) AS posted,
       COALESCE((SELECT SUM(h.amount) FROM ledger.holds h
                 WHERE h.ledger_account_id = la.id AND h.status='active'),0) AS held
FROM ledger.accounts la
LEFT JOIN ledger.entries e ON e.ledger_account_id = la.id
GROUP BY la.id;
-- `available = posted - held`. In production, prefer an incrementally-maintained balance
-- table updated in the same tx as entries; the MV is shown here for clarity.

CREATE INDEX ON ledger.entries (tx_group_id);
CREATE INDEX ON ledger.entries (ledger_account_id, created_at);
CREATE INDEX ON ledger.holds (ledger_account_id) WHERE status='active';

-- Deposits / withdrawals (fiat + crypto on/off ramp).
CREATE TABLE ledger.transfers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID NOT NULL,
    asset_id    UUID NOT NULL REFERENCES ledger.assets(id),
    kind        TEXT NOT NULL,                 -- 'deposit' | 'withdrawal'
    amount      NUMERIC(38,18) NOT NULL,
    rail        TEXT NOT NULL,                 -- 'onchain'|'stripe'|'razorpay'|'sepa'
    address_or_ref TEXT,
    status      TEXT NOT NULL DEFAULT 'pending', -- pending|confirmed|failed|held_24h
    tx_hash     TEXT,
    idempotency_key TEXT UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Schema: `trading` (orders, trades, markets)

```sql
CREATE TYPE order_side AS ENUM ('buy','sell');
CREATE TYPE order_type AS ENUM ('market','limit','stop_limit','stop_market','oco','iceberg','twac');
CREATE TYPE order_status AS ENUM ('open','partial','filled','cancelled','rejected');
CREATE TYPE tif AS ENUM ('gtc','ioc','fok');

CREATE TABLE trading.markets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol       TEXT UNIQUE NOT NULL,         -- 'AMZN-RF25/USDT'
    base_instrument_id UUID NOT NULL REFERENCES token.instruments(id),
    quote_asset_id UUID NOT NULL REFERENCES ledger.assets(id),
    tick_size    NUMERIC(38,18) NOT NULL,
    lot_size     NUMERIC(38,18) NOT NULL,
    min_notional NUMERIC(38,18) NOT NULL,
    maker_fee_bps INT NOT NULL DEFAULT 10,     -- 0.10%
    taker_fee_bps INT NOT NULL DEFAULT 20,     -- 0.20%
    status       TEXT NOT NULL DEFAULT 'active', -- 'active'|'halted'|'delisted'
    price_band_bps INT NOT NULL DEFAULT 1000,  -- circuit-breaker band
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE trading.orders (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   UUID NOT NULL,
    user_id      UUID NOT NULL,                -- who placed it (audit)
    market_id    UUID NOT NULL REFERENCES trading.markets(id),
    side         order_side NOT NULL,
    type         order_type NOT NULL,
    tif          tif NOT NULL DEFAULT 'gtc',
    price        NUMERIC(38,18),               -- NULL for market orders
    stop_price   NUMERIC(38,18),
    quantity     NUMERIC(38,18) NOT NULL,
    filled_qty   NUMERIC(38,18) NOT NULL DEFAULT 0,
    avg_fill_price NUMERIC(38,18),
    status       order_status NOT NULL DEFAULT 'open',
    hold_id      UUID REFERENCES ledger.holds(id),
    idempotency_key TEXT UNIQUE,
    reject_reason TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE trading.trades (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id     UUID NOT NULL REFERENCES trading.markets(id),
    maker_order_id UUID NOT NULL REFERENCES trading.orders(id),
    taker_order_id UUID NOT NULL REFERENCES trading.orders(id),
    price         NUMERIC(38,18) NOT NULL,
    quantity      NUMERIC(38,18) NOT NULL,
    maker_fee     NUMERIC(38,18) NOT NULL DEFAULT 0,
    taker_fee     NUMERIC(38,18) NOT NULL DEFAULT 0,
    -- settlement lifecycle
    settlement_status TEXT NOT NULL DEFAULT 'pending', -- pending|batched|settled|failed
    settlement_batch_id UUID,                  -- FK to chain.settlement_batches
    executed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON trading.orders (account_id, status);
CREATE INDEX ON trading.orders (market_id, status) WHERE status IN ('open','partial');
CREATE INDEX ON trading.trades (market_id, executed_at DESC);
CREATE INDEX ON trading.trades (settlement_status) WHERE settlement_status <> 'settled';
```

> The **live order book itself lives in the Rust engine's memory + Redis**, not in Postgres.
> `trading.orders` is the durable record of intent/outcome; the engine is authoritative for
> the current book (rebuilt from the Kafka order-event log on restart — ADR-001/007).

---

## Schema: `chain` (settlement, on-chain events)

```sql
CREATE TABLE chain.settlement_batches (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merkle_root  BYTEA NOT NULL,
    trade_count  INT NOT NULL,
    tx_hash      TEXT,
    status       TEXT NOT NULL DEFAULT 'building', -- building|submitted|confirmed|failed
    gas_used     NUMERIC(38,0),
    submitted_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every relevant chain event ingested (mint, transfer, settle, retire) — the reconciliation
-- and Transparency Explorer source. Also indexed via The Graph for read APIs (ADR-009).
CREATE TABLE chain.events (
    id           BIGSERIAL PRIMARY KEY,
    contract     TEXT NOT NULL,
    event_name   TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    log_index    INT NOT NULL,
    tx_hash      TEXT NOT NULL,
    payload      JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tx_hash, log_index)               -- idempotent ingestion
);

CREATE TABLE chain.retirements (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id    UUID NOT NULL,
    batch_id      UUID NOT NULL REFERENCES token.credit_batches(id),
    quantity      NUMERIC(38,18) NOT NULL,
    certificate_token_id NUMERIC(78,0),        -- Retirement Certificate NFT id
    certificate_ipfs_cid TEXT,                 -- PDF certificate
    tx_hash       TEXT,
    status        TEXT NOT NULL DEFAULT 'pending', -- pending|confirmed
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Schema: `mining`

```sql
CREATE TYPE action_type AS ENUM ('steps','cycling','utility_bill','green_purchase','tree_plant','referral','streak');
CREATE TYPE action_status AS ENUM ('submitted','verifying','approved','rejected','flagged');

CREATE TABLE mining.actions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL,
    account_id   UUID NOT NULL,
    type         action_type NOT NULL,
    payload      JSONB NOT NULL,               -- e.g. {steps, gps_track, receipt_ipfs_cid}
    points_awarded NUMERIC(20,4) NOT NULL DEFAULT 0,
    status       action_status NOT NULL DEFAULT 'submitted',
    fraud_score  NUMERIC(5,4),                 -- 0..1 from anomaly model
    device_fingerprint TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mining.point_balances (
    account_id   UUID PRIMARY KEY,
    points       NUMERIC(20,4) NOT NULL DEFAULT 0,
    lifetime_points NUMERIC(20,4) NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mining.conversions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   UUID NOT NULL,
    points_spent NUMERIC(20,4) NOT NULL,
    rate         NUMERIC(38,18) NOT NULL,      -- points per fractional credit
    credits_granted NUMERIC(38,18) NOT NULL,
    batch_id     UUID NOT NULL REFERENCES token.credit_batches(id), -- platform liquidity batch
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-user daily caps + fraud flags.
CREATE TABLE mining.daily_caps (
    account_id UUID NOT NULL,
    day        DATE NOT NULL,
    points_earned NUMERIC(20,4) NOT NULL DEFAULT 0,
    PRIMARY KEY (account_id, day)
);

CREATE INDEX ON mining.actions (account_id, created_at DESC);
CREATE INDEX ON mining.actions (status) WHERE status IN ('submitted','flagged');
```

---

## Schema: `admin` (audit + operations)

```sql
CREATE TABLE admin.audit_log (
    id           BIGSERIAL PRIMARY KEY,
    actor_user_id UUID NOT NULL,               -- admin who acted
    action       TEXT NOT NULL,                -- 'kyc.approve','market.halt','mint.trigger'...
    target_type  TEXT,
    target_id    UUID,
    before       JSONB,
    after        JSONB,
    ip           INET,
    -- tamper-evidence: each row chains the prior row's hash; roots periodically anchored on-chain
    prev_hash    BYTEA,
    row_hash     BYTEA NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin.disputes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opened_by    UUID NOT NULL,
    against      UUID,
    ref_type     TEXT,                          -- 'trade'|'retirement'|'payout'
    ref_id       UUID,
    status       TEXT NOT NULL DEFAULT 'open',  -- open|investigating|resolved|rejected
    evidence     JSONB NOT NULL DEFAULT '[]',
    resolution   TEXT,
    assigned_to  UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at  TIMESTAMPTZ
);

CREATE TABLE admin.surveillance_alerts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind         TEXT NOT NULL,                 -- 'wash_trade'|'spoofing'|'pump_dump'
    market_id    UUID,
    account_ids  UUID[],
    severity     TEXT NOT NULL DEFAULT 'medium',
    details      JSONB NOT NULL,
    status       TEXT NOT NULL DEFAULT 'open',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## TimescaleDB — market data (OHLCV)

```sql
-- Raw ticks (every trade), then continuous aggregates roll up candles.
CREATE TABLE market.ticks (
    market_id  UUID NOT NULL,
    price      NUMERIC(38,18) NOT NULL,
    quantity   NUMERIC(38,18) NOT NULL,
    ts         TIMESTAMPTZ NOT NULL
);
SELECT create_hypertable('market.ticks', 'ts');
CREATE INDEX ON market.ticks (market_id, ts DESC);

-- 1-minute candles as a continuous aggregate; coarser frames roll up from these.
CREATE MATERIALIZED VIEW market.ohlcv_1m
WITH (timescaledb.continuous) AS
SELECT market_id,
       time_bucket('1 minute', ts) AS bucket,
       first(price, ts) AS open,
       max(price)       AS high,
       min(price)       AS low,
       last(price, ts)  AS close,
       sum(quantity)    AS volume
FROM market.ticks
GROUP BY market_id, bucket;
-- Add refresh policy; define ohlcv_5m/15m/1h/4h/1d/1w similarly (bucket from 1m for efficiency).
```

---

## Redis — cache & real-time structures

| Key pattern | Type | Purpose | TTL |
|-------------|------|---------|-----|
| `book:{market}:bids` / `:asks` | Sorted Set | Live order-book snapshot (score = price) | none (rebuilt from Kafka) |
| `ticker:{market}` | Hash | last price, 24h %, 24h vol, high/low | rolling |
| `depth:{market}` | String (JSON) | pre-aggregated depth for WS push | ~1s |
| `trades:{market}` | List (capped) | recent-trades tape | cap 200 |
| `session:{token}` | String | fast session lookup | = session exp |
| `ratelimit:{key}` | String (counter) | token-bucket rate limiting | window |
| `idem:{key}` | String | in-flight idempotency guard | short |
| `lock:settle:{market}` | String | settlement batch mutex | short |

---

## Cross-schema integrity note

Foreign keys **within** a schema are DB-enforced. FKs **across** schemas (e.g.
`token.projects.seller_account_id → identity.accounts.id`) are **application-enforced**, per
the single-writer rule (ADR-005). Referential correctness across services is guaranteed by
the owning service's API + Kafka events, not by DB constraints. Document each such logical FK
in the owning service's code.

## Open questions (data model)
1. Incrementally-maintained `balances` table vs. the materialized view shown — production
   wants the former (updated in-tx with entries). Decide before the Ledger sprint.
2. Fiat ledger precision/rounding rules per currency (esp. INR) — needs finance sign-off.
3. Retention policy for `market.ticks` (compression + drop raw after N days, keep candles).
4. Whether `mining.actions.payload` GPS tracks are PII requiring field-level encryption
   (likely yes — coordinate with §05).
