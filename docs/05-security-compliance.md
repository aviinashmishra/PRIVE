# 05 — Security, Compliance & Trust

Per the PRD, these are **non-negotiable, first-class requirements** — equal to feature work.
This document is the control checklist a security/compliance lead owns and signs off against
before each release gate.

> **Not legal advice.** Regulatory classification of tokenized carbon credits varies by
> jurisdiction. Engage securities and environmental-market counsel per launch market. This
> document specifies the *technical and process controls*; a lawyer confirms *whether and how*
> we may operate in a given country (README open question #1).

---

## 1. Custody & key management

| Control | Requirement | Phase |
|---|---|---|
| Wallet infra | MPC (Fireblocks-class) or self-hosted MPC; no single hot key | 1 |
| Cold storage | ≥95% of custodied assets in cold; hot float only for daily settlement/withdrawals | 1 |
| Multi-sig | Gnosis Safe on **all** mint, treasury, upgrade, and pause operations | 1 |
| Withdrawal safety | Address allowlist + **24h delay on new addresses** + per-tier caps | 1 |
| Key rotation | `SETTLER_ROLE` (hot) rotatable without redeploy; admin keys in HSM/KMS | 1 |
| Secrets | HSM/KMS only; no secrets in env files, images, or repo; short-lived DB creds | 1 |

**Operational keys inventory** (who holds what, where): document every privileged key, its
custodian, its multi-sig threshold (e.g. 3-of-5), and its rotation schedule. Review quarterly.

---

## 2. Application security (OWASP ASVS L2+)

- **AuthN:** Argon2id password hashing; TOTP + WebAuthn MFA; **admin console requires
  FIDO2/YubiKey** (hardware) + IP allowlist. SIWE for wallet login with domain-binding + nonce
  + short replay window.
- **AuthZ:** deny-by-default RBAC at the gateway *and* per-service fine-grained checks
  (`can_withdraw`, `can_approve_payout`). Maker-checker on corporate withdrawals & payouts.
- **Input:** validate/normalize at the edge; parameterized queries only (no string SQL);
  schema-validate all JSON bodies; reject unknown fields on money endpoints.
- **Transport/data:** TLS 1.3 end-to-end; **field-level encryption** of PII (KYC docs
  pointers, DOB, GPS tracks, MFA secrets) with envelope encryption via KMS.
- **Rate limiting / abuse:** token-bucket per IP + per account; WAF; DDoS protection (CDN
  layer); bot detection on auth + mining endpoints.
- **Idempotency & concurrency:** enforced on all money-moving endpoints (§03); optimistic
  locking / row locks around ledger writes to prevent double-spend.
- **Dependencies:** SCA (Dependabot/Snyk) in CI; pinned lockfiles; SBOM per release.
- **Secrets scanning + SAST** (Semgrep/CodeQL) block merges on high findings.

---

## 3. Smart-contract security

- **Two independent audits** + a **public bug bounty** gate mainnet — no mainnet mint before
  both firms sign off (repeated from §04, it's a hard gate).
- Foundry unit + **invariant/fuzz** tests for the money-safety properties:
  - `totalMinted − totalRetired == circulating supply` per batch.
  - No `mint` unless `registryRetired == true`.
  - A given `tradeId` settles **at most once**; a certificate is minted **exactly once** per
    retirement.
  - Pausing halts mint/settle/retire; upgrades only via timelock + multi-sig.
- Static analysis (Slither, Mythril) in CI; `nonReentrant` on token-moving externals; no
  unbounded loops over user input; checks-effects-interactions.
- Timelock on upgrades so a pending change is publicly visible before it lands.

---

## 4. AML / CFT & KYC/KYB

| Control | Detail |
|---|---|
| Tiered KYC | Tier0 browse-only → Tier1 (ID+liveness) → Tier2 (address + AML) — gates limits (§02) |
| KYB | Company docs (incorporation, tax ID, UBO, board resolution) → OCR → admin review |
| Screening | Sanctions/PEP/adverse-media at onboarding **and** ongoing rescreening |
| Transaction monitoring | Rules engine: structuring, velocity, high-risk geographies, sudden pattern change → alerts |
| Travel Rule readiness | Capture originator/beneficiary data for crypto transfers ≥ threshold |
| SAR/STR tooling | Compliance officer can file suspicious-activity reports from the admin console |
| Geo-gating | Geo-block restricted jurisdictions at the edge; enforce at signup + trade |
| Recordkeeping | KYC docs + decisions retained per jurisdictional minimums; PII encrypted at rest |

---

## 5. Market integrity & surveillance

- **Real-time surveillance** (`admin.surveillance_alerts`, §02): wash-trading, spoofing/
  layering, pump-and-dump anomaly detection (ML flags) fed from the Kafka trade/order stream.
- **Self-trade prevention** in the matching engine; per-account/per-market position + order
  caps by tier.
- **Circuit breakers:** per-market price bands (`price_band_bps`), auto-halt on ±X% in Y min,
  manual kill switch (§03 admin). Halts are logged and time-boxed.
- **Trade cancellation/rollback** produces an on-chain **correction record** — never a silent
  edit; the audit log + `AuditAnchor` make reversals visible.
- **Insider/abuse watchlists**; admins themselves are surveilled — every admin action is in the
  hash-chained `admin.audit_log`, roots anchored on-chain (`AuditAnchor`, §04).

---

## 6. Carbon integrity (the "can the planet trust the credit?" controls)

- **1 token = 1 registry-retired tonne.** `CreditRegistry.mint` reverts unless the legacy
  serials were retired at source (`registryRetired`). No double-counting by construction.
- **Provenance on IPFS**, content-hash-anchored on-chain; tampering is detectable.
- **Public Transparency Explorer** (no login, §03 GraphQL): full lifecycle of any credit —
  issuance → verification → trades → retirement — auditable by anyone.
- **Retirement is a burn** + non-transferable certificate NFT; retired credits can never
  re-enter the market.
- **MRV pipeline** (Phase 2): satellite/IoT/registry-API oracles continuously verify claimed
  impact; streaming issuance only mints against verified deltas.

**Success metric (PRD §11):** *zero double-counting incidents.* This is a release-blocking
invariant, not a KPI to trend.

---

## 7. Reliability & operational security

- **Targets:** uptime ≥99.95%; matching-engine crash recovery via Kafka replay (RPO ≈ 0 on the
  event log); documented RTO per service.
- **Reconciliation (continuous):** automated job diffs off-chain ledger vs. on-chain balances
  and flags any drift → finance alert + freeze on the affected asset until resolved. This is
  the safety net behind the hybrid model (ADR-001).
- **Observability:** structured logs, distributed tracing (`trace_id` in every error),
  Prometheus/Grafana dashboards for engine TPS, WS latency, gas-tank balance, settlement lag;
  Sentry for exceptions. Alerting on: settlement backlog, reconciliation drift, gas-tank low,
  KYC provider outage, WS fan-out latency.
- **Backups & DR:** PITR on Postgres; cross-region replicas; tested restore runbooks; chaos/
  game-day drills before mainnet.
- **Incident response:** on-call rotation, severity ladder, emergency-pause runbook (which
  Safe signers, what order), post-mortems.

---

## 8. Data protection & privacy (GDPR / India DPDP)

- Lawful basis + consent capture at signup; purpose limitation; data-subject rights (access,
  export, erasure) — noting that **on-chain data is immutable**: PII never goes on-chain; only
  hashes/pseudonymous addresses do. Retirement certificates carry a beneficiary *name string*
  by design (ESG proof) — flag to legal that this is intentional publication, and let users
  choose a pseudonym.
- Data residency per jurisdiction (India DPDP may require local storage — infra §01 must
  support region pinning).
- DPIA before launch; DPO/ grievance officer as required.

---

## 9. Release gates (checklist per environment promotion)

**staging → production (mainnet):**
- [ ] Both independent contract audits closed, criticals/highs resolved, report published.
- [ ] Bug bounty live ≥ N weeks with no unresolved critical.
- [ ] Pen test (OWASP ASVS L2) passed; SAST/SCA clean of highs.
- [ ] Reconciliation job proven on staging (intentional drift detected + alerted).
- [ ] Multi-sig signers, thresholds, and key custody documented and tested.
- [ ] Emergency-pause + rollback runbook rehearsed (game day).
- [ ] AML rules + sanctions screening live and tested with red-team cases.
- [ ] Legal sign-off for each launch jurisdiction (classification + geo-gating).
- [ ] DPIA complete; PII encryption + data-residency verified.
- [ ] Load test: engine ≥10k orders/s, WS <100ms fan-out, settlement lag <2 min at target vol.

## Open questions (security/compliance)
1. Launch jurisdiction(s) → classification of the credit token (commodity/security/other).
   Blocks final AML rules and geo-gating config. (README #1.)
2. Build-vs-buy custody (Fireblocks vs. self-hosted MPC) → key-management model. (README #3.)
3. Registry (Verra/GS) API access timeline → whether `registryRetired` is admin-attested at
   MVP with automated cross-check in Phase 2. (README #4.)
4. Certificate beneficiary PII publication — confirm with legal that name-on-IPFS is
   acceptable and consented, or default to pseudonym.
