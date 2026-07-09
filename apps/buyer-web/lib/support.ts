// Support-center persistence — Postgres via Drizzle, in-memory fallback without
// DATABASE_URL (same pattern as lib/repo.ts).
import { randomUUID } from "node:crypto";
import { db, hasDb } from "@/db/client";
import { tickets, ticketMessages } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export interface TicketDTO {
  id: string;
  userId: string;
  email: string;
  name: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: number;
  updatedAt: number;
}

export interface TicketMessageDTO {
  id: string;
  ticketId: string;
  authorRole: "user" | "support";
  authorName: string;
  body: string;
  createdAt: number;
}

const memTickets: TicketDTO[] = [];
const memMessages: TicketMessageDTO[] = [];

function rowToTicket(r: typeof tickets.$inferSelect): TicketDTO {
  return {
    id: r.id,
    userId: r.userId,
    email: r.email,
    name: r.name,
    category: r.category,
    subject: r.subject,
    status: r.status,
    priority: r.priority,
    createdAt: r.createdAt.getTime(),
    updatedAt: r.updatedAt.getTime(),
  };
}

export async function createTicket(input: {
  userId: string;
  email: string;
  name: string;
  category: string;
  subject: string;
  priority: string;
  body: string;
}): Promise<TicketDTO> {
  if (hasDb && db) {
    const [row] = await db
      .insert(tickets)
      .values({
        userId: input.userId,
        email: input.email,
        name: input.name,
        category: input.category,
        subject: input.subject,
        priority: input.priority,
      })
      .returning();
    await db.insert(ticketMessages).values({
      ticketId: row.id,
      authorRole: "user",
      authorName: input.name,
      body: input.body,
    });
    return rowToTicket(row);
  }
  const now = Date.now();
  const t: TicketDTO = {
    id: randomUUID(),
    userId: input.userId,
    email: input.email,
    name: input.name,
    category: input.category,
    subject: input.subject,
    status: "open",
    priority: input.priority,
    createdAt: now,
    updatedAt: now,
  };
  memTickets.push(t);
  memMessages.push({
    id: randomUUID(),
    ticketId: t.id,
    authorRole: "user",
    authorName: input.name,
    body: input.body,
    createdAt: now,
  });
  return t;
}

// userId undefined → all tickets (admin view).
export async function listTickets(userId?: string): Promise<TicketDTO[]> {
  if (hasDb && db) {
    const rows = userId
      ? await db.select().from(tickets).where(eq(tickets.userId, userId)).orderBy(desc(tickets.updatedAt))
      : await db.select().from(tickets).orderBy(desc(tickets.updatedAt));
    return rows.map(rowToTicket);
  }
  return memTickets
    .filter((t) => !userId || t.userId === userId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getTicket(id: string): Promise<TicketDTO | null> {
  if (hasDb && db) {
    const [row] = await db.select().from(tickets).where(eq(tickets.id, id));
    return row ? rowToTicket(row) : null;
  }
  return memTickets.find((t) => t.id === id) ?? null;
}

export async function listMessages(ticketId: string): Promise<TicketMessageDTO[]> {
  if (hasDb && db) {
    const rows = await db
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(ticketMessages.createdAt);
    return rows.map((r) => ({
      id: r.id,
      ticketId: r.ticketId,
      authorRole: r.authorRole as "user" | "support",
      authorName: r.authorName,
      body: r.body,
      createdAt: r.createdAt.getTime(),
    }));
  }
  return memMessages
    .filter((m) => m.ticketId === ticketId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function addMessage(input: {
  ticketId: string;
  authorRole: "user" | "support";
  authorName: string;
  body: string;
}): Promise<TicketMessageDTO> {
  if (hasDb && db) {
    const [row] = await db
      .insert(ticketMessages)
      .values({
        ticketId: input.ticketId,
        authorRole: input.authorRole,
        authorName: input.authorName,
        body: input.body,
      })
      .returning();
    // a support reply moves an open ticket forward; any reply bumps updated_at
    if (input.authorRole === "support") {
      await db
        .update(tickets)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(and(eq(tickets.id, input.ticketId), eq(tickets.status, "open")));
    }
    await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, input.ticketId));
    return {
      id: row.id,
      ticketId: row.ticketId,
      authorRole: row.authorRole as "user" | "support",
      authorName: row.authorName,
      body: row.body,
      createdAt: row.createdAt.getTime(),
    };
  }
  const m: TicketMessageDTO = {
    id: randomUUID(),
    ticketId: input.ticketId,
    authorRole: input.authorRole,
    authorName: input.authorName,
    body: input.body,
    createdAt: Date.now(),
  };
  memMessages.push(m);
  const t = memTickets.find((x) => x.id === input.ticketId);
  if (t) {
    t.updatedAt = m.createdAt;
    if (input.authorRole === "support" && t.status === "open") t.status = "in_progress";
  }
  return m;
}

export async function setTicketStatus(id: string, status: string): Promise<TicketDTO | null> {
  if (hasDb && db) {
    const [row] = await db
      .update(tickets)
      .set({ status, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return row ? rowToTicket(row) : null;
  }
  const t = memTickets.find((x) => x.id === id);
  if (!t) return null;
  t.status = status;
  t.updatedAt = Date.now();
  return t;
}
