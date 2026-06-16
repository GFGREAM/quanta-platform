import { NextResponse } from 'next/server';
import { getSessionOrBypass } from '@/lib/auth';
import { auditsPool as pool } from '@/lib/db-audits';
import { generateSasUrl } from '@/lib/azure-blob';
import { UpdateAuditHeaderInputSchema, type AuditResponse, type AuditRoom, type Finding, type Photo } from '@/lib/schemas/audits';
import { guardDraftAudit, auditLog } from '../_helpers';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrBypass();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { id: idParam } = await context.params;
    const auditId = Number(idParam);
    if (!Number.isInteger(auditId) || auditId <= 0) {
      return NextResponse.json({ error: 'Invalid audit id' }, { status: 400 });
    }
    const [headerRes, responsesRes, roomsRes, findingsRes, photosRes, sigRes] = await Promise.all([
      pool.query(`SELECT a.id, a.hotel_id, h.aag_name AS hotel_name, a.template_id, a.auditor_responsible,
                         a.auditor_email, a.status, a.audit_date, a.summary, a.geo_lat, a.geo_lng,
                         a.total_score, a.created_at, a.completed_at
                  FROM hotel_audits.audits a
                  LEFT JOIN core.dim_hotels h ON h.hotel_id = a.hotel_id
                  WHERE a.id = $1;`, [auditId]),
      pool.query(`SELECT id, question_id, response_value, comment, is_na FROM hotel_audits.audit_responses WHERE audit_id = $1 ORDER BY id ASC;`, [auditId]),
      pool.query(`SELECT id, room_number, cleanliness_score, bathroom_score, functionality_pass, notes FROM hotel_audits.audit_rooms WHERE audit_id = $1 ORDER BY id ASC;`, [auditId]),
      pool.query(`SELECT id, description, section, severity, created_at FROM hotel_audits.findings WHERE audit_id = $1 ORDER BY created_at ASC;`, [auditId]),
      pool.query(`SELECT id, response_id, finding_id, room_id, blob_url, caption, taken_at FROM hotel_audits.photos WHERE audit_id = $1 ORDER BY taken_at ASC;`, [auditId]),
      pool.query(`SELECT id, signature_blob_url AS blob_url, signed_at FROM hotel_audits.signatures WHERE audit_id = $1 LIMIT 1;`, [auditId]),
    ]);
    if (headerRes.rowCount === 0) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }
    const h = headerRes.rows[0];
    const responses: AuditResponse[] = responsesRes.rows.map((r) => ({ id: r.id, question_id: r.question_id, response_value: r.response_value, comment: r.comment, is_na: r.is_na }));
    const rooms: AuditRoom[] = roomsRes.rows.map((r) => ({ id: r.id, room_number: r.room_number, cleanliness_score: r.cleanliness_score, bathroom_score: r.bathroom_score, functionality_pass: r.functionality_pass, notes: r.notes }));
    const findings: Finding[] = findingsRes.rows.map((r) => ({ id: r.id, description: r.description, section: r.section, severity: r.severity, created_at: r.created_at.toISOString() }));
    const photos: (Photo & { signed_url: string })[] = photosRes.rows.map((r) => {
      const blobName = extractBlobName(r.blob_url);
      return { id: r.id, response_id: r.response_id, finding_id: r.finding_id, room_id: r.room_id, blob_url: r.blob_url, caption: r.caption, taken_at: r.taken_at.toISOString(), signed_url: blobName ? generateSasUrl(blobName) : r.blob_url };
    });
    const signature = sigRes.rowCount && sigRes.rowCount > 0 ? (() => {
      const s = sigRes.rows[0];
      const blobName = extractBlobName(s.blob_url);
      return { id: s.id, blob_url: s.blob_url, signed_at: s.signed_at.toISOString(), signed_url: blobName ? generateSasUrl(blobName) : s.blob_url };
    })() : null;
    return NextResponse.json({
      id: h.id, hotel_id: h.hotel_id, hotel_name: h.hotel_name, template_id: h.template_id,
      auditor_responsible: h.auditor_responsible, auditor_email: h.auditor_email, status: h.status,
      audit_date: h.audit_date instanceof Date ? h.audit_date.toISOString().slice(0, 10) : String(h.audit_date),
      summary: h.summary,
      geo_lat: h.geo_lat !== null ? Number(h.geo_lat) : null,
      geo_lng: h.geo_lng !== null ? Number(h.geo_lng) : null,
      total_score: h.total_score !== null ? Number(h.total_score) : null,
      created_at: h.created_at.toISOString(),
      completed_at: h.completed_at ? h.completed_at.toISOString() : null,
      responses, rooms, findings, photos, signature,
    });
  } catch (err) {
    console.error('GET /api/audits/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await context.params;
    const guard = await guardDraftAudit(idParam);
    if (!guard.ok) return guard.response;
    const { auditId, email } = guard;

    const body = await request.json();
    const parseResult = UpdateAuditHeaderInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid body', details: parseResult.error.flatten() }, { status: 400 });
    }
    const input = parseResult.data;
    const sets: string[] = [];
    const params: unknown[] = [];
    if (input.summary !== undefined) { params.push(input.summary); sets.push(`summary = $${params.length}`); }
    if (input.geo_lat !== undefined) { params.push(input.geo_lat); sets.push(`geo_lat = $${params.length}`); }
    if (input.geo_lng !== undefined) { params.push(input.geo_lng); sets.push(`geo_lng = $${params.length}`); }
    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    params.push(auditId);
    const result = await pool.query(
      `UPDATE hotel_audits.audits SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id, summary, geo_lat, geo_lng;`,
      params,
    );
    await auditLog(auditId, 'update_header', email, input as Record<string, unknown>);
    const r = result.rows[0];
    return NextResponse.json({ id: r.id, summary: r.summary, geo_lat: r.geo_lat !== null ? Number(r.geo_lat) : null, geo_lng: r.geo_lng !== null ? Number(r.geo_lng) : null });
  } catch (err) {
    console.error('PATCH /api/audits/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Extract the blob path from a full Azure Blob URL. */
function extractBlobName(blobUrl: string): string | null {
  try {
    const url = new URL(blobUrl);
    // Path is /<container>/<blobName...>  — strip leading slash and container
    const parts = url.pathname.split('/');
    return parts.length > 2 ? parts.slice(2).join('/') : null;
  } catch {
    return null;
  }
}
