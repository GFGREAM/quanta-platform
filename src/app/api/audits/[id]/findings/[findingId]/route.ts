import { NextResponse } from 'next/server';
import { auditsPool as pool } from '@/lib/db-audits';
import { UpdateFindingInputSchema } from '@/lib/schemas/audits';
import { guardDraftAudit, auditLog } from '../../../_helpers';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string; findingId: string }> };

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id: idParam, findingId: findingIdParam } = await context.params;
    const guard = await guardDraftAudit(idParam);
    if (!guard.ok) return guard.response;
    const { auditId, email } = guard;
    const findingId = Number(findingIdParam);

    const ownerCheck = await pool.query(
      `SELECT id FROM hotel_audits.findings WHERE id = $1 AND audit_id = $2;`,
      [findingId, auditId],
    );
    if (ownerCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Finding not found in this audit' }, { status: 404 });
    }

    const body = await request.json();
    const parseResult = UpdateFindingInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid body', details: parseResult.error.flatten() }, { status: 400 });
    }
    const input = parseResult.data;
    const sets: string[] = [];
    const params: unknown[] = [];
    if (input.description !== undefined) { params.push(input.description); sets.push(`description = $${params.length}`); }
    if (input.section !== undefined) { params.push(input.section); sets.push(`section = $${params.length}`); }
    if (input.severity !== undefined) { params.push(input.severity); sets.push(`severity = $${params.length}`); }
    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    params.push(findingId);
    const result = await pool.query(
      `UPDATE hotel_audits.findings SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *;`,
      params,
    );
    const row = result.rows[0];
    await auditLog(auditId, 'update_finding', email, { finding_id: findingId });
    return NextResponse.json({ ...row, created_at: row.created_at.toISOString() });
  } catch (err) {
    console.error('PATCH /api/audits/[id]/findings/[findingId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id: idParam, findingId: findingIdParam } = await context.params;
    const guard = await guardDraftAudit(idParam);
    if (!guard.ok) return guard.response;
    const { auditId, email } = guard;
    const findingId = Number(findingIdParam);

    const result = await pool.query(
      `DELETE FROM hotel_audits.findings WHERE id = $1 AND audit_id = $2 RETURNING id;`,
      [findingId, auditId],
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Finding not found in this audit' }, { status: 404 });
    }
    await auditLog(auditId, 'delete_finding', email, { finding_id: findingId });
    return NextResponse.json({ deleted: findingId });
  } catch (err) {
    console.error('DELETE /api/audits/[id]/findings/[findingId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
