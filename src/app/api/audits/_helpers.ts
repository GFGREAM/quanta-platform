import { NextResponse } from 'next/server';
import { getSessionOrBypass } from '@/lib/auth';
import { auditsPool as pool } from '@/lib/db-audits';

/**
 * Common guard: validate auth, parse audit ID, and ensure audit exists
 * and is in 'borrador' status. Returns the session email + auditId on
 * success, or a NextResponse error to return immediately.
 */
export async function guardDraftAudit(
  idParam: string,
): Promise<
  | { ok: true; auditId: number; email: string }
  | { ok: false; response: NextResponse }
> {
  const session = await getSessionOrBypass();
  if (!session?.user?.email) {
    return { ok: false, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }
  const auditId = Number(idParam);
  if (!Number.isInteger(auditId) || auditId <= 0) {
    return { ok: false, response: NextResponse.json({ error: 'Invalid audit id' }, { status: 400 }) };
  }
  const res = await pool.query(
    `SELECT status FROM hotel_audits.audits WHERE id = $1;`,
    [auditId],
  );
  if (res.rowCount === 0) {
    return { ok: false, response: NextResponse.json({ error: 'Audit not found' }, { status: 404 }) };
  }
  if (res.rows[0].status !== 'borrador') {
    return { ok: false, response: NextResponse.json({ error: 'Cannot edit non-draft audit' }, { status: 409 }) };
  }
  return { ok: true, auditId, email: session.user.email };
}

/** Insert a row into audit_log. Fire-and-forget is fine. */
export async function auditLog(
  auditId: number,
  action: string,
  email: string,
  details?: Record<string, unknown>,
) {
  await pool.query(
    `INSERT INTO hotel_audits.audit_log (audit_id, action, actor_email, details) VALUES ($1, $2, $3, $4::jsonb);`,
    [auditId, action, email, details ? JSON.stringify(details) : null],
  );
}
