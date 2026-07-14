// Seeds accounts, users, market catalog and demo workflow rows. Usage: npm run db:seed
// Idempotent — safe to run on every container start.
import { getConnWithRetry } from "./conn.mjs";
import { hash } from "@node-rs/argon2";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL is not set. Add it to apps/buyer-web/.env.local");
  process.exit(1);
}
const conn = await getConnWithRetry(url);
const sql = conn.sql;

const DEMO_ACCOUNT_ID = "00000000-0000-4000-8000-000000000001";
const SELLER_ACCOUNT_ID = "00000000-0000-4000-8000-000000000002";
const ADMIN_ACCOUNT_ID = "00000000-0000-4000-8000-000000000003";

const markets = [
  ["AMZN-RF25", "Amazon Reforestation", "Reforestation", "Verra VCS", 2025, "Pará Basin", "🇧🇷 Brazil", "AAA", 24.8, 1820000, 412000],
  ["SOLR-IN24", "Rajasthan Solar Array", "Solar", "Gold Standard", 2024, "Thar Desert", "🇮🇳 India", "AA", 11.4, 3100000, 640000],
  ["WIND-SC25", "North Sea Wind", "Wind", "Gold Standard", 2025, "Dogger Bank", "🏴 Scotland", "AAA", 18.2, 2240000, 305000],
  ["BLUE-ID24", "Mangrove Blue Carbon", "Blue Carbon", "Verra VCS", 2024, "Sumatra Coast", "🇮🇩 Indonesia", "AAA", 32.6, 640000, 188000],
  ["DAC-IS25", "Hellisheiði Direct Air Capture", "Direct Air Capture", "Prive Native", 2025, "Reykjavík", "🇮🇸 Iceland", "AAA", 128.5, 92000, 41000],
  ["BIO-KE24", "Rift Valley Biogas", "Biogas", "Gold Standard", 2024, "Nakuru", "🇰🇪 Kenya", "A", 9.1, 880000, 210000],
  ["COOK-UG25", "Clean Cookstoves", "Cookstoves", "Gold Standard", 2025, "Kampala", "🇺🇬 Uganda", "AA", 7.4, 1450000, 520000],
  ["PRIVE-CO2", "Prive CO₂ Index", "Reforestation", "Prive Native", 2025, "Blended Basket", "🌍 Global", "AAA", 21.9, 8400000, 1900000],
];

console.log("→ Seeding accounts…");
const accounts = [
  [DEMO_ACCOUNT_ID, "individual", "Oz (Demo Trader)", "IN", "tier2", 48650.0],
  [SELLER_ACCOUNT_ID, "company", "Verdant Terra Ltd", "BR", "tier2", 0],
  [ADMIN_ACCOUNT_ID, "company", "Prive Exchange Operations", "IN", "tier2", 0],
];
for (const a of accounts) {
  await sql`
    INSERT INTO accounts (id, type, legal_name, country, kyc_tier, usd_balance)
    VALUES (${a[0]}, ${a[1]}, ${a[2]}, ${a[3]}, ${a[4]}, ${a[5]})
    ON CONFLICT (id) DO NOTHING
  `;
}

// Bootstrap users — one per portal, email pre-verified. Passwords come from env so
// production deploys never ship the documented dev defaults (see .env.example).
console.log("→ Seeding users…");
const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 }; // OWASP Argon2id baseline
const users = [
  ["admin@prive.exchange", process.env.SEED_ADMIN_PASSWORD || "Admin!Prive2026", "Prive Admin", "admin", ADMIN_ACCOUNT_ID],
  ["trader@prive.exchange", process.env.SEED_TRADER_PASSWORD || "Trader!Prive2026", "Oz (Demo Trader)", "buyer", DEMO_ACCOUNT_ID],
  ["seller@prive.exchange", process.env.SEED_SELLER_PASSWORD || "Seller!Prive2026", "Verdant Terra Ltd", "seller", SELLER_ACCOUNT_ID],
];
for (const [email, password, name, role, accountId] of users) {
  const passwordHash = await hash(password, ARGON2);
  await sql`
    INSERT INTO users (email, password_hash, display_name, role, account_id, email_verified_at)
    VALUES (${email}, ${passwordHash}, ${name}, ${role}, ${accountId}, now())
    ON CONFLICT (email) DO NOTHING
  `;
}

// Owner admin login — upserted (not DO NOTHING) so the admin role and password
// are enforced even if this email signed up earlier with another role.
console.log("→ Seeding owner admin…");
const ownerEmail = "avimishra8354@gmail.com";
const ownerHash = await hash(process.env.SEED_OWNER_PASSWORD || "Av!@1234", ARGON2);
await sql`
  INSERT INTO users (email, password_hash, display_name, role, account_id, email_verified_at)
  VALUES (${ownerEmail}, ${ownerHash}, 'Avinash Mishra', 'admin', ${ADMIN_ACCOUNT_ID}, now())
  ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        role = 'admin',
        account_id = EXCLUDED.account_id,
        email_verified_at = now(),
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = now()
`;

console.log(`→ Seeding ${markets.length} markets…`);
for (const m of markets) {
  await sql`
    INSERT INTO markets (symbol, pair, name, project_type, standard, vintage, location, country, rating, base_price, supply, retired)
    VALUES (${m[0]}, ${m[0] + "/USDT"}, ${m[1]}, ${m[2]}, ${m[3]}, ${m[4]}, ${m[5]}, ${m[6]}, ${m[7]}, ${m[8]}, ${m[9]}, ${m[10]})
    ON CONFLICT (symbol) DO UPDATE SET base_price = EXCLUDED.base_price, supply = EXCLUDED.supply, retired = EXCLUDED.retired
  `;
}

// Clean up the placeholder certificate earlier seeds inserted (fabricated tx hash).
await sql`DELETE FROM retirements WHERE cert_id = 'PRV-CERT-8814'`;

// Seller projects across the verification pipeline (drives seller + admin dashboards).
const projects = [
  ["Verdant Terra Ltd", "Cerrado Savanna Restoration", "Reforestation", "Verra VCS", "🇧🇷 Brazil", "Goiás", 2026, 320000, 22.5, "Site/MRV Audit", "pending", null],
  ["Helios Grid Co", "Atacama Solar Phase II", "Solar", "Gold Standard", "🇨🇱 Chile", "Antofagasta", 2026, 540000, 12.8, "Document Review", "pending", null],
  ["Tidewater Blue", "Sundarbans Mangrove", "Blue Carbon", "Verra VCS", "🇧🇩 Bangladesh", "Khulna", 2025, 96000, 34.0, "Registry Cross-Check", "pending", null],
  ["Nordic Capture AS", "Fjord Direct Air Capture", "Direct Air Capture", "Prive Native", "🇳🇴 Norway", "Bergen", 2026, 48000, 132.0, "Approval", "pending", null],
  ["Savanna Stoves", "Sahel Clean Cookstoves", "Cookstoves", "Gold Standard", "🇹🇩 Chad", "N'Djamena", 2025, 210000, 7.9, "Submitted", "pending", null],
  ["Verdant Terra Ltd", "Amazon Reforestation", "Reforestation", "Verra VCS", "🇧🇷 Brazil", "Pará Basin", 2025, 400000, 24.8, "Live", "live", "AMZN-RF25"],
];

const existingProjects = await sql`SELECT count(*)::int AS n FROM projects`;
if (existingProjects[0].n === 0) {
  console.log(`→ Seeding ${projects.length} seller projects…`);
  for (const p of projects) {
    await sql`
      INSERT INTO projects (seller_account_id, seller_name, name, project_type, standard, country, location, vintage, expected_annual, price, stage, status, token_id)
      VALUES (${SELLER_ACCOUNT_ID}, ${p[0]}, ${p[1]}, ${p[2]}, ${p[3]}, ${p[4]}, ${p[5]}, ${p[6]}, ${p[7]}, ${p[8]}, ${p[9]}, ${p[10]}, ${p[11]})
    `;
  }
} else {
  console.log("→ Projects already present, skipping.");
}


// Wallet: the demo trader's credit holdings (server-authoritative — trading,
// mining conversions and retirements all settle against this table).
console.log("→ Seeding demo wallet holdings…");
const holdings = [
  ["AMZN-RF25", 1240, 21.1],
  ["BLUE-ID24", 380, 28.9],
  ["SOLR-IN24", 5200, 10.2],
  ["PRIVE-CO2", 2100, 19.4],
];
for (const [symbol, qty, avgCost] of holdings) {
  await sql`
    INSERT INTO holdings (account_id, symbol, qty, avg_cost)
    VALUES (${DEMO_ACCOUNT_ID}, ${symbol}, ${qty}, ${avgCost})
    ON CONFLICT (account_id, symbol) DO NOTHING
  `;
}

// A starter mining history so the Mining Hub shows a real streak + leaderboard.
const existingMining = await sql`SELECT count(*)::int AS n FROM mining_events WHERE account_id = ${DEMO_ACCOUNT_ID}`;
if (existingMining[0].n === 0) {
  console.log("→ Seeding mining history…");
  const miningRows = [
    // [daysAgo, actionKey, label, points]
    [2, "checkin", "Daily check-in", 50],
    [2, "steps", "Log today's steps", 120],
    [1, "checkin", "Daily check-in", 50],
    [1, "tree", "Tree-planting drive", 200],
    [1, "referral", "Refer a friend", 400],
  ];
  for (const [daysAgo, key, label, points] of miningRows) {
    await sql`
      INSERT INTO mining_events (account_id, kind, action_key, label, points, created_at)
      VALUES (${DEMO_ACCOUNT_ID}, 'action', ${key}, ${label}, ${points}, now() - make_interval(days => ${daysAgo}))
    `;
  }
}

await conn.end();
console.log("✓ Seed complete.");
