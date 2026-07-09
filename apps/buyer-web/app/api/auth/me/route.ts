import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  // Prefer the stored profile (display name can change after the JWT was issued).
  const user = await findUserById(session.userId);
  return NextResponse.json({
    data: {
      email: user?.email ?? session.email,
      name: user?.displayName ?? session.name,
      role: session.role,
      accountId: session.accountId,
    },
  });
}
