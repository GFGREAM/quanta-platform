import { NextResponse } from 'next/server';
import { auditsPool as pool } from '@/lib/db-audits';
import { uploadBuffer } from '@/lib/azure-blob';
import { CreateSignatureInputSchema } from '@/lib/schemas/audits';
import { guardDraftAudit, auditLog } from '../../_helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await context.params;
    const guard = await guardDraftAudit(idParam);
    if (!guard.ok) return guard.response;
    const { auditId, email } = guard;

    const body = await request.json();
    const parseResult = CreateSignatureInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid body', details: parseResult.error.flatten() }, { status: 400 });
    }

    // Check if signature already exists
    const existing = await pool.query(
      `SELECT id FROM hotel_audits.signatures WHERE audit_id = $1;`,
      [auditId],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json({ error: 'Audit already has a signature' }, { status: 409 });
    }

    // Decode base64 data URL → Buffer
    const { signature_base64 } = parseResult.data;
    const base64Data = signature_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const uuid = crypto.randomUUID();
    const blobName = `${auditId}/signatures/${uuid}.png`;
    const blobUrl = await uploadBuffer(buffer, blobName, 'image/png');

    const result = await pool.query(
      `INSERT INTO hotel_audits.signatures (audit_id, signature_blob_url, signed_by) VALUES ($1, $2, $3) RETURNING signed_at, signature_blob_url;`,
      [auditId, blobUrl, email],
    );
    const row = result.rows[0];
    await auditLog(auditId, 'sign', email);

    return NextResponse.json({
      signed_at: row.signed_at.toISOString(),
      signature_blob_url: row.signature_blob_url,
    }, { status: 201 });
  } catch (err) {
    console.error('POST /api/audits/[id]/signature error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
