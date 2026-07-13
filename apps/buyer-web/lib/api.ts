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

// Burns the credits from the server wallet and mints the certificate; the updated
// wallet snapshot rides along so the UI can re-sync.
export async function postRetirement(input: {
  symbol: string;
  name: string;
  qty: number;
  beneficiary: string;
}): Promise<{ rec: ApiRetirement; wallet?: { usd: number; holdings: { symbol: string; qty: number; avgCost: number }[] } }> {
  const r = await fetch("/api/retirements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Failed to create retirement");
  return { rec: j.data as ApiRetirement, wallet: j.wallet };
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
  mining?: {
    totalAccruedKg: string;
    totalSettledKg: string;
  };
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

// ------------------------------ Wallet ------------------------------

export interface ApiWallet {
  usd: number;
  holdings: { symbol: string; qty: number; avgCost: number }[];
}

export async function getWallet(): Promise<ApiWallet> {
  const r = await fetch("/api/wallet", { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load wallet");
  const j = await r.json();
  return j.data as ApiWallet;
}

// ------------------------------ Orders (server-settled) ------------------------------

export interface ApiOrder {
  id: string;
  pair: string;
  side: string;
  type: string;
  price: number;
  qty: number;
  status: string;
  time: number;
}

export interface PlaceOrderResult {
  ok: boolean;
  error?: string;
  order?: ApiOrder;
  wallet?: ApiWallet;
  filled?: boolean;
}

// Places an order on the backend; marketable orders settle against the account
// wallet server-side and the updated wallet comes back in the response.
export async function placeOrderApi(input: {
  pair: string;
  side: string;
  type: string;
  price: number;
  qty: number;
}): Promise<PlaceOrderResult> {
  try {
    const r = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const j = await r.json();
    if (!r.ok) return { ok: false, error: j.error || "Order rejected" };
    return {
      ok: true,
      order: j.data as ApiOrder,
      wallet: j.wallet as ApiWallet,
      filled: (j.data?.status as string) === "filled",
    };
  } catch (e) {
    return { ok: false, error: "Network error — order not placed." };
  }
}

// ------------------------------ Mining ------------------------------

export interface ApiMiningStats {
  points: number;
  earned: number;
  creditsMinted: number;
  co2SavedKg: number;
  streak: number;
  doneToday: string[];
  log: {
    id: string;
    kind: string;
    actionKey: string;
    label: string;
    points: number;
    credits: number;
    txHash: string | null;
    time: number;
  }[];
}

export interface ApiMiningPayload {
  stats: ApiMiningStats;
  leaderboard: { rank: number; name: string; country: string; points: number; you: boolean }[];
  actions: { key: string; label: string; sub: string; points: number }[];
  pointsPerCredit: number;
}

export async function getMining(): Promise<ApiMiningPayload> {
  const r = await fetch("/api/mining", { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load mining data");
  const j = await r.json();
  return j.data as ApiMiningPayload;
}

export async function postMiningAction(key: string): Promise<{ points: number; stats: ApiMiningStats }> {
  const r = await fetch("/api/mining/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Failed to log action");
  return j.data;
}

export async function postMiningConvert(
  points: number,
): Promise<{ credits: number; txHash: string | null; stats: ApiMiningStats; wallet: ApiWallet }> {
  const r = await fetch("/api/mining/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Conversion failed");
  return j.data;
}

// Best-effort backend cancel (openapi: DELETE /orders/{id}).
export async function cancelOrderApi(id: string): Promise<void> {
  try {
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
  } catch {
    /* non-blocking */
  }
}
