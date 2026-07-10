# 10 — Implementation Status (audited)

An honest, verified map of the dossier (01–09) against the running code. Three states:

- **✅ Built** — implemented and verified working end-to-end (production build, real HTTP calls).
- **🟡 Simulated** — fully interactive in-product, but powered by the deterministic in-app
  engine rather than external infrastructure. Disclosed in Terms §1.
- **⬜ Pending** — specified in the dossier, deliberately not yet implemented (usually gated
  on an open product/legal decision or external vendor).

Last audit: 2026-07-10 (commit series through `docs-verify` pass; verification = HTTP smoke
tests against the standalone production build and the Docker stack).

---

## Platform & portals

| Feature (doc) | Status | Notes |
|---|---|---|
| Luxury landing + live ticker (PRD) | ✅ | Scroll reveals, counters, ambient motion; `prefers-reduced-motion` honoured |
| Buyer portal: dashboard/markets/trade/portfolio/mining/offset (PRD §4) | ✅ / 🟡 | All screens live; pricing & matching are the in-app engine |
| Seller portal: dashboard/projects/inventory/revenue (PRD §4) | ✅ / 🟡 | Project submission → pipeline is real & persisted; inventory/revenue figures simulated |
| Admin console: overview/verification/users/surveillance/treasury/support (09) | ✅ / 🟡 | Verification queue, users list and support desk are real DB; surveillance & treasury are illustrative |
| Public Transparency Explorer (03 §GraphQL, 05 §6) | ✅ | `/explorer`, no login required (REST/page, not GraphQL yet) |
| Support center: tickets + threaded replies + admin desk | ✅ | `tickets`/`ticket_messages` tables (migration 0003) |
| Account settings: profile, password, session revocation | ✅ | Password change revokes all sessions and re-issues current device |
| Legal: Terms / Privacy / Cookies + consent banner | ✅ | `/legal/*`, public |

## Authentication & security (05 §2)

| Control | Status | Notes |
|---|---|---|
| Email+password, Argon2id hashing | ✅ | `@node-rs/argon2`, OWASP parameters |
| Mandatory email verification (6-digit OTP) | ✅ | 15-min expiry; re-issued on unverified login; SMTP or console fallback |
| Password reset flow | ✅ | 30-min token; revokes all sessions |
| Revocable sessions (JWT + server-side session table) | ✅ | httpOnly cookie; Settings lists/revokes devices |
| Deny-by-default RBAC (edge middleware + per-route guards) | ✅ | buyer/seller/admin; admin may enter all portals |
| Rate limiting + lockout on auth endpoints | ✅ | In-memory (single instance); Redis noted for multi-instance |
| TOTP / WebAuthn MFA; FIDO2-only admin; IP allowlist | ⬜ | Next security tier |
| SIWE wallet login | ⬜ | Specified in 03; gated on custody decision |
| KYC/KYB provider integration (Sumsub/Onfido) | ⬜ | Tier gating modelled in DB (`kyc_tier`); vendor not wired |

## Data & APIs (02, 03, openapi.yaml)

| Contract | Status | Notes |
|---|---|---|
| `POST /auth/register`, `/auth/login`, logout, me | ✅ | As `/api/auth/*` (signup/login/logout/me + verify/resend/forgot/reset/profile/change-password/sessions) |
| `GET /markets` | ✅ | DB-backed with in-memory fallback |
| `GET /markets/{symbol}` + `/candles` + `/orderbook` + `/trades` | ✅ | Served from the deterministic dataset the terminal renders |
| `POST /orders`, `GET /orders` | ✅ | Persisted per authenticated account |
| `DELETE /orders/{id}` (cancel) | ✅ | Owner-scoped; terminal cancel now propagates to the backend row |
| `GET/POST /retirements`, `GET /retirements/{id}` | ✅ | Certificate lookup by id or cert number |
| Projects pipeline (seller submit → admin advance/approve/reject) | ✅ | 8-stage pipeline persisted; admin-only decisions |
| `GET /api/admin/users` | ✅ | Real registered users joined with ledger accounts (admin-only) |
| `/wallet/balances`, `/portfolio`, `/mining/*` REST | 🟡 | Live in the client engine; REST surface deferred with it |
| WebSocket feeds (03 §WS) | 🟡 | Client tick loop stands in; same payload shapes |
| `/kyc/*`, `/auth/wallet/*`, `/auth/refresh` | ⬜ | Vendor / custody / token-rotation decisions pending |
| Matching engine (Rust/Go), Kafka event log, TimescaleDB (01) | 🟡 | In-app deterministic engine plays this role in the demo |

## Blockchain (04)

| Feature | Status | Notes |
|---|---|---|
| CreditRegistry (ERC-1155, mint blocked unless `registryRetired`) | ✅ | `contracts/` — 17 tests passing |
| RetirementVault (soulbound certificate NFT, burn-to-retire) | ✅ | Real burn tx verified on local Hardhat node via `/api/chain/retire` |
| PriveEscrow (Merkle-batched settlement), MiningRewards, AuditAnchor | ✅ | Deployed by script; app reads live via `/api/chain/status` |
| App ↔ chain wiring (ethers v6, ChainPanel on /offset) | ✅ | Panel shows offline when no RPC — run `npm run node` + `deploy:local` in `contracts/` |
| Testnet (Amoy) deployment | ⬜ | Ready; needs a funded key |
| Mainnet | ⬜ | Hard-gated on two audits + bounty (05 §3) |

## Operations

| Item | Status | Notes |
|---|---|---|
| Postgres persistence (Neon or any Postgres; dual driver) | ✅ | Drizzle; idempotent SQL migrations 0000–0003 |
| Docker: multi-stage image, compose stack (db/mailpit/migrate/web) | ✅ | Non-root runner; boot migrations via `RUN_MIGRATIONS=true` |
| Render deployment (blueprint + root Dockerfile) | ✅ | `render.yaml`; SMTP self-diagnosing logs; OTP falls back to logs on send failure |
| Transactional email (SMTP, Mailpit locally) | ✅ | Gmail verified live; provider swap = 4 env vars |
| Observability stack (Prometheus/Grafana/Sentry) (05 §7) | ⬜ | Console/structured logs only |
| Reconciliation job, circuit breakers, surveillance ML (05) | ⬜ | Admin UI illustrates the surfaces |

## Open decisions still blocking (README #1–4)

Launch jurisdiction · fiat rails at MVP · custody model · registry API integration. These
gate KYC vendor choice, payments, SIWE/custody, and automated `registryRetired` checks.
