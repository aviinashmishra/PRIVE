# Prive Exchange — Buyer / Trader Web App

The flagship trading experience: a real, running **Next.js 14 + TypeScript + Tailwind**
application with a green-and-white luxury design system. Spec-aligned with the engineering
dossier in [`/docs`](../../docs).

## Run it

```bash
cd apps/buyer-web
npm install
npm run dev
# open http://localhost:3000
```

`npm run build` for a production build (standalone output — serve with
`node .next/standalone/server.js`, which is what the Docker image does).

### …or run the whole platform with Docker

From the repo root:

```bash
cp .env.example .env      # optional — every value has a dev default
docker compose up --build
```

| Service | URL | What it is |
|---|---|---|
| `web` | http://localhost:3000 (or `WEB_PORT`) | This app (production build, non-root runner) |
| `mailpit` | http://localhost:8025 | Local inbox — all verification/reset emails land here |
| `db` | localhost:5432 | Postgres 16 (`prive`/`prive_dev_password`) |
| `migrate` | one-shot | Applies `db/migrations/*.sql` then seeds users + markets |

## Authentication (end-to-end, per docs/05 §2)

Full email + password auth with **email verification behind a flag**
(`REQUIRE_EMAIL_VERIFICATION` — currently `false` in deployments without reliable
SMTP; signup activates the account and signs in immediately. Set it `true` to
restore the mandatory OTP flow below):

- **Argon2id** password hashing (`@node-rs/argon2`, OWASP parameters), generic error
  messages, timing-equalised lookups, 5-failure / 15-min lockout, per-IP + per-account
  rate limits on every auth endpoint.
- **Sessions:** signed JWT (`jose`, HS256 via `AUTH_SECRET`) in an `httpOnly` cookie +
  a server-side `sessions` row so logout/reset genuinely revoke. 7-day TTL.
- **Email flows:** 6-digit verification code (15 min) on signup and on any login while
  unverified; password-reset link (30 min) that revokes all sessions. SMTP via
  `nodemailer` (`SMTP_*` env) — without SMTP configured, emails print to the console.
- **RBAC, deny-by-default:** `middleware.ts` gates every page/API on the edge
  (`buyer → /dashboard…`, `seller → /seller`, `admin → /admin`; admins may enter all
  portals), and every API route re-checks with `requireAuth`/`requireRole` plus a DB
  revocation check. Orders/retirements/projects are scoped to the session's account.

Pages: `/login`, `/signup` (trader or seller), `/verify-email`, `/forgot-password`,
`/reset-password`. Seeded users (verified, passwords overridable via `SEED_*_PASSWORD`):

| Email | Password | Portal |
|---|---|---|
| `trader@prive.exchange` | `Trader!Prive2026` | Buyer `/dashboard` |
| `seller@prive.exchange` | `Seller!Prive2026` | Seller `/seller` |
| `admin@prive.exchange` | `Admin!Prive2026` | Admin `/admin` |

Not yet implemented from docs/05 (production hardening beyond this demo): TOTP/WebAuthn
MFA, FIDO2-only admin + IP allowlist, SIWE wallet login, KMS-held secrets.

## What's here

| Route | Screen |
|-------|--------|
| `/` | Luxury marketing landing with a live market ticker |
| `/dashboard` | Portfolio overview, holdings, top movers, open orders |
| `/markets` | Searchable, filterable live market table |
| `/trade/[symbol]` | Full trading terminal — candlestick chart, live order book, trade panel, trades tape, open orders |
| `/portfolio` | Allocation donut, holdings P&L, order history |
| `/mining` | Proof-of-Green-Action hub — earn actions, streak, points→credits conversion, leaderboard |
| `/offset` | Carbon retirement flow with on-chain-style certificate generation |
| `/seller` · `/seller/projects` · `/seller/inventory` · `/seller/revenue` | **Seller portal** (light, back-office feel): submit projects, track verification, manage tokenised inventory, revenue & payouts |
| `/admin` · `/admin/verification` · `/admin/users` · `/admin/surveillance` · `/admin/treasury` | **Admin console** (dark mission-control): KPI wall, verification queue, user management, market surveillance + circuit breakers, treasury maker-checker |

Switch between the three portals via the switcher in each header, or the "Choose how you
enter" section on the landing page.

### The cross-actor workflow (real, persisted to Neon)

The three dashboards are connected by one persisted pipeline:

1. **Seller** submits a project at `/seller/projects` → `POST /api/projects` → row in Neon (`stage: Submitted`).
2. **Admin** works the queue at `/admin/verification` → `PATCH /api/projects/:id` to **advance** through
   the 8-stage pipeline, **approve** (auto-tokenises → `stage: Live`, gets a token id), **reject**, or **request info**.
3. Both portals read the same `projects` table, so the seller sees status change live.

Verified end-to-end against Neon: submit → advance ×5 → approve → `status: live, tokenId` persisted.

## Database — Neon Postgres

The **Offset / Retirements** module and **order history** are wired to a real backend:
Next.js Route Handlers (`app/api/*`) backed by **Neon serverless Postgres** via Drizzle ORM.
Live pricing, matching, and the rest of the portfolio remain the in-memory simulation.

**Connect Neon:**

```bash
cp .env.example .env.local        # then paste your Neon pooled connection string
npm run db:setup                  # runs the migration + seeds account, markets, a sample cert
npm run dev
```

- `npm run db:migrate` — applies every `db/migrations/*.sql` in order (idempotent)
- `npm run db:seed` — seeds accounts, the three demo users, market catalog, and one sample retirement
- Health check: open `http://localhost:3000/api/health` → `"database": "neon"` when connected.
- Works with **any Postgres**, not just Neon: non-`neon.tech` URLs automatically use the
  node-postgres driver (this is how the Docker stack connects).

**No `DATABASE_URL`?** The app still runs — API routes fall back to an in-memory store, and the
Offset page shows an "In-memory" badge instead of "Persisting to Neon". Drop in the URL and the
same code path persists to Postgres with zero changes.

Schema (`db/schema.ts`) and migration mirror the production data model in
[`/docs/02-data-model.md`](../../docs/02-data-model.md).

## How the rest works

The remaining screens are a **front-end demonstration** — fully *interactive* (place/cancel
orders, mine points, live charts) backed by an **in-memory simulated engine**, not yet a real
backend or blockchain.

- **State & simulation:** [`lib/store.ts`](lib/store.ts) — a Zustand store that ticks prices,
  regenerates order books, streams trades, and holds the portfolio / balances / orders.
- **Live feel:** [`components/app/SimulationProvider.tsx`](components/app/SimulationProvider.tsx)
  drives the tick loop (and gates first paint to avoid hydration mismatch).
- **Seed data:** [`lib/data.ts`](lib/data.ts) — deterministic markets, candles, projects.

The store is deliberately shaped like the API contracts in
[`/api/openapi.yaml`](../../api/openapi.yaml) and [`/docs/03-api-contracts.md`](../../docs/03-api-contracts.md),
so swapping the simulation for real REST + WebSocket calls is a drop-in replacement per module.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zustand · lightweight-charts
(TradingView) · lucide-react · next/font (Manrope, Fraunces, JetBrains Mono).

## Design system

Green-and-white luxury: emerald spine with forest depths and a champagne-gold whisper.
Tokens in [`tailwind.config.ts`](tailwind.config.ts) and [`app/globals.css`](app/globals.css).
Display serif (Fraunces) for headlines, geometric sans (Manrope) for UI, mono (JetBrains) for
all figures with tabular alignment.
