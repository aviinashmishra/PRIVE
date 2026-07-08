# PRIVE

**Prive Exchange** — a blockchain-based carbon-credit exchange: crypto-exchange UX for
tokenised, registry-retired carbon credits. Buy, trade, and offset with full on-chain
provenance; sellers tokenise verified projects; admins run the verification pipeline.

## What's in this repo

| Path | What it is |
|---|---|
| [`apps/buyer-web/`](apps/buyer-web) | The **runnable platform** — Next.js 14 app with all three portals (trader `/dashboard`, seller `/seller`, admin `/admin`), full email+password auth, Postgres persistence, Docker packaging |
| [`contracts/`](contracts) | Solidity smart contracts (Hardhat + OpenZeppelin): ERC-1155 credit registry, soulbound retirement certificates, escrow settlement, audit anchoring — 17 tests passing |
| [`docs/`](docs) | Engineering dossier (architecture, data model, API contracts, smart contracts, security & compliance, roadmap, threat model, admin UX) |
| [`api/openapi.yaml`](api/openapi.yaml) | OpenAPI 3.1 REST contract |

## Quick start (Docker — the whole platform)

```bash
cp .env.example .env        # optional: set AUTH_SECRET + seed passwords
docker compose up --build
```

- **App** → http://localhost:3000 (or `WEB_PORT` from `.env`)
- **Mailbox (Mailpit)** → http://localhost:8025 — verification codes & reset emails land here
- **Postgres 16** → localhost:5432 — migrated and seeded automatically

Demo users: `trader@prive.exchange`, `seller@prive.exchange`, `admin@prive.exchange`
(passwords default to `Trader!Prive2026` etc., overridable via `SEED_*_PASSWORD`).

## Deploy to Render

This repo ships a [Render Blueprint](render.yaml):

1. Push to GitHub, then in Render: **New → Blueprint** → select this repo.
2. Render provisions the `prive-db` Postgres and the `prive-exchange` Docker web service.
   `AUTH_SECRET` is generated; `RUN_MIGRATIONS=true` makes the container apply
   migrations + seed on boot (idempotent).
3. After the first deploy, set **`APP_URL`** to your Render URL (used in emailed links)
   and add **SMTP credentials** (Resend/Postmark/SES/Brevo…) so verification and
   password-reset emails are actually delivered — without SMTP they print to the logs.
4. Set `SEED_*_PASSWORD` env vars before first boot to control the demo-user passwords.

## Local development

```bash
cd apps/buyer-web
npm install
cp .env.example .env.local   # add a Postgres/Neon DATABASE_URL (optional)
npm run db:setup             # migrate + seed (skip if no DATABASE_URL)
npm run dev                  # http://localhost:3000
```

Without `DATABASE_URL` the app still runs against an in-memory store (demo users only).
See [`apps/buyer-web/README.md`](apps/buyer-web/README.md) for the full feature and
auth documentation, and [`docs/`](docs) for the production architecture the build follows.

## Security posture (docs/05)

Argon2id password hashing · mandatory email verification · revocable JWT sessions
(httpOnly cookie + server-side session table) · deny-by-default RBAC enforced in edge
middleware **and** per-route guards · rate limiting + lockout on auth endpoints · secrets
only via environment. Production items still open: TOTP/WebAuthn MFA, FIDO2-only admin,
SIWE wallet login, KMS-managed secrets, contract audits before mainnet.
