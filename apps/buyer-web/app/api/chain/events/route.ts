import { NextResponse } from "next/server";
import { getChainEvents } from "@/lib/chain/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getChainEvents();
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: "Failed to read chain events", detail: String(e) }, { status: 500 });
  }
}
