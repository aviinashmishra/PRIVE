import { NextRequest, NextResponse } from "next/server";
import { generateResetToken, sha256, validateEmail } from "@/lib/auth/password";
import { findUserByEmail, createAuthToken } from "@/lib/auth/store";
import { sendPasswordResetEmail } from "@/lib/auth/email";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";
import { RESET_TOKEN_TTL_MS } from "@/lib/auth/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Always 200 — never confirms whether an email is registered.
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (validateEmail(b.email)) return NextResponse.json({ ok: true });
    const email = String(b.email).trim().toLowerCase();

    const rl = rateLimit(`forgot:${clientIp(req)}:${email}`, 3, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many reset requests. Wait a few minutes." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterS) } },
      );
    }

    const user = await findUserByEmail(email);
    if (user) {
      const token = generateResetToken();
      await createAuthToken(user.id, "reset_password", sha256(token), new Date(Date.now() + RESET_TOKEN_TTL_MS));
      await sendPasswordResetEmail(email, token);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Request failed", detail: String(e) }, { status: 500 });
  }
}
