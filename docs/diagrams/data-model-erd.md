# Data Model — Entity Relationship Diagrams

Visual companion to [02-data-model.md](../02-data-model.md). Rendered with Mermaid (GitHub,
VS Code, and most doc tools render these natively). Cross-schema relationships are **logical /
application-enforced** (dashed intent), not DB foreign keys — per the single-writer rule
(ADR-005). Split by schema for readability, then a cross-schema overview.

## `identity` — accounts, users, KYC

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : "has"
    USERS ||--o{ ORG_MEMBERS : "member via"
    ACCOUNTS ||--o{ ORG_MEMBERS : "staffed by"
    ACCOUNTS ||--o| COMPANY_PROFILES : "1:1 (company)"
    ACCOUNTS ||--o{ KYC_CASES : "verified by"
    ACCOUNTS ||--o| USERS : "primary_user (individual)"

    USERS {
        uuid id PK
        citext email UK
        text phone UK
        text wallet_address
        text mfa_secret "encrypted"
        account_status status
    }
    ACCOUNTS {
        uuid id PK
        account_type type
        text legal_name
        kyc_tier kyc_tier
        uuid primary_user_id FK
    }
    COMPANY_PROFILES {
        uuid account_id PK,FK
        text registration_number
        text tax_id
        numeric annual_emissions_tco2e
    }
    ORG_MEMBERS {
        uuid id PK
        uuid account_id FK
        uuid user_id FK
        org_role role
        bool can_trade
        bool can_withdraw
    }
    KYC_CASES {
        uuid id PK
        uuid account_id FK
        kyc_tier target_tier
        kyc_status status
        text provider
        jsonb documents
    }
    SESSIONS {
        uuid id PK
        uuid user_id FK
        text device_fingerprint
        timestamptz expires_at
    }
```

## `token` — projects, batches, instruments

```mermaid
erDiagram
    PROJECTS ||--o{ CREDIT_BATCHES : "issues"
    CREDIT_BATCHES ||--o| INSTRUMENTS : "tradable as"

    PROJECTS {
        uuid id PK
        uuid seller_account_id "logical FK -> accounts"
        text name
        project_type project_type
        credit_standard standard
        jsonb geo_polygon
        text pdd_ipfs_cid
    }
    CREDIT_BATCHES {
        uuid id PK
        uuid project_id FK
        smallint vintage_year
        text registry_serial_start
        text registry_serial_end
        text registry_retired_ref
        numeric onchain_token_id "ERC-1155 id"
        numeric total_minted
        numeric total_retired
        batch_status status
    }
    INSTRUMENTS {
        uuid id PK
        text symbol UK
        uuid batch_id FK
        text kind "credit|index"
    }
```

## `ledger` — double-entry money model

```mermaid
erDiagram
    ASSETS ||--o{ LEDGER_ACCOUNTS : "denominated in"
    LEDGER_ACCOUNTS ||--o{ ENTRIES : "journaled to"
    LEDGER_ACCOUNTS ||--o{ HOLDS : "reserves"
    ASSETS ||--o| INSTRUMENTS : "credit asset maps to"
    ASSETS ||--o{ TRANSFERS : "moved by"

    ASSETS {
        uuid id PK
        text symbol UK
        text kind "fiat|stablecoin|credit"
        smallint decimals
        uuid instrument_id "logical FK"
    }
    LEDGER_ACCOUNTS {
        uuid id PK
        uuid owner_account_id "logical FK -> accounts"
        uuid asset_id FK
        text kind "user|fee|hot_wallet|cold|escrow"
    }
    ENTRIES {
        bigserial id PK
        uuid tx_group_id "legs net to zero"
        uuid ledger_account_id FK
        char direction "D|C"
        numeric amount
        text reason
    }
    HOLDS {
        uuid id PK
        uuid ledger_account_id FK
        numeric amount
        text ref_type "order|withdrawal|retirement"
        text status "active|released|consumed"
    }
    TRANSFERS {
        uuid id PK
        uuid account_id "logical FK"
        uuid asset_id FK
        text kind "deposit|withdrawal"
        text status
        text idempotency_key UK
    }
```

## `trading` — markets, orders, trades

```mermaid
erDiagram
    MARKETS ||--o{ ORDERS : "quoted on"
    MARKETS ||--o{ TRADES : "executed on"
    ORDERS ||--o{ TRADES : "maker side"
    ORDERS ||--o{ TRADES : "taker side"
    ORDERS ||--o| HOLDS : "reserves via"

    MARKETS {
        uuid id PK
        text symbol UK
        uuid base_instrument_id "logical FK -> instruments"
        uuid quote_asset_id "logical FK -> assets"
        numeric tick_size
        int maker_fee_bps
        int taker_fee_bps
        int price_band_bps
        text status "active|halted|delisted"
    }
    ORDERS {
        uuid id PK
        uuid account_id "logical FK"
        uuid market_id FK
        order_side side
        order_type type
        numeric price
        numeric quantity
        numeric filled_qty
        order_status status
        uuid hold_id "logical FK"
        text idempotency_key UK
    }
    TRADES {
        uuid id PK
        uuid market_id FK
        uuid maker_order_id FK
        uuid taker_order_id FK
        numeric price
        numeric quantity
        text settlement_status "pending|batched|settled|failed"
        uuid settlement_batch_id "logical FK -> chain"
    }
```

## `chain` — settlement & on-chain events

```mermaid
erDiagram
    SETTLEMENT_BATCHES ||--o{ TRADES : "settles (logical)"
    CREDIT_BATCHES ||--o{ RETIREMENTS : "retired from"
    CHAIN_EVENTS }o--|| SETTLEMENT_BATCHES : "confirms"

    SETTLEMENT_BATCHES {
        uuid id PK
        bytea merkle_root
        int trade_count
        text tx_hash
        text status "building|submitted|confirmed|failed"
    }
    CHAIN_EVENTS {
        bigserial id PK
        text contract
        text event_name
        bigint block_number
        text tx_hash
        jsonb payload
    }
    RETIREMENTS {
        uuid id PK
        uuid account_id "logical FK"
        uuid batch_id FK
        numeric quantity
        numeric certificate_token_id "NFT id"
        text certificate_ipfs_cid
        text status "pending|confirmed"
    }
```

## `mining`

```mermaid
erDiagram
    ACTIONS }o--|| POINT_BALANCES : "accrues to"
    POINT_BALANCES ||--o{ CONVERSIONS : "spent in"
    CONVERSIONS }o--|| CREDIT_BATCHES : "draws from (liquidity)"
    ACTIONS ||--o{ DAILY_CAPS : "counts toward"

    ACTIONS {
        uuid id PK
        uuid account_id "logical FK"
        action_type type
        jsonb payload "steps|gps|receipt"
        numeric points_awarded
        action_status status
        numeric fraud_score
    }
    POINT_BALANCES {
        uuid account_id PK
        numeric points
        numeric lifetime_points
    }
    CONVERSIONS {
        uuid id PK
        uuid account_id "logical FK"
        numeric points_spent
        numeric rate
        numeric credits_granted
        uuid batch_id FK
    }
    DAILY_CAPS {
        uuid account_id PK
        date day PK
        numeric points_earned
    }
```

## Cross-schema overview (logical links)

Dashed lines are application-enforced boundaries (single-writer per service, ADR-005).

```mermaid
flowchart LR
    subgraph identity
        A[accounts]
    end
    subgraph token
        P[projects] --> CB[credit_batches] --> I[instruments]
    end
    subgraph ledger
        AS[assets] --> LA[ledger_accounts] --> E[entries]
        LA --> H[holds]
    end
    subgraph trading
        M[markets] --> O[orders] --> T[trades]
    end
    subgraph chain
        SB[settlement_batches]
        R[retirements]
        CE[chain_events]
    end
    subgraph mining
        AC[actions] --> PB[point_balances] --> CV[conversions]
    end

    A -.owns.-> LA
    A -.seller.-> P
    I  -.credit asset.-> AS
    I  -.base.-> M
    AS -.quote.-> M
    O  -.hold.-> H
    T  -.settled by.-> SB
    CB -.retired via.-> R
    CB -.liquidity for.-> CV
    A  -.miner.-> AC
```

> To render as images for a slide deck: paste any block into the
> [Mermaid Live Editor](https://mermaid.live) and export SVG/PNG. Keep the source here as the
> versioned truth; export copies as needed.
