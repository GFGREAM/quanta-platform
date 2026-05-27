import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Agent, setGlobalDispatcher } from 'undici';

// undici defaults: headersTimeout=300s, bodyTimeout=300s.
// Snapshot workflow tarda 6-17min, así que subimos ambos a 30min.
setGlobalDispatcher(new Agent({
  headersTimeout: 30 * 60 * 1000,
  bodyTimeout: 30 * 60 * 1000,
}));

export const runtime = 'nodejs';
export const maxDuration = 1800;

interface SnapshotPayload {
  hotel_name?: string;
  city?: string;
  period_days?: number;
  google_url?: string;
  tripadvisor_url?: string;
  booking_url?: string;
  expedia_url?: string;
  email?: string;
}

const TIMEOUT_MS = 30 * 60 * 1000; // 30 min
const HEARTBEAT_MS = 60 * 1000;    // log cada 1 min

export async function POST(req: NextRequest) {
  const reqId = Math.random().toString(36).slice(2, 10);
  const log = (msg: string) => console.log(`[snapshot/run][${reqId}] ${msg}`);

  log(`START at ${new Date().toISOString()}`);

  const session = await getServerSession(authOptions);
  if (!session) {
    log('REJECTED: no session');
    return NextResponse.json({ error: 'Unauthorized: no active session' }, { status: 401 });
  }
  log(`session OK user=${session.user?.email ?? 'unknown'}`);

  const secret = process.env.SNAPSHOT_WEBHOOK_SECRET;
  const webhookUrl = process.env.SNAPSHOT_WEBHOOK_URL;
  if (!secret || !webhookUrl) {
    log('REJECTED: missing env vars');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  log(`webhookUrl=${webhookUrl} secret_length=${secret.length}`);

  let payload: SnapshotPayload;
  try {
    payload = await req.json();
  } catch {
    log('REJECTED: invalid JSON body');
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  log(`payload hotel="${payload.hotel_name}" city="${payload.city}"`);

  const t0 = Date.now();
  const controller = new AbortController();
  const abortTimer = setTimeout(() => {
    log(`ABORT triggered after ${TIMEOUT_MS}ms (HARD TIMEOUT)`);
    controller.abort();
  }, TIMEOUT_MS);

  const heartbeat = setInterval(() => {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    log(`heartbeat: still waiting for n8n... elapsed=${elapsed}s`);
  }, HEARTBEAT_MS);

  log('fetch START → n8n');
  let upstream: Response;
  try {
    upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Quanta-Secret': secret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      keepalive: true,
    });
    clearInterval(heartbeat);
    clearTimeout(abortTimer);
    const fetchTime = ((Date.now() - t0) / 1000).toFixed(1);
    log(`fetch RESOLVED after ${fetchTime}s status=${upstream.status} ok=${upstream.ok}`);
  } catch (err: unknown) {
    clearInterval(heartbeat);
    clearTimeout(abortTimer);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string; name?: string } };
    log(`fetch FAILED after ${elapsed}s`);
    log(`  err.name=${e.name}`);
    log(`  err.message=${e.message}`);
    log(`  err.cause.code=${e.cause?.code}`);
    log(`  err.cause.name=${e.cause?.name}`);
    log(`  err.cause.message=${e.cause?.message}`);
    log(`  err.cause keys=${e.cause ? Object.keys(e.cause).join(',') : 'no cause'}`);
    return NextResponse.json(
      {
        error: 'Upstream fetch failed',
        diagnostic: {
          elapsed_seconds: elapsed,
          err_name: e.name,
          err_message: e.message,
          cause_code: e.cause?.code,
          cause_name: e.cause?.name,
          cause_message: e.cause?.message,
        },
      },
      { status: 502 }
    );
  }

  if (upstream.status === 401) {
    log('upstream returned 401 (auth gate fail)');
    return NextResponse.json({ error: 'Auth gate rejected' }, { status: 502 });
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    log(`upstream non-OK ${upstream.status}: ${errText.slice(0, 200)}`);
    return NextResponse.json(
      { error: `Upstream HTTP ${upstream.status}: ${errText.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const contentType = upstream.headers.get('content-type') || 'application/pdf';
  const contentDisposition =
    upstream.headers.get('content-disposition') ||
    `attachment; filename="${payload.hotel_name}_Digital_Presence_Snapshot.pdf"`;
  log(`upstream OK content-type=${contentType}`);

  const tBody = Date.now();
  log('reading body (arrayBuffer)...');
  let pdfBuffer: ArrayBuffer;
  try {
    pdfBuffer = await upstream.arrayBuffer();
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
    const elapsed = ((Date.now() - tBody) / 1000).toFixed(1);
    log(`body read FAILED after ${elapsed}s`);
    log(`  err.name=${e.name} err.message=${e.message} cause.code=${e.cause?.code}`);
    return NextResponse.json(
      {
        error: 'Failed reading PDF from upstream',
        diagnostic: { elapsed_seconds: elapsed, err_name: e.name, err_message: e.message, cause_code: e.cause?.code },
      },
      { status: 502 }
    );
  }
  const bodyTime = ((Date.now() - tBody) / 1000).toFixed(1);
  const totalTime = ((Date.now() - t0) / 1000).toFixed(1);
  log(`body read OK size=${pdfBuffer.byteLength}b in ${bodyTime}s (total=${totalTime}s)`);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition,
      'Content-Length': String(pdfBuffer.byteLength),
    },
  });
}
