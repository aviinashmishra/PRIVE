import { NextRequest, NextResponse } from "next/server";
import { listOrders, createOrder } from "@/lib/repo";
import { requireAuth } from "@/lib/auth/guard";
import { executeTrade, getWallet, WalletOpError } from "@/lib/wallet";
import { db, hasDb } from "@/db/client";
import { markets as marketsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MARKETS } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  try {
    const data = await listOrders(session.accountId);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load orders", detail: String(e) }, { status: 500 });
  }
}

async function referencePrice(symbol: string): Promise<number | null> {
  if (hasDb && db) {
    const [row] = await db
      .select({ basePrice: marketsTable.basePrice })
      .from(marketsTable)
      .where(eq(marketsTable.symbol, symbol));
    return row ? Number(row.basePrice) : null;
  }
  const m = MARKETS.find((x) => x.symbol === symbol);
  return m ? m.price : null;
}

// The price band around the listed base price inside which client marks are
// accepted (the ticker is simulated client-side; the band stops wild fills).
const PRICE_BAND = 0.15;

// Places an order and — when marketable — settles it against the account wallet.
// Buys debit USD and credit the holding; sells do the reverse. Balance checks are
// conditional SQL updates, so a stale client can never overdraw the account.
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  try {
    const body = await req.json();
    const side = String(body.side);
    const type = String(body.type);
    const qty = Number(body.qty);
    const clientPrice = Number(body.price);
    const pair = String(body.pair || "");
    const symbol = pair.split("/")[0];

    if (!symbol || !["buy", "sell"].includes(side) || !["limit", "market"].includes(type) || !(qty > 0)) {
      return NextResponse.json(
        { error: "pair, side (buy|sell), type (limit|market) and a positive qty are required" },
        { status: 422 },
      );
    }

    const base = await referencePrice(symbol);
    if (base === null) return NextResponse.json({ error: `Unknown market ${symbol}` }, { status: 422 });

    // clamp the client's mark into a sane band around the listed price
    const clamp = (p: number) => Math.min(base * (1 + PRICE_BAND), Math.max(base * (1 - PRICE_BAND), p));
    const mark = clientPrice > 0 ? clamp(clientPrice) : base;

    if (type === "limit" && !(clientPrice > 0)) {
      return NextResponse.json({ error: "Enter a limit price." }, { status: 422 });
    }

    // marketable = fills now; otherwise the limit order rests on the book
    const marketable =
      type === "market" || (side === "buy" && clientPrice >= mark) || (side === "sell" && clientPrice <= mark);
    const execPrice = +(type === "market" ? mark : clamp(clientPrice)).toFixed(2);

    if (marketable) {
      const fill = await executeTrade({
        accountId: session.accountId,
        symbol,
        side: side as "buy" | "sell",
        qty,
        price: execPrice,
      });
      const rec = await createOrder({
        pair,
        side,
        type,
        price: execPrice,
        qty,
        status: "filled",
        accountId: session.accountId,
      });
      return NextResponse.json({ data: rec, fill: { ...fill, wallet: undefined }, wallet: fill.wallet }, { status: 201 });
    }

    const rec = await createOrder({
      pair,
      side,
      type,
      price: execPrice,
      qty,
      status: "open",
      accountId: session.accountId,
    });
    const wallet = await getWallet(session.accountId);
    return NextResponse.json({ data: rec, wallet }, { status: 201 });
  } catch (e) {
    if (e instanceof WalletOpError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 422 });
    }
    return NextResponse.json({ error: "Failed to create order", detail: String(e) }, { status: 500 });
  }
}
