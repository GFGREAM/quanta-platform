// src/lib/db.ts
//
// Postgres connection pool singleton for Azure Postgres Flexible Server.
//
// IMPORTANT: do NOT install `pg-native`. The next.config.ts uses
// output: 'standalone', which excludes optional native bindings.
// pg works fine in pure-JS mode (the default).
//
// NUMERIC parsing: pg returns NUMERIC as string by default to preserve
// precision. We do NOT register a global type parser here. Each endpoint
// that consumes NUMERIC columns is responsible for parsing them locally
// (e.g. via Number(v)) so future endpoints with high-precision NUMERIC
// columns are not silently truncated.

import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
    max: 5,
    statement_timeout: 10_000,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}
