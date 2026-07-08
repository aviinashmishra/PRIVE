import { NextRequest, NextResponse } from "next/server";
import { listRetirements, createRetirement } from "@/lib/repo";
import { requireAuth } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  try {
    const data = await listRetirements(session.accountId);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load retirements", detail: String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  try {
    const body = await req.json();
    const qty = Number(body.qty);
    if (!body.symbol || !body.name || !(qty > 0)) {
      return NextResponse.json({ error: "symbol, name and a positive qty are required" }, { status: 422 });
    }
    const rec = await createRetirement({
      symbol: String(body.symbol),
      name: String(body.name),
      qty,
      beneficiary: String(body.beneficiary || "Personal"),
      accountId: session.accountId,
    });
    return NextResponse.json({ data: rec }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create retirement", detail: String(e) }, { status: 500 });
  }
}
