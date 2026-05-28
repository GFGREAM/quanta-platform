import { NextResponse } from 'next/server';
import { auditsPool as pool } from '@/lib/db-audits';
import { uploadBuffer, generateSasUrl } from '@/lib/azure-blob';
import { guardDraftAudit, auditLog } from '../../_helpers';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await context.params;
    const guard = await guardDraftAudit(idParam);
    if (!guard.ok) return guard.response;
    const { auditId, email } = guard;

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are accepted' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 });
    }

    const caption = formData.get('caption')?.toString() || null;
    const responseId = formData.get('response_id') ? Number(formData.get('response_id')) : null;
    const findingId = formData.get('finding_id') ? Number(formData.get('finding_id')) : null;
    const roomId = formData.get('room_id') ? Number(formData.get('room_id')) : null;

    // Exactly one parent must be set (DB constraint chk_photos_parent)
    const parentCount = [responseId, findingId, roomId].filter((v) => v !== null).length;
    if (parentCount !== 1) {
      return NextResponse.json({ error: 'Exactly one of response_id, finding_id, or room_id is required' }, { status: 400 });
    }

    const uuid = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blobName = `${auditId}/${uuid}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const blobUrl = await uploadBuffer(buffer, blobName, file.type);

    const result = await pool.query(
      `INSERT INTO hotel_audits.photos (audit_id, response_id, finding_id, room_id, blob_url, caption, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;`,
      [auditId, responseId, findingId, roomId, blobUrl, caption, email],
    );
    const row = result.rows[0];
    await auditLog(auditId, 'upload_photo', email, { photo_id: row.id, blob_name: blobName });

    return NextResponse.json(
      {
        id: row.id,
        response_id: row.response_id,
        finding_id: row.finding_id,
        room_id: row.room_id,
        blob_url: row.blob_url,
        caption: row.caption,
        taken_at: row.taken_at.toISOString(),
        signed_url: generateSasUrl(blobName),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('POST /api/audits/[id]/photos error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
