import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  smallint,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

// Phase-1 subset aligned with /docs/02-data-model.md. A single physical schema here
// (public) for the demo; the doc's schema-per-service split is the production target.

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull().default("individual"), // individual | company
  legalName: text("legal_name").notNull(),
  country: text("country").notNull().default("IN"),
  kycTier: text("kyc_tier").notNull().default("tier2"),
  usdBalance: numeric("usd_balance", { precision: 20, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const markets = pgTable("markets", {
  symbol: text("symbol").primaryKey(),
  pair: text("pair").notNull(),
  name: text("name").notNull(),
  projectType: text("project_type").notNull(),
  standard: text("standard").notNull(),
  vintage: smallint("vintage").notNull(),
  location: text("location").notNull(),
  country: text("country").notNull(),
  rating: text("rating").notNull(),
  basePrice: numeric("base_price", { precision: 20, scale: 2 }).notNull(),
  supply: integer("supply").notNull().default(0),
  retired: integer("retired").notNull().default(0),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull(),
    pair: text("pair").notNull(),
    side: text("side").notNull(), // buy | sell
    type: text("type").notNull(), // limit | market
    price: numeric("price", { precision: 20, scale: 2 }).notNull(),
    qty: numeric("qty", { precision: 24, scale: 4 }).notNull(),
    filled: numeric("filled", { precision: 24, scale: 4 }).notNull().default("0"),
    status: text("status").notNull().default("open"), // open | filled | cancelled
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byAccount: index("orders_account_idx").on(t.accountId, t.createdAt) }),
);

export const retirements = pgTable(
  "retirements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull(),
    symbol: text("symbol").notNull(),
    name: text("name").notNull(),
    qty: numeric("qty", { precision: 24, scale: 4 }).notNull(),
    beneficiary: text("beneficiary").notNull().default("Personal"),
    certId: text("cert_id").notNull(),
    txHash: text("tx_hash").notNull(),
    status: text("status").notNull().default("confirmed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byAccount: index("retirements_account_idx").on(t.accountId, t.createdAt) }),
);

// Seller projects — the cross-actor verification pipeline (seller submits → admin advances).
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sellerAccountId: uuid("seller_account_id").notNull(),
    sellerName: text("seller_name").notNull(),
    name: text("name").notNull(),
    projectType: text("project_type").notNull(),
    standard: text("standard").notNull(),
    country: text("country").notNull(),
    location: text("location").notNull(),
    vintage: smallint("vintage").notNull(),
    expectedAnnual: integer("expected_annual").notNull().default(0), // tonnes CO2e / yr
    price: numeric("price", { precision: 20, scale: 2 }).notNull().default("0"),
    stage: text("stage").notNull().default("Submitted"),
    status: text("status").notNull().default("pending"), // pending | approved | rejected | live
    tokenId: text("token_id"), // set on tokenization
    note: text("note"), // admin request-for-info / rejection reason
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byStatus: index("projects_status_idx").on(t.status, t.createdAt) }),
);

// ------------------------------ Auth (docs/05 §2) ------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role").notNull().default("buyer"), // buyer | seller | admin
    accountId: uuid("account_id").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byAccount: index("users_account_idx").on(t.accountId) }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byUser: index("sessions_user_idx").on(t.userId, t.expiresAt) }),
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    purpose: text("purpose").notNull(), // verify_email | reset_password
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byUser: index("auth_tokens_user_idx").on(t.userId, t.purpose, t.createdAt) }),
);

// ------------------------------ Support center ------------------------------

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull().default("general"),
    subject: text("subject").notNull(),
    status: text("status").notNull().default("open"), // open | in_progress | resolved
    priority: text("priority").notNull().default("normal"), // low | normal | high | critical
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byUser: index("tickets_user_idx").on(t.userId, t.createdAt),
    byStatus: index("tickets_status_idx").on(t.status, t.updatedAt),
  }),
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id").notNull(),
    authorRole: text("author_role").notNull().default("user"), // user | support
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byTicket: index("ticket_messages_ticket_idx").on(t.ticketId, t.createdAt) }),
);

// ------------------------------ Wallet ------------------------------

// Server-authoritative credit wallet: one row per (account, symbol). USD cash
// lives on accounts.usd_balance; this table holds the tonne-denominated credits
// (bought on the exchange or minted from mining conversions).
export const holdings = pgTable(
  "holdings",
  {
    accountId: uuid("account_id").notNull(),
    symbol: text("symbol").notNull(),
    qty: numeric("qty", { precision: 24, scale: 4 }).notNull().default("0"),
    avgCost: numeric("avg_cost", { precision: 20, scale: 4 }).notNull().default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.accountId, t.symbol] }) }),
);

export type HoldingRow = typeof holdings.$inferSelect;

// ------------------------------ Green Mining ------------------------------

// One row per proof-of-green-action (positive points) or conversion
// (negative points + minted credits). All mining stats derive from here.
export const miningEvents = pgTable(
  "mining_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull(),
    kind: text("kind").notNull().default("action"), // action | convert
    actionKey: text("action_key").notNull(),
    label: text("label").notNull(),
    points: integer("points").notNull(),
    credits: numeric("credits", { precision: 24, scale: 4 }).notNull().default("0"),
    txHash: text("tx_hash"), // set when the grant is anchored on-chain (MiningRewards.accrue)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byAccount: index("mining_events_account_idx").on(t.accountId, t.createdAt),
    byAction: index("mining_events_action_idx").on(t.accountId, t.actionKey, t.createdAt),
  }),
);

export type MiningEventRow = typeof miningEvents.$inferSelect;

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type TicketRow = typeof tickets.$inferSelect;

export type Retirement = typeof retirements.$inferSelect;
export type NewRetirement = typeof retirements.$inferInsert;
export type OrderRow = typeof orders.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
