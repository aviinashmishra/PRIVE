import { NextRequest, NextResponse } from "next/server";
import { listOrders, createOrder } from "@/lib/repo";
import { requireAuth } from "@/lib/auth/guard";

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

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  try {
    const body = await req.json();
    const price = Number(body.price);
    const qty = Number(body.qty);
    if (!body.pair || !body.side || !body.type || !(qty > 0)) {
      return NextResponse.json({ error: "pair, side, type and a positive qty are required" }, { status: 422 });
    }
    const rec = await createOrder({
      pair: String(body.pair),
      side: String(body.side),
      type: String(body.type),
      price: price > 0 ? price : 0,
      qty,
      status: String(body.status || "open"),
      accountId: session.accountId,
    });
    return NextResponse.json({ data: rec }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create order", detail: String(e) }, { status: 500 });
  }
}
