import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { logMiningAction, getMiningStats } from "@/lib/mining";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Logs a proof-of-green-action. The client sends only the action key; the server
// owns point values and enforces the once-per-day rule.
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  try {
    const body = await req.json();
    const result = await logMiningAction(session.accountId, String(body.key || ""));
    if (!result.ok) {
      const msg =
        result.error === "unknown_action"
          ? "Unknown mining action."
          : "Already completed today — come back tomorrow.";
      return NextResponse.json({ error: msg, code: result.error }, { status: 422 });
    }
    const stats = await getMiningStats(session.accountId);
    return NextResponse.json({ data: { points: result.points, stats } }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to log action", detail: String(e) }, { status: 500 });
  }
}
