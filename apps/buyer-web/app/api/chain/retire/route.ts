import { NextRequest, NextResponse } from "next/server";
import { retireOnChain, chainConfigured } from "@/lib/chain/service";
import { requireAuth } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;
  if (!chainConfigured()) {
    return NextResponse.json(
      { error: "On-chain layer not deployed. Run the contracts deploy script (see contracts/README.md)." },
      { status: 503 },
    );
  }
  try {
    const b = await req.json();
    const amount = Number(b.amount);
    if (!(amount > 0)) return NextResponse.json({ error: "amount must be > 0" }, { status: 422 });
    const result = await retireOnChain(amount, String(b.beneficiary || "Personal"));
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "On-chain retirement failed", detail: String(e) }, { status: 500 });
  }
}
