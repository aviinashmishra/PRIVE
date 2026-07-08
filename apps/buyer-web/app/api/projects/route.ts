import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/repo";
import { requireRole } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { session, error } = await requireRole("seller", "admin");
  if (error) return error;
  try {
    // Sellers see their own submissions; admins see the whole pipeline.
    const data = await listProjects(session.role === "seller" ? session.accountId : undefined);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load projects", detail: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("seller", "admin");
  if (error) return error;
  try {
    const b = await req.json();
    if (!b.name || !b.projectType || !b.standard) {
      return NextResponse.json({ error: "name, projectType and standard are required" }, { status: 422 });
    }
    const rec = await createProject({
      sellerName: String(b.sellerName || session.name),
      name: String(b.name),
      projectType: String(b.projectType),
      standard: String(b.standard),
      country: String(b.country || "🌍 Global"),
      location: String(b.location || "—"),
      vintage: Number(b.vintage) || new Date().getFullYear(),
      expectedAnnual: Number(b.expectedAnnual) || 0,
      price: Number(b.price) || 0,
      accountId: session.accountId,
    });
    return NextResponse.json({ data: rec }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create project", detail: String(e) }, { status: 500 });
  }
}
