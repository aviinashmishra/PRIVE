import { db, hasDb } from "@/db/client";
import { accounts, holdings } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { DEMO_ACCOUNT_ID } from "./repo";

// Server-authoritative wallet: USD cash on accounts.usd_balance, credits in the
// holdings table. Every mutation is a single conditional SQL statement so balances
// can never go negative even without an interactive transaction (the Neon HTTP
// driver runs one statement per request).

export interface WalletHolding {
  symbol: string;
  qty: number;
  avgCost: number;
}

export interface WalletDTO {
  usd: number;
  holdings: WalletHolding[];
}

export type WalletError = "insufficient_funds" | "insufficient_credits" | "account_not_found";

export class WalletOpError extends Error {
  constructor(public code: WalletError, message: string) {
    super(message);
  }
}

// ---- in-memory fallback (dev without DATABASE_URL) ----
interface MemWallet {
  usd: number;
  holdings: Map<string, { qty: number; avgCost: number }>;
}
const memWallets = new Map<string, MemWallet>();

function memWallet(accountId: string): MemWallet {
  let w = memWallets.get(accountId);
  if (!w) {
    // mirror the seeded demo portfolio so the no-DB dev experience matches
    w = {
      usd: 48650,
      holdings: new Map([
        ["AMZN-RF25", { qty: 1240, avgCost: 21.1 }],
        ["BLUE-ID24", { qty: 380, avgCost: 28.9 }],
        ["SOLR-IN24", { qty: 5200, avgCost: 10.2 }],
        ["PRIVE-CO2", { qty: 2100, avgCost: 19.4 }],
      ]),
    };
    memWallets.set(accountId, w);
  }
  return w;
}

const EPSILON = 0.0001; // below this a holding row is considered empty and removed

export async function getWallet(accountId = DEMO_ACCOUNT_ID): Promise<WalletDTO> {
  if (hasDb && db) {
    const [acct] = await db
      .select({ usd: accounts.usdBalance })
      .from(accounts)
      .where(eq(accounts.id, accountId));
    const rows = await db.select().from(holdings).where(eq(holdings.accountId, accountId));
    return {
      usd: acct ? Number(acct.usd) : 0,
      holdings: rows
        .filter((r) => Number(r.qty) > EPSILON)
        .map((r) => ({ symbol: r.symbol, qty: Number(r.qty), avgCost: Number(r.avgCost) }))
        .sort((a, b) => a.symbol.localeCompare(b.symbol)),
    };
  }
  const w = memWallet(accountId);
  return {
    usd: w.usd,
    holdings: [...w.holdings.entries()]
      .filter(([, h]) => h.qty > EPSILON)
      .map(([symbol, h]) => ({ symbol, qty: h.qty, avgCost: h.avgCost }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol)),
  };
}

// Debits cash iff the balance covers it. Returns false when funds are insufficient.
async function debitUsd(accountId: string, amount: number): Promise<boolean> {
  const amt = amount.toFixed(2);
  if (hasDb && db) {
    const res = await db
      .update(accounts)
      .set({ usdBalance: sql`${accounts.usdBalance} - ${amt}` })
      .where(and(eq(accounts.id, accountId), sql`${accounts.usdBalance} >= ${amt}`))
      .returning({ id: accounts.id });
    return res.length > 0;
  }
  const w = memWallet(accountId);
  if (w.usd < amount) return false;
  w.usd -= amount;
  return true;
}

async function creditUsd(accountId: string, amount: number): Promise<void> {
  const amt = amount.toFixed(2);
  if (hasDb && db) {
    await db
      .update(accounts)
      .set({ usdBalance: sql`${accounts.usdBalance} + ${amt}` })
      .where(eq(accounts.id, accountId));
    return;
  }
  memWallet(accountId).usd += amount;
}

// Adds credits to a holding, blending the average cost (cost 0 = free mining grant).
export async function creditHolding(
  accountId: string,
  symbol: string,
  qty: number,
  unitCost: number,
): Promise<void> {
  const q = qty.toFixed(4);
  const c = unitCost.toFixed(4);
  if (hasDb && db) {
    await db
      .insert(holdings)
      .values({ accountId, symbol, qty: q, avgCost: c })
      .onConflictDoUpdate({
        target: [holdings.accountId, holdings.symbol],
        set: {
          // weighted average over the pre-update row (Postgres evaluates the old row)
          avgCost: sql`CASE WHEN ${holdings.qty} + ${q} > 0
            THEN (${holdings.avgCost} * ${holdings.qty} + ${c}::numeric * ${q}::numeric) / (${holdings.qty} + ${q})
            ELSE 0 END`,
          qty: sql`${holdings.qty} + ${q}`,
          updatedAt: new Date(),
        },
      });
    return;
  }
  const w = memWallet(accountId);
  const cur = w.holdings.get(symbol);
  if (cur) {
    const newQty = cur.qty + qty;
    cur.avgCost = newQty > 0 ? (cur.avgCost * cur.qty + unitCost * qty) / newQty : 0;
    cur.qty = newQty;
  } else {
    w.holdings.set(symbol, { qty, avgCost: unitCost });
  }
}

// Removes credits iff the holding covers it. Returns false when insufficient.
export async function debitHolding(accountId: string, symbol: string, qty: number): Promise<boolean> {
  const q = qty.toFixed(4);
  if (hasDb && db) {
    const res = await db
      .update(holdings)
      .set({ qty: sql`${holdings.qty} - ${q}`, updatedAt: new Date() })
      .where(
        and(eq(holdings.accountId, accountId), eq(holdings.symbol, symbol), sql`${holdings.qty} >= ${q}`),
      )
      .returning({ qty: holdings.qty });
    if (res.length === 0) return false;
    if (Number(res[0].qty) <= EPSILON) {
      await db
        .delete(holdings)
        .where(and(eq(holdings.accountId, accountId), eq(holdings.symbol, symbol)));
    }
    return true;
  }
  const w = memWallet(accountId);
  const cur = w.holdings.get(symbol);
  if (!cur || cur.qty < qty) return false;
  cur.qty -= qty;
  if (cur.qty <= EPSILON) w.holdings.delete(symbol);
  return true;
}

export interface TradeFill {
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  notional: number;
  wallet: WalletDTO;
}

// Settles a marketable order against the wallet. Buys debit cash first (conditional,
// so overdrafts are impossible) then credit the holding; sells do the reverse.
export async function executeTrade(input: {
  accountId: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
}): Promise<TradeFill> {
  const { accountId, symbol, side, qty, price } = input;
  const notional = +(qty * price).toFixed(2);

  if (side === "buy") {
    const ok = await debitUsd(accountId, notional);
    if (!ok) throw new WalletOpError("insufficient_funds", "Insufficient USDT balance.");
    await creditHolding(accountId, symbol, qty, price);
  } else {
    const ok = await debitHolding(accountId, symbol, qty);
    if (!ok) throw new WalletOpError("insufficient_credits", `Insufficient ${symbol} balance.`);
    await creditUsd(accountId, notional);
  }

  return { symbol, side, qty, price, notional, wallet: await getWallet(accountId) };
}
