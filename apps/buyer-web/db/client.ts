import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Dual-driver Drizzle client:
//  - Neon serverless (HTTP) when DATABASE_URL points at neon.tech (original setup)
//  - node-postgres Pool for any other Postgres (the Docker Compose `db` service)
// If DATABASE_URL is not configured the app still runs — API routes fall back to an
// in-memory store (see lib/repo.ts and lib/auth/store.ts).
const url = process.env.DATABASE_URL;

export const hasDb = !!url;

// Both drivers expose the same query-builder surface; typing as one of them keeps
// call sites (e.g. `.returning({...})`) from collapsing to a union signature.
export type Database = NodePgDatabase<typeof schema>;

// Neon scale-to-zero: the first query after idle can land while the compute is
// still waking, surfacing as "fetch failed" before any response is received.
// Retrying connection-level failures (never received a response, so nothing
// executed) turns a user-facing 500 into ~1s of extra latency.
neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch(input, init);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
};

function connect(u: string): Database {
  if (/\.neon\.tech/.test(u))
    return drizzleNeon(neon(u), { schema }) as unknown as Database;
  const pool = new Pool({
    connectionString: u,
    ssl: /sslmode=require/.test(u) ? { rejectUnauthorized: false } : undefined,
  });
  return drizzlePg(pool, { schema });
}

export const db: Database | null = url ? connect(url) : null;

export { schema };
