import { NextRequest, NextResponse } from "next/server";
import { MARKETS } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Recent public trades (openapi: GET /markets/{symbol}/trades?limit=N).
export async function GET(req: NextRequest, { params }: { params: { symbol: string } }) {
  const m = MARKETS.find((x) => x.symbol.toLowerCase() === params.symbol.toLowerCase());
  if (!m) return NextResponse.json({ error: "Unknown market" }, { status: 404 });
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit")) || 24, 1), 100);

  const now = Date.now();
  const data = Array.from({ length: limit }, (_, i) => {
    const seed = (m.symbol.charCodeAt(0) * 131 + i * 29) % 199;
    return {
      id: `${m.symbol}-${now - i * 4200}`,
      price: +(m.price * (1 + ((seed / 199 - 0.5) * 0.002))).toFixed(2),
      size: +(2 + (seed % 90) * 2.1).toFixed(2),
      side: seed % 2 === 0 ? "buy" : "sell",
      time: now - i * 4200,
    };
  });
  return NextResponse.json({ data });
}
