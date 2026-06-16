import { NextResponse } from 'next/server';
import { getSessionOrBypass } from '@/lib/auth';
import { auditsPool as pool } from '@/lib/db-audits';
import type { Hotel } from '@/lib/schemas/audits';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionOrBypass();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const result = await pool.query(`
      SELECT hotel_id, hotel_code, aag_name
      FROM core.dim_hotels
      WHERE is_auditable = TRUE
      ORDER BY aag_name ASC NULLS LAST, hotel_code ASC NULLS LAST;
    `);
    const hotels: Hotel[] = result.rows.map((r) => ({
      hotel_id: r.hotel_id,
      hotel_code: r.hotel_code,
      aag_name: r.aag_name,
    }));
    return NextResponse.json(hotels);
  } catch (err) {
    console.error('GET /api/audits/hotels error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
