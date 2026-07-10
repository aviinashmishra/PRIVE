import { NextRequest, NextResponse } from "next/server";
import { MARKETS } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Market detail (openapi: GET /markets/{symbol}). Served from the deterministic
// market dataset — the same source the terminal charts render from.
export async function GET(_req: NextRequest, { params }: { params: { symbol: string } }) {
  const m = MARKETS.find((x) => x.symbol.toLowerCase() === params.symbol.toLowerCase());
  if (!m) return NextResponse.json({ error: "Unknown market" }, { status: 404 });
  const { candles, ...detail } = m;
  return NextResponse.json({ data: detail });
}
