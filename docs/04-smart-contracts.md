# 04 — Smart Contracts & On-Chain Design

Solidity ^0.8.24, OpenZeppelin v5, Hardhat + Foundry, deployed to Polygon PoS (Amoy testnet
first). Contracts are **upgradeable** via UUPS proxies behind a multi-sig-controlled
`ProxyAdmin`, and **pausable** per-contract. Interfaces below are the authoritative on-chain
contract surface for Phase 1 (plus Phase-2/3 seams marked clearly).

## On-chain vs off-chain split (recap from ADR-001)

| On-chain (source of truth for *existence & finality*) | Off-chain (source of truth for *balances & matching*) |
|---|---|
| Credit issuance (mint) after approval | Order book, matching, price-time priority |
| Trade **settlement** (batched, Merkle) | Instant balance/hold updates in the ledger |
| **Retirement** (burn) + certificate NFT | Fee computation, P&L, portfolio |
| Registry-serial ↔ token mapping | Mining points (pre-conversion) |
| Admin audit-log root anchoring | Market data / candles |

## Contract inventory

| Contract | Standard | Phase | Purpose |
|---|---|---|---|
| `CreditRegistry` | ERC-1155 | 1 | Mints/holds tokenized credit batches; registry-serial mapping |
| `PriveEscrow` | — | 1 | Batched, Merkle-proven trade settlement between platform accounts |
| `RetirementVault` | ERC-721 (certs) | 1 | Burns credits, mints Retirement Certificate NFTs |
| `MiningRewards` | — | 1 | Records/claims netted mining credit grants (gas-abstracted) |
| `AuditAnchor` | — | 1 | Stores periodic Merkle roots of the admin audit log + orderbook |
| `PriveAccessControl` | — | 1 | Shared roles: MINTER, SETTLER, PAUSER, UPGRADER (all multi-sig) |
| `PriveCO2Index` | ERC-20 | 2 | Wrapped index token pooling verified credits |
| `PriveForward` | — | 3 | Pre-issuance forward contracts w/ collateral slashing |
| `Governance` | — | 3 | Fee/listing votes for PRIVE holders |

All privileged roles are held by a **Gnosis Safe multi-sig**, not an EOA.

---

## `PriveAccessControl`

Central role registry consumed by the others via `AccessControlUpgradeable`.

```solidity
// Roles (bytes32 = keccak256(name)):
//   DEFAULT_ADMIN_ROLE -> Gnosis Safe (super-admin multi-sig)
//   MINTER_ROLE        -> CreditRegistry mint authority (multi-sig gated in admin flow)
//   SETTLER_ROLE       -> Blockchain Gateway settlement signer (hot, rotatable)
//   RETIRER_ROLE       -> RetirementVault
//   PAUSER_ROLE        -> ops multi-sig; can pause any contract
//   UPGRADER_ROLE      -> ProxyAdmin multi-sig
//   ORACLE_ROLE        -> Chainlink adapters / MRV oracle (Phase 2)
```

---

## `CreditRegistry` (ERC-1155)

One token ID per project-vintage batch. Mints **only** after off-chain verification +
multi-sig admin approval. Metadata (project, vintage, standard, verifier, geolocation hash,
registry serial range) is pinned to IPFS; the on-chain record stores the content hash so the
metadata is tamper-evident.

```solidity
interface ICreditRegistry {
    struct BatchInfo {
        uint256 projectId;          // internal project id
        uint16  vintageYear;
        bytes32 standard;           // keccak256("verra_vcs") etc.
        bytes32 metadataHash;       // sha256 of the IPFS metadata JSON
        string  registrySerialRange;// e.g. "VCS-1234-0001..0500"
        bool    registryRetired;    // legacy serials retired at source (anti double-sell)
        uint256 totalMinted;
        uint256 totalRetired;
    }

    event BatchRegistered(uint256 indexed tokenId, uint256 indexed projectId,
                          uint16 vintageYear, bytes32 metadataHash);
    event CreditsMinted(uint256 indexed tokenId, address indexed to, uint256 amount);
    event MetadataAnchored(uint256 indexed tokenId, string ipfsCid, bytes32 metadataHash);

    /// @notice Register a new batch's metadata BEFORE minting. MINTER_ROLE (multi-sig).
    function registerBatch(uint256 tokenId, BatchInfo calldata info, string calldata ipfsCid)
        external returns (uint256);

    /// @notice Mint credits for an already-registered, registry-retired batch.
    /// Reverts if !registryRetired (enforces 1 token = 1 real, retired-elsewhere tonne).
    function mint(uint256 tokenId, address to, uint256 amount) external;

    function batchInfo(uint256 tokenId) external view returns (BatchInfo memory);
    function uri(uint256 tokenId) external view returns (string memory); // ipfs://<cid>
}
```

**Integrity rule enforced in code:** `mint()` requires `info.registryRetired == true`, i.e.
the corresponding serials were retired in the legacy registry (Verra/GS) so the same tonne
cannot be sold both places. At MVP this flag is set by an admin attestation (README open
question #4); Phase 2 sets it via the registry-API oracle.

---

## `PriveEscrow` (batched settlement)

Matched trades settle in batches. The Blockchain Gateway computes a Merkle tree of settlement
instructions (transfers of credits + quote balances between platform-custodied sub-accounts)
and submits the root; the contract verifies each instruction against the root when applied.
This minimizes gas while keeping every settlement individually provable.

```solidity
interface IPriveEscrow {
    struct Settlement {
        uint256 tradeId;
        address buyer;              // platform sub-account (custodial) or self-custody addr
        address seller;
        uint256 creditTokenId;
        uint256 creditAmount;
        address quoteToken;         // USDT/USDC ERC-20
        uint256 quoteAmount;
    }

    event BatchSettled(bytes32 indexed merkleRoot, uint256 tradeCount, uint256 timestamp);
    event SettlementApplied(uint256 indexed tradeId, bytes32 indexed merkleRoot);

    /// @notice Commit a batch root. SETTLER_ROLE. Off-chain balances already updated;
    /// this provides on-chain finality + tamper-evidence.
    function settleBatch(bytes32 merkleRoot, uint256 tradeCount) external;

    /// @notice Apply/verify a single settlement against a committed root (atomic swap of
    /// credits<->quote held in escrow). Callable to realize on-chain movement when a party
    /// withdraws to self-custody. Verifies merkleProof.
    function applySettlement(Settlement calldata s, bytes32 merkleRoot, bytes32[] calldata proof)
        external;

    function isSettled(uint256 tradeId) external view returns (bool);
}
```

> **Design note:** For fully-custodial users, movements net inside the platform's escrow
> sub-accounts and only the root is posted (cheapest). Actual ERC-1155/ERC-20 transfers hit
> the chain when value crosses the custody boundary (deposit/withdrawal/self-custody). This
> is the standard hybrid-exchange settlement pattern and is what keeps gas sane at volume.

---

## `RetirementVault` (burn + certificate NFT)

Permanently burns credits and issues a soulbound-ish **Retirement Certificate** ERC-721 —
the on-chain proof a company embeds in ESG reports.

```solidity
interface IRetirementVault {
    event CreditsRetired(uint256 indexed creditTokenId, address indexed beneficiary,
                         uint256 amount, uint256 indexed certificateId);

    /// @notice Burn `amount` of a credit batch from `from` and mint a certificate NFT.
    /// RETIRER_ROLE (called by gateway after off-chain hold). `beneficiaryName` recorded
    /// in certificate metadata (IPFS).
    function retire(address from, uint256 creditTokenId, uint256 amount,
                    string calldata beneficiaryName, string calldata certIpfsCid)
        external returns (uint256 certificateId);

    /// @return the on-chain certificate metadata URI (ipfs://) — links to PDF w/ QR to tx.
    function tokenURI(uint256 certificateId) external view returns (string memory);
}
```
Certificate NFTs are **non-transferable** (a retirement is not a tradable asset). Burned
credits reduce `CreditRegistry.totalRetired` via a cross-call/event; the Transparency Explorer
shows the closed lifecycle.

---

## `MiningRewards` (gas-abstracted grants)

Mining awards happen off-chain (points). On conversion, the platform allocates fractional
credits from a platform-held liquidity batch. To avoid a chain tx per micro-action, grants are
**netted**: the contract records claimable balances updated by the gateway; large aggregates
settle to `CreditRegistry` balances periodically. Users never pay gas.

```solidity
interface IMiningRewards {
    event RewardAccrued(address indexed user, uint256 creditTokenId, uint256 amount);
    event RewardSettled(address indexed user, uint256 creditTokenId, uint256 amount);

    /// @notice Record a netted grant (ORACLE_ROLE/gateway). Off-chain is authoritative;
    /// this anchors totals for transparency.
    function accrue(address user, uint256 creditTokenId, uint256 amount) external;

    /// @notice Move accrued rewards into the user's real ERC-1155 balance (batched).
    function settle(address[] calldata users, uint256 creditTokenId) external;
}
```

---

## `AuditAnchor` (tamper-evidence)

Periodically stores Merkle roots of (a) the admin audit log (§02 `admin.audit_log` hash chain)
and (b) the off-chain order-book state — so an operator cannot silently rewrite history.

```solidity
interface IAuditAnchor {
    event RootAnchored(bytes32 indexed kind, bytes32 root, uint256 indexed epoch);
    // kind = keccak256("audit_log") | keccak256("orderbook")
    function anchor(bytes32 kind, bytes32 root, uint256 epoch) external; // SETTLER/OPS role
    function rootAt(bytes32 kind, uint256 epoch) external view returns (bytes32);
}
```

---

## Emergency controls & upgradeability

- **Pausable:** every value-moving contract inherits `PausableUpgradeable`; `PAUSER_ROLE`
  (ops multi-sig) can halt mint/settle/retire independently. The admin "emergency pause
  switch" (§05, PRD §5.2.9) maps to these.
- **UUPS upgrades:** `UPGRADER_ROLE` (multi-sig) only; upgrades go through a timelock
  (`TimelockController`) so the community/regulator can see a pending upgrade before it lands.
- **Reentrancy:** `nonReentrant` on all external state-changing functions moving tokens.
- **No unbounded loops** over user-supplied arrays in a single tx (batch settle/retire cap the
  array length; large sets paginate across txs).

## Oracles (Phase 2+, seams reserved now)

- **Chainlink price feeds** for fiat/crypto conversion display and index NAV.
- **Custom MRV oracle adapters** (`ORACLE_ROLE`): satellite/IoT/registry-API data hashes
  pushed on-chain to (a) flip `registryRetired`, and (b) drive streaming incremental issuance
  (`CreditRegistry.mint` triggered by verified MRV deltas). Kept out of Phase 1 scope but the
  role and event surface exist so we don't refactor later.

## Testing & audit gates (see §05)

- Foundry unit + invariant tests (e.g. *"totalMinted − totalRetired == circulating"*,
  *"no mint without registryRetired"*, *"a trade settles at most once"*).
- Fork tests against Amoy. Slither/Mythril in CI. **Two independent audit firms + a public bug
  bounty gate mainnet deployment** — no mainnet mint before both sign off.

## Open questions (contracts)
1. Custodial-net settlement vs. per-trade on-chain atomic swap default — leaning custodial-net
   for gas, but self-custody users need `applySettlement`. Confirm custody model (README #3).
2. Quote asset at MVP: USDT vs. USDC vs. a platform stablecoin. Affects `PriveEscrow`.
3. Certificate NFT: strictly non-transferable (soulbound) vs. transferable-to-auditor —
   ESG/legal input needed.
4. Timelock delay length for upgrades (24h? 48h?) — balances agility vs. trust.
