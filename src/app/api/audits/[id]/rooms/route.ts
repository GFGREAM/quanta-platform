import { NextResponse } from 'next/server';
import { auditsPool as pool } from '@/lib/db-audits';
import { CreateRoomInputSchema } from '@/lib/schemas/audits';
import { guardDraftAudit, auditLog } from '../../_helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await context.params;
    const guard = await guardDraftAudit(idParam);
    if (!guard.ok) return guard.response;
    const { auditId, email } = guard;

    const body = await request.json();
    const parseResult = CreateRoomInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid body', details: parseResult.error.flatten() }, { status: 400 });
    }
    const input = parseResult.data;
    const result = await pool.query(
      `INSERT INTO hotel_audits.audit_rooms (audit_id, room_number, cleanliness_score, bathroom_score, functionality_pass, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`,
      [auditId, input.room_number, input.cleanliness_score ?? null, input.bathroom_score ?? null, input.functionality_pass ?? null, input.notes ?? null],
    );
    await auditLog(auditId, 'add_room', email, { room_number: input.room_number });
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/audits/[id]/rooms error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
