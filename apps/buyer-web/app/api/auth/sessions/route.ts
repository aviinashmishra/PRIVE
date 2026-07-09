import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { listUserSessions, revokeSession, revokeAllSessions } from "@/lib/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const sessions = await listUserSessions(session.userId);
  return NextResponse.json({
    data: sessions.map((s) => ({
      id: s.id,
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt.getTime(),
      expiresAt: s.expiresAt.getTime(),
      current: s.id === session.sessionId,
    })),
  });
}

// Revoke one session (?id=…) or every other session (?scope=others).
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const id = req.nextUrl.searchParams.get("id");
  const scope = req.nextUrl.searchParams.get("scope");

  if (scope === "others") {
    const all = await listUserSessions(session.userId);
    for (const s of all) if (s.id !== session.sessionId) await revokeSession(s.id);
    return NextResponse.json({ ok: true });
  }
  if (!id) return NextResponse.json({ error: "id or scope=others required" }, { status: 422 });

  // only the owner's sessions can be revoked
  const owned = (await listUserSessions(session.userId)).some((s) => s.id === id);
  if (!owned) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  await revokeSession(id);
  return NextResponse.json({ ok: true });
}
