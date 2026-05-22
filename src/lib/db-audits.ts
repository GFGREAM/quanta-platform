import { Pool } from 'pg';
const globalForAuditsPg = globalThis as unknown as { auditsPgPool?: Pool };
export const auditsPool =
  globalForAuditsPg.auditsPgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL_AUDITS,
    ssl: true,
    max: 5,
    statement_timeout: 10_000,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
if (process.env.NODE_ENV !== 'production') {
  globalForAuditsPg.auditsPgPool = auditsPool;
}
