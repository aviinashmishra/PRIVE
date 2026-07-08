# Prive Exchange — Engineering Documentation

Technical planning artifacts derived from the Master Build Prompt (PRD). This doc set
translates the product vision into buildable engineering specifications: architecture
decisions, data models, API contracts, smart-contract interfaces, security controls, and
a Phase-1 sprint plan.

> **Status:** Planning / pre-implementation. No application code has been written yet.
> These documents are the source of truth a team builds against. Keep them versioned in
> the repo and update them via PR as decisions change.

## How to read this set

| # | Document | Answers the question |
|---|----------|----------------------|
| 00 | [README.md](./README.md) | What is this, and where do I start? |
| 01 | [01-architecture.md](./01-architecture.md) | How is the system structured, and why these choices? (ADRs) |
| 02 | [02-data-model.md](./02-data-model.md) | What data do we store, in what shape? (SQL DDL) |
| 03 | [03-api-contracts.md](./03-api-contracts.md) | How do clients and services talk? (REST/WS/GraphQL) |
| 04 | [04-smart-contracts.md](./04-smart-contracts.md) | What lives on-chain, and what are the contract interfaces? |
| 05 | [05-security-compliance.md](./05-security-compliance.md) | How do we keep it safe, legal, and auditable? |
| 06 | [06-roadmap-sprints.md](./06-roadmap-sprints.md) | Who builds what, in what order? (Phase 1) |
| 07 | [07-threat-model.md](./07-threat-model.md) | What can go wrong, and how do we stop it? (STRIDE per boundary) |
| 08 | [08-monorepo-skeleton.md](./08-monorepo-skeleton.md) | Where does the code live, and what boundaries does the layout enforce? |
| 09 | [09-admin-ux-spec.md](./09-admin-ux-spec.md) | What does mission-control look like, screen by screen? |

### Supporting artifacts

| Artifact | What it is |
|----------|------------|
| [diagrams/data-model-erd.md](./diagrams/data-model-erd.md) | Mermaid ERDs for every schema + a cross-schema overview (renders on GitHub) |
| [diagrams/sequence-flows.md](./diagrams/sequence-flows.md) | Mermaid sequence diagrams for the money/carbon-critical flows (trade, retire, mine, mint, KYC) |
| [../api/openapi.yaml](../api/openapi.yaml) | OpenAPI 3.1 spec for the core REST surface — usable for mock servers, client codegen, and contract tests |

## Scope of this planning pass

- **Phase 1 (MVP)** is specified in build-ready detail: dual buyer onboarding, admin-minted
  tokenization of pre-verified credits, spot trading on 3–5 pairs with live order book +
  charts, basic mining (steps + referrals), on-chain retirement with certificate NFT, admin
  core, and the public Transparency Explorer.
- **Phases 2 & 3** (self-serve seller tokenization, auctions/storefronts, OTC desk, MRV
  oracles, forward contracts, hybrid AMM, governance token) are described at the
  interface/seam level so Phase 1 does not paint us into a corner, but their internals are
  intentionally left for later planning passes.

## Guiding principles (from the PRD)

Every feature must pass two tests:

1. **Can a trader trust the market?** — exchange-grade reliability, surveillance, custody.
2. **Can the planet trust the credit?** — 1 token = 1 registry-retired tonne, full on-chain
   lifecycle, no double-counting.

These are treated as **equal first-class, non-negotiable requirements.**

## Confirmed decisions (this planning pass)

- **Deliverable:** technical planning documents (this set).
- **Stack:** follows PRD §8 as written (Next.js 14 + TS + Tailwind; NestJS services;
  Rust/Go matching engine; Solidity on Polygon PoS/zkEVM; Postgres/TimescaleDB/Redis/Kafka;
  Sumsub/Onfido KYC; Fireblocks custody).
- **Quality bar:** production foundation — correct architecture, real auth, real data models,
  real security posture from day one.

## Open questions for product/legal (flagged, not yet resolved)

These block or reshape specific modules and need a human decision before the relevant sprint:

1. **Launch jurisdiction(s).** Determines KYC tiers, geo-gating, and the legal classification
   of a tokenized credit (commodity vs. security vs. environmental instrument). Drives §05.
2. **Fiat rails at MVP.** Is Phase 1 crypto-settled only (USDT/USDC), or do we need
   Razorpay/Stripe on-ramp on day one? Affects §02 (ledger), §03 (payments API), §06 scope.
3. **Custody model at MVP.** Fireblocks (fastest to production, adds vendor cost/KYB) vs. a
   self-managed MPC setup. Affects §04 minting authority and §05 key management.
4. **Registry integration reality.** Verra/Gold Standard API access is gated and slow. For
   MVP, is "admin manually attests the registry serial + retirement" acceptable, with
   automated cross-check deferred to Phase 2? Affects §04 `CreditRegistry` and §06.

See each document's own "Open questions" section for module-specific items.
