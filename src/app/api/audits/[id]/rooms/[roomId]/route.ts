import { NextResponse } from 'next/server';
import { auditsPool as pool } from '@/lib/db-audits';
import { UpdateRoomInputSchema } from '@/lib/schemas/audits';
import { guardDraftAudit, auditLog } from '../../../_helpers';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string; roomId: string }> };

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id: idParam, roomId: roomIdParam } = await context.params;
    const guard = await guardDraftAudit(idParam);
    if (!guard.ok) return guard.response;
    const { auditId, email } = guard;
    const roomId = Number(roomIdParam);

    const ownerCheck = await pool.query(
      `SELECT id FROM hotel_audits.audit_rooms WHERE id = $1 AND audit_id = $2;`,
      [roomId, auditId],
    );
    if (ownerCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Room not found in this audit' }, { status: 404 });
    }

    const body = await request.json();
    const parseResult = UpdateRoomInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid body', details: parseResult.error.flatten() }, { status: 400 });
    }
    const input = parseResult.data;
    const sets: string[] = [];
    const params: unknown[] = [];
    if (input.room_number !== undefined) { params.push(input.room_number); sets.push(`room_number = $${params.length}`); }
    if (input.cleanliness_score !== undefined) { params.push(input.cleanliness_score); sets.push(`cleanliness_score = $${params.length}`); }
    if (input.bathroom_score !== undefined) { params.push(input.bathroom_score); sets.push(`bathroom_score = $${params.length}`); }
    if (input.functionality_pass !== undefined) { params.push(input.functionality_pass); sets.push(`functionality_pass = $${params.length}`); }
    if (input.notes !== undefined) { params.push(input.notes); sets.push(`notes = $${params.length}`); }
    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    params.push(roomId);
    const result = await pool.query(
      `UPDATE hotel_audits.audit_rooms SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *;`,
      params,
    );
    await auditLog(auditId, 'update_room', email, { room_id: roomId });
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /api/audits/[id]/rooms/[roomId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id: idParam, roomId: roomIdParam } = await context.params;
    const guard = await guardDraftAudit(idParam);
    if (!guard.ok) return guard.response;
    const { auditId, email } = guard;
    const roomId = Number(roomIdParam);

    const result = await pool.query(
      `DELETE FROM hotel_audits.audit_rooms WHERE id = $1 AND audit_id = $2 RETURNING id;`,
      [roomId, auditId],
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Room not found in this audit' }, { status: 404 });
    }
    await auditLog(auditId, 'delete_room', email, { room_id: roomId });
    return NextResponse.json({ deleted: roomId });
  } catch (err) {
    console.error('DELETE /api/audits/[id]/rooms/[roomId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
