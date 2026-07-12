import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { db, hasDb } from "@/db/client";
import { users, accounts, orders, retirements, projects, tickets, sessions } from "@/db/schema";
import { desc, eq, gt, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Real platform aggregates for the admin console — one round trip, all tables.
export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;
  try {
    if (!hasDb || !db) {
      return NextResponse.json({ data: null, source: "in-memory-fallback" });
    }
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [[userAgg], [orderAgg], [retireAgg], [projectAgg], [ticketAgg], [sessionAgg], [balanceAgg], recentOrders] =
      await Promise.all([
        db
          .select({
            total: sql<string>`count(*)`,
            verified: sql<string>`count(*) filter (where ${users.emailVerifiedAt} is not null)`,
            sellers: sql<string>`count(*) filter (where ${users.role} = 'seller')`,
            new24h: sql<string>`count(*) filter (where ${users.createdAt} > ${dayAgo})`,
          })
          .from(users),
        db
          .select({
            total: sql<string>`count(*)`,
            open: sql<string>`count(*) filter (where ${orders.status} = 'open')`,
            notional24h: sql<string>`coalesce(sum(${orders.qty} * ${orders.price}) filter (where ${orders.createdAt} > ${dayAgo}), 0)`,
            count24h: sql<string>`count(*) filter (where ${orders.createdAt} > ${dayAgo})`,
          })
          .from(orders),
        db
          .select({
            total: sql<string>`count(*)`,
            tonnes: sql<string>`coalesce(sum(${retirements.qty}), 0)`,
          })
          .from(retirements),
        db
          .select({
            total: sql<string>`count(*)`,
            pending: sql<string>`count(*) filter (where ${projects.status} = 'pending')`,
            live: sql<string>`count(*) filter (where ${projects.status} = 'live')`,
          })
          .from(projects),
        db
          .select({
            open: sql<string>`count(*) filter (where ${tickets.status} = 'open')`,
            inProgress: sql<string>`count(*) filter (where ${tickets.status} = 'in_progress')`,
          })
          .from(tickets),
        db
          .select({ active: sql<string>`count(*)` })
          .from(sessions)
          .where(sql`${sessions.revokedAt} is null and ${sessions.expiresAt} > now()`),
        db.select({ total: sql<string>`coalesce(sum(${accounts.usdBalance}), 0)` }).from(accounts),
        // largest recent orders — the raw feed the surveillance heuristics read
        db
          .select({
            id: orders.id,
            accountId: orders.accountId,
            pair: orders.pair,
            side: orders.side,
            price: orders.price,
            qty: orders.qty,
            status: orders.status,
            createdAt: orders.createdAt,
          })
          .from(orders)
          .orderBy(desc(orders.createdAt))
          .limit(50),
      ]);

    // Surveillance heuristics over the real order flow (docs/05 §5 — demo tier):
    // large-notional orders and rapid submission bursts per account.
    const NOTIONAL_ALERT = 5000;
    const alerts: Array<{ kind: string; market: string; sev: string; note: string; time: number }> = [];
    for (const o of recentOrders) {
      const notional = Number(o.price) * Number(o.qty);
      if (notional >= NOTIONAL_ALERT) {
        alerts.push({
          kind: "large_order",
          market: o.pair.split("/")[0],
          sev: notional >= 25000 ? "high" : "medium",
          note: `${o.side.toUpperCase()} ${Number(o.qty).toLocaleString()} t ≈ $${Math.round(notional).toLocaleString()} (account ${o.accountId.slice(0, 8)})`,
          time: o.createdAt.getTime(),
        });
      }
    }
    const byAccount = new Map<string, typeof recentOrders>();
    recentOrders.forEach((o) => {
      const arr = byAccount.get(o.accountId) ?? [];
      arr.push(o);
      byAccount.set(o.accountId, arr);
    });
    Array.from(byAccount.entries()).forEach(([acct, list]) => {
      const inHour = list.filter((o) => Date.now() - o.createdAt.getTime() < 60 * 60 * 1000);
      if (inHour.length >= 5) {
        alerts.push({
          kind: "velocity",
          market: inHour[0].pair.split("/")[0],
          sev: "medium",
          note: `${inHour.length} orders in 60m from account ${acct.slice(0, 8)}`,
          time: inHour[0].createdAt.getTime(),
        });
      }
    });
    alerts.sort((a, b) => b.time - a.time);

    return NextResponse.json({
      data: {
        users: {
          total: Number(userAgg.total),
          verified: Number(userAgg.verified),
          sellers: Number(userAgg.sellers),
          new24h: Number(userAgg.new24h),
        },
        orders: {
          total: Number(orderAgg.total),
          open: Number(orderAgg.open),
          notional24h: Number(orderAgg.notional24h),
          count24h: Number(orderAgg.count24h),
        },
        retirements: { total: Number(retireAgg.total), tonnes: Number(retireAgg.tonnes) },
        projects: {
          total: Number(projectAgg.total),
          pending: Number(projectAgg.pending),
          live: Number(projectAgg.live),
        },
        tickets: { open: Number(ticketAgg.open), inProgress: Number(ticketAgg.inProgress) },
        sessions: { active: Number(sessionAgg.active) },
        treasury: { customerBalances: Number(balanceAgg.total) },
        alerts: alerts.slice(0, 12),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load summary", detail: String(e) }, { status: 500 });
  }
}
