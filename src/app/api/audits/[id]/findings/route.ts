import { NextResponse } from 'next/server';
import { auditsPool as pool } from '@/lib/db-audits';
import { CreateFindingInputSchema } from '@/lib/schemas/audits';
import { guardDraftAudit, auditLog } from '../../_helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await context.params;
    const guard = await guardDraftAudit(idParam);
    if (!guard.ok) return guard.response;
    const { auditId, email } = guard;

    const body = await request.json();
    const parseResult = CreateFindingInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid body', details: parseResult.error.flatten() }, { status: 400 });
    }
    const input = parseResult.data;
    const result = await pool.query(
      `INSERT INTO hotel_audits.findings (audit_id, description, section, severity)
       VALUES ($1, $2, $3, $4) RETURNING *;`,
      [auditId, input.description, input.section ?? null, input.severity],
    );
    const row = result.rows[0];
    await auditLog(auditId, 'add_finding', email, { finding_id: row.id });
    return NextResponse.json({ ...row, created_at: row.created_at.toISOString() }, { status: 201 });
  } catch (err) {
    console.error('POST /api/audits/[id]/findings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
