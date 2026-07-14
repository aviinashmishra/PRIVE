// Boot-time contract deployment for the embedded chain (anvil in the Docker runner).
// Mirrors contracts/scripts/deploy.ts, but runs with plain ethers against the
// hardhat-compiled artifacts baked into the image — no hardhat at runtime.
//
// Idempotent: if the deployment file already points at live code on this chain
// (anvil restarted from a persisted state file), it leaves everything in place.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const here = dirname(fileURLToPath(import.meta.url));

const RPC_URL = process.env.CHAIN_RPC_URL || "http://127.0.0.1:8545";
// anvil/hardhat default account #0 — a PUBLICLY KNOWN key, safe only for the
// in-container dev chain. External networks must set CHAIN_ADMIN_KEY.
const ADMIN_KEY =
  process.env.CHAIN_ADMIN_KEY ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const OUT_FILE = process.env.CHAIN_DEPLOYMENT_FILE || join(here, "deployment.json");
const ARTIFACTS = join(here, "artifacts");

const RETIRER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RETIRER_ROLE"));
const STANDARD_VCS = ethers.keccak256(ethers.toUtf8Bytes("verra_vcs"));

// Seed batch mirrors the app's flagship market (same values as scripts/deploy.ts).
const SEED = {
  tokenId: 1n,
  symbol: "AMZN-RF25",
  projectId: 101n,
  vintage: 2025,
  serials: "VCS-1174-000001..400000",
  metaCid: "bafybeigdyrzt5amazonreforestation2025metadata",
  mintTonnes: 400_000n,
};

function artifact(rel, name) {
  return JSON.parse(readFileSync(join(ARTIFACTS, `${rel}.sol`, `${name}.json`), "utf8"));
}

async function waitForRpc(provider) {
  for (let i = 0; i < 60; i++) {
    try {
      await provider.getBlockNumber();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Chain RPC not reachable at ${RPC_URL}`);
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  await waitForRpc(provider);
  const chainId = Number((await provider.getNetwork()).chainId);

  // Already deployed on this (persisted) chain? Then keep the addresses stable.
  if (existsSync(OUT_FILE)) {
    try {
      const prev = JSON.parse(readFileSync(OUT_FILE, "utf8"));
      if (prev.chainId === chainId && (await provider.getCode(prev.contracts.CreditRegistry)) !== "0x") {
        console.log(`✓ Chain already deployed (CreditRegistry ${prev.contracts.CreditRegistry}) — skipping.`);
        return;
      }
    } catch {
      /* redeploy */
    }
  }

  const wallet = new ethers.Wallet(ADMIN_KEY, provider);
  // NonceManager tracks nonces locally — sequential deploys against anvil's
  // instant mining otherwise race the provider's cached transaction count.
  const signer = new ethers.NonceManager(wallet);
  const admin = wallet.address;
  console.log(`▸ Deploying Prive contracts to ${RPC_URL} (chain ${chainId}) as ${admin}`);

  async function deploy(rel, name, ...args) {
    const art = artifact(rel, name);
    const factory = new ethers.ContractFactory(art.abi, art.bytecode, signer);
    const contract = await factory.deploy(...args);
    await contract.waitForDeployment();
    console.log(`  ${name.padEnd(16)} → ${await contract.getAddress()}`);
    return contract;
  }

  const registry = await deploy("CreditRegistry", "CreditRegistry", admin);
  const registryAddr = await registry.getAddress();
  const vault = await deploy("RetirementVault", "RetirementVault", admin, registryAddr);
  const escrow = await deploy("PriveEscrow", "PriveEscrow", admin, registryAddr);
  const mining = await deploy("MiningRewards", "MiningRewards", admin, registryAddr);
  const anchor = await deploy("AuditAnchor", "AuditAnchor", admin);
  const usdc = await deploy("mocks/MockUSDC", "MockUSDC");

  // The vault burns credits on the registry; mining anchors reward accruals.
  await (await registry.grantRole(RETIRER_ROLE, await vault.getAddress())).wait();

  // Seed the flagship batch: register (attested) → mint to the platform account.
  await (
    await registry.registerBatch(
      SEED.tokenId,
      {
        projectId: SEED.projectId,
        vintageYear: SEED.vintage,
        standard: STANDARD_VCS,
        metadataHash: ethers.keccak256(ethers.toUtf8Bytes(SEED.metaCid)),
        registrySerialRange: SEED.serials,
        registryRetired: true,
        exists: false,
        totalMinted: 0n,
        totalRetired: 0n,
      },
      SEED.metaCid,
    )
  ).wait();
  await (await registry.mint(SEED.tokenId, admin, SEED.mintTonnes)).wait();
  console.log(`  ✓ Seeded batch #${SEED.tokenId} (${SEED.symbol}) · minted ${SEED.mintTonnes} t to ${admin}`);

  const deployment = {
    network: "prive-anchor",
    chainId,
    deployedAt: new Date().toISOString(),
    admin,
    contracts: {
      CreditRegistry: registryAddr,
      RetirementVault: await vault.getAddress(),
      PriveEscrow: await escrow.getAddress(),
      MiningRewards: await mining.getAddress(),
      AuditAnchor: await anchor.getAddress(),
      MockUSDC: await usdc.getAddress(),
    },
    seedBatch: { tokenId: Number(SEED.tokenId), symbol: SEED.symbol, minted: Number(SEED.mintTonnes) },
  };

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(deployment, null, 2));
  console.log(`✅ Embedded chain ready — deployment written to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error("Chain deploy failed:", e);
  process.exitCode = 1;
});
