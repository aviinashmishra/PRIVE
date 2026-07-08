# 08 — Monorepo Skeleton (Sprint 0)

The exact repository layout to stand up in Sprint 0, as a **specification** — a team can create
it verbatim. No application logic here; this defines *where things live*, *how they build*, and
*the boundaries the code must respect* (schema-per-service, single-writer — ADR-005). Tooling
follows PRD §8: **Turborepo + pnpm** workspace, Next.js apps, NestJS services, a Rust matching
engine, and a Foundry/Hardhat contracts package.

## Top-level layout

```
prive-exchange/
├─ apps/                      # deployable frontends
│  ├─ buyer-web/              # Next.js 14 — trading terminal + mining hub (dark, green accent)
│  ├─ seller-web/             # Next.js 14 — seller portal (light) [scaffold now, build Phase 2]
│  ├─ admin-web/              # Next.js 14 — mission-control console (see docs/09)
│  └─ explorer-web/           # Next.js 14 — public Transparency Explorer (no auth)
│
├─ services/                  # deployable backends (one bounded context each — §01)
│  ├─ gateway/                # API gateway config (Kong/Envoy) or a thin NestJS BFF edge
│  ├─ identity/               # NestJS — accounts, users, KYC/KYB, RBAC, sessions  [schema: identity]
│  ├─ ledger/                 # NestJS — double-entry ledger, wallet, transfers    [schema: ledger]
│  ├─ trading/                # NestJS — order intake API, portfolio, fills        [schema: trading]
│  ├─ market-data/            # NestJS — OHLCV, ticker/depth, WS fan-out           [schema: market]
│  ├─ tokenization/           # NestJS — projects, credit batches, mint orchestration [schema: token]
│  ├─ settlement/             # NestJS — blockchain gateway: sign/settle/ingest    [schema: chain]
│  ├─ mining/                 # NestJS — points, actions, anti-fraud, conversion   [schema: mining]
│  ├─ notification/           # NestJS — email/push/webhook                        [schema: notify]
│  └─ admin-bff/              # NestJS — admin console backend-for-frontend, audit [schema: admin]
│
├─ engine/                    # NOT a JS workspace — Rust (cargo) matching engine
│  └─ matching/               # in-memory CLOB, Kafka log, Redis snapshot (ADR-004)
│
├─ contracts/                 # Foundry + Hardhat — Solidity (docs/04)
│  ├─ src/                    # CreditRegistry.sol, PriveEscrow.sol, RetirementVault.sol, ...
│  ├─ test/                   # Foundry unit + invariant/fuzz tests
│  ├─ script/                 # deploy + Safe wiring scripts (Amoy → mainnet)
│  └─ foundry.toml / hardhat.config.ts
│
├─ subgraph/                  # The Graph subgraph for the explorer (ADR-009)
│
├─ packages/                  # shared, versioned workspace libraries
│  ├─ contracts-sdk/          # typechain/viem bindings generated from contracts/ ABIs
│  ├─ api-types/              # types generated from api/openapi.yaml (client + server)
│  ├─ ui/                     # shared React component library + theme tokens
│  ├─ config/                 # tsconfig/eslint/prettier presets, env schema (zod)
│  ├─ money/                  # decimal-string math helpers (NEVER float) — used everywhere
│  ├─ events/                 # Kafka topic names + Avro/Protobuf schemas + typed producer/consumer
│  ├─ auth/                   # JWT verify, RBAC guards, SIWE helpers (shared by services)
│  └─ observability/          # logger, tracing, metrics wrappers (Sentry/OTel/Prometheus)
│
├─ api/
│  └─ openapi.yaml            # source-of-truth REST contract (already written)
│
├─ db/
│  ├─ migrations/             # per-schema SQL migrations (one folder per service schema)
│  └─ seed/                   # local/dev seed data (test markets, fixtures)
│
├─ infra/
│  ├─ terraform/              # VPC, K8s, Postgres/Timescale, Redis, Kafka, KMS, IPFS/Pinata
│  ├─ k8s/                    # Helm charts / manifests per service
│  └─ docker/                 # Dockerfiles + docker-compose.yml (local full-stack parity)
│
├─ docs/                      # this documentation set (01–09 + diagrams)
├─ .github/workflows/         # CI/CD pipelines (see below)
├─ turbo.json                 # task graph + caching
├─ pnpm-workspace.yaml        # workspace globs: apps/*, services/*, packages/*
├─ package.json               # root scripts
└─ README.md
```

## Boundary rules the layout enforces

1. **One service owns one schema.** A service in `services/<x>/` may only run migrations for and
   write to its own schema in `db/migrations/<x>/`. Cross-schema reads go through another
   service's API or a Kafka event — never a direct query. (ADR-005; enforced by per-service DB
   roles at runtime, and by code review + a lint rule on DB client instantiation.)
2. **`packages/money` is mandatory** for any monetary arithmetic. A lint rule bans
   `parseFloat`/`Number(` on amount fields. (Mirrors the decimal-string contract in
   [03](./03-api-contracts.md) and `api/openapi.yaml`.)
3. **`packages/events` is the only place topic names + schemas live.** Producers/consumers
   import typed helpers; no stringly-typed topics.
4. **Generated code is generated, not hand-edited.** `packages/api-types` regenerates from
   `api/openapi.yaml`; `packages/contracts-sdk` regenerates from compiled ABIs. CI fails if the
   checked-in output drifts from a fresh generation.
5. **The engine is language-isolated.** `engine/` is Rust with its own toolchain; it talks to
   the JS world only via the gRPC/Kafka contracts in `packages/events` — so ADR-004's language
   choice never leaks into the rest of the stack.

## Standard service internal layout (NestJS)

```
services/<name>/
├─ src/
│  ├─ main.ts                 # bootstrap (imports @prive/observability, @prive/auth)
│  ├─ app.module.ts
│  ├─ modules/                # feature modules (controllers + services + DTOs)
│  ├─ domain/                 # entities, value objects, domain services (no framework deps)
│  ├─ infra/                  # repositories, DB client (scoped to THIS schema), external clients
│  ├─ events/                 # Kafka producers/consumers (typed via @prive/events)
│  └─ config/                 # zod-validated env (via @prive/config)
├─ test/                      # unit + integration (testcontainers for pg/redis/kafka)
├─ Dockerfile
├─ package.json
└─ tsconfig.json              # extends @prive/config preset
```

## Standard Next.js app layout

```
apps/<name>/
├─ app/                       # App Router routes
├─ components/                # app-specific (shared ones live in @prive/ui)
├─ lib/                       # api client (from @prive/api-types), ws client, hooks
├─ store/                     # Zustand/Redux state
├─ styles/                    # Tailwind config + theme (imports @prive/ui tokens)
├─ public/
├─ next.config.js
└─ package.json
```

## Environments & config

- `packages/config` exports a **zod env schema** per runtime; services fail fast on boot if a
  required var is missing. No secrets in the repo — injected from KMS/K8s secrets (§05).
- `.env.example` at root documents every variable; `docker-compose.yml` in `infra/docker`
  brings up Postgres+Timescale, Redis, Kafka, and a local IPFS for full-stack local dev.
- Four environments (§01): `local → dev → staging(Amoy) → production(mainnet)`.

## CI/CD (`.github/workflows/`)

| Workflow | Triggers | Does |
|---|---|---|
| `ci.yml` | PR | Affected-only (Turbo) lint, typecheck, unit/integration tests, `pnpm build` |
| `contracts.yml` | PR touching `contracts/` | `forge build` + `forge test` (incl. invariants), Slither, gas report |
| `codegen-check.yml` | PR | Regenerate `api-types` + `contracts-sdk`; fail if diff (prevents drift) |
| `security.yml` | PR + nightly | Semgrep/CodeQL SAST, Snyk/Dependabot SCA, secret scan, SBOM |
| `deploy-dev.yml` | merge to `main` | Build+push images, Helm deploy to `dev`, run smoke tests |
| `deploy-staging.yml` | tag `staging-*` | Deploy to staging; deploy contracts to Amoy via Safe |
| `deploy-prod.yml` | tag `v*` (manual approval) | Prod deploy; **gated by §05 release checklist** |

## Turborepo task graph (`turbo.json` intent)

```jsonc
{
  "pipeline": {
    "build":    { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "test":     { "dependsOn": ["build"] },
    "lint":     {},
    "typecheck":{ "dependsOn": ["^build"] },
    "codegen":  { "outputs": ["src/generated/**"] }   // openapi + abi bindings
  }
}
```
`^build` = build dependencies first; remote caching on in CI so PRs only rebuild what changed.

## Sprint-0 "definition of done" for the skeleton
- [ ] `pnpm install && pnpm build` green from a clean clone.
- [ ] `docker-compose up` brings the full local stack (all data stores + one hello service + one page).
- [ ] One service (`identity`) and one app (`buyer-web`) deploy through CI to `dev`.
- [ ] `contracts/` compiles + a sample Foundry test passes; `PriveAccessControl` + `CreditRegistry`
      skeletons deploy to Amoy; Gnosis Safe wired for roles.
- [ ] `codegen-check.yml` proves `api-types` regenerate cleanly from `api/openapi.yaml`.
- [ ] Every service boots with zod-validated env and structured logging + tracing.

> This satisfies the Sprint-0 exit criteria in [06-roadmap-sprints.md](./06-roadmap-sprints.md).

## Open questions (repo/tooling)
1. pnpm+Turborepo (assumed) vs. Nx — both fine; Nx adds generators/graph tooling at the cost of
   more config. Decide in Sprint 0.
2. Gateway as Kong/Envoy config vs. a thin NestJS edge BFF — leaning managed gateway + a small
   BFF only where the frontends need aggregation.
3. Whether `engine/` lives in this monorepo or a sibling repo — in-repo (shown) keeps the
   event-contract in `packages/events` atomic with the consumers; a split repo needs versioned
   contract publishing. Leaning in-repo for Phase 1.
