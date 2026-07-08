import { neon } from "@neondatabase/serverless";
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
