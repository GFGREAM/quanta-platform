import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { auditsPool as pool } from '@/lib/db-audits';
import { auditLog } from '../../_helpers';

const N8N_WEBHOOK_URL = 'https://n8n.gfgam.com/webhook/hotel-audit-pdf';
const N8N_TIMEOUT_MS = 30_000;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const email = session.user.email;

  const { id } = await params;
  const auditId = Number(id);
  if (!Number.isInteger(auditId) || auditId <= 0) {
    return NextResponse.json({ error: 'Invalid audit id' }, { status: 400 });
  }

  const res = await pool.query(
    `SELECT status FROM hotel_audits.audits WHERE id = $1;`,
    [auditId],
  );
  if (res.rowCount === 0) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  const start = Date.now();

  let n8nRes: Response;
  try {
    n8nRes = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audit_id: auditId }),
      signal: AbortSignal.timeout(N8N_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'PDF generation timed out' }, { status: 504 });
    }
    console.error('POST /api/audits/[id]/pdf n8n fetch error:', err);
    return NextResponse.json({ error: 'PDF generation service unavailable' }, { status: 502 });
  }

  if (!n8nRes.ok) {
    console.error('POST /api/audits/[id]/pdf n8n returned', n8nRes.status);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 502 });
  }

  const durationMs = Date.now() - start;

  // Fire-and-forget audit log
  auditLog(auditId, 'pdf_generated', email, { duration_ms: durationMs }).catch(() => {});

  const contentDisposition = n8nRes.headers.get('content-disposition') || '';
  const pdfBody = n8nRes.body;
  if (!pdfBody) {
    return NextResponse.json({ error: 'Empty response from PDF service' }, { status: 502 });
  }

  return new NextResponse(pdfBody as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      ...(contentDisposition ? { 'Content-Disposition': contentDisposition } : {}),
    },
  });
}
