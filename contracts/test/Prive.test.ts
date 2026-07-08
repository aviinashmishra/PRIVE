import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes, AbiCoder, ZeroHash } from "ethers";

const MINTER_ROLE = keccak256(toUtf8Bytes("MINTER_ROLE"));
const RETIRER_ROLE = keccak256(toUtf8Bytes("RETIRER_ROLE"));
const SETTLER_ROLE = keccak256(toUtf8Bytes("SETTLER_ROLE"));
const ORACLE_ROLE = keccak256(toUtf8Bytes("ORACLE_ROLE"));

const STANDARD = keccak256(toUtf8Bytes("verra_vcs"));
const META = keccak256(toUtf8Bytes("metadata-json"));
const TOKEN_ID = 1n;

async function deployAll() {
  const [admin, gateway, seller, buyer, other] = await ethers.getSigners();

  const Registry = await ethers.getContractFactory("CreditRegistry");
  const registry = await Registry.deploy(admin.address);

  const Vault = await ethers.getContractFactory("RetirementVault");
  const vault = await Vault.deploy(admin.address, await registry.getAddress());

  const Escrow = await ethers.getContractFactory("PriveEscrow");
  const escrow = await Escrow.deploy(admin.address, await registry.getAddress());

  const Mining = await ethers.getContractFactory("MiningRewards");
  const mining = await Mining.deploy(admin.address, await registry.getAddress());

  const Anchor = await ethers.getContractFactory("AuditAnchor");
  const anchor = await Anchor.deploy(admin.address);

  const USDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await USDC.deploy();

  // vault needs RETIRER on the registry to burn
  await registry.grantRole(RETIRER_ROLE, await vault.getAddress());

  return { admin, gateway, seller, buyer, other, registry, vault, escrow, mining, anchor, usdc };
}

function batchInfo(registryRetired: boolean) {
  return {
    projectId: 42n,
    vintageYear: 2025,
    standard: STANDARD,
    metadataHash: META,
    registrySerialRange: "VCS-1234-0001..0500",
    registryRetired,
    exists: false,
    totalMinted: 0n,
    totalRetired: 0n,
  };
}

describe("CreditRegistry", () => {
  it("registers a batch and stores metadata uri", async () => {
    const { registry } = await deployAll();
    await registry.registerBatch(TOKEN_ID, batchInfo(true), "bafyMeta");
    expect(await registry.uri(TOKEN_ID)).to.equal("ipfs://bafyMeta");
    const b = await registry.batchInfo(TOKEN_ID);
    expect(b.exists).to.equal(true);
    expect(b.projectId).to.equal(42n);
  });

  it("BLOCKS minting when registry serials are NOT retired (anti double-counting)", async () => {
    const { registry, buyer } = await deployAll();
    await registry.registerBatch(TOKEN_ID, batchInfo(false), "bafy");
    await expect(registry.mint(TOKEN_ID, buyer.address, 100n)).to.be.revertedWith(
      "registry not retired: cannot mint",
    );
  });

  it("mints once registryRetired is attested and tracks supply", async () => {
    const { registry, buyer } = await deployAll();
    await registry.registerBatch(TOKEN_ID, batchInfo(false), "bafy");
    await registry.setRegistryRetired(TOKEN_ID, true);
    await registry.mint(TOKEN_ID, buyer.address, 500n);
    expect(await registry.balanceOf(buyer.address, TOKEN_ID)).to.equal(500n);
    expect(await registry.circulating(TOKEN_ID)).to.equal(500n);
  });

  it("only MINTER_ROLE can register or mint", async () => {
    const { registry, other, buyer } = await deployAll();
    await expect(registry.connect(other).registerBatch(TOKEN_ID, batchInfo(true), "x")).to.be.reverted;
    await registry.registerBatch(TOKEN_ID, batchInfo(true), "x");
    await expect(registry.connect(other).mint(TOKEN_ID, buyer.address, 1n)).to.be.reverted;
  });

  it("rejects duplicate batch ids", async () => {
    const { registry } = await deployAll();
    await registry.registerBatch(TOKEN_ID, batchInfo(true), "x");
    await expect(registry.registerBatch(TOKEN_ID, batchInfo(true), "x")).to.be.revertedWith("batch exists");
  });

  it("pause blocks minting and transfers", async () => {
    const { registry, buyer } = await deployAll();
    await registry.registerBatch(TOKEN_ID, batchInfo(true), "x");
    await registry.pause();
    await expect(registry.mint(TOKEN_ID, buyer.address, 1n)).to.be.revertedWithCustomError(registry, "EnforcedPause");
  });
});

describe("RetirementVault", () => {
  it("burns credits and mints a certificate NFT to the retiree", async () => {
    const { registry, vault, admin, buyer } = await deployAll();
    await registry.registerBatch(TOKEN_ID, batchInfo(true), "x");
    await registry.mint(TOKEN_ID, buyer.address, 200n);

    await expect(vault.retire(buyer.address, TOKEN_ID, 50n, "Acme Corp FY2026", "bafyCert"))
      .to.emit(vault, "CreditsRetired")
      .withArgs(TOKEN_ID, buyer.address, 50n, 1n);

    expect(await registry.balanceOf(buyer.address, TOKEN_ID)).to.equal(150n);
    expect(await registry.circulating(TOKEN_ID)).to.equal(150n);
    const b = await registry.batchInfo(TOKEN_ID);
    expect(b.totalRetired).to.equal(50n);
    expect(await vault.ownerOf(1n)).to.equal(buyer.address);
    expect(await vault.tokenURI(1n)).to.equal("ipfs://bafyCert");
  });

  it("certificates are non-transferable (soulbound)", async () => {
    const { registry, vault, buyer, other } = await deployAll();
    await registry.registerBatch(TOKEN_ID, batchInfo(true), "x");
    await registry.mint(TOKEN_ID, buyer.address, 100n);
    await vault.retire(buyer.address, TOKEN_ID, 10n, "X", "cid");
    await expect(
      vault.connect(buyer).transferFrom(buyer.address, other.address, 1n),
    ).to.be.revertedWith("certificate is non-transferable");
  });

  it("only RETIRER_ROLE can retire", async () => {
    const { registry, vault, buyer, other } = await deployAll();
    await registry.registerBatch(TOKEN_ID, batchInfo(true), "x");
    await registry.mint(TOKEN_ID, buyer.address, 100n);
    await expect(vault.connect(other).retire(buyer.address, TOKEN_ID, 10n, "X", "cid")).to.be.reverted;
  });

  it("INVARIANT: totalMinted - totalRetired == circulating across mint+retire", async () => {
    const { registry, vault, buyer } = await deployAll();
    await registry.registerBatch(TOKEN_ID, batchInfo(true), "x");
    await registry.mint(TOKEN_ID, buyer.address, 1000n);
    await vault.retire(buyer.address, TOKEN_ID, 250n, "X", "cid");
    await vault.retire(buyer.address, TOKEN_ID, 125n, "X", "cid");
    const b = await registry.batchInfo(TOKEN_ID);
    expect(b.totalMinted - b.totalRetired).to.equal(await registry.circulating(TOKEN_ID));
    expect(await registry.circulating(TOKEN_ID)).to.equal(625n);
  });
});

describe("PriveEscrow", () => {
  it("commits a batch root and applies a proven settlement (atomic swap)", async () => {
    const { registry, escrow, admin, seller, buyer, usdc } = await deployAll();
    // fund escrow with credits (seller side) and quote (buyer side already paid off-chain)
    await registry.registerBatch(TOKEN_ID, batchInfo(true), "x");
    await registry.mint(TOKEN_ID, await escrow.getAddress(), 100n);
    await usdc.transfer(await escrow.getAddress(), 1_000_000n);

    const s = {
      tradeId: 7n,
      buyer: buyer.address,
      seller: seller.address,
      creditTokenId: TOKEN_ID,
      creditAmount: 40n,
      quoteToken: await usdc.getAddress(),
      quoteAmount: 500_000n,
    };
    const leaf = await escrow.leafOf(s);
    // single-leaf tree: root == leaf, proof == []
    await escrow.settleBatch(leaf, 1n);

    await expect(escrow.applySettlement(s, leaf, []))
      .to.emit(escrow, "SettlementApplied")
      .withArgs(7n, leaf);

    expect(await registry.balanceOf(buyer.address, TOKEN_ID)).to.equal(40n);
    expect(await usdc.balanceOf(seller.address)).to.equal(500_000n);
    expect(await escrow.isSettled(7n)).to.equal(true);
  });

  it("rejects double settlement of the same tradeId", async () => {
    const { registry, escrow, seller, buyer, usdc } = await deployAll();
    await registry.registerBatch(TOKEN_ID, batchInfo(true), "x");
    await registry.mint(TOKEN_ID, await escrow.getAddress(), 100n);
    await usdc.transfer(await escrow.getAddress(), 1_000_000n);
    const s = {
      tradeId: 7n, buyer: buyer.address, seller: seller.address, creditTokenId: TOKEN_ID,
      creditAmount: 10n, quoteToken: await usdc.getAddress(), quoteAmount: 100_000n,
    };
    const leaf = await escrow.leafOf(s);
    await escrow.settleBatch(leaf, 1n);
    await escrow.applySettlement(s, leaf, []);
    await expect(escrow.applySettlement(s, leaf, [])).to.be.revertedWith("already settled");
  });

  it("rejects settlement against an uncommitted root", async () => {
    const { escrow, seller, buyer, usdc } = await deployAll();
    const s = {
      tradeId: 9n, buyer: buyer.address, seller: seller.address, creditTokenId: TOKEN_ID,
      creditAmount: 1n, quoteToken: await usdc.getAddress(), quoteAmount: 1n,
    };
    const leaf = await escrow.leafOf(s);
    await expect(escrow.applySettlement(s, leaf, [])).to.be.revertedWith("root not committed");
  });

  it("only SETTLER_ROLE can commit a batch", async () => {
    const { escrow, other } = await deployAll();
    await expect(escrow.connect(other).settleBatch(keccak256(toUtf8Bytes("r")), 1n)).to.be.reverted;
  });
});

describe("MiningRewards", () => {
  it("accrues and settles netted grants to real balances", async () => {
    const { registry, mining, buyer } = await deployAll();
    await registry.registerBatch(TOKEN_ID, batchInfo(true), "x");
    await registry.mint(TOKEN_ID, await mining.getAddress(), 1000n); // pre-fund liquidity
    await mining.accrue(buyer.address, TOKEN_ID, 30n);
    expect(await mining.claimable(buyer.address, TOKEN_ID)).to.equal(30n);
    await mining.settle([buyer.address], TOKEN_ID);
    expect(await registry.balanceOf(buyer.address, TOKEN_ID)).to.equal(30n);
    expect(await mining.claimable(buyer.address, TOKEN_ID)).to.equal(0n);
  });

  it("only ORACLE_ROLE can accrue/settle", async () => {
    const { mining, other, buyer } = await deployAll();
    await expect(mining.connect(other).accrue(buyer.address, TOKEN_ID, 1n)).to.be.reverted;
  });
});

describe("AuditAnchor", () => {
  it("anchors a root per kind+epoch and prevents overwrite", async () => {
    const { anchor } = await deployAll();
    const kind = keccak256(toUtf8Bytes("audit_log"));
    const root = keccak256(toUtf8Bytes("root-1"));
    await anchor.anchor(kind, root, 1n);
    expect(await anchor.rootAt(kind, 1n)).to.equal(root);
    expect(await anchor.latestEpoch(kind)).to.equal(1n);
    await expect(anchor.anchor(kind, root, 1n)).to.be.revertedWith("epoch already anchored");
  });
});
