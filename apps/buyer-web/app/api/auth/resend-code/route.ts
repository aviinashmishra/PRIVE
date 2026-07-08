import { NextRequest, NextResponse } from "next/server";
import { generateVerifyCode, sha256, validateEmail } from "@/lib/auth/password";
import { findUserByEmail, createAuthToken } from "@/lib/auth/store";
import { sendVerificationEmail } from "@/lib/auth/email";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";
import { VERIFY_CODE_TTL_MS } from "@/lib/auth/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Always 200 — never confirms whether an email is registered.
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (validateEmail(b.email)) return NextResponse.json({ ok: true });
    const email = String(b.email).trim().toLowerCase();

    const rl = rateLimit(`resend:${clientIp(req)}:${email}`, 3, 10 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many codes requested. Wait a few minutes." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterS) } },
      );
    }

    const user = await findUserByEmail(email);
    if (user && !user.emailVerifiedAt) {
      const code = generateVerifyCode();
      await createAuthToken(user.id, "verify_email", sha256(code), new Date(Date.now() + VERIFY_CODE_TTL_MS));
      await sendVerificationEmail(email, code);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Could not resend code", detail: String(e) }, { status: 500 });
  }
}
