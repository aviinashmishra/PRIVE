// Central auth configuration. AUTH_SECRET must be set in production — the dev
// fallback keeps the demo runnable but is loudly insecure.
export const SESSION_COOKIE = "prive_session";
export const SESSION_TTL_S = 60 * 60 * 24 * 7; // 7 days
export const VERIFY_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const MAX_LOGIN_FAILURES = 5;
export const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export type Role = "buyer" | "seller" | "admin";

export const HOME_BY_ROLE: Record<Role, string> = {
  buyer: "/dashboard",
  seller: "/seller",
  admin: "/admin",
};

const DEV_SECRET = "dev-insecure-secret-change-me-0000000000000000";
let warned = false;

export function authSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (!warned && process.env.NODE_ENV === "production") {
      console.warn("⚠ AUTH_SECRET is not set — using an insecure development secret.");
      warned = true;
    }
    return new TextEncoder().encode(DEV_SECRET);
  }
  return new TextEncoder().encode(s);
}

export function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}
