import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getWallet } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The authenticated account's wallet: USD cash + tonne-denominated credit holdings.
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  try {
    const data = await getWallet(session.accountId);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load wallet", detail: String(e) }, { status: 500 });
  }
}
