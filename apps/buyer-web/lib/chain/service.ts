import "server-only";
import { ethers } from "ethers";

// Reads the deployment written by contracts/scripts/deploy.ts. Present only after a deploy.
let deployment: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  deployment = require("./deployment.json");
} catch {
  deployment = null;
}

// Local Hardhat default account #0 — a PUBLICLY KNOWN key, safe for local dev only.
// On testnet/mainnet, set CHAIN_ADMIN_KEY in the environment (never commit it).
const LOCAL_ADMIN_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const RPC_URL = process.env.CHAIN_RPC_URL || "http://127.0.0.1:8545";
const ADMIN_KEY = process.env.CHAIN_ADMIN_KEY || LOCAL_ADMIN_KEY;

// Minimal ABIs — just the surface the app touches.
const REGISTRY_ABI = [
  "function batchInfo(uint256) view returns (tuple(uint256 projectId,uint16 vintageYear,bytes32 standard,bytes32 metadataHash,string registrySerialRange,bool registryRetired,bool exists,uint256 totalMinted,uint256 totalRetired))",
  "function circulating(uint256) view returns (uint256)",
  "function balanceOf(address,uint256) view returns (uint256)",
  "function uri(uint256) view returns (string)",
  "event BatchRegistered(uint256 indexed tokenId,uint256 indexed projectId,uint16 vintageYear,bytes32 metadataHash)",
  "event CreditsMinted(uint256 indexed tokenId,address indexed to,uint256 amount)",
  "event CreditsRetired(uint256 indexed tokenId,address indexed from,uint256 amount)",
  "event RegistryRetiredSet(uint256 indexed tokenId,bool value)",
];
const VAULT_ABI = [
  "function retire(address from,uint256 creditTokenId,uint256 amount,string beneficiaryName,string certIpfsCid) returns (uint256)",
  "function totalCertificates() view returns (uint256)",
  "function tokenURI(uint256) view returns (string)",
  "function ownerOf(uint256) view returns (address)",
  "event CreditsRetired(uint256 indexed creditTokenId,address indexed beneficiary,uint256 amount,uint256 indexed certificateId)",
];

export const chainConfigured = !!deployment;

function provider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}
function adminSigner() {
  return new ethers.Wallet(ADMIN_KEY, provider());
}

export interface ChainStatus {
  connected: boolean;
  configured: boolean;
  network?: string;
  chainId?: number;
  rpc?: string;
  contracts?: Record<string, string>;
  seed?: { symbol: string; tokenId: number };
  batch?: {
    registryRetired: boolean;
    totalMinted: string;
    totalRetired: string;
    circulating: string;
    adminBalance: string;
    uri: string;
  };
  certificates?: string;
  error?: string;
}

export async function getChainStatus(): Promise<ChainStatus> {
  if (!deployment) return { connected: false, configured: false };
  try {
    const p = provider();
    const net = await p.getNetwork();
    const registry = new ethers.Contract(deployment.contracts.CreditRegistry, REGISTRY_ABI, p);
    const vault = new ethers.Contract(deployment.contracts.RetirementVault, VAULT_ABI, p);
    const tid = BigInt(deployment.seedBatch?.tokenId ?? 1);
    const admin: string = deployment.admin;

    const [info, circ, bal, uri, certs] = await Promise.all([
      registry.batchInfo(tid),
      registry.circulating(tid),
      registry.balanceOf(admin, tid),
      registry.uri(tid),
      vault.totalCertificates(),
    ]);

    return {
      connected: true,
      configured: true,
      network: deployment.network,
      chainId: Number(net.chainId),
      rpc: RPC_URL,
      contracts: deployment.contracts,
      seed: { symbol: deployment.seedBatch?.symbol, tokenId: Number(tid) },
      batch: {
        registryRetired: info.registryRetired,
        totalMinted: info.totalMinted.toString(),
        totalRetired: info.totalRetired.toString(),
        circulating: circ.toString(),
        adminBalance: bal.toString(),
        uri,
      },
      certificates: certs.toString(),
    };
  } catch (e) {
    return { connected: false, configured: true, rpc: RPC_URL, error: String(e) };
  }
}

export interface ChainEvent {
  kind: "BatchRegistered" | "RegistryRetiredSet" | "CreditsMinted" | "CreditsRetired" | "CertificateIssued";
  tokenId: string;
  detail: string;
  amount?: string;
  address?: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

/// Reads the REAL event log from the chain — the Transparency Explorer's data source.
/// Anyone can audit the full lifecycle: registration → attestation → mint → retirement.
export async function getChainEvents(): Promise<ChainEvent[]> {
  if (!deployment) return [];
  const p = provider();
  const registry = new ethers.Contract(deployment.contracts.CreditRegistry, REGISTRY_ABI, p);
  const vault = new ethers.Contract(deployment.contracts.RetirementVault, VAULT_ABI, p);

  const [registered, attested, minted, retired, certs] = await Promise.all([
    registry.queryFilter(registry.filters.BatchRegistered(), 0),
    registry.queryFilter(registry.filters.RegistryRetiredSet(), 0),
    registry.queryFilter(registry.filters.CreditsMinted(), 0),
    registry.queryFilter(registry.filters.CreditsRetired(), 0),
    vault.queryFilter(vault.filters.CreditsRetired(), 0),
  ]);

  const blockCache = new Map<number, number>();
  async function ts(bn: number): Promise<number> {
    if (!blockCache.has(bn)) {
      const b = await p.getBlock(bn);
      blockCache.set(bn, (b?.timestamp ?? 0) * 1000);
    }
    return blockCache.get(bn)!;
  }

  const out: ChainEvent[] = [];
  for (const e of registered as ethers.EventLog[]) {
    out.push({
      kind: "BatchRegistered", tokenId: e.args.tokenId.toString(),
      detail: `Project #${e.args.projectId} · vintage ${e.args.vintageYear} · metadata anchored`,
      txHash: e.transactionHash, blockNumber: e.blockNumber, timestamp: await ts(e.blockNumber),
    });
  }
  for (const e of attested as ethers.EventLog[]) {
    out.push({
      kind: "RegistryRetiredSet", tokenId: e.args.tokenId.toString(),
      detail: e.args.value ? "Legacy registry serials attested retired — minting unlocked" : "Attestation revoked",
      txHash: e.transactionHash, blockNumber: e.blockNumber, timestamp: await ts(e.blockNumber),
    });
  }
  for (const e of minted as ethers.EventLog[]) {
    out.push({
      kind: "CreditsMinted", tokenId: e.args.tokenId.toString(),
      detail: `Minted to ${e.args.to.slice(0, 8)}…`, amount: e.args.amount.toString(), address: e.args.to,
      txHash: e.transactionHash, blockNumber: e.blockNumber, timestamp: await ts(e.blockNumber),
    });
  }
  for (const e of retired as ethers.EventLog[]) {
    out.push({
      kind: "CreditsRetired", tokenId: e.args.tokenId.toString(),
      detail: `Burned from ${e.args.from.slice(0, 8)}…`, amount: e.args.amount.toString(), address: e.args.from,
      txHash: e.transactionHash, blockNumber: e.blockNumber, timestamp: await ts(e.blockNumber),
    });
  }
  for (const e of certs as ethers.EventLog[]) {
    out.push({
      kind: "CertificateIssued", tokenId: e.args.creditTokenId.toString(),
      detail: `Certificate NFT #${e.args.certificateId} → ${e.args.beneficiary.slice(0, 8)}…`,
      amount: e.args.amount.toString(), address: e.args.beneficiary,
      txHash: e.transactionHash, blockNumber: e.blockNumber, timestamp: await ts(e.blockNumber),
    });
  }

  return out.sort((a, b) => b.blockNumber - a.blockNumber || b.timestamp - a.timestamp);
}

export interface RetireResult {
  txHash: string;
  certificateId: string;
  tokenURI: string;
  amount: number;
  blockNumber: number;
}

/// Performs a REAL on-chain retirement: burns `amount` of the seed batch held by the admin
/// account and mints a certificate NFT. Returns the transaction hash + certificate id.
export async function retireOnChain(amount: number, beneficiary: string, cid = "bafyPriveCert"): Promise<RetireResult> {
  if (!deployment) throw new Error("No deployment. Run the contracts deploy script first.");
  const signer = adminSigner();
  const vault = new ethers.Contract(deployment.contracts.RetirementVault, VAULT_ABI, signer);
  const tid = BigInt(deployment.seedBatch?.tokenId ?? 1);

  const tx = await vault.retire(deployment.admin, tid, BigInt(amount), beneficiary, cid);
  const receipt = await tx.wait();

  // parse the CreditsRetired event for the certificate id
  let certificateId = "0";
  for (const log of receipt.logs) {
    try {
      const parsed = vault.interface.parseLog(log);
      if (parsed?.name === "CreditsRetired") {
        certificateId = parsed.args.certificateId.toString();
        break;
      }
    } catch {
      /* not our event */
    }
  }
  const tokenURI = certificateId !== "0" ? await vault.tokenURI(BigInt(certificateId)) : "";

  return {
    txHash: tx.hash,
    certificateId,
    tokenURI,
    amount,
    blockNumber: receipt.blockNumber,
  };
}
