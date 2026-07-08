# Prive Exchange — Smart Contracts

The real on-chain layer, implementing [docs/04-smart-contracts.md](../docs/04-smart-contracts.md).
Solidity 0.8.24 · OpenZeppelin v5 · Hardhat · EVM target Cancun (Polygon-compatible).

## Contracts

| Contract | Standard | What it does |
|---|---|---|
| `CreditRegistry` | ERC-1155 | One token id per project-vintage batch. **Mint is blocked unless `registryRetired == true`** — the anti-double-counting guarantee. Tracks `totalMinted/totalRetired`; `circulating()` is always provable. |
| `RetirementVault` | ERC-721 | Burns credits via the registry and mints a **non-transferable (soulbound)** Retirement Certificate NFT with IPFS metadata. |
| `PriveEscrow` | — | Batched settlement: the gateway commits a Merkle root (`settleBatch`); individual trades are realised with a Merkle proof (`applySettlement`) as an atomic credits↔quote swap. A tradeId can settle at most once. |
| `MiningRewards` | — | Gas-abstracted mining grants: `accrue` (ORACLE_ROLE) then batched `settle` to real ERC-1155 balances. Bounded loops. |
| `AuditAnchor` | — | Anchors Merkle roots of the admin audit log / order book per epoch; an epoch can never be overwritten. |
| `MockUSDC` | ERC-20 | 6-decimal quote token for local/testnet only. Use real USDC/USDT on mainnet. |

Role model (per docs/04): `MINTER_ROLE`, `RETIRER_ROLE`, `SETTLER_ROLE`, `PAUSER_ROLE`,
`ORACLE_ROLE`. In production every role is held by a **Gnosis Safe multi-sig**, not an EOA.

## Commands

```bash
npm install            # once
npm run compile        # solc 0.8.24, cancun
npm test               # 17 tests: integrity invariants, roles, soulbound, double-settle, pause
npm run node           # start a local chain on http://127.0.0.1:8545 (terminal 1)
npm run deploy:local   # deploy + wire roles + seed AMZN-RF25 batch (terminal 2)
npm run lifecycle:local# full lifecycle as real txs: mint → escrow settle → retire → anchor
npm run deploy:amoy    # deploy to Polygon Amoy testnet (needs env, see below)
```

`deploy` writes `deployments/<network>.json` **and** copies it to
`apps/buyer-web/lib/chain/deployment.json`, which is how the app finds the contracts.

## App integration (already wired)

- `GET /api/chain/status` — live contract state over JSON-RPC (supply, retired, certificates).
- `POST /api/chain/retire` — executes a **real** burn + certificate-NFT mint transaction.
- The Offset page renders a "Live blockchain" panel driven by these routes.

App env (optional overrides in `apps/buyer-web/.env.local`):

```bash
CHAIN_RPC_URL=http://127.0.0.1:8545   # default; point at Amoy RPC for testnet
CHAIN_ADMIN_KEY=0x...                 # signer for gateway txs; defaults to Hardhat account #0 (LOCAL ONLY)
```

> The default local key is Hardhat's publicly-known account #0 — safe for localhost,
> catastrophic anywhere else. Never fund it on a public network.

## Deploying to Polygon Amoy (testnet) — needs your input

1. Create a fresh wallet for deployment (MetaMask → new account → export private key).
2. Fund it with test POL from a faucet: https://faucet.polygon.technology (select Amoy).
3. Set env and deploy:
   ```bash
   # in contracts/.env or your shell (never commit)
   AMOY_RPC_URL=https://rpc-amoy.polygon.technology   # or an Alchemy/Infura Amoy URL
   DEPLOYER_PRIVATE_KEY=0x<your test key>
   npm run deploy:amoy
   ```
4. Point the app at Amoy in `apps/buyer-web/.env.local`:
   ```bash
   CHAIN_RPC_URL=<your Amoy RPC URL>
   CHAIN_ADMIN_KEY=0x<the same test key>
   ```
5. (Optional) verify source on Polygonscan: set `POLYGONSCAN_API_KEY` and run
   `npx hardhat verify --network amoy <address> <constructor args>`.

## Mainnet gate (do not skip)

Per [docs/05](../docs/05-security-compliance.md) and the threat model
([docs/07](../docs/07-threat-model.md)), mainnet deployment is gated on:

1. **Two independent smart-contract audits** + a public bug bounty.
2. All privileged roles transferred to a **Gnosis Safe multi-sig** (no EOA admin).
3. A **TimelockController** in front of upgrades/admin ops.
4. Real USDC/USDT as quote asset (never MockUSDC).
5. Legal sign-off per launch jurisdiction (registry linkage, token classification).

## Test coverage (all passing)

- No mint without `registryRetired` (anti-double-counting) ✓
- `totalMinted − totalRetired == circulating` invariant across mint+retire ✓
- Certificates are soulbound (transfers revert) ✓
- Escrow: Merkle-proven settlement, uncommitted-root rejection, double-settle rejection ✓
- Role gating on every privileged function ✓
- Pause halts mint/transfer ✓
