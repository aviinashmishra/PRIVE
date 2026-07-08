import { NextResponse } from "next/server";
import { db, hasDb } from "@/db/client";
import { markets as marketsTable } from "@/db/schema";
import { MARKETS } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (hasDb && db) {
      const rows = await db.select().from(marketsTable);
      return NextResponse.json({ source: "neon", data: rows });
    }
    // fallback: catalog fields from the seed dataset
    const data = MARKETS.map((m) => ({
      symbol: m.symbol,
      pair: m.pair,
      name: m.name,
      projectType: m.projectType,
      standard: m.standard,
      vintage: m.vintage,
      location: m.location,
      country: m.country,
      rating: m.rating,
      basePrice: m.price,
      supply: m.supply,
      retired: m.retired,
    }));
    return NextResponse.json({ source: "in-memory-fallback", data });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load markets", detail: String(e) }, { status: 500 });
  }
}
