import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrBypass } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 30; // ya no esperamos el PDF, solo el accepted

interface SnapshotPayload {
  job_id?: string;
  hotel_name?: string;
  city?: string;
  period_days?: number;
  google_url?: string;
  tripadvisor_url?: string;
  booking_url?: string;
  expedia_url?: string;
  email?: string;
}

export async function POST(req: NextRequest) {
  const session = await getSessionOrBypass();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized: no active session' },
      { status: 401 }
    );
  }

  const secret = process.env.SNAPSHOT_WEBHOOK_SECRET;
  const webhookUrl = process.env.SNAPSHOT_WEBHOOK_URL;
  if (!secret || !webhookUrl) {
    return NextResponse.json(
      { error: 'Server misconfigured: snapshot endpoint not available' },
      { status: 500 }
    );
  }

  let payload: SnapshotPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload.job_id || typeof payload.job_id !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: job_id' },
      { status: 400 }
    );
  }
  if (!payload.email || typeof payload.email !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: email' },
      { status: 400 }
    );
  }

  const reqId = Math.random().toString(36).slice(2, 8);
  console.log(
    `[snapshot/run][${reqId}] start job_id=${payload.job_id} user=${session.user?.email ?? 'unknown'} hotel="${payload.hotel_name}"`
  );

  let upstream: Response;
  try {
    upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Quanta-Secret': secret,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[snapshot/run][${reqId}] fetch_error: ${message}`);
    return NextResponse.json(
      { error: 'Upstream unreachable: ' + message },
      { status: 502 }
    );
  }

  if (upstream.status === 401) {
    console.error(`[snapshot/run][${reqId}] upstream 401 — check SNAPSHOT_WEBHOOK_SECRET`);
    return NextResponse.json(
      { error: 'Upstream auth gate rejected the request' },
      { status: 502 }
    );
  }

  if (upstream.status !== 202) {
    const errText = await upstream.text().catch(() => '');
    console.error(`[snapshot/run][${reqId}] upstream ${upstream.status}: ${errText.slice(0, 200)}`);
    return NextResponse.json(
      { error: `Upstream returned ${upstream.status}: ${errText.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const accepted = await upstream.json().catch(() => null);
  console.log(`[snapshot/run][${reqId}] accepted job_id=${payload.job_id}`);
  return NextResponse.json(
    {
      accepted: true,
      job_id: payload.job_id,
      message: accepted?.message ?? 'Snapshot queued',
    },
    { status: 202 }
  );
}
