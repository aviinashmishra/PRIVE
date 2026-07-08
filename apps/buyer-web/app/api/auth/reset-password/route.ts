import { NextRequest, NextResponse } from "next/server";
import { hashPassword, sha256, validateEmail, validatePassword } from "@/lib/auth/password";
import { findUserByEmail, consumeAuthToken, updatePassword, revokeAllSessions, setEmailVerified } from "@/lib/auth/store";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (validateEmail(b.email) || typeof b.token !== "string" || !b.token) {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }
    const pwErr = validatePassword(b.password);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 422 });
    const email = String(b.email).trim().toLowerCase();

    const rl = rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterS) } },
      );
    }

    const user = await findUserByEmail(email);
    if (!user || !(await consumeAuthToken(user.id, "reset_password", sha256(String(b.token))))) {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }

    await updatePassword(user.id, await hashPassword(String(b.password)));
    await revokeAllSessions(user.id); // a reset invalidates every existing session
    if (!user.emailVerifiedAt) await setEmailVerified(user.id); // reset link proves mailbox control

    return NextResponse.json({ ok: true, next: "/login?reset=1" });
  } catch (e) {
    return NextResponse.json({ error: "Reset failed", detail: String(e) }, { status: 500 });
  }
}
