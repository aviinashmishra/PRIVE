// Session JWT — edge-safe (jose only, no Node APIs) so middleware can verify it.
import { SignJWT, jwtVerify } from "jose";
import { authSecret, SESSION_TTL_S, type Role } from "./config";

export interface SessionClaims {
  sub: string; // user id
  sid: string; // session id (revocable server-side)
  role: Role;
  email: string;
  name: string;
  acct: string; // account id
}

export async function signSessionJwt(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("prive-exchange")
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_TTL_S)
    .sign(authSecret());
}

export async function verifySessionJwt(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret(), { issuer: "prive-exchange" });
    if (!payload.sub || !payload.sid || !payload.role) return null;
    return payload as unknown as SessionClaims;
  } catch {
    return null;
  }
}
