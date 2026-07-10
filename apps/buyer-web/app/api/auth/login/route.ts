import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, dummyHash, generateVerifyCode, sha256, validateEmail } from "@/lib/auth/password";
import { findUserByEmail, recordLoginFailure, resetLoginFailures, createAuthToken, setEmailVerified } from "@/lib/auth/store";
import { issueSession, setSessionCookie } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/auth/email";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";
import { VERIFY_CODE_TTL_MS, requireEmailVerification } from "@/lib/auth/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC = { error: "Invalid email or password." };

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (validateEmail(b.email) || typeof b.password !== "string") {
      return NextResponse.json(GENERIC, { status: 401 });
    }
    const email = String(b.email).trim().toLowerCase();

    const rl = rateLimit(`login:${clientIp(req)}:${email}`, 10, 10 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in a few minutes." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterS) } },
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      await verifyPassword(await dummyHash(), String(b.password)); // constant-shape timing
      return NextResponse.json(GENERIC, { status: 401 });
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Account temporarily locked. Try again in ${mins} min.` },
        { status: 423 },
      );
    }

    if (!(await verifyPassword(user.passwordHash, String(b.password)))) {
      await recordLoginFailure(user);
      return NextResponse.json(GENERIC, { status: 401 });
    }

    await resetLoginFailures(user.id);

    // With the OTP gate on, unverified users are re-issued a code instead of a
    // session; with it off, pre-existing unverified accounts are activated here.
    if (!user.emailVerifiedAt) {
      if (requireEmailVerification()) {
        const code = generateVerifyCode();
        await createAuthToken(user.id, "verify_email", sha256(code), new Date(Date.now() + VERIFY_CODE_TTL_MS));
        await sendVerificationEmail(email, code);
        return NextResponse.json({
          ok: true,
          requiresVerification: true,
          next: `/verify-email?email=${encodeURIComponent(email)}`,
        });
      }
      await setEmailVerified(user.id);
    }

    const { token, home } = await issueSession(user, req);
    const res = NextResponse.json({
      ok: true,
      next: home,
      user: { email: user.email, name: user.displayName, role: user.role },
    });
    setSessionCookie(res, token);
    return res;
  } catch (e) {
    return NextResponse.json({ error: "Login failed", detail: String(e) }, { status: 500 });
  }
}
