import { NextRequest, NextResponse } from "next/server";
import { hashPassword, validateEmail, validatePassword, generateVerifyCode, sha256 } from "@/lib/auth/password";
import { findUserByEmail, createUser, createAuthToken, setEmailVerified } from "@/lib/auth/store";
import { issueSession, setSessionCookie } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/auth/email";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";
import { VERIFY_CODE_TTL_MS, requireEmailVerification } from "@/lib/auth/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`signup:${clientIp(req)}`, 5, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many signups from this address. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterS) } },
      );
    }

    const b = await req.json();
    const emailErr = validateEmail(b.email);
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 422 });
    const pwErr = validatePassword(b.password);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 422 });
    const name = typeof b.name === "string" ? b.name.trim().slice(0, 80) : "";
    if (name.length < 2) return NextResponse.json({ error: "Enter your name." }, { status: 422 });
    const role = b.role === "seller" ? "seller" : "buyer"; // admin is never self-service

    const email = String(b.email).trim().toLowerCase();
    if (await findUserByEmail(email)) {
      return NextResponse.json(
        { error: "An account with this email already exists. Sign in instead." },
        { status: 409 },
      );
    }

    const user = await createUser({
      email,
      passwordHash: await hashPassword(String(b.password)),
      displayName: name,
      role,
    });

    // OTP gate disabled: activate the account and sign the user straight in.
    if (!requireEmailVerification()) {
      await setEmailVerified(user.id);
      const { token, home } = await issueSession({ ...user, emailVerifiedAt: new Date() }, req);
      const res = NextResponse.json(
        { ok: true, next: home, user: { email: user.email, name: user.displayName, role: user.role } },
        { status: 201 },
      );
      setSessionCookie(res, token);
      return res;
    }

    const code = generateVerifyCode();
    await createAuthToken(user.id, "verify_email", sha256(code), new Date(Date.now() + VERIFY_CODE_TTL_MS));
    await sendVerificationEmail(email, code);

    return NextResponse.json(
      { ok: true, next: `/verify-email?email=${encodeURIComponent(email)}` },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json({ error: "Signup failed", detail: String(e) }, { status: 500 });
  }
}
