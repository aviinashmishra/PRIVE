import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/guard";
import { getTicket, listMessages, addMessage, setTicketStatus } from "@/lib/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ticket detail + thread. Owner or admin only.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const ticket = await getTicket(params.id);
  if (!ticket || (ticket.userId !== session.userId && session.role !== "admin")) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  const messages = await listMessages(ticket.id);
  return NextResponse.json({ data: { ticket, messages } });
}

// Reply on the thread. Admin replies are marked as support.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const ticket = await getTicket(params.id);
  if (!ticket || (ticket.userId !== session.userId && session.role !== "admin")) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  const b = await req.json();
  const body = typeof b.body === "string" ? b.body.trim().slice(0, 5000) : "";
  if (body.length < 2) return NextResponse.json({ error: "Message is empty." }, { status: 422 });
  const msg = await addMessage({
    ticketId: ticket.id,
    authorRole: session.role === "admin" ? "support" : "user",
    authorName: session.role === "admin" ? "Prive Support" : session.name,
    body,
  });
  return NextResponse.json({ data: msg }, { status: 201 });
}

// Status changes are a support-desk (admin) power.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole("admin");
  if (error) return error;
  const b = await req.json();
  if (!["open", "in_progress", "resolved"].includes(b.status)) {
    return NextResponse.json({ error: "status must be open, in_progress or resolved" }, { status: 422 });
  }
  const rec = await setTicketStatus(params.id, b.status);
  if (!rec) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  return NextResponse.json({ data: rec });
}
