// Session lifecycle for Node route handlers: issue the signed cookie on login /
// verification, resolve it back to a validated session, and tear it down on logout.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_S, HOME_BY_ROLE } from "./config";
import { signSessionJwt, verifySessionJwt, type SessionClaims } from "./jwt";
import { createSessionRecord, isSessionActive, revokeSession, type AuthUser } from "./store";

export interface Session {
  userId: string;
  sessionId: string;
  role: SessionClaims["role"];
  email: string;
  name: string;
  accountId: string;
}

export async function issueSession(user: AuthUser, req: Request): Promise<{ token: string; home: string }> {
  const sid = await createSessionRecord({
    userId: user.id,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
    userAgent: req.headers.get("user-agent"),
    expiresAt: new Date(Date.now() + SESSION_TTL_S * 1000),
  });
  const token = await signSessionJwt({
    sub: user.id,
    sid,
    role: user.role,
    email: user.email,
    name: user.displayName,
    acct: user.accountId,
  });
  return { token, home: HOME_BY_ROLE[user.role] };
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !/^http:\/\//.test(process.env.APP_URL || ""),
    path: "/",
    maxAge: SESSION_TTL_S,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

// Full validation: JWT signature/expiry + server-side revocation check.
export async function getSession(): Promise<Session | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifySessionJwt(token);
  if (!claims) return null;
  if (!(await isSessionActive(claims.sid))) return null;
  return {
    userId: claims.sub,
    sessionId: claims.sid,
    role: claims.role,
    email: claims.email,
    name: claims.name,
    accountId: claims.acct,
  };
}

export async function destroySession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return;
  const claims = await verifySessionJwt(token);
  if (claims) await revokeSession(claims.sid);
}
