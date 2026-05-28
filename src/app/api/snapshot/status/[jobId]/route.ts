import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized: no active session' },
      { status: 401 }
    );
  }

  const { jobId } = await ctx.params;
  if (!jobId || !/^[a-zA-Z0-9_-]+$/.test(jobId)) {
    return NextResponse.json(
      { error: 'Invalid job_id format' },
      { status: 400 }
    );
  }

  const secret = process.env.SNAPSHOT_WEBHOOK_SECRET;
  const statusUrl = process.env.SNAPSHOT_STATUS_URL;
  if (!secret || !statusUrl) {
    return NextResponse.json(
      { error: 'Server misconfigured: status endpoint not available' },
      { status: 500 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${statusUrl}?job_id=${encodeURIComponent(jobId)}`, {
      method: 'GET',
      headers: {
        'X-Quanta-Secret': secret,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Upstream unreachable: ' + message },
      { status: 502 }
    );
  }

  if (upstream.status === 401) {
    return NextResponse.json(
      { error: 'Upstream auth gate rejected the request' },
      { status: 502 }
    );
  }

  // 202: still processing — passthrough
  if (upstream.status === 202) {
    const body = await upstream.json().catch(() => ({ status: 'processing' }));
    return NextResponse.json(body, { status: 202 });
  }

  // 200: PDF ready — stream body to client
  if (upstream.status === 200) {
    const contentType = upstream.headers.get('content-type') || 'application/pdf';
    const contentDisposition =
      upstream.headers.get('content-disposition') ||
      `attachment; filename="snapshot_${jobId}.pdf"`;
    const pdfBuffer = await upstream.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Content-Length': String(pdfBuffer.byteLength),
      },
    });
  }

  const errText = await upstream.text().catch(() => '');
  return NextResponse.json(
    { error: `Upstream returned ${upstream.status}: ${errText.slice(0, 200)}` },
    { status: 502 }
  );
}
