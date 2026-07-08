// Runs the raw SQL migrations. Usage: npm run db:migrate
// Requires DATABASE_URL (node --env-file=.env.local locally; injected in Docker).
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getConnWithRetry } from "./conn.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("✗ DATABASE_URL is not set. Add it to apps/buyer-web/.env.local");
  process.exit(1);
}

const conn = await getConnWithRetry(url);

// Run every .sql file in migrations/ in filename order (idempotent — uses IF NOT EXISTS).
const dir = join(__dirname, "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  const raw = readFileSync(join(dir, file), "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--")) // drop comment lines first
    .join("\n");
  const statements = raw
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  console.log(`→ ${file}: applying ${statements.length} statements…`);
  for (const stmt of statements) await conn.raw(stmt);
}
await conn.end();
console.log("✓ Migrations complete.");
