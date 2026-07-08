import { NextResponse } from "next/server";
import { getChainStatus } from "@/lib/chain/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getChainStatus();
  return NextResponse.json(status);
}
