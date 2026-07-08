import { db, hasDb } from "@/db/client";
import { retirements, orders, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { nextStage, SELLER_ACCOUNT_ID } from "./pipeline";

// Seeded demo-trader account (trader@prive.exchange). Routes now pass the
// authenticated session's accountId; this remains only as the in-memory fallback.
export const DEMO_ACCOUNT_ID = "00000000-0000-4000-8000-000000000001";

export interface RetirementDTO {
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

export interface OrderDTO {
  id: string;
  pair: string;
  side: string;
  type: string;
  price: number;
  qty: number;
  status: string;
  time: number;
}

// ---- in-memory fallback (dev without DATABASE_URL) ----
const memRetirements: RetirementDTO[] = [];
const memOrders: OrderDTO[] = [];

function genCert() {
  return "PRV-CERT-" + Math.floor(1000 + Math.random() * 9000);
}
function genTx() {
  return "0x" + Math.random().toString(16).slice(2, 6) + "…" + Math.random().toString(16).slice(2, 6);
}

export async function listRetirements(accountId = DEMO_ACCOUNT_ID): Promise<RetirementDTO[]> {
  if (hasDb && db) {
    const rows = await db
      .select()
      .from(retirements)
      .where(eq(retirements.accountId, accountId))
      .orderBy(desc(retirements.createdAt));
    return rows.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      name: r.name,
      qty: Number(r.qty),
      beneficiary: r.beneficiary,
      certId: r.certId,
      txHash: r.txHash,
      status: r.status,
      time: r.createdAt.getTime(),
    }));
  }
  return [...memRetirements].sort((a, b) => b.time - a.time);
}

export async function createRetirement(input: {
  symbol: string;
  name: string;
  qty: number;
  beneficiary: string;
  accountId?: string;
}): Promise<RetirementDTO> {
  const accountId = input.accountId ?? DEMO_ACCOUNT_ID;
  const certId = genCert();
  const txHash = genTx();
  if (hasDb && db) {
    const [row] = await db
      .insert(retirements)
      .values({
        accountId,
        symbol: input.symbol,
        name: input.name,
        qty: String(input.qty),
        beneficiary: input.beneficiary,
        certId,
        txHash,
        status: "confirmed",
      })
      .returning();
    return {
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      qty: Number(row.qty),
      beneficiary: row.beneficiary,
      certId: row.certId,
      txHash: row.txHash,
      status: row.status,
      time: row.createdAt.getTime(),
    };
  }
  const rec: RetirementDTO = {
    id: "mem-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    symbol: input.symbol,
    name: input.name,
    qty: input.qty,
    beneficiary: input.beneficiary,
    certId,
    txHash,
    status: "confirmed",
    time: Date.now(),
  };
  memRetirements.push(rec);
  return rec;
}

export async function listOrders(accountId = DEMO_ACCOUNT_ID): Promise<OrderDTO[]> {
  if (hasDb && db) {
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.accountId, accountId))
      .orderBy(desc(orders.createdAt));
    return rows.map((r) => ({
      id: r.id,
      pair: r.pair,
      side: r.side,
      type: r.type,
      price: Number(r.price),
      qty: Number(r.qty),
      status: r.status,
      time: r.createdAt.getTime(),
    }));
  }
  return [...memOrders].sort((a, b) => b.time - a.time);
}

export async function createOrder(input: {
  pair: string;
  side: string;
  type: string;
  price: number;
  qty: number;
  status: string;
  accountId?: string;
}): Promise<OrderDTO> {
  const accountId = input.accountId ?? DEMO_ACCOUNT_ID;
  if (hasDb && db) {
    const [row] = await db
      .insert(orders)
      .values({
        accountId,
        pair: input.pair,
        side: input.side,
        type: input.type,
        price: String(input.price),
        qty: String(input.qty),
        filled: input.status === "filled" ? String(input.qty) : "0",
        status: input.status,
      })
      .returning();
    return {
      id: row.id,
      pair: row.pair,
      side: row.side,
      type: row.type,
      price: Number(row.price),
      qty: Number(row.qty),
      status: row.status,
      time: row.createdAt.getTime(),
    };
  }
  const rec: OrderDTO = {
    id: "mem-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    pair: input.pair,
    side: input.side,
    type: input.type,
    price: input.price,
    qty: input.qty,
    status: input.status,
    time: Date.now(),
  };
  memOrders.push(rec);
  return rec;
}

// ------------------------------ Projects (seller ↔ admin) ------------------------------

export interface ProjectDTO {
  id: string;
  sellerAccountId: string;
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

const memProjects: ProjectDTO[] = [];

function rowToProject(r: typeof projects.$inferSelect): ProjectDTO {
  return {
    id: r.id,
    sellerAccountId: r.sellerAccountId,
    sellerName: r.sellerName,
    name: r.name,
    projectType: r.projectType,
    standard: r.standard,
    country: r.country,
    location: r.location,
    vintage: r.vintage,
    expectedAnnual: r.expectedAnnual,
    price: Number(r.price),
    stage: r.stage,
    status: r.status,
    tokenId: r.tokenId,
    note: r.note,
    time: r.createdAt.getTime(),
  };
}

export async function listProjects(sellerAccountId?: string): Promise<ProjectDTO[]> {
  if (hasDb && db) {
    const rows = sellerAccountId
      ? await db
          .select()
          .from(projects)
          .where(eq(projects.sellerAccountId, sellerAccountId))
          .orderBy(desc(projects.createdAt))
      : await db.select().from(projects).orderBy(desc(projects.createdAt));
    return rows.map(rowToProject);
  }
  return [...memProjects]
    .filter((p) => !sellerAccountId || p.sellerAccountId === sellerAccountId)
    .sort((a, b) => b.time - a.time);
}

export async function createProject(input: {
  sellerName: string;
  name: string;
  projectType: string;
  standard: string;
  country: string;
  location: string;
  vintage: number;
  expectedAnnual: number;
  price: number;
  accountId?: string;
}): Promise<ProjectDTO> {
  const accountId = input.accountId ?? SELLER_ACCOUNT_ID;
  if (hasDb && db) {
    const [row] = await db
      .insert(projects)
      .values({
        sellerAccountId: accountId,
        sellerName: input.sellerName,
        name: input.name,
        projectType: input.projectType,
        standard: input.standard,
        country: input.country,
        location: input.location,
        vintage: input.vintage,
        expectedAnnual: input.expectedAnnual,
        price: String(input.price),
        stage: "Submitted",
        status: "pending",
      })
      .returning();
    return rowToProject(row);
  }
  const rec: ProjectDTO = {
    id: "mem-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    sellerAccountId: accountId,
    sellerName: input.sellerName,
    name: input.name,
    projectType: input.projectType,
    standard: input.standard,
    country: input.country,
    location: input.location,
    vintage: input.vintage,
    expectedAnnual: input.expectedAnnual,
    price: input.price,
    stage: "Submitted",
    status: "pending",
    tokenId: null,
    note: null,
    time: Date.now(),
  };
  memProjects.push(rec);
  return rec;
}

// Admin actions: advance | approve | reject | request_info
export async function actOnProject(
  id: string,
  action: "advance" | "approve" | "reject" | "request_info",
  note?: string,
): Promise<ProjectDTO | null> {
  const apply = (p: ProjectDTO): ProjectDTO => {
    if (action === "advance") return { ...p, stage: nextStage(p.stage) };
    if (action === "approve")
      return { ...p, stage: "Live", status: "live", tokenId: p.tokenId ?? synthTokenId(p) };
    if (action === "reject") return { ...p, status: "rejected", note: note ?? "Rejected" };
    return { ...p, note: note ?? "More information requested" };
  };

  if (hasDb && db) {
    const [existing] = await db.select().from(projects).where(eq(projects.id, id));
    if (!existing) return null;
    const updated = apply(rowToProject(existing));
    const [row] = await db
      .update(projects)
      .set({
        stage: updated.stage,
        status: updated.status,
        tokenId: updated.tokenId,
        note: updated.note,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();
    return rowToProject(row);
  }
  const idx = memProjects.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  memProjects[idx] = apply(memProjects[idx]);
  return memProjects[idx];
}

function synthTokenId(p: ProjectDTO): string {
  const prefix = p.name.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "PRV";
  return `${prefix}-${String(p.vintage).slice(2)}`;
}
