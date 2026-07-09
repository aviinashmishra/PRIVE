import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { createTicket, listTickets } from "@/lib/support";
import { rateLimit, clientIp } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = ["general", "trading", "verification", "payments", "security", "bug"];
const PRIORITIES = ["low", "normal", "high", "critical"];

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  try {
    // support staff (admin) see the whole queue; users see their own tickets
    const data = await listTickets(session.role === "admin" ? undefined : session.userId);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load tickets", detail: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  try {
    const rl = rateLimit(`ticket:${clientIp(req)}:${session.userId}`, 5, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many tickets opened. Please wait before opening another." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterS) } },
      );
    }

    const b = await req.json();
    const subject = typeof b.subject === "string" ? b.subject.trim().slice(0, 140) : "";
    const body = typeof b.body === "string" ? b.body.trim().slice(0, 5000) : "";
    if (subject.length < 4) return NextResponse.json({ error: "Subject is too short." }, { status: 422 });
    if (body.length < 10) return NextResponse.json({ error: "Describe the issue in a bit more detail." }, { status: 422 });

    const rec = await createTicket({
      userId: session.userId,
      email: session.email,
      name: session.name,
      category: CATEGORIES.includes(b.category) ? b.category : "general",
      priority: PRIORITIES.includes(b.priority) ? b.priority : "normal",
      subject,
      body,
    });
    return NextResponse.json({ data: rec }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create ticket", detail: String(e) }, { status: 500 });
  }
}
