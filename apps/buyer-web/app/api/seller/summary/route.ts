import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { db, hasDb } from "@/db/client";
import { projects, markets, orders, retirements } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { listProjects } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Real seller analytics, aggregated from the live tables:
//  - own projects (pipeline)
//  - markets rows for tokenised batches (minted supply / retired / price)
//  - platform order flow on those pairs (sold qty + notional, monthly buckets)
//  - retirement flow per symbol
export async function GET() {
  const { session, error } = await requireRole("seller", "admin");
  if (error) return error;
  try {
    const own = await listProjects(session.role === "seller" ? session.accountId : undefined);
    const live = own.filter((p) => p.status === "live" && p.tokenId);
    const symbols = live.map((p) => p.tokenId as string);
    const pairs = symbols.map((s) => `${s}/USDT`);

    let batches: Array<{
      tokenId: string;
      name: string;
      projectType: string;
      vintage: number;
      minted: number;
      retired: number;
      price: number;
      soldQty: number;
      soldNotional: number;
    }> = [];
    let monthly: Array<{ month: string; notional: number; qty: number }> = [];

    if (hasDb && db && symbols.length > 0) {
      const marketRows = await db.select().from(markets).where(inArray(markets.symbol, symbols));

      const orderAgg = await db
        .select({
          pair: orders.pair,
          qty: sql<string>`coalesce(sum(${orders.qty}), 0)`,
          notional: sql<string>`coalesce(sum(${orders.qty} * ${orders.price}), 0)`,
        })
        .from(orders)
        .where(and(inArray(orders.pair, pairs), eq(orders.side, "buy"), eq(orders.status, "filled")))
        .groupBy(orders.pair);

      const retireAgg = await db
        .select({
          symbol: retirements.symbol,
          qty: sql<string>`coalesce(sum(${retirements.qty}), 0)`,
        })
        .from(retirements)
        .where(inArray(retirements.symbol, symbols))
        .groupBy(retirements.symbol);

      const monthRows = await db
        .select({
          month: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM')`,
          notional: sql<string>`coalesce(sum(${orders.qty} * ${orders.price}), 0)`,
          qty: sql<string>`coalesce(sum(${orders.qty}), 0)`,
        })
        .from(orders)
        .where(and(inArray(orders.pair, pairs), eq(orders.side, "buy"), eq(orders.status, "filled")))
        .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM')`);

      const orderByPair = new Map(orderAgg.map((o) => [o.pair, o]));
      const retiredBySymbol = new Map(retireAgg.map((r) => [r.symbol, Number(r.qty)]));

      batches = live.map((p) => {
        const mkt = marketRows.find((m) => m.symbol === p.tokenId);
        const o = orderByPair.get(`${p.tokenId}/USDT`);
        return {
          tokenId: p.tokenId as string,
          name: p.name,
          projectType: p.projectType,
          vintage: p.vintage,
          minted: mkt?.supply ?? p.expectedAnnual,
          retired: (mkt?.retired ?? 0) + (retiredBySymbol.get(p.tokenId as string) ?? 0),
          price: Number(mkt?.basePrice ?? p.price),
          soldQty: Number(o?.qty ?? 0),
          soldNotional: Number(o?.notional ?? 0),
        };
      });
      monthly = monthRows.map((m) => ({ month: m.month, notional: Number(m.notional), qty: Number(m.qty) }));
    } else {
      // no-DB fallback: batch skeletons from the projects themselves
      batches = live.map((p) => ({
        tokenId: p.tokenId as string,
        name: p.name,
        projectType: p.projectType,
        vintage: p.vintage,
        minted: p.expectedAnnual,
        retired: 0,
        price: p.price,
        soldQty: 0,
        soldNotional: 0,
      }));
    }

    const totals = {
      projects: own.length,
      live: live.length,
      pending: own.filter((p) => p.status === "pending").length,
      minted: batches.reduce((a, b) => a + b.minted, 0),
      retired: batches.reduce((a, b) => a + b.retired, 0),
      soldQty: batches.reduce((a, b) => a + b.soldQty, 0),
      grossRevenue: batches.reduce((a, b) => a + b.soldNotional, 0),
    };
    const PLATFORM_FEE = 0.025;
    return NextResponse.json({
      data: {
        batches,
        monthly,
        totals: {
          ...totals,
          fee: totals.grossRevenue * PLATFORM_FEE,
          netRevenue: totals.grossRevenue * (1 - PLATFORM_FEE),
        },
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load seller summary", detail: String(e) }, { status: 500 });
  }
}
