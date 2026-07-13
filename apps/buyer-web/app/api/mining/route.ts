import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getMiningStats, getLeaderboard } from "@/lib/mining";
import { MINING_ACTIONS, POINTS_PER_CREDIT } from "@/lib/miningActions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mining hub payload: server-computed stats + activity log + leaderboard, plus the
// authoritative action catalog (the client never supplies point values).
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  try {
    const [stats, leaderboard] = await Promise.all([
      getMiningStats(session.accountId),
      getLeaderboard(session.accountId),
    ]);
    return NextResponse.json({
      data: { stats, leaderboard, actions: MINING_ACTIONS, pointsPerCredit: POINTS_PER_CREDIT },
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load mining data", detail: String(e) }, { status: 500 });
  }
}
