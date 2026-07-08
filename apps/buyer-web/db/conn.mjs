// Shared connection helper for the .mjs migrate/seed scripts. Mirrors db/client.ts:
// Neon HTTP driver for neon.tech URLs, node-postgres for anything else (Docker).
export async function getConn(url) {
  if (/\.neon\.tech/.test(url)) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    return {
      // tagged template: rows = await conn.sql`SELECT ... ${param}`
      sql,
      // raw single statement (no params)
      raw: (stmt) => sql(Object.assign([stmt], { raw: [stmt] })),
      end: async () => {},
    };
  }
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: url,
    ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  return {
    sql: async (strings, ...values) => {
      const text = strings.reduce(
        (acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ""),
        "",
      );
      const res = await client.query(text, values);
      return res.rows;
    },
    raw: (stmt) => client.query(stmt),
    end: () => client.end(),
  };
}

// Docker entrypoint may start before Postgres accepts connections; retry briefly.
export async function getConnWithRetry(url, attempts = 15, delayMs = 2000) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await getConn(url);
    } catch (e) {
      lastErr = e;
      console.log(`… database not ready (attempt ${i + 1}/${attempts}), retrying`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}
