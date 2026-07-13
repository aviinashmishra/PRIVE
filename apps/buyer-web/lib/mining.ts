import { db, hasDb } from "@/db/client";
import { miningEvents, accounts } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { MINING_ACTIONS, POINTS_PER_CREDIT, CO2_KG_PER_POINT, findAction } from "./miningActions";
import { creditHolding } from "./wallet";

// Green Mining engine — Proof-of-Green-Action. The mining_events table is the
// single source of truth: earn rows carry positive points, conversions carry
// negative points plus the PRIVE-CO2 credits minted. Every derived stat (balance,
// streak, CO2 saved, leaderboard) is computed from it, so the client can never
// forge points — it only ever sends an action key.

export const CREDIT_SYMBOL = "PRIVE-CO2";
export const MIN_CONVERT_POINTS = 100;

export interface MiningLogEntry {
  id: string;
  kind: string;
  actionKey: string;
  label: string;
  points: number;
  credits: number;
  txHash: string | null;
  time: number;
}

export interface MiningStats {
  points: number; // spendable balance
  earned: number; // lifetime earned (positive rows)
  creditsMinted: number; // lifetime PRIVE-CO2 from conversions
  co2SavedKg: number;
  streak: number;
  doneToday: string[]; // action keys already logged today
  log: MiningLogEntry[];
}

export interface LeaderboardRow {
  rank: number;
  name: string;
  country: string;
  points: number;
  you: boolean;
}

// ---- in-memory fallback (dev without DATABASE_URL) ----
interface MemEvent {
  id: string;
  kind: string;
  actionKey: string;
  label: string;
  points: number;
  credits: number;
  txHash: string | null;
  time: number;
}
const memEvents = new Map<string, MemEvent[]>();
let memId = 1;

function memList(accountId: string): MemEvent[] {
  let list = memEvents.get(accountId);
  if (!list) {
    list = [];
    memEvents.set(accountId, list);
  }
  return list;
}

function utcDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function computeStreak(days: Set<string>): number {
  // consecutive UTC days ending today (or yesterday, so a streak isn't "broken"
  // before the user has had a chance to act today)
  const DAY = 86_400_000;
  let cursor = Date.now();
  if (!days.has(utcDay(cursor))) cursor -= DAY;
  let streak = 0;
  while (days.has(utcDay(cursor))) {
    streak++;
    cursor -= DAY;
  }
  return streak;
}

export async function getMiningStats(accountId: string): Promise<MiningStats> {
  if (hasDb && db) {
    const rows = await db
      .select()
      .from(miningEvents)
      .where(eq(miningEvents.accountId, accountId))
      .orderBy(desc(miningEvents.createdAt));

    let points = 0;
    let earned = 0;
    let creditsMinted = 0;
    const days = new Set<string>();
    const today = utcDay(Date.now());
    const doneToday: string[] = [];
    for (const r of rows) {
      points += r.points;
      if (r.points > 0) {
        earned += r.points;
        days.add(utcDay(r.createdAt.getTime()));
        if (utcDay(r.createdAt.getTime()) === today) doneToday.push(r.actionKey);
      }
      if (r.kind === "convert") creditsMinted += Number(r.credits);
    }
    return {
      points,
      earned,
      creditsMinted: +creditsMinted.toFixed(4),
      co2SavedKg: Math.round(earned * CO2_KG_PER_POINT),
      streak: computeStreak(days),
      doneToday,
      log: rows.slice(0, 24).map((r) => ({
        id: r.id,
        kind: r.kind,
        actionKey: r.actionKey,
        label: r.label,
        points: r.points,
        credits: Number(r.credits),
        txHash: r.txHash,
        time: r.createdAt.getTime(),
      })),
    };
  }

  const rows = memList(accountId);
  let points = 0;
  let earned = 0;
  let creditsMinted = 0;
  const days = new Set<string>();
  const today = utcDay(Date.now());
  const doneToday: string[] = [];
  for (const r of rows) {
    points += r.points;
    if (r.points > 0) {
      earned += r.points;
      days.add(utcDay(r.time));
      if (utcDay(r.time) === today) doneToday.push(r.actionKey);
    }
    if (r.kind === "convert") creditsMinted += r.credits;
  }
  return {
    points,
    earned,
    creditsMinted: +creditsMinted.toFixed(4),
    co2SavedKg: Math.round(earned * CO2_KG_PER_POINT),
    streak: computeStreak(days),
    doneToday,
    log: [...rows]
      .sort((a, b) => b.time - a.time)
      .slice(0, 24)
      .map((r) => ({ ...r })),
  };
}

export type MiningActionResult =
  | { ok: true; points: number }
  | { ok: false; error: "unknown_action" | "already_done_today" };

// Records a proof-of-green-action. Point values come from the server-side catalog;
// each action can be logged once per UTC day. The dedupe check and the insert are
// one SQL statement, so double-submits can't double-earn.
export async function logMiningAction(accountId: string, key: string): Promise<MiningActionResult> {
  const action = findAction(key);
  if (!action) return { ok: false, error: "unknown_action" };

  if (hasDb && db) {
    const res = await db.execute(sql`
      INSERT INTO mining_events (account_id, kind, action_key, label, points)
      SELECT ${accountId}, 'action', ${action.key}, ${action.label}, ${action.points}
      WHERE NOT EXISTS (
        SELECT 1 FROM mining_events
        WHERE account_id = ${accountId}
          AND action_key = ${action.key}
          AND kind = 'action'
          AND created_at >= date_trunc('day', now())
      )
      RETURNING id
    `);
    const inserted = (res as { rows?: unknown[] }).rows?.length ?? 0;
    if (inserted === 0) return { ok: false, error: "already_done_today" };
    return { ok: true, points: action.points };
  }

  const rows = memList(accountId);
  const today = utcDay(Date.now());
  const dup = rows.some((r) => r.kind === "action" && r.actionKey === key && utcDay(r.time) === today);
  if (dup) return { ok: false, error: "already_done_today" };
  rows.push({
    id: "mem-" + memId++,
    kind: "action",
    actionKey: action.key,
    label: action.label,
    points: action.points,
    credits: 0,
    txHash: null,
    time: Date.now(),
  });
  return { ok: true, points: action.points };
}

export type ConvertResult =
  | { ok: true; eventId: string; credits: number }
  | { ok: false; error: "invalid_amount" | "insufficient_points" };

// Converts points to PRIVE-CO2 wallet credits (1,000 pts → 1.000 credit). The
// balance check and the ledger insert are a single conditional statement, then the
// wallet is credited at cost 0. On-chain anchoring happens in the API layer.
export async function convertPoints(accountId: string, points: number): Promise<ConvertResult> {
  if (!Number.isFinite(points) || points < MIN_CONVERT_POINTS || Math.round(points) !== points) {
    return { ok: false, error: "invalid_amount" };
  }
  const credits = +(points / POINTS_PER_CREDIT).toFixed(4);
  const label = `Converted ${points.toLocaleString()} pts → ${credits.toFixed(3)} ${CREDIT_SYMBOL}`;

  if (hasDb && db) {
    const res = await db.execute(sql`
      INSERT INTO mining_events (account_id, kind, action_key, label, points, credits)
      SELECT ${accountId}, 'convert', 'convert', ${label}, ${-points}, ${credits.toFixed(4)}
      WHERE (
        SELECT coalesce(sum(points), 0) FROM mining_events WHERE account_id = ${accountId}
      ) >= ${points}
      RETURNING id
    `);
    const rows = (res as unknown as { rows?: { id: string }[] }).rows ?? [];
    if (rows.length === 0) return { ok: false, error: "insufficient_points" };
    await creditHolding(accountId, CREDIT_SYMBOL, credits, 0);
    return { ok: true, eventId: rows[0].id, credits };
  }

  const list = memList(accountId);
  const balance = list.reduce((a, r) => a + r.points, 0);
  if (balance < points) return { ok: false, error: "insufficient_points" };
  const ev: MemEvent = {
    id: "mem-" + memId++,
    kind: "convert",
    actionKey: "convert",
    label,
    points: -points,
    credits,
    txHash: null,
    time: Date.now(),
  };
  list.push(ev);
  await creditHolding(accountId, CREDIT_SYMBOL, credits, 0);
  return { ok: true, eventId: ev.id, credits };
}

// Stamps the on-chain anchor tx hash onto a conversion event (best-effort).
export async function setEventTxHash(eventId: string, txHash: string): Promise<void> {
  if (hasDb && db) {
    await db.update(miningEvents).set({ txHash }).where(eq(miningEvents.id, eventId));
    return;
  }
  for (const list of memEvents.values()) {
    const ev = list.find((r) => r.id === eventId);
    if (ev) {
      ev.txHash = txHash;
      return;
    }
  }
}

export async function getLeaderboard(accountId: string, limit = 8): Promise<LeaderboardRow[]> {
  if (hasDb && db) {
    const rows = await db
      .select({
        accountId: miningEvents.accountId,
        name: accounts.legalName,
        country: accounts.country,
        points: sql<number>`sum(case when ${miningEvents.points} > 0 then ${miningEvents.points} else 0 end)`,
      })
      .from(miningEvents)
      .leftJoin(accounts, eq(accounts.id, miningEvents.accountId))
      .groupBy(miningEvents.accountId, accounts.legalName, accounts.country)
      .orderBy(sql`4 desc`)
      .limit(limit);
    return rows.map((r, i) => ({
      rank: i + 1,
      name: r.name ?? "Anonymous",
      country: r.country ?? "—",
      points: Number(r.points),
      you: r.accountId === accountId,
    }));
  }

  const rows = [...memEvents.entries()].map(([acct, list]) => ({
    acct,
    points: list.reduce((a, r) => a + (r.points > 0 ? r.points : 0), 0),
  }));
  return rows
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map((r, i) => ({
      rank: i + 1,
      name: r.acct === accountId ? "You" : "Trader " + r.acct.slice(0, 4),
      country: "—",
      points: r.points,
      you: r.acct === accountId,
    }));
}

export { MINING_ACTIONS, POINTS_PER_CREDIT };
