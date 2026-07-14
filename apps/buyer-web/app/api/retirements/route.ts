import { NextRequest, NextResponse } from "next/server";
import { listRetirements, createRetirement } from "@/lib/repo";
import { requireAuth } from "@/lib/auth/guard";
import { debitHolding, getWallet } from "@/lib/wallet";
import { chainConfigured, retireOnChain } from "@/lib/chain/service";

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
    const beneficiary = String(body.beneficiary || "Personal");
    // burn from the wallet first — a certificate can only exist for credits held
    const burned = await debitHolding(session.accountId, String(body.symbol), qty);
    if (!burned) {
      return NextResponse.json(
        { error: `Insufficient ${body.symbol} balance to retire.`, code: "insufficient_credits" },
        { status: 422 },
      );
    }

    // Anchor on-chain: RetirementVault burns the credits and mints the
    // certificate NFT — the cert id and tx hash below are the real ones.
    // Credits are integer tonnes on-chain, so the burn covers ceil(qty).
    // Best-effort like mining convert: the wallet ledger stays authoritative
    // when the chain is unreachable, and no hash is ever fabricated.
    let certId = "";
    let txHash = "";
    let status = "recorded";
    if (chainConfigured) {
      try {
        const anchored = await retireOnChain(Math.ceil(qty), beneficiary);
        certId = `PRV-CERT-${anchored.certificateId}`;
        txHash = anchored.txHash;
        status = "confirmed";
      } catch (e) {
        console.warn("[retire] on-chain anchor skipped:", String(e).slice(0, 200));
      }
    }
    if (!certId) certId = `PRV-REC-${Date.now().toString(36).toUpperCase()}`;

    const rec = await createRetirement({
      symbol: String(body.symbol),
      name: String(body.name),
      qty,
      beneficiary,
      certId,
      txHash,
      status,
      accountId: session.accountId,
    });
    const wallet = await getWallet(session.accountId);
    return NextResponse.json({ data: rec, wallet }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create retirement", detail: String(e) }, { status: 500 });
  }
}
