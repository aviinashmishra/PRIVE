import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { findUserById, updatePassword, revokeAllSessions, createSessionRecord } from "@/lib/auth/store";
import { hashPassword, verifyPassword, validatePassword } from "@/lib/auth/password";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";
import { issueSession, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  try {
    const rl = rateLimit(`chpw:${clientIp(req)}:${session.userId}`, 5, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterS) } },
      );
    }

    const b = await req.json();
    const pwErr = validatePassword(b.newPassword);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 422 });

    const user = await findUserById(session.userId);
    if (!user || !(await verifyPassword(user.passwordHash, String(b.currentPassword ?? "")))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    await updatePassword(user.id, await hashPassword(String(b.newPassword)));
    // Changing the password signs out every other device, then re-issues this one.
    await revokeAllSessions(user.id);
    const { token } = await issueSession(user, req);
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, token);
    return res;
  } catch (e) {
    return NextResponse.json({ error: "Failed to change password", detail: String(e) }, { status: 500 });
  }
}
