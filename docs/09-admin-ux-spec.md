# 09 — Admin Console UX Specification

Screen-by-screen spec for the **mission-control** admin panel (`admin.priveexchange.com`,
PRD §5). This is the densest UI in the platform and the highest-blast-radius surface — so it
gets a "Bloomberg-terminal" aesthetic: dark, information-dense, keyboard-driven, multi-monitor
friendly. Backed by `admin-bff` (§03 §8). Every mutation is hash-chain audit-logged (§02, §07
TB5). This spec defines layout, components, data, and permitted actions per screen — not visual
pixels.

## Design language & global shell

- **Theme:** near-black canvas (`#0B0E11`), elevated panels (`#14181F`), electric-green accent
  (`#00E28A`) for positive/live, amber for warnings, red for halts/critical. Monospace for
  numbers, tabular figures, no number jitter.
- **Density:** compact rows (28–32px), sticky headers, virtualized tables, resizable/pinnable
  columns, saved views per admin.
- **Global chrome:**
  - Left rail: module icons (Overview, Users, Sellers, Surveillance, Mining, Treasury,
    Disputes, Blockchain, Content, Reports).
  - Top bar: environment badge (STAGING/PROD), global search, **⌘K command palette**, active
    role, hardware-key session indicator, incident/pause status light.
  - Right drawer: contextual detail (slides in for row inspection without losing the table).
- **Command palette (⌘K):** fuzzy jump to any user/order/market/case; run guarded actions
  ("halt market X", "freeze account Y") that route through the same confirm + maker-checker as
  the UI.
- **Keyboard-first:** `j/k` row nav, `/` focus search, `g` then letter to switch module, `.`
  to open the action menu on a row. Every action has a shortcut; nothing is mouse-only.
- **Permission-aware rendering:** actions a role can't perform are hidden (not just disabled)
  except where showing "requires Compliance role" aids workflow. Roles per §05 §5.1.

---

## 1. Global Overview (Home)

**Purpose:** real-time health of the whole ecosystem at a glance.

- **KPI wall** (top strip, live via WS): Active users (now / 24h), 24h volume, Tonnes
  tokenized / traded / retired, Revenue today, Pending verifications, Open disputes.
- **System health panel:** matching-engine TPS, WS fan-out latency (p50/p99), settlement lag,
  gas-tank balance, KYC-vendor status, reconciliation-drift indicator (green/amber/red — §07
  4.5). Each tile links to its module.
- **Live world map:** trade activity by geography (dots animate on fills) — social-proof +
  anomaly spotting.
- **Alert feed:** newest surveillance/mining/treasury alerts, click → jump to detail.
- **Actions:** none destructive here; it's situational awareness. Big red **Emergency Pause**
  affordance lives here but opens a guarded multi-sig flow (§07 4.3, PRD §5.2.9).

## 2. User Management

**Purpose:** find and act on any individual or company.

- **Table:** account id, type, legal name, country, KYC tier, status, 30d volume, flags. Filter
  by tier/status/country/risk; saved segments (e.g. "Tier-2 frozen").
- **Row → right drawer / full profile:** identity, KYC docs (viewer with the doc + provider
  result), wallet balances (read-only from ledger), trade & login/device history, linked org
  members.
- **Actions** (role-gated, all audit-logged): approve/reject KYC (Compliance), freeze/unfreeze
  (Compliance), force password reset, adjust tier limits, shadow-ban suspicious miner
  (Market-ops). PII **masked for Support**; unmask is a logged, justified, time-boxed action
  (§07 5.5).
- **States:** empty (no results), loading (skeleton rows), error, and a "frozen" banner on
  affected profiles.

## 3. Seller & Project Governance

**Purpose:** the verification pipeline and tokenization control.

- **Pipeline board** (kanban/status-tracker): columns = `Submitted → Doc Review → Verifier
  Assigned → Site/MRV Audit → Registry Cross-Check → Approval → Tokenization → LIVE` (mirrors
  PRD §4.1). Cards = projects; drag/advance is a logged action.
- **Project detail:** document viewer (PDD, certs — from IPFS, with hash-match indicator),
  map/polygon, methodology, **side-by-side registry cross-check tool** (our record vs. Verra/GS
  serials; MVP = manual attest of `registryRetired`, §04).
- **Actions:** advance/return-for-info (templated reasons), assign verifier, **trigger mint** —
  a *multi-sig-protected* button that creates a Safe proposal (never a direct mint), showing
  required signers + current signatures (§07 4.1, sequence flow #4). Delist controls.
- **Guardrail UI:** the mint button is disabled with an explicit reason until `registryRetired`
  is attested and metadata is pinned — the "can the planet trust the credit?" gate made visible.

## 4. Market Surveillance

**Purpose:** detect and act on market abuse in real time.

- **Alert table:** kind (wash/spoof/layering/pump-dump), market, involved accounts, severity,
  ML score, status. Sortable, filterable, live-appending.
- **Alert detail:** the reconstructed order/trade timeline (from the event log) with the
  suspicious pattern highlighted; linked accounts and their relationship graph.
- **Market controls panel:** per-market **circuit breaker** config (price band, ±X%/Y-min
  auto-halt), manual **halt / kill switch**, resume. Halts are time-boxed + reason-logged.
- **Trade cancellation/rollback:** guarded action that emits an **on-chain correction record**,
  never a silent edit (§07 5.4); requires maker-checker.
- **Watchlists:** insider/abuse lists; adding an account is logged.

## 5. Mining Oversight

**Purpose:** keep Proof-of-Green-Action honest.

- **Fraud dashboard:** flagged actions by reason (GPS anomaly, duplicate receipt, device farm),
  fraud-score distribution, top-flagged devices/accounts.
- **Action detail:** the submitted evidence (GPS track on a map, receipt image, steps series)
  with the anomaly annotated; approve/reject/clawback points.
- **Economy controls:** conversion-rate (points→credit) editor with an effective-date + audit
  trail; per-user daily caps; campaign scheduler (bonus events) with start/stop.
- **Guardrail:** rate/cap changes are maker-checker and preview their economic impact before
  apply.

## 6. Treasury & Settlement

**Purpose:** the money is where it should be, and it reconciles.

- **Balances:** hot/cold wallet balances per asset, fiat float per payment provider, platform
  fee revenue.
- **Reconciliation report:** off-chain ledger vs. on-chain, per asset, with any **drift
  highlighted red** and a freeze-asset action (the §07 4.5 safety net, surfaced).
- **Payout queue:** maker-checker approvals (Finance) with dual-control UI — proposer vs.
  approver clearly separated; a proposer cannot approve their own item.
- **Settlement monitor:** batch status (building/submitted/confirmed/failed), settlement lag,
  gas used, gas-tank balance + top-up.

## 7. Dispute Resolution Center

**Purpose:** structured arbitration with an evidence trail.

- **Ticket table:** parties, ref (trade/retirement/payout), status, assignee, age.
- **Case workspace:** threaded evidence (uploads + system records), escrow freeze/release
  controls, decision form with templated + free-text rationale — the decision is logged and,
  where it touches escrow, produces an on-chain record.

## 8. Blockchain Console

**Purpose:** operate the on-chain layer safely.

- **Contracts panel:** addresses + versions per environment, proxy/impl, pending upgrades (with
  the **timelock countdown** visible — §07 4.3).
- **Multi-sig queue:** pending Safe transactions (mint, upgrade, treasury) with signer status;
  sign/execute from here (still hardware-key gated).
- **Health:** oracle feed status, gas-tank balance + auto-topup config, chain-reorg / confirmation
  monitor.
- **Emergency:** per-contract **pause switches** (mint/settle/retire independently) behind a
  confirm + multi-sig; the master switch from the Overview lands here.

## 9. Content & Comms

**Purpose:** announcements + education CMS.

- Announcement banner scheduler (targeting: all / tier / region), push/email campaign builder
  with preview + test-send, educational content CMS (what-is-a-credit, how-mining-works),
  listing/delisting notices. Publishing is logged; scheduled sends show a queue.

## 10. Reports & Regulator Portal

**Purpose:** one-click, audit-ready exports.

- Export builder: full trade logs, retirement registry, AML/SAR reports, KYC decision logs —
  CSV/Excel/PDF with blockchain proof links. Each export is itself logged (who exported what,
  when).
- **Read-only regulator login** (scoped): a locked-down view with no mutation surface and no
  raw PII beyond what the regulator's scope permits.

---

## Cross-cutting UX rules

- **Every mutating action:** confirm modal stating the effect + blast radius → (if high-impact)
  maker-checker → optimistic UI with rollback on failure → toast + audit-log entry. High-impact
  on-chain actions additionally route through multi-sig and show signer progress.
- **Auditability is visible:** each detail view has an "Audit trail" tab showing the
  hash-chained history for that entity; the admin knows they are on the record (§07 5.3).
- **Non-destructive by default:** halts, freezes, and rollbacks are reversible and time-boxed;
  truly irreversible actions (mint) demand multi-sig and an explicit typed confirmation.
- **Resilience states:** every table/panel specifies loading (skeleton), empty, error, and
  degraded (e.g. "reconciliation feed stale") states — no blank screens.
- **Accessibility:** WCAG 2.1 AA even in the dense dark theme — sufficient contrast on the green
  accent, full keyboard operability, focus-visible, screen-reader labels on icon-only controls.
- **Session security:** hardware-key (FIDO2) session with idle timeout; IP-allowlist enforced;
  re-auth prompt before high-impact actions (§07 5.1).

## Screen inventory → API/data map (build reference)

| Screen | Primary endpoints (§03/§8) | Key tables (§02) |
|---|---|---|
| Overview | `GET /admin/overview` | cross-service read models |
| Users | `GET /admin/users`, `POST /admin/kyc/*/decision`, `/accounts/*/freeze` | `identity.*` |
| Sellers | `POST /admin/projects/*/advance`, `POST /admin/batches/*/mint` | `token.*`, `chain.*` |
| Surveillance | `GET /admin/surveillance/alerts`, `/markets/*/halt`, `/trades/*/cancel` | `trading.*`, `admin.surveillance_alerts` |
| Mining | `GET /admin/mining/fraud` | `mining.*` |
| Treasury | `GET /admin/treasury`, `POST /admin/payouts/*/approve` | `ledger.*`, `chain.settlement_batches` |
| Disputes | `GET /admin/disputes`, `POST /admin/disputes/*/resolve` | `admin.disputes` |
| Blockchain | (multi-sig/Safe + `chain` reads) | `chain.*` |
| Reports | export endpoints (scoped) | read-only across |
| Audit (global) | `GET /admin/audit-log` | `admin.audit_log` |

## Open questions (admin UX)
1. Build the admin UI on the shared `@prive/ui` library or a purpose-built dense-table kit
   (e.g. AG Grid) — leaning AG Grid for the heavy tables, `@prive/ui` for shell/forms.
2. Regulator-portal scope granularity (per-jurisdiction field-level masking) — depends on
   README open question #1 (launch jurisdiction).
3. Whether the ⌘K palette can execute maker-checker *proposals* or only navigate — leaning
   "propose yes, approve no" so the second control stays deliberate.
