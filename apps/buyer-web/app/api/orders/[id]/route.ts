import { NextRequest, NextResponse } from "next/server";
import { cancelOrderRecord } from "@/lib/repo";
import { requireAuth } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cancel a resting order (openapi: DELETE /orders/{id}). Owner-scoped: the WHERE
// clause includes the session's account id, so nobody can cancel another book.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  try {
    const ok = await cancelOrderRecord(params.id, session.accountId);
    if (!ok) return NextResponse.json({ error: "Order not found or not open" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to cancel order", detail: String(e) }, { status: 500 });
  }
}
