import { NextRequest, NextResponse } from "next/server";
import { sha256, validateEmail } from "@/lib/auth/password";
import { findUserByEmail, consumeAuthToken, setEmailVerified } from "@/lib/auth/store";
import { issueSession, setSessionCookie } from "@/lib/auth/session";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (validateEmail(b.email) || !/^\d{6}$/.test(String(b.code ?? ""))) {
      return NextResponse.json({ error: "Enter the 6-digit code from your email." }, { status: 422 });
    }
    const email = String(b.email).trim().toLowerCase();

    const rl = rateLimit(`verify:${clientIp(req)}:${email}`, 10, 10 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Request a new code and try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterS) } },
      );
    }

    const user = await findUserByEmail(email);
    if (!user || !(await consumeAuthToken(user.id, "verify_email", sha256(String(b.code))))) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
    }

    if (!user.emailVerifiedAt) await setEmailVerified(user.id);

    const { token, home } = await issueSession({ ...user, emailVerifiedAt: new Date() }, req);
    const res = NextResponse.json({
      ok: true,
      next: home,
      user: { email: user.email, name: user.displayName, role: user.role },
    });
    setSessionCookie(res, token);
    return res;
  } catch (e) {
    return NextResponse.json({ error: "Verification failed", detail: String(e) }, { status: 500 });
  }
}
