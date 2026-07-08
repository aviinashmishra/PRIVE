// Deny-by-default guards for API route handlers (docs/05 §2 AuthZ). Middleware
// gates page navigation; these enforce the same rules on the data plane.
import { NextResponse } from "next/server";
import { getSession, type Session } from "./session";
import type { Role } from "./config";

type GuardResult = { session: Session; error: null } | { session: null; error: NextResponse };

export async function requireAuth(): Promise<GuardResult> {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  return { session, error: null };
}

export async function requireRole(...roles: Role[]): Promise<GuardResult> {
  const res = await requireAuth();
  if (res.error) return res;
  if (!roles.includes(res.session.role)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
    };
  }
  return res;
}
