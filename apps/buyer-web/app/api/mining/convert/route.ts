import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { convertPoints, setEventTxHash, getMiningStats, MIN_CONVERT_POINTS } from "@/lib/mining";
import { getWallet } from "@/lib/wallet";
import { chainConfigured, accrueMiningReward } from "@/lib/chain/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Converts points to PRIVE-CO2 credits: debits the points ledger, credits the
// wallet, then (best-effort) anchors the grant on-chain via MiningRewards.accrue.
// The conversion succeeds even when the chain is unreachable — the tx hash is an
// audit anchor, not the settlement layer (docs/04 §MiningRewards).
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  try {
    const body = await req.json();
    const points = Number(body.points);
    const result = await convertPoints(session.accountId, points);
    if (!result.ok) {
      const msg =
        result.error === "invalid_amount"
          ? `Enter a whole number of at least ${MIN_CONVERT_POINTS} points.`
          : "You don't have that many points.";
      return NextResponse.json({ error: msg, code: result.error }, { status: 422 });
    }

    let txHash: string | null = null;
    if (chainConfigured) {
      try {
        const anchored = await accrueMiningReward(result.credits * 1000); // credits → kg
        txHash = anchored.txHash;
        await setEventTxHash(result.eventId, txHash);
      } catch (e) {
        console.warn("[mining] on-chain accrual skipped:", String(e).slice(0, 200));
      }
    }

    const [stats, wallet] = await Promise.all([
      getMiningStats(session.accountId),
      getWallet(session.accountId),
    ]);
    return NextResponse.json(
      { data: { credits: result.credits, txHash, stats, wallet } },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json({ error: "Conversion failed", detail: String(e) }, { status: 500 });
  }
}
