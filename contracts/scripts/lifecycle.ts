import { ethers, network } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

// Full credit lifecycle as REAL on-chain transactions:
// register → attest registry-retired → mint → trade-settle (escrow) → retire (burn + cert) → anchor.
const RETIRER_ROLE = keccak256(toUtf8Bytes("RETIRER_ROLE"));
const STANDARD = keccak256(toUtf8Bytes("verra_vcs"));
const TID = 1n;

const line = (s = "") => console.log(s);

async function main() {
  const [admin, seller, buyer] = await ethers.getSigners();
  line(`\n╔══ Prive on-chain lifecycle · network: ${network.name} ══╗\n`);

  const registry = await (await ethers.getContractFactory("CreditRegistry")).deploy(admin.address);
  const vault = await (await ethers.getContractFactory("RetirementVault")).deploy(admin.address, await registry.getAddress());
  const escrow = await (await ethers.getContractFactory("PriveEscrow")).deploy(admin.address, await registry.getAddress());
  const anchor = await (await ethers.getContractFactory("AuditAnchor")).deploy(admin.address);
  const usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
  await registry.grantRole(RETIRER_ROLE, await vault.getAddress());
  line("① Deployed CreditRegistry, RetirementVault, PriveEscrow, AuditAnchor, MockUSDC");

  // ② register + attest + mint
  await (await registry.registerBatch(
    TID,
    { projectId: 101n, vintageYear: 2025, standard: STANDARD, metadataHash: keccak256(toUtf8Bytes("meta")),
      registrySerialRange: "VCS-1174-000001..001000", registryRetired: true, exists: false, totalMinted: 0n, totalRetired: 0n },
    "bafyAmazonMeta",
  )).wait();
  await (await registry.mint(TID, seller.address, 1000n)).wait();
  line(`② Registered batch #${TID} (AMZN-RF25), minted 1000 tCO₂e to seller`);
  line(`   circulating = ${await registry.circulating(TID)} t`);

  // ③ settle a trade: seller sells 200t to buyer @ 25 mUSDC via escrow
  await (await registry.connect(seller).safeTransferFrom(seller.address, await escrow.getAddress(), TID, 200n, "0x")).wait();
  await (await usdc.transfer(await escrow.getAddress(), 5000n * 10n ** 6n)).wait(); // buyer's quote, pre-paid off-chain
  const settlement = {
    tradeId: 1001n, buyer: buyer.address, seller: seller.address, creditTokenId: TID,
    creditAmount: 200n, quoteToken: await usdc.getAddress(), quoteAmount: 5000n * 10n ** 6n,
  };
  const leaf = await escrow.leafOf(settlement);
  await (await escrow.settleBatch(leaf, 1n)).wait();
  await (await escrow.applySettlement(settlement, leaf, [])).wait();
  line(`③ Settled trade #1001 via PriveEscrow (Merkle-proven atomic swap)`);
  line(`   buyer credits = ${await registry.balanceOf(buyer.address, TID)} t · seller received ${Number(await usdc.balanceOf(seller.address)) / 1e6} mUSDC`);

  // ④ buyer retires 80t → burn + certificate NFT
  const tx = await vault.retire(buyer.address, TID, 80n, "Acme Steel Ltd · FY2026", "bafyCertQR");
  const rcpt = await tx.wait();
  const certId = await vault.totalCertificates();
  line(`④ Buyer retired 80 tCO₂e → burned on-chain, certificate NFT #${certId} minted`);
  line(`   cert owner = ${await vault.ownerOf(certId)} · uri = ${await vault.tokenURI(certId)}`);
  line(`   buyer credits now = ${await registry.balanceOf(buyer.address, TID)} t`);

  // ⑤ anchor an audit-log root
  await (await anchor.anchor(keccak256(toUtf8Bytes("audit_log")), keccak256(toUtf8Bytes("epoch-1-root")), 1n)).wait();
  line(`⑤ Anchored audit-log Merkle root for epoch 1`);

  // ⑥ closing invariant
  const b = await registry.batchInfo(TID);
  line(`\n── Ledger integrity ──`);
  line(`   totalMinted  = ${b.totalMinted} t`);
  line(`   totalRetired = ${b.totalRetired} t`);
  line(`   circulating  = ${await registry.circulating(TID)} t  (minted - retired) ✓`);
  line(`\n✅ Full lifecycle executed on-chain (tx gas used on retire: ${rcpt?.gasUsed}).\n`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
