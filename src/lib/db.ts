import { Pool } from "pg";

declare global {
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  return new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: true },
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

export const pool: Pool = globalThis._pgPool ?? (globalThis._pgPool = createPool());

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}
