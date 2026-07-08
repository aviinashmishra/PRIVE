import { ethers, network } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const RETIRER_ROLE = keccak256(toUtf8Bytes("RETIRER_ROLE"));
const STANDARD_VCS = keccak256(toUtf8Bytes("verra_vcs"));

// Seed batch mirrors the app's flagship market so the two line up out of the box.
const SEED = {
  tokenId: 1n,
  symbol: "AMZN-RF25",
  projectId: 101n,
  vintage: 2025,
  serials: "VCS-1174-000001..400000",
  metaCid: "bafybeigdyrzt5amazonreforestation2025metadata",
  mintTonnes: 400_000n,
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\n▸ Network: ${network.name}`);
  console.log(`▸ Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`▸ Balance: ${ethers.formatEther(bal)} ETH/MATIC\n`);

  const admin = deployer.address;

  const registry = await (await ethers.getContractFactory("CreditRegistry")).deploy(admin);
  await registry.waitForDeployment();
  console.log(`  CreditRegistry   → ${await registry.getAddress()}`);

  const vault = await (await ethers.getContractFactory("RetirementVault")).deploy(admin, await registry.getAddress());
  await vault.waitForDeployment();
  console.log(`  RetirementVault  → ${await vault.getAddress()}`);

  const escrow = await (await ethers.getContractFactory("PriveEscrow")).deploy(admin, await registry.getAddress());
  await escrow.waitForDeployment();
  console.log(`  PriveEscrow      → ${await escrow.getAddress()}`);

  const mining = await (await ethers.getContractFactory("MiningRewards")).deploy(admin, await registry.getAddress());
  await mining.waitForDeployment();
  console.log(`  MiningRewards    → ${await mining.getAddress()}`);

  const anchor = await (await ethers.getContractFactory("AuditAnchor")).deploy(admin);
  await anchor.waitForDeployment();
  console.log(`  AuditAnchor      → ${await anchor.getAddress()}`);

  let usdcAddr = "";
  if (network.name !== "mainnet") {
    const usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
    await usdc.waitForDeployment();
    usdcAddr = await usdc.getAddress();
    console.log(`  MockUSDC         → ${usdcAddr}`);
  }

  // wire roles: the vault must be able to burn on the registry
  await (await registry.grantRole(RETIRER_ROLE, await vault.getAddress())).wait();
  console.log(`\n  ✓ Granted RETIRER_ROLE on CreditRegistry to RetirementVault`);

  // seed the flagship batch: register → attest registry-retired → mint
  await (
    await registry.registerBatch(
      SEED.tokenId,
      {
        projectId: SEED.projectId,
        vintageYear: SEED.vintage,
        standard: STANDARD_VCS,
        metadataHash: keccak256(toUtf8Bytes(SEED.metaCid)),
        registrySerialRange: SEED.serials,
        registryRetired: true, // MVP: admin-attested (Phase 2: registry-API oracle)
        exists: false,
        totalMinted: 0n,
        totalRetired: 0n,
      },
      SEED.metaCid,
    )
  ).wait();
  await (await registry.mint(SEED.tokenId, deployer.address, SEED.mintTonnes)).wait();
  console.log(`  ✓ Seeded batch #${SEED.tokenId} (${SEED.symbol}) · minted ${SEED.mintTonnes} tCO₂e to deployer`);

  const deployment = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    admin,
    contracts: {
      CreditRegistry: await registry.getAddress(),
      RetirementVault: await vault.getAddress(),
      PriveEscrow: await escrow.getAddress(),
      MiningRewards: await mining.getAddress(),
      AuditAnchor: await anchor.getAddress(),
      MockUSDC: usdcAddr,
    },
    seedBatch: { tokenId: Number(SEED.tokenId), symbol: SEED.symbol, minted: Number(SEED.mintTonnes) },
  };

  // write for the contracts repo + the app (so the UI can read on-chain state)
  const localDir = join(__dirname, "..", "deployments");
  if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });
  writeFileSync(join(localDir, `${network.name}.json`), JSON.stringify(deployment, null, 2));

  const appDir = join(__dirname, "..", "..", "apps", "buyer-web", "lib", "chain");
  if (existsSync(join(__dirname, "..", "..", "apps", "buyer-web"))) {
    if (!existsSync(appDir)) mkdirSync(appDir, { recursive: true });
    writeFileSync(join(appDir, "deployment.json"), JSON.stringify(deployment, null, 2));
    console.log(`\n  ✓ Wrote deployment.json to the app (lib/chain/)`);
  }

  console.log(`\n✅ Deployment complete on ${network.name}.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
