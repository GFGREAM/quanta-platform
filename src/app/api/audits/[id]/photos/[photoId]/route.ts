import { NextResponse } from 'next/server';
import { auditsPool as pool } from '@/lib/db-audits';
import { deleteBlob } from '@/lib/azure-blob';
import { guardDraftAudit, auditLog } from '../../../_helpers';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string; photoId: string }> };

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id: idParam, photoId: photoIdParam } = await context.params;
    const guard = await guardDraftAudit(idParam);
    if (!guard.ok) return guard.response;
    const { auditId, email } = guard;
    const photoId = Number(photoIdParam);

    const result = await pool.query(
      `DELETE FROM hotel_audits.photos WHERE id = $1 AND audit_id = $2 RETURNING id, blob_url;`,
      [photoId, auditId],
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Photo not found in this audit' }, { status: 404 });
    }

    // Best-effort blob cleanup
    const blobUrl: string = result.rows[0].blob_url;
    try {
      const url = new URL(blobUrl);
      const parts = url.pathname.split('/');
      const blobName = parts.length > 2 ? parts.slice(2).join('/') : null;
      if (blobName) await deleteBlob(blobName);
    } catch (blobErr) {
      console.error('Failed to delete blob:', blobErr);
    }

    await auditLog(auditId, 'delete_photo', email, { photo_id: photoId });
    return NextResponse.json({ deleted: photoId });
  } catch (err) {
    console.error('DELETE /api/audits/[id]/photos/[photoId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
