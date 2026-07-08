# 03 — API Contracts

Three surfaces: **REST** (commands + queries), **WebSocket** (real-time market + private
streams), **GraphQL** (the public Transparency Explorer read API, backed by The Graph +
`chain.events`). Conventions below apply to all REST endpoints.

## Conventions

- **Base:** `https://api.priveexchange.com/v1`. Versioned in the path; breaking changes bump.
- **Auth:** `Authorization: Bearer <JWT>`. Access token ~15 min; refresh token rotated,
  stored hashed (`identity.sessions`). Wallet-connect uses SIWE (sign-in-with-Ethereum)
  challenge → JWT.
- **RBAC:** JWT carries `sub` (user), `act` (active account), `roles`, `scopes`. Gateway
  enforces coarse scope; services enforce fine-grained (e.g. `can_withdraw`).
- **Idempotency:** all money-moving `POST`s require `Idempotency-Key: <uuid>`. Replays return
  the original result.
- **Money in JSON:** decimal **strings**, never numbers (avoid float loss). e.g. `"12.500000"`.
- **Pagination:** cursor-based — `?limit=50&cursor=<opaque>`; response `{ data, next_cursor }`.
- **Errors:** RFC-7807 problem+json:
  ```json
  { "type":"https://api.priveexchange.com/errors/insufficient-funds",
    "title":"Insufficient available balance","status":422,
    "detail":"available 10.0 < required 12.5","instance":"/v1/orders",
    "trace_id":"01H..." }
  ```
- **Rate limits:** returned via `RateLimit-*` headers; public market data has a generous
  anonymous tier, private/order endpoints a stricter per-account tier.

---

## 1. Identity, KYC & accounts (`identity` service)

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /auth/register` | none | Individual/company sign-up (email/phone/SSO/wallet) |
| `POST /auth/login` | none | Password or SSO → tokens |
| `POST /auth/wallet/challenge` | none | Get SIWE nonce for wallet login |
| `POST /auth/wallet/verify` | none | Submit signed SIWE message → tokens |
| `POST /auth/refresh` | refresh | Rotate access token |
| `POST /auth/logout` | yes | Revoke session |
| `POST /auth/mfa/enroll` · `/verify` | yes | TOTP/WebAuthn enrollment |
| `GET  /me` | yes | Current user + active account + tier |
| `POST /accounts/switch` | yes | Switch active account (company staff) |
| `POST /kyc/cases` | yes | Start a KYC/KYB case for a target tier |
| `POST /kyc/cases/{id}/documents` | yes | Attach doc (returns IPFS CID after pin) |
| `GET  /kyc/cases/{id}` | yes | Case status (polls provider result) |
| `POST /webhooks/kyc/{provider}` | signed | Provider callback → advance case status |
| `POST /orgs/{accountId}/members` | owner/admin | Invite staff, set role + flags |

**Example — register (company):**
```http
POST /v1/auth/register
{ "type":"company",
  "email":"treasury@acme.com",
  "company":{"legal_name":"Acme Steel Ltd","registration_number":"U27100MH...",
             "incorporation_country":"IN","industry_sector":"steel"} }
→ 201 { "account_id":"...","user_id":"...","kyc_tier":"tier0",
        "next":"submit KYB via POST /kyc/cases" }
```

---

## 2. Wallet & Ledger (`ledger` service)

| Method & path | Auth | Purpose |
|---|---|---|
| `GET  /wallet/balances` | yes | All asset balances: `posted`, `held`, `available` |
| `GET  /wallet/balances/{asset}` | yes | Single asset |
| `POST /wallet/deposit-address` | yes | Get/create a deposit address (crypto) |
| `POST /wallet/withdrawals` | yes + `can_withdraw` | Request withdrawal (Idempotency-Key) |
| `GET  /wallet/transfers` | yes | Deposit/withdrawal history |
| `POST /wallet/withdrawals/{id}/approve` | checker role | Maker-checker approval (corporate) |

**Withdrawal rules enforced server-side:** address allowlist, **24h delay on new addresses**,
tier withdrawal caps, AML screening on destination. New-address withdrawals return
`status:"held_24h"` with `available_at`.

```http
POST /v1/wallet/withdrawals
Idempotency-Key: 6f1c...
{ "asset":"USDT","amount":"500.00","address":"0xabc...","network":"polygon" }
→ 202 { "id":"...","status":"held_24h","available_at":"2026-07-08T09:00:00Z" }
```

---

## 3. Market data (public — `market` service)

Public, cache-friendly, anonymous-rate-limited. Feeds the trading terminal + explorer.

| Method & path | Purpose |
|---|---|
| `GET /markets` | List all markets: symbol, last, 24h %, 24h vol, status |
| `GET /markets/{symbol}` | Market detail + config (tick/lot/min-notional/fees) |
| `GET /markets/{symbol}/orderbook?depth=50` | Snapshot of top-of-book bids/asks |
| `GET /markets/{symbol}/trades?limit=100` | Recent trades tape |
| `GET /markets/{symbol}/candles?interval=1m&from=&to=` | OHLCV from TimescaleDB |
| `GET /markets/{symbol}/ticker` | 24h rolling stats |

```http
GET /v1/markets/AMZN-RF25-USDT/candles?interval=1h&limit=200
→ 200 { "data":[ {"t":1720339200,"o":"11.20","h":"11.85","l":"11.10",
                  "c":"11.60","v":"4210.5"}, ... ] }
```

---

## 4. Trading (private — `trading` service)

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /orders` | yes + `can_trade` | Place order (Idempotency-Key required) |
| `GET  /orders?status=open` | yes | List own orders |
| `GET  /orders/{id}` | yes | Order detail + fills |
| `DELETE /orders/{id}` | yes | Cancel |
| `DELETE /orders?market=` | yes | Cancel all in a market |
| `GET  /fills?market=&from=` | yes | Own trade history |
| `GET  /portfolio` | yes | Holdings by batch, cost basis, unrealized P&L, CO₂ potential |

**Place order — request/validation pipeline:**
```http
POST /v1/orders
Idempotency-Key: a12...
{ "market":"AMZN-RF25/USDT","side":"buy","type":"limit","tif":"gtc",
  "price":"11.55","quantity":"100" }
```
Server sequence: RBAC + tier limits → tick/lot/min-notional validation → **place ledger hold**
on `100 × 11.55 = 1155 USDT` (+ estimated taker fee) → forward to matching engine → return.
```http
→ 201 { "id":"...","status":"open","filled_qty":"0",
        "hold_id":"...","fee_estimate":"2.31","co2_tonnes":"100" }
```
On reject (band breach, insufficient available, market halted): `422/409` problem+json, hold
released.

**Order-type support (Phase 1 vs later):** `market`, `limit`, `stop_limit`, `stop_market` at
MVP. `oco`, `iceberg`, `twac` (TWAP), recurring-buy (DCA) are Phase 2 — endpoint accepts a
`type` it doesn't yet support with `501`/feature-flag until enabled.

---

## 5. Retirement / Offset (`chain` + `token`)

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /retirements` | yes | Retire (burn) credits for offsetting (Idempotency-Key) |
| `GET  /retirements` | yes | Own retirement history |
| `GET  /retirements/{id}` | yes | Status + certificate NFT id + PDF/QR link |
| `GET  /retirements/{id}/certificate.pdf` | yes | Downloadable certificate |

```http
POST /v1/retirements
Idempotency-Key: ...
{ "batch_id":"...","quantity":"50","beneficiary":"Acme Steel Ltd FY2026" }
→ 202 { "id":"...","status":"pending","tx_hash":null }
# on-chain confirm → GET returns:
{ "id":"...","status":"confirmed","certificate_token_id":"8801",
  "tx_hash":"0x...","certificate_ipfs_cid":"bafy...",
  "explorer_url":"https://priveexchange.com/explorer/tx/0x..." }
```

---

## 6. Mining (`mining` service)

| Method & path | Auth | Purpose |
|---|---|---|
| `GET  /mining/summary` | yes | Points, CO₂-saved meter, streak, rank |
| `POST /mining/actions` | yes (tier1+) | Submit a green action for verification |
| `GET  /mining/actions` | yes | Action history + statuses |
| `GET  /mining/conversion-rate` | yes | Live points→credit rate |
| `POST /mining/convert` | yes | Convert points → fractional credits (Idempotency-Key) |
| `GET  /mining/leaderboard?scope=city` | yes | City/country/global leaderboard |

Anti-fraud runs server-side on submit (device fingerprint, GPS spoof heuristics, daily cap,
anomaly score). Actions may return `status:"verifying"` and settle async → notification.

---

## 7. Seller portal (Phase 2 surface — stubbed at MVP)

Documented now so Phase-1 tokenization is compatible. Full pipeline in Phase 2.

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /seller/projects` | seller | Submit a project (docs → IPFS) |
| `GET  /seller/projects/{id}` | seller | Verification-pipeline status tracker |
| `POST /seller/projects/{id}/documents` | seller | Attach PDD/verifier certs |
| `GET  /seller/inventory` | seller | Minted/listed/sold/retired per batch |
| `POST /seller/listings` | seller | Order-book / storefront / auction listing |
| `GET  /seller/payouts` | seller | Revenue + payout center |

At MVP, tokenization is **admin-minted** for pre-verified credits; seller self-serve
submission is accepted and queued but minting is triggered from the admin console (§8).

---

## 8. Admin API (`admin`/BFF — separate host, hardware-key MFA)

| Method & path | Role | Purpose |
|---|---|---|
| `GET  /admin/overview` | any admin | KPI wall, system health |
| `GET  /admin/users?query=` | support+ | Search users/companies (PII masked for support) |
| `POST /admin/kyc/{caseId}/decision` | compliance | Approve/reject/request-info |
| `POST /admin/accounts/{id}/freeze` | compliance | Freeze/unfreeze |
| `POST /admin/projects/{id}/advance` | verification | Move pipeline stage |
| `POST /admin/batches/{id}/mint` | verification (multi-sig) | Trigger tokenization mint |
| `POST /admin/markets` · `PATCH /admin/markets/{id}` | market-ops | Create/config market |
| `POST /admin/markets/{id}/halt` | market-ops | Circuit breaker / kill switch |
| `POST /admin/trades/{id}/cancel` | market-ops | Cancel/rollback w/ on-chain correction record |
| `GET  /admin/surveillance/alerts` | market-ops | Wash/spoof/pump alerts |
| `GET  /admin/mining/fraud` | market-ops | Flagged actions, device farms |
| `GET  /admin/treasury` | finance | Hot/cold balances, float, reconciliation |
| `POST /admin/payouts/{id}/approve` | finance (checker) | Maker-checker payout |
| `GET  /admin/disputes` · `POST /admin/disputes/{id}/resolve` | support+ | Dispute center |
| `GET  /admin/audit-log` | super | Immutable, hash-chained action log |

Every admin mutation writes `admin.audit_log` (hash-chained, periodically anchored on-chain —
§02, §04). Mint and treasury actions are **multi-sig protected** — the API records intent;
the on-chain execution needs quorum signatures (§04).

---

## 9. WebSocket API

Two endpoints: **public** `wss://stream.priveexchange.com/public` (no auth) and **private**
`wss://stream.priveexchange.com/private` (JWT in the connect payload). JSON messages;
subscribe/unsubscribe model; server heartbeats every 15s; clients must pong.

**Public channels:**
```json
// subscribe
{ "op":"subscribe", "channels":["orderbook:AMZN-RF25/USDT",
                                 "trades:AMZN-RF25/USDT",
                                 "ticker:AMZN-RF25/USDT",
                                 "candles:AMZN-RF25/USDT:1m"] }
```
- `orderbook:{market}` — snapshot then incremental deltas (`{bids:[[price,size]],asks:[…],seq}`);
  `seq` gaps → client resubscribes for a fresh snapshot. Target <100ms fan-out.
- `trades:{market}` — each print `{price,size,side,ts}`.
- `ticker:{market}` — rolling 24h stats on change.
- `candles:{market}:{interval}` — closed + forming candle updates.

**Private channels (authenticated):**
- `orders` — own order lifecycle (open→partial→filled/cancelled).
- `balances` — balance/hold changes.
- `retirements` — retirement confirmation events.
- `mining` — points awarded / action verified.

---

## 10. GraphQL — Transparency Explorer (public, no login)

Read-only, backed by The Graph subgraph + `chain.events`. Lets anyone audit a credit's full
lifecycle: issuance → verification → trades → retirement.

```graphql
type Query {
  batch(onchainTokenId: BigInt!): CreditBatch
  batches(projectType: ProjectType, standard: CreditStandard, first: Int, skip: Int): [CreditBatch!]!
  retirement(certificateTokenId: BigInt!): Retirement
  transaction(hash: String!): ChainTx
  stats: PlatformStats!            # total tonnes tokenized / traded / retired
}

type CreditBatch {
  onchainTokenId: BigInt!
  project: Project!
  vintageYear: Int!
  standard: CreditStandard!
  registrySerialRange: String
  totalMinted: BigDecimal!
  totalRetired: BigDecimal!
  metadataURI: String!             # IPFS
  mintTx: ChainTx!
  transfers(first: Int): [Transfer!]!
  retirements: [Retirement!]!
}

type Retirement {
  certificateTokenId: BigInt!
  batch: CreditBatch!
  quantity: BigDecimal!
  beneficiary: String
  retiredBy: String!               # address
  tx: ChainTx!
  certificateURI: String!          # PDF on IPFS
}
```
No authentication; aggressively cached; the "can the planet trust the credit?" surface.

---

## Open questions (API)
1. gRPC vs. REST for internal service-to-service (leaning REST + Kafka at MVP — §01).
2. Public REST rate-limit tiers and API-key issuance for institutional/algo traders (Phase 3
   deliverable, but reserve the auth model now).
3. SIWE domain-binding + replay-window policy for wallet login — security review with §05.
4. Whether candle endpoints should also stream historical backfill over WS or stay REST-only
   (leaning REST for history, WS for live).
