import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { db, hasDb } from "@/db/client";
import { users, accounts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Real registered users for the admin console (docs/09 §Users). Joined with the
// ledger account for type/tier/balance. Admin-only.
export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;
  try {
    if (!hasDb || !db) return NextResponse.json({ data: [], source: "in-memory-fallback" });
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.displayName,
        role: users.role,
        verified: users.emailVerifiedAt,
        createdAt: users.createdAt,
        lockedUntil: users.lockedUntil,
        accountType: accounts.type,
        country: accounts.country,
        kycTier: accounts.kycTier,
        usdBalance: accounts.usdBalance,
      })
      .from(users)
      .leftJoin(accounts, eq(users.accountId, accounts.id))
      .orderBy(desc(users.createdAt));
    return NextResponse.json({
      data: rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role,
        verified: !!r.verified,
        locked: !!(r.lockedUntil && r.lockedUntil.getTime() > Date.now()),
        createdAt: r.createdAt.getTime(),
        accountType: r.accountType ?? "individual",
        country: r.country ?? "—",
        kycTier: r.kycTier ?? "tier0",
        usdBalance: Number(r.usdBalance ?? 0),
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load users", detail: String(e) }, { status: 500 });
  }
}
