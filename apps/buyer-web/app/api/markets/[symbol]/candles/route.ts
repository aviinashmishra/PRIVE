import { NextRequest, NextResponse } from "next/server";
import { MARKETS } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// OHLCV history (openapi: GET /markets/{symbol}/candles?limit=N).
export async function GET(req: NextRequest, { params }: { params: { symbol: string } }) {
  const m = MARKETS.find((x) => x.symbol.toLowerCase() === params.symbol.toLowerCase());
  if (!m) return NextResponse.json({ error: "Unknown market" }, { status: 404 });
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit")) || 200, 1), 500);
  return NextResponse.json({ data: m.candles.slice(-limit) });
}
