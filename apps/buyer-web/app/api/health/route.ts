import { NextResponse } from "next/server";
import { hasDb } from "@/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL || "";
  const database = !hasDb ? "in-memory-fallback" : /\.neon\.tech/.test(url) ? "neon" : "postgres";
  return NextResponse.json({
    ok: true,
    database,
    connected: hasDb,
    time: new Date().toISOString(),
  });
}
