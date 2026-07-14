// Auth persistence — Postgres via Drizzle when DATABASE_URL is set, otherwise an
// in-memory store so the demo keeps working with zero config (same philosophy as
// lib/repo.ts). Every mutation goes through this module.
import { randomUUID } from "node:crypto";
import { db, hasDb } from "@/db/client";
import { users, sessions, authTokens, accounts } from "@/db/schema";
import { and, eq, gt, isNull, sql as dsql } from "drizzle-orm";
import { hashPassword } from "./password";
import { MAX_LOGIN_FAILURES, LOCKOUT_MS, type Role } from "./config";

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: Role;
  accountId: string;
  emailVerifiedAt: Date | null;
  failedAttempts: number;
  lockedUntil: Date | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

interface TokenRecord {
  id: string;
  userId: string;
  purpose: string;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

// ---------------------------- in-memory fallback ----------------------------

const memUsers: AuthUser[] = [];
const memSessions = new Map<string, SessionRecord>();
const memTokens: TokenRecord[] = [];
let memSeeded: Promise<void> | null = null;

// Mirror db/seed.mjs so the no-DB fallback has the same logins as a seeded
// database — including the owner admin, so that login works in every mode.
function seedMemory(): Promise<void> {
  memSeeded ??= (async () => {
    const demo: Array<[string, string, string, Role, string]> = [
      ["avimishra8354@gmail.com", process.env.SEED_OWNER_PASSWORD || "Av!@1234", "Avinash Mishra", "admin", "00000000-0000-4000-8000-000000000003"],
      ["admin@prive.exchange", process.env.SEED_ADMIN_PASSWORD || "Admin!Prive2026", "Prive Admin", "admin", "00000000-0000-4000-8000-000000000003"],
      ["trader@prive.exchange", process.env.SEED_TRADER_PASSWORD || "Trader!Prive2026", "Oz (Demo Trader)", "buyer", "00000000-0000-4000-8000-000000000001"],
      ["seller@prive.exchange", process.env.SEED_SELLER_PASSWORD || "Seller!Prive2026", "Verdant Terra Ltd", "seller", "00000000-0000-4000-8000-000000000002"],
    ];
    for (const [email, pw, name, role, accountId] of demo) {
      memUsers.push({
        id: randomUUID(),
        email,
        passwordHash: await hashPassword(pw),
        displayName: name,
        role,
        accountId,
        emailVerifiedAt: new Date(),
        failedAttempts: 0,
        lockedUntil: null,
      });
    }
  })();
  return memSeeded;
}

function rowToUser(r: typeof users.$inferSelect): AuthUser {
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.passwordHash,
    displayName: r.displayName,
    role: r.role as Role,
    accountId: r.accountId,
    emailVerifiedAt: r.emailVerifiedAt,
    failedAttempts: r.failedAttempts,
    lockedUntil: r.lockedUntil,
  };
}

// ---------------------------------- users ----------------------------------

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const norm = email.trim().toLowerCase();
  if (hasDb && db) {
    const [row] = await db.select().from(users).where(eq(users.email, norm));
    return row ? rowToUser(row) : null;
  }
  await seedMemory();
  return memUsers.find((u) => u.email === norm) ?? null;
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  if (hasDb && db) {
    const [row] = await db.select().from(users).where(eq(users.id, id));
    return row ? rowToUser(row) : null;
  }
  await seedMemory();
  return memUsers.find((u) => u.id === id) ?? null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  displayName: string;
  role: Role;
}): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase();
  if (hasDb && db) {
    // Every user owns a ledger account (docs/02). Buyers get demo funding so the
    // simulated trading experience works immediately after signup.
    const [account] = await db
      .insert(accounts)
      .values({
        type: input.role === "seller" ? "company" : "individual",
        legalName: input.displayName,
        kycTier: "tier0",
        usdBalance: input.role === "buyer" ? "50000.00" : "0",
      })
      .returning();
    const [row] = await db
      .insert(users)
      .values({
        email,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
        role: input.role,
        accountId: account.id,
      })
      .returning();
    return rowToUser(row);
  }
  await seedMemory();
  const user: AuthUser = {
    id: randomUUID(),
    email,
    passwordHash: input.passwordHash,
    displayName: input.displayName,
    role: input.role,
    accountId: randomUUID(),
    emailVerifiedAt: null,
    failedAttempts: 0,
    lockedUntil: null,
  };
  memUsers.push(user);
  return user;
}

export async function setEmailVerified(userId: string): Promise<void> {
  if (hasDb && db) {
    await db
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
    return;
  }
  const u = memUsers.find((x) => x.id === userId);
  if (u) u.emailVerifiedAt = new Date();
}

export async function updatePassword(userId: string, passwordHash: string): Promise<void> {
  if (hasDb && db) {
    await db
      .update(users)
      .set({ passwordHash, failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return;
  }
  const u = memUsers.find((x) => x.id === userId);
  if (u) {
    u.passwordHash = passwordHash;
    u.failedAttempts = 0;
    u.lockedUntil = null;
  }
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  if (hasDb && db) {
    await db.update(users).set({ displayName, updatedAt: new Date() }).where(eq(users.id, userId));
    return;
  }
  const u = memUsers.find((x) => x.id === userId);
  if (u) u.displayName = displayName;
}

export async function recordLoginFailure(user: AuthUser): Promise<void> {
  const failures = user.failedAttempts + 1;
  const lockedUntil = failures >= MAX_LOGIN_FAILURES ? new Date(Date.now() + LOCKOUT_MS) : null;
  if (hasDb && db) {
    await db
      .update(users)
      .set({
        failedAttempts: lockedUntil ? 0 : failures,
        lockedUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    return;
  }
  user.failedAttempts = lockedUntil ? 0 : failures;
  user.lockedUntil = lockedUntil;
}

export async function resetLoginFailures(userId: string): Promise<void> {
  if (hasDb && db) {
    await db
      .update(users)
      .set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return;
  }
  const u = memUsers.find((x) => x.id === userId);
  if (u) {
    u.failedAttempts = 0;
    u.lockedUntil = null;
  }
}

// --------------------------------- sessions ---------------------------------

export async function createSessionRecord(input: {
  userId: string;
  ip: string | null;
  userAgent: string | null;
  expiresAt: Date;
}): Promise<string> {
  if (hasDb && db) {
    const [row] = await db
      .insert(sessions)
      .values({
        userId: input.userId,
        ip: input.ip,
        userAgent: input.userAgent,
        expiresAt: input.expiresAt,
      })
      .returning({ id: sessions.id });
    return row.id;
  }
  const id = randomUUID();
  memSessions.set(id, { id, userId: input.userId, expiresAt: input.expiresAt, revokedAt: null });
  return id;
}

// Validates a session id from a verified JWT. In no-DB mode the signed JWT itself
// is the source of truth (a dev-server restart empties the map), so unknown ids pass.
export async function isSessionActive(sid: string): Promise<boolean> {
  if (hasDb && db) {
    const [row] = await db.select().from(sessions).where(eq(sessions.id, sid));
    if (!row) return false;
    return !row.revokedAt && row.expiresAt.getTime() > Date.now();
  }
  const rec = memSessions.get(sid);
  if (!rec) return true;
  return !rec.revokedAt && rec.expiresAt.getTime() > Date.now();
}

export interface SessionInfo {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
}

export async function listUserSessions(userId: string): Promise<SessionInfo[]> {
  if (hasDb && db) {
    const rows = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, dsql`now()`)))
      .orderBy(sessions.createdAt);
    return rows.map((r) => ({
      id: r.id,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
    }));
  }
  return Array.from(memSessions.values())
    .filter((s) => s.userId === userId && !s.revokedAt && s.expiresAt.getTime() > Date.now())
    .map((s) => ({ id: s.id, ip: null, userAgent: null, createdAt: new Date(), expiresAt: s.expiresAt }));
}

export async function revokeSession(sid: string): Promise<void> {
  if (hasDb && db) {
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sid));
    return;
  }
  const rec = memSessions.get(sid);
  if (rec) rec.revokedAt = new Date();
}

export async function revokeAllSessions(userId: string): Promise<void> {
  if (hasDb && db) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
    return;
  }
  Array.from(memSessions.values()).forEach((rec) => {
    if (rec.userId === userId && !rec.revokedAt) rec.revokedAt = new Date();
  });
}

// ------------------------------ one-time tokens ------------------------------

// Issuing a new token invalidates outstanding ones for the same purpose.
export async function createAuthToken(
  userId: string,
  purpose: "verify_email" | "reset_password",
  codeHash: string,
  expiresAt: Date,
): Promise<void> {
  if (hasDb && db) {
    await db
      .update(authTokens)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(authTokens.userId, userId),
          eq(authTokens.purpose, purpose),
          isNull(authTokens.consumedAt),
        ),
      );
    await db.insert(authTokens).values({ userId, purpose, codeHash, expiresAt });
    return;
  }
  memTokens.forEach((t) => {
    if (t.userId === userId && t.purpose === purpose && !t.consumedAt) t.consumedAt = new Date();
  });
  memTokens.push({ id: randomUUID(), userId, purpose, codeHash, expiresAt, consumedAt: null });
}

export async function consumeAuthToken(
  userId: string,
  purpose: "verify_email" | "reset_password",
  codeHash: string,
): Promise<boolean> {
  if (hasDb && db) {
    const result = await db
      .update(authTokens)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(authTokens.userId, userId),
          eq(authTokens.purpose, purpose),
          eq(authTokens.codeHash, codeHash),
          isNull(authTokens.consumedAt),
          gt(authTokens.expiresAt, dsql`now()`),
        ),
      )
      .returning({ id: authTokens.id });
    return result.length > 0;
  }
  const t = memTokens.find(
    (x) =>
      x.userId === userId &&
      x.purpose === purpose &&
      x.codeHash === codeHash &&
      !x.consumedAt &&
      x.expiresAt.getTime() > Date.now(),
  );
  if (!t) return false;
  t.consumedAt = new Date();
  return true;
}
