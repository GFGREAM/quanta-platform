import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { auditsPool as pool } from '@/lib/db-audits';
import { CreateAuditInputSchema, ListAuditsQuerySchema, type AuditListItem } from '@/lib/schemas/audits';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const parseResult = ListAuditsQuerySchema.safeParse({
      hotel_id: searchParams.get('hotel_id') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      auditor_responsible: searchParams.get('auditor_responsible') ?? undefined,
      from_date: searchParams.get('from_date') ?? undefined,
      to_date: searchParams.get('to_date') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid query', details: parseResult.error.flatten() }, { status: 400 });
    }
    const filters = parseResult.data;
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filters.hotel_id !== undefined) { params.push(filters.hotel_id); conditions.push(`a.hotel_id = $${params.length}`); }
    if (filters.status !== undefined) { params.push(filters.status); conditions.push(`a.status = $${params.length}`); }
    if (filters.auditor_responsible !== undefined) { params.push(filters.auditor_responsible); conditions.push(`a.auditor_responsible = $${params.length}`); }
    if (filters.from_date !== undefined) { params.push(filters.from_date); conditions.push(`a.audit_date >= $${params.length}`); }
    if (filters.to_date !== undefined) { params.push(filters.to_date); conditions.push(`a.audit_date <= $${params.length}`); }
    params.push(filters.limit);
    const limitPlaceholder = `$${params.length}`;
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT a.id, a.hotel_id, h.aag_name AS hotel_name, a.auditor_responsible, a.status,
             a.audit_date, a.total_score, a.created_at, a.completed_at
      FROM hotel_audits.audits a
      LEFT JOIN core.dim_hotels h ON h.hotel_id = a.hotel_id
      ${whereClause}
      ORDER BY a.audit_date DESC, a.created_at DESC
      LIMIT ${limitPlaceholder};
    `;
    const result = await pool.query(sql, params);
    const audits: AuditListItem[] = result.rows.map((r) => ({
      id: r.id,
      hotel_id: r.hotel_id,
      hotel_name: r.hotel_name,
      auditor_responsible: r.auditor_responsible,
      status: r.status,
      audit_date: r.audit_date instanceof Date ? r.audit_date.toISOString().slice(0, 10) : String(r.audit_date),
      total_score: r.total_score !== null ? Number(r.total_score) : null,
      created_at: r.created_at.toISOString(),
      completed_at: r.completed_at ? r.completed_at.toISOString() : null,
    }));
    return NextResponse.json(audits);
  } catch (err) {
    console.error('GET /api/audits error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const body = await request.json();
    const parseResult = CreateAuditInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid body', details: parseResult.error.flatten() }, { status: 400 });
    }
    const input = parseResult.data;
    const tplResult = await pool.query(`SELECT id FROM hotel_audits.templates WHERE is_active = TRUE ORDER BY version DESC LIMIT 1;`);
    if (tplResult.rowCount === 0) {
      return NextResponse.json({ error: 'No active template found' }, { status: 500 });
    }
    const templateId = tplResult.rows[0].id;
    const insertResult = await pool.query(
      `INSERT INTO hotel_audits.audits (hotel_id, template_id, auditor_responsible, auditor_email, status, audit_date)
       VALUES ($1, $2, $3, $4, 'borrador', $5) RETURNING id;`,
      [input.hotel_id, templateId, input.auditor_responsible, session.user.email, input.audit_date]
    );
    const newAuditId = insertResult.rows[0].id;
    await pool.query(
      `INSERT INTO hotel_audits.audit_log (audit_id, action, actor_email, details) VALUES ($1, 'create', $2, $3::jsonb);`,
      [newAuditId, session.user.email, JSON.stringify({ hotel_id: input.hotel_id, auditor_responsible: input.auditor_responsible, audit_date: input.audit_date })]
    );
    return NextResponse.json({ id: newAuditId }, { status: 201 });
  } catch (err) {
    console.error('POST /api/audits error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
