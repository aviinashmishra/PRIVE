import { NextResponse } from "next/server";
import { destroySession, clearSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await destroySession();
  const res = NextResponse.json({ ok: true, next: "/login" });
  clearSessionCookie(res);
  return res;
}
