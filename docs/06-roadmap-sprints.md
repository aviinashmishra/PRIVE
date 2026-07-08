# 06 — Phase 1 Delivery Plan (Sprint Breakdown)

Phase 1 = the MVP from PRD §10: dual buyer onboarding, admin-minted tokenization of
pre-verified credits, spot trading on 3–5 pairs with live charts/order book, basic mining
(steps + referrals), on-chain retirement with certificate NFT, admin core, and the
Transparency Explorer. **Target: 3–4 months.**

Two-week sprints. Assumes a small cross-functional team (indicative roles below). Adjust
staffing to reality; the *sequence and dependencies* are the durable part.

## Indicative team

| Role | Count | Primary areas |
|---|---|---|
| Backend (NestJS) | 2–3 | identity, ledger, trading API, mining, admin BFF |
| Systems (Rust/Go) | 1 | matching engine, settlement gateway |
| Smart contracts | 1 | Solidity + audits liaison |
| Frontend (Next.js) | 2 | buyer app, admin console, explorer |
| DevOps/SRE | 1 | infra, CI/CD, observability, secrets |
| Design | 1 | trading terminal, mining hub, admin |
| Security/Compliance lead | 1 (shared) | §05 controls, audit + KYC vendor mgmt |
| PM | 1 | scope, the four README open questions, legal coordination |

## Dependency map (what must precede what)

```
Sprint 0  ─ foundations (infra, CI, skeleton, contracts on Amoy)
   │
   ├─ Identity/KYC ─┐
   ├─ Ledger ───────┼─ Trading API ─ Matching engine ─ Settlement ─ Retirement
   │                │        │              │              │
   └─ Market data ──┘        └── Buyer trading UI ─────────┘
                                     │
   Mining (parallel, needs Identity+Ledger) ─ Mining UI
   Admin core (parallel, needs each service's data) ─ Admin UI
   Transparency Explorer (needs chain events) ── last
```

---

## Sprint 0 — Foundations (2 wks)
**Goal:** everything needed to build safely and deploy repeatedly.
- Monorepo (Turborepo/nx): apps (`buyer-web`, `admin-web`, `explorer`), services, `contracts`,
  shared `packages` (types, config, ui).
- IaC (Terraform): VPC, K8s cluster, managed Postgres+TimescaleDB, Redis, Kafka, secrets in
  KMS. `local` docker-compose parity.
- CI/CD (GitHub Actions): lint, test, SAST/SCA, contract compile, preview deploys.
- Observability baseline (Prometheus/Grafana/Sentry), structured logging, `trace_id`.
- Contracts: Hardhat/Foundry scaffold; `PriveAccessControl` + `CreditRegistry` skeleton
  deployed to **Amoy testnet**; Gnosis Safe set up for roles.
- **Decide README open questions #1–#4** (jurisdiction, fiat-at-MVP, custody, registry) — PM +
  legal. These reshape later sprints; resolve now.

**Exit:** a "hello world" service and page deploy through the full pipeline to `dev`; contracts
verified on Amoy.

## Sprint 1 — Identity, accounts & KYC (2 wks)
- `identity` schema + service: register/login (email/phone/SSO/wallet-SIWE), sessions, MFA,
  RBAC, org membership, account switching.
- KYC/KYB integration (Sumsub or chosen vendor): case creation, doc upload → IPFS pin,
  webhook → status; tiered limits wired.
- Buyer onboarding UI: dual-track (individual vs. company) flows, tier gating.
- **Security:** Argon2id, field-level PII encryption, geo-gating stub. §05 controls started.

**Exit:** a user can sign up (both tracks), complete Tier-1 KYC in staging (sandbox vendor),
and receive a JWT with correct roles.

## Sprint 2 — Ledger & wallet (2 wks)
- `ledger` schema: double-entry engine, holds, balances (incremental balance table — §02 open
  Q1), assets, transfers.
- Deposit-address issuance + on-chain deposit detection (crypto). Withdrawal flow with
  allowlist + 24h new-address delay + maker-checker (corporate).
- Custody integration (Fireblocks-class or MPC per README #3).
- Idempotency + concurrency safety around all money writes.

**Exit:** a funded test account shows correct `available/held/posted`; a withdrawal honors the
24h delay and allowlist in staging.

## Sprint 3 — Matching engine + market config (2 wks)
- Rust/Go matching engine: in-memory price-time FIFO book, order intake gRPC/API, `TradeExecuted`
  → Kafka, Redis snapshot, self-trade prevention, price bands.
- Kafka topics + schema registry; event-sourced order log with replay-on-restart.
- `trading.markets` config; admin can create 3–5 markets.
- **Decide Rust vs. Go here at the latest** (§01 open Q1).

**Exit:** orders match deterministically under a replay test; engine sustains a load-test burst
(scaled target toward 10k/s); crash + replay reconstructs the identical book.

## Sprint 4 — Trading API + market data (2 wks)
- `trading` service: `POST/GET/DELETE /orders`, fills, portfolio; ledger-hold-before-match
  pipeline (§03).
- `market` service + TimescaleDB: tick ingestion, OHLCV continuous aggregates, REST candles/
  depth/trades/ticker.
- **WebSocket**: public (orderbook/trades/ticker/candles) + private (orders/balances) with
  <100ms fan-out target and seq-gap resubscribe.

**Exit:** place a limit order via API → see it in the book over WS → matched → ledger updates →
candle + tape update live.

## Sprint 5 — Tokenization + settlement + retirement (2 wks)
- `token` + `chain` services + Blockchain Gateway: admin-minted batches (`CreditRegistry`
  registerBatch → multi-sig mint), metadata → IPFS.
- `PriveEscrow` batched Merkle settlement wired to matched trades; settlement lifecycle
  (`pending→batched→settled`) + confirmation ingestion (`chain.events`).
- `RetirementVault`: retire flow → burn → certificate NFT → PDF (QR→tx) → notification.
- **Reconciliation job** (off-chain ledger vs. on-chain) — §05 safety net.

**Exit:** a pre-verified batch is admin-minted on Amoy; a trade settles on-chain within target
lag; a user retires credits and downloads a valid certificate whose QR resolves to the tx.

## Sprint 6 — Mining + admin core (2 wks)
- `mining` service: steps sync (Google Fit/Apple Health), referrals, streaks; points balance,
  daily caps, anti-fraud (device fingerprint, GPS heuristics, anomaly score); points→credit
  conversion from a platform liquidity batch.
- Mining hub UI: points counter, CO₂ meter, streak, leaderboard, convert.
- Admin core: overview KPIs, user management, KYC decision queue, market controls (create/
  halt/kill), mint trigger (multi-sig), surveillance alert list, disputes, treasury view,
  hash-chained audit log; FIDO2 + IP allowlist on admin.

**Exit:** a user earns points from steps + referral and converts to fractional credits; an
admin can approve KYC, mint a batch, and halt a market, with every action in the audit log.

## Sprint 7 — Transparency Explorer + hardening + launch prep (2 wks)
- The Graph subgraph indexing mint/transfer/settle/retire; public GraphQL explorer UI (no
  login) showing full credit lifecycle + platform stats.
- i18n (English + Hindi), WCAG 2.1 AA pass, skeleton loaders, optimistic order UI.
- **Security & release gates (§05):** pen test, load test, reconciliation game day,
  emergency-pause rehearsal; kick off the two contract audits + bug bounty (these run in
  parallel and **gate mainnet** — mainnet launch waits on their completion, which may extend
  past Sprint 7).
- Content: education ("what is a carbon credit / how mining works"), tutorial with first
  micro-credit reward.

**Exit:** full MVP demonstrable on staging/Amoy end-to-end; mainnet launch pending audit +
bounty sign-off and legal clearance.

---

## Milestones & gates

| Milestone | When | Gate |
|---|---|---|
| **M0 — Foundations** | end S0 | Pipeline deploys; Amoy contracts live; open questions resolved |
| **M1 — Onboarding+Wallet** | end S2 | KYC + funded balances working in staging |
| **M2 — Live trading** | end S4 | Order→match→settle-offchain→live charts/WS |
| **M3 — On-chain integrity** | end S5 | Mint + on-chain settle + retirement + reconciliation |
| **M4 — Full MVP (staging)** | end S7 | Mining + admin + explorer; all §05 gates started |
| **M5 — Mainnet launch** | post-S7 | **Both audits + bounty + legal sign-off complete** |

> M5 is intentionally *not* a fixed sprint. Two independent audits and a bug bounty cannot be
> compressed safely — treat the mainnet date as audit-gated, not calendar-gated (§05).

## What Phase 1 deliberately excludes (→ Phase 2/3)
Self-serve seller portal + verification pipeline; auctions/storefronts; corporate OTC/RFQ desk;
advanced order types (OCO/iceberg/TWAP/DCA); MRV oracle + streaming issuance; fiat on/off-ramp
(unless README #2 pulls a basic ramp into Phase 1); mobile apps; forward contracts; hybrid AMM;
PRIVE governance token + staking; regulator portal; institutional API. Interfaces for these are
reserved in §02–§04 so Phase 1 doesn't block them.

## Cross-cutting, every sprint
- Update these docs by PR when a decision changes (they are source of truth).
- §05 controls are acceptance criteria, not a final sprint — each feature ships with its
  auth, idempotency, encryption, and audit-logging in place.
- Demo at each sprint end against the two guiding questions: *can a trader trust the market?*
  and *can the planet trust the credit?*
