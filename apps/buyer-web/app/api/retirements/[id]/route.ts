import { NextRequest, NextResponse } from "next/server";
import { listRetirements } from "@/lib/repo";
import { requireAuth } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Certificate lookup (openapi: GET /retirements/{id}) — scoped to the caller's
// account; the public proof surface is the Transparency Explorer, not this API.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const all = await listRetirements(session.accountId);
  const rec = all.find((r) => r.id === params.id || r.certId === params.id);
  if (!rec) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  return NextResponse.json({ data: rec });
}
