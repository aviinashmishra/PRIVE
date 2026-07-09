import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { updateDisplayName } from "@/lib/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  try {
    const b = await req.json();
    const name = typeof b.name === "string" ? b.name.trim().slice(0, 80) : "";
    if (name.length < 2) {
      return NextResponse.json({ error: "Display name must be at least 2 characters." }, { status: 422 });
    }
    await updateDisplayName(session.userId, name);
    return NextResponse.json({ ok: true, data: { name } });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update profile", detail: String(e) }, { status: 500 });
  }
}
