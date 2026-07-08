import { NextRequest, NextResponse } from "next/server";
import { actOnProject } from "@/lib/repo";
import { requireRole } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = ["advance", "approve", "reject", "request_info"] as const;

// Verification-pipeline decisions are an admin-only power (docs/09).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole("admin");
  if (error) return error;
  try {
    const b = await req.json();
    const action = b.action as (typeof ACTIONS)[number];
    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: "action must be one of " + ACTIONS.join(", ") }, { status: 422 });
    }
    const rec = await actOnProject(params.id, action, b.note);
    if (!rec) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json({ data: rec });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update project", detail: String(e) }, { status: 500 });
  }
}
