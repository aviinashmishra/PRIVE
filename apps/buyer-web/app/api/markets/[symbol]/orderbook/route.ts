import { NextRequest, NextResponse } from "next/server";
import { MARKETS } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Order-book snapshot (openapi: GET /markets/{symbol}/orderbook?depth=N).
// Depth is synthesised around the last price with a deterministic profile —
// the same construction the trading terminal uses client-side.
export async function GET(req: NextRequest, { params }: { params: { symbol: string } }) {
  const m = MARKETS.find((x) => x.symbol.toLowerCase() === params.symbol.toLowerCase());
  if (!m) return NextResponse.json({ error: "Unknown market" }, { status: 404 });
  const depth = Math.min(Math.max(Number(req.nextUrl.searchParams.get("depth")) || 15, 1), 50);

  const mkSide = (dir: 1 | -1) => {
    let total = 0;
    return Array.from({ length: depth }, (_, i) => {
      const price = +(m.price * (1 + dir * (i + 1) * 0.0008)).toFixed(2);
      // deterministic pseudo-size from symbol + level
      const seed = (m.symbol.charCodeAt(0) * 31 + i * 17) % 97;
      const size = +(8 + seed * 3.7 + i * 5.2).toFixed(2);
      total = +(total + size).toFixed(2);
      return { price, size, total };
    });
  };

  return NextResponse.json({
    data: {
      symbol: m.symbol,
      lastPrice: m.price,
      bids: mkSide(-1),
      asks: mkSide(1),
      timestamp: Date.now(),
    },
  });
}
