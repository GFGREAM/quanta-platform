import { NextResponse } from 'next/server';
import { auditsPool as pool } from '@/lib/db-audits';
import { UpsertResponsesInputSchema } from '@/lib/schemas/audits';
import { guardDraftAudit, auditLog } from '../../_helpers';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await context.params;
    const guard = await guardDraftAudit(idParam);
    if (!guard.ok) return guard.response;
    const { auditId, email } = guard;

    const body = await request.json();
    const parseResult = UpsertResponsesInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid body', details: parseResult.error.flatten() }, { status: 400 });
    }
    const { responses } = parseResult.data;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of responses) {
        await client.query(
          `INSERT INTO hotel_audits.audit_responses (audit_id, question_id, response_value, comment, is_na)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (audit_id, question_id)
           DO UPDATE SET response_value = EXCLUDED.response_value, comment = EXCLUDED.comment, is_na = EXCLUDED.is_na;`,
          [auditId, r.question_id, r.response_value, r.comment, r.is_na],
        );
      }
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    await auditLog(auditId, 'update_responses', email, { count: responses.length });
    return NextResponse.json({ updated: responses.length });
  } catch (err) {
    console.error('PUT /api/audits/[id]/responses error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
