// Thin client for the Prive backend API. Shapes mirror /api/openapi.yaml so these
// helpers stay valid when the demo backend is replaced by the real services.

export interface ApiRetirement {
  id: string;
  symbol: string;
  name: string;
  qty: number;
  beneficiary: string;
  certId: string;
  txHash: string;
  status: string;
  time: number;
}

export interface ApiHealth {
  ok: boolean;
  database: string;
  connected: boolean;
}

export async function getHealth(): Promise<ApiHealth> {
  const r = await fetch("/api/health", { cache: "no-store" });
  return r.json();
}

export async function getRetirements(): Promise<ApiRetirement[]> {
  const r = await fetch("/api/retirements", { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load retirements");
  const j = await r.json();
  return j.data as ApiRetirement[];
}

export async function postRetirement(input: {
  symbol: string;
  name: string;
  qty: number;
  beneficiary: string;
}): Promise<ApiRetirement> {
  const r = await fetch("/api/retirements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Failed to create retirement");
  return j.data as ApiRetirement;
}

export interface ApiProject {
  id: string;
  sellerName: string;
  name: string;
  projectType: string;
  standard: string;
  country: string;
  location: string;
  vintage: number;
  expectedAnnual: number;
  price: number;
  stage: string;
  status: string;
  tokenId: string | null;
  note: string | null;
  time: number;
}

export async function getProjects(): Promise<ApiProject[]> {
  const r = await fetch("/api/projects", { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load projects");
  const j = await r.json();
  return j.data as ApiProject[];
}

export async function postProject(input: Partial<ApiProject>): Promise<ApiProject> {
  const r = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Failed to create project");
  return j.data as ApiProject;
}

export async function patchProject(
  id: string,
  action: "advance" | "approve" | "reject" | "request_info",
  note?: string,
): Promise<ApiProject> {
  const r = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, note }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Failed to update project");
  return j.data as ApiProject;
}

export interface ChainStatus {
  connected: boolean;
  configured: boolean;
  network?: string;
  chainId?: number;
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
  const r = await fetch("/api/chain/status", { cache: "no-store" });
  return r.json();
}

export async function postChainRetire(amount: number, beneficiary: string) {
  const r = await fetch("/api/chain/retire", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, beneficiary }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "On-chain retirement failed");
  return j.data as { txHash: string; certificateId: string; tokenURI: string; amount: number; blockNumber: number };
}

export async function postOrder(input: {
  pair: string;
  side: string;
  type: string;
  price: number;
  qty: number;
  status: string;
}): Promise<void> {
  try {
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    /* non-blocking: order history persistence is best-effort in the demo */
  }
}
