import { ethers } from "ethers";
import "dotenv/config";

// Go/no-go check before an Amoy deploy: RPC reachable, key present, balance sufficient.
// Usage: npm run preflight

const AMOY_CHAIN_ID = 80002n;
const MIN_POL = ethers.parseEther("0.2"); // deploy of 6 contracts + seeding fits comfortably

async function main() {
  console.log("\n── Amoy deployment preflight ──\n");
  let ok = true;

  const rpc = process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";
  const key = process.env.DEPLOYER_PRIVATE_KEY || "";

  // 1. key present + well-formed
  if (!key) {
    console.log("✗ DEPLOYER_PRIVATE_KEY is not set (contracts/.env). See .env.example.");
    ok = false;
  } else if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    console.log("✗ DEPLOYER_PRIVATE_KEY is set but not a 0x-prefixed 64-hex-char key.");
    ok = false;
  } else {
    console.log("✓ Deployer key present");
  }

  // 2. RPC reachable + correct chain
  let provider: ethers.JsonRpcProvider | null = null;
  try {
    provider = new ethers.JsonRpcProvider(rpc);
    const net = await provider.getNetwork();
    if (net.chainId !== AMOY_CHAIN_ID) {
      console.log(`✗ RPC reachable but wrong chain: ${net.chainId} (expected ${AMOY_CHAIN_ID} / Amoy)`);
      ok = false;
    } else {
      const block = await provider.getBlockNumber();
      console.log(`✓ RPC reachable · Amoy (80002) · latest block ${block}`);
    }
  } catch (e) {
    console.log(`✗ RPC unreachable at ${rpc}\n   ${String(e).slice(0, 120)}`);
    ok = false;
  }

  // 3. balance
  if (ok && provider && key) {
    const wallet = new ethers.Wallet(key, provider);
    const bal = await provider.getBalance(wallet.address);
    console.log(`  Deployer: ${wallet.address}`);
    console.log(`  Balance:  ${ethers.formatEther(bal)} POL`);
    if (bal < MIN_POL) {
      console.log(`✗ Balance below ${ethers.formatEther(MIN_POL)} POL — fund it at https://faucet.polygon.technology (Amoy)`);
      ok = false;
    } else {
      console.log("✓ Balance sufficient for deployment");
    }
  }

  console.log(ok ? "\n✅ GO — run: npm run deploy:amoy\n" : "\n⛔ NO-GO — fix the items above, then re-run: npm run preflight\n");
  process.exitCode = ok ? 0 : 1;
}

main();
