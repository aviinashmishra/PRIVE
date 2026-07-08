# 01 — System Architecture & Decision Records

## 1. Architectural stance

Prive is a **hybrid exchange**: order matching is off-chain for latency; custody,
issuance, settlement finality, and retirement are on-chain for auditability. The system is
decomposed into services along **consistency boundaries**, not arbitrary "microservice"
lines — each service owns its data and is the only writer to its tables.

```
                         ┌───────────────────────────┐
   Buyer Web  ──┐        │        API Gateway         │
   Seller Web ──┼──HTTPS─▶  (Kong/Envoy)              │
   Admin Web  ──┤        │  · TLS 1.3 termination     │
   Mobile     ──┘        │  · JWT verify + RBAC       │
                         │  · Rate limiting / WAF     │
                         └────────────┬──────────────┘
                                      │ (REST/gRPC internal)
        ┌───────────────┬─────────────┼──────────────┬────────────────┐
        ▼               ▼             ▼              ▼                ▼
 ┌────────────┐  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐
 │  Identity  │  │  Matching  │ │  Wallet /  │ │ Tokenize / │ │  Mining /    │
 │  KYC/KYB   │  │  Engine    │ │  Ledger    │ │  Registry  │ │  Rewards     │
 │ (NestJS)   │  │ (Rust/Go)  │ │ (NestJS)   │ │ (NestJS)   │ │ (NestJS)     │
 └─────┬──────┘  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──────┬───────┘
       │               │              │              │               │
       │        ┌──────▼──────┐       │              │               │
       │        │   Kafka     │◀──────┴──────────────┴───────────────┘
       │        │ (event bus) │   (domain events, event-sourced)
       │        └──────┬──────┘
       ▼               ▼
 ┌──────────┐   ┌──────────────┐   ┌───────────┐   ┌────────────────────────┐
 │ Postgres │   │ TimescaleDB  │   │  Redis    │   │  Blockchain Gateway     │
 │ (core,   │   │ (OHLCV,      │   │ (orderbook│   │  · signs & submits tx   │
 │ per-svc  │   │  ticks)      │   │  cache,   │   │  · Merkle batch settle  │
 │ schemas) │   │              │   │  sessions)│   │  · listens to events    │
 └──────────┘   └──────────────┘   └───────────┘   └───────────┬────────────┘
                                                               ▼
                                          Polygon PoS/zkEVM · The Graph · Chainlink
                                          IPFS/Pinata (docs, certificates)
```

### Core services (Phase 1)

| Service | Language | Owns | Responsibility |
|---------|----------|------|----------------|
| **API Gateway** | Kong/Envoy | — | AuthN edge, routing, rate limit, WAF |
| **Identity & KYC** | NestJS | `identity.*` | Accounts, sessions, KYC/KYB state, RBAC, org membership |
| **Matching Engine** | Rust (or Go) | in-memory book + Kafka log | Order intake, matching, trade emission |
| **Market Data** | NestJS + Timescale | `market.*` | OHLCV aggregation, ticker/depth WS fan-out |
| **Wallet & Ledger** | NestJS | `ledger.*` | Double-entry balances, holds, deposits/withdrawals |
| **Tokenization & Registry** | NestJS | `token.*` | Credit batches, mint orchestration, registry serials |
| **Settlement (Blockchain Gateway)** | NestJS + ethers | `chain.*` | Tx signing, Merkle batch settle, chain event ingestion |
| **Mining & Rewards** | NestJS | `mining.*` | Points, action verification, anti-fraud, conversion |
| **Notification** | NestJS | `notify.*` | Email/push/webhook, alerts |
| **Admin/BFF** | NestJS | reads across | Admin console backend-for-frontend, audit log |

> Matching, Market Data, and the Ledger are the **hot path** and get their own scaling and
> on-call budget. Everything else is standard request/response.

## 2. Request & data-flow narratives

### 2.1 Placing and settling a trade (the hot path)
1. Client sends `POST /orders` (authenticated) → Gateway validates JWT + RBAC + rate limit.
2. Wallet/Ledger service places a **hold** on the buyer's quote balance (or seller's credit
   balance) — atomic, in Postgres, within the user's ledger. Rejects if insufficient.
3. Order forwarded to **Matching Engine**. Engine matches against the in-memory book
   (price-time FIFO), emits `TradeExecuted` events to Kafka. Latency target <10ms match.
4. Ledger consumes `TradeExecuted`, moves held funds to the counterparty (off-chain
   balances update instantly → optimistic UI reflects fill).
5. Market Data consumes the same event → updates candle + depth + trade tape → WS fan-out.
6. **Settlement** batches N trades / T seconds, computes a Merkle root, submits one
   `PriveEscrow.settleBatch(root, …)` tx. On-chain finality in ~1–2 min. DB rows flip
   `settlement_status: pending → settled` on the confirmed event.

### 2.2 Retiring (offsetting) credits
1. Client `POST /retirements` for a batch + quantity.
2. Ledger locks the credits (cannot be re-listed).
3. Settlement calls `RetirementVault.retire(...)` → burns ERC-1155 units, mints a
   **Retirement Certificate NFT** to the user, emits `CreditsRetired`.
4. On confirmation: generate PDF certificate (QR → tx hash), push notification, expose in
   the Transparency Explorer. Legacy registry serial marked retired (MVP: admin-attested).

### 2.3 Mining → credit conversion
1. User submits a green action (steps sync, referral, receipt). Mining service runs
   anti-fraud checks → awards **off-chain Prive Points**.
2. On "convert points → credits", Mining requests Tokenization to allocate fractional
   credits from a platform-held liquidity batch at the live conversion rate; Ledger credits
   the user's on-platform balance. (No per-action on-chain tx — gas-abstracted, netted.)

## 3. Cross-cutting design rules

- **Event sourcing on the hot path.** The matching engine's authoritative state is its Kafka
  event log; Redis holds a rebuildable snapshot. A cold start replays the log → deterministic
  book reconstruction. This is the crash-recovery and audit story.
- **Single writer per table.** Services never write each other's schemas. Cross-service reads
  go through APIs or the event bus, never direct DB reads.
- **Idempotency everywhere money moves.** Every state-changing financial request carries an
  `Idempotency-Key`; the Ledger dedupes. Kafka consumers are idempotent (dedupe on event id).
- **Off-chain is source of truth for *balances*; on-chain is source of truth for
  *existence & finality*.** Reconciliation job continuously diffs the two (see §05).
- **Gas abstraction.** Users never touch gas. A relayer with a funded gas tank submits
  meta-transactions; the Blockchain Gateway is the only component holding operational keys
  (in HSM/KMS, multi-sig for mint/treasury).

---

## 4. Architecture Decision Records

Each ADR: **Context → Decision → Consequences → Alternatives rejected.**

### ADR-001 — Hybrid off-chain matching, on-chain settlement
- **Context:** Users expect Binance-grade latency; regulators/ESG buyers expect auditability.
  Pure on-chain matching (every order a tx) cannot hit <100ms and is prohibitively gassy.
- **Decision:** Match off-chain in memory; settle on-chain in Merkle-batched transactions;
  anchor periodic order-book Merkle roots for tamper-evidence.
- **Consequences:** (+) real-exchange UX, low gas. (−) a trusted-operator window exists
  between match and on-chain finality — mitigated by event-sourced logs, published Merkle
  roots, and surveillance. Requires a robust reconciliation subsystem.
- **Rejected:** Full on-chain CLOB (latency/gas); pure AMM-only (poor price discovery for
  distinct vintages). AMM kept as a Phase-3 *fallback* for thin markets.

### ADR-002 — ERC-1155 for credits, optional ERC-20 index
- **Context:** Each project-vintage is distinct (metadata, verifier, geolocation, serial
  range) yet fungible *within* its batch. Buyers want both distinct credits and a liquid
  blended instrument.
- **Decision:** ERC-1155 where **token ID = project-vintage batch**. A wrapped ERC-20
  `PRIVE-CO2` index (Phase 2+) pools verified credits for a high-liquidity pair.
- **Consequences:** (+) natural fit for batches + cheap multi-transfer for batch settlement.
  (−) ERC-1155 is less "DeFi-native" than ERC-20 → the index token bridges that gap later.
- **Rejected:** One ERC-20 per vintage (contract sprawl); a single fungible ERC-20 for all
  credits (destroys provenance / enables greenwashing).

### ADR-003 — Polygon PoS at MVP, zkEVM-ready
- **Context:** A carbon platform cannot have a large energy footprint; needs low fees and
  EVM tooling maturity.
- **Decision:** Launch on Polygon PoS (mature, cheap, PoS). Keep contracts zkEVM-compatible
  (no PoS-specific assumptions) to migrate/bridge later.
- **Consequences:** (+) credible eco-footprint, rich tooling (Hardhat/Foundry, The Graph,
  Chainlink). (−) Polygon-specific reorg/finality characteristics to handle in the gateway.
- **Rejected:** Ethereum L1 (gas/energy); a novel L1 (tooling risk, credibility risk).

### ADR-004 — Rust for the matching engine
- **Context:** Target ≥10k orders/s, <10ms match, deterministic replay.
- **Decision:** Rust, single-threaded matching core per market (shard by market), Kafka for
  the event log, Redis for snapshots. (Go is the approved fallback if team velocity demands.)
- **Consequences:** (+) predictable latency, no GC pauses, memory safety. (−) smaller hiring
  pool, longer ramp. Isolate it behind a narrow gRPC/Kafka contract so the rest of the stack
  is agnostic to the choice.
- **Rejected:** Node.js matching (GC/latency jitter under load).

### ADR-005 — Per-service Postgres schemas, one physical cluster at MVP
- **Context:** "Single writer per service" without premature infra sprawl.
- **Decision:** One Postgres cluster, one schema per service, service-scoped DB roles that
  can only write their own schema. Split into separate clusters when a service's load or
  blast-radius warrants it.
- **Consequences:** (+) enforced ownership, cheap ops at MVP, easy local dev. (−) shared
  failure domain — accepted for Phase 1, revisit for the Ledger first.
- **Rejected:** DB-per-service from day one (ops overhead pre-scale); one shared schema
  (breaks ownership, invites cross-service coupling).

### ADR-006 — Double-entry ledger as the off-chain money source of truth
- **Context:** Balances, holds, fees, payouts must always reconcile; auditors will check.
- **Decision:** An append-only, double-entry ledger (every movement = balanced debit/credit
  across accounts). Balances are derived/materialized, never mutated in place.
- **Consequences:** (+) provable consistency, natural audit trail, reconcilable to chain.
  (−) more write volume and modeling discipline. Non-negotiable for a financial platform.
- **Rejected:** Mutable balance columns (unauditable, race-prone).

### ADR-007 — Kafka as the event backbone
- **Context:** Hot-path events feed many consumers (ledger, market data, surveillance,
  analytics, notifications) and need replay.
- **Decision:** Kafka as the durable, replayable event log; topics per domain; schema
  registry (Avro/Protobuf) for contract enforcement.
- **Consequences:** (+) decoupling, replay, crash recovery. (−) operational weight — accepted
  because event-sourcing is core to the recovery/audit design (ADR-001).
- **Rejected:** Direct service-to-service calls for events (tight coupling, no replay).

### ADR-008 — Custody via MPC (Fireblocks-class), 95%+ cold
- **Context:** Custodial model means we hold user assets → prime attack target.
- **Decision:** MPC wallet infra, 95%+ in cold storage, withdrawal allowlists + 24h delay on
  new addresses, multi-sig on all mint and treasury operations.
- **Consequences:** (+) institutional-grade key security. (−) vendor dependency/cost; **open
  question in README** on build-vs-buy at MVP.
- **Rejected:** Single hot key (catastrophic single point of failure).

### ADR-009 — The Graph for read-side chain indexing
- **Context:** The Transparency Explorer and portfolio views need fast historical on-chain
  queries; polling nodes directly is slow and brittle.
- **Decision:** A subgraph indexes mint/transfer/settle/retire events → GraphQL read API.
- **Consequences:** (+) fast, flexible reads decoupled from write path. (−) indexing lag
  (seconds) — acceptable for explorer/history, never used for balance-critical checks.
- **Rejected:** Ad-hoc RPC log scans (slow, rate-limited, no rich queries).

## 5. Environments & deployment

- **Environments:** `local` (docker-compose) → `dev` → `staging` (Polygon Amoy testnet) →
  `production` (Polygon mainnet). Contracts deploy to Amoy first; two independent audits gate
  mainnet (see §05).
- **Infra:** Kubernetes (EKS/GKE), Terraform IaC, GitHub Actions CI/CD, Grafana+Prometheus,
  Sentry, centralized structured logging. Secrets in KMS/HSM — never in env files.
- **Data stores:** managed Postgres + TimescaleDB, managed Redis, managed Kafka (MSK/Confluent),
  Elasticsearch for search/logs, Pinata/IPFS for documents & certificates.

## 6. Open questions (architecture)
1. Rust vs. Go for the engine — locks the hiring plan; decide before Sprint 3 (see §06).
2. One Kafka vs. Redis Streams at MVP — Kafka assumed; Redis Streams could defer ops load if
   the team is small. Affects §02 event tables and §06.
3. Managed Fireblocks vs. self-hosted MPC (custody) — README open question #3.
4. Do we need gRPC internally at MVP, or is REST-between-services fine until scale? (Leaning
   REST + Kafka for Phase 1 simplicity.)
