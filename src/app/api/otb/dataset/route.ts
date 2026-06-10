import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

const asNum = (v: unknown): number =>
  v === null || v === undefined ? 0 : Number(v);

/** Generate ISO date strings for every day of a year. */
function generateDates(year: number): string[] {
  const dates: string[] = [];
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      dates.push(
        `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      );
    }
  }
  return dates;
}

// ─── SQL ────────────────────────────────────────────────────────

const SQL_PROPERTY = `
  SELECT property_code, property_name, capacity, capacity_ly
  FROM daily_segmentation_otb.properties
  WHERE property_code = $1
`;

const SQL_SEGMENTS = `
  SELECT segment_key
  FROM daily_segmentation_otb.segments
  ORDER BY display_order
`;

const SQL_SNAPSHOTS = `
  SELECT DISTINCT snapshot_date::text AS snapshot_date
  FROM daily_segmentation_otb.daily_actuals
  WHERE property_code = $1
  ORDER BY snapshot_date DESC
`;

const SQL_DAILY = `
  SELECT stay_date::text AS stay_date, year, segment_key,
         room_nights, rooms_revenue,
         cs_room_nights, cs_revenue, rn_change_vs_ly
  FROM daily_segmentation_otb.daily_actuals
  WHERE property_code = $1 AND snapshot_date = $2::date
  ORDER BY year, stay_date, segment_key
`;

const SQL_BUDGET = `
  SELECT segment_key, month, budget_rn, budget_revenue
  FROM daily_segmentation_otb.budget
  WHERE property_code = $1 AND year = $2
  ORDER BY segment_key, month
`;

// ─── Pivot helpers ──────────────────────────────────────────────

type SegArrays = Record<string, number[]>;

function emptyArrays(segments: string[], len: number): SegArrays {
  const out: SegArrays = {};
  for (const s of segments) out[s] = new Array(len).fill(0);
  return out;
}

function pivotMetric(
  rows: Array<Record<string, unknown>>,
  segments: string[],
  dateIdx: Map<string, number>,
  yearFilter: number,
  metric: string,
  len: number,
): SegArrays {
  const out = emptyArrays(segments, len);
  for (const r of rows) {
    if (Number(r.year) !== yearFilter) continue;
    const idx = dateIdx.get(r.stay_date as string);
    if (idx === undefined) continue;
    const seg = r.segment_key as string;
    if (!(seg in out)) continue;
    out[seg][idx] = Math.round(asNum(r[metric]));
  }
  return out;
}

// ─── Handler ────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const property = searchParams.get("property");
    if (!property) {
      return NextResponse.json({ error: "property is required" }, { status: 400 });
    }

    // Parallel queries
    const [propRes, segRes, snapRes] = await Promise.all([
      pool.query(SQL_PROPERTY, [property]),
      pool.query(SQL_SEGMENTS),
      pool.query(SQL_SNAPSHOTS, [property]),
    ]);

    if (propRes.rows.length === 0) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const prop = propRes.rows[0];
    const segments: string[] = segRes.rows.map((r) => r.segment_key);
    const snapshots: string[] = snapRes.rows.map((r) => r.snapshot_date);

    // Use requested snapshot or latest
    const snapshotParam = searchParams.get("snapshot");
    const snapshot = snapshotParam ?? snapshots[0];
    if (!snapshot) {
      return NextResponse.json({ error: "No snapshots available" }, { status: 404 });
    }

    // Determine the year from the snapshot (2026-06-06 → 2026)
    const currentYear = Number(snapshot.slice(0, 4));
    const priorYear = currentYear - 1;

    // Fetch daily actuals + budget in parallel
    const [dailyRes, budgetRes] = await Promise.all([
      pool.query(SQL_DAILY, [property, snapshot]),
      pool.query(SQL_BUDGET, [property, currentYear]),
    ]);

    // Generate date axes
    const dates2025 = generateDates(priorYear);
    const dates2026 = generateDates(currentYear);
    const len = dates2026.length;

    // Build date→index maps
    const dateIdx2025 = new Map<string, number>();
    dates2025.forEach((d, i) => dateIdx2025.set(d, i));
    const dateIdx2026 = new Map<string, number>();
    dates2026.forEach((d, i) => dateIdx2026.set(d, i));

    const rows = dailyRes.rows;

    // Pivot actuals into columnar arrays
    const actual2025 = pivotMetric(rows, segments, dateIdx2025, priorYear, "room_nights", dates2025.length);
    const actual2026 = pivotMetric(rows, segments, dateIdx2026, currentYear, "room_nights", len);
    const revenue2025 = pivotMetric(rows, segments, dateIdx2025, priorYear, "rooms_revenue", dates2025.length);
    const revenue2026 = pivotMetric(rows, segments, dateIdx2026, currentYear, "rooms_revenue", len);
    const csRn2025 = pivotMetric(rows, segments, dateIdx2025, priorYear, "cs_room_nights", dates2025.length);
    const csRev2025 = pivotMetric(rows, segments, dateIdx2025, priorYear, "cs_revenue", dates2025.length);

    // STLY = room_nights - rn_change_vs_ly (on the 2026 axis)
    const stly2026 = emptyArrays(segments, len);
    for (const r of rows) {
      if (Number(r.year) !== currentYear) continue;
      const idx = dateIdx2026.get(r.stay_date as string);
      if (idx === undefined) continue;
      const seg = r.segment_key as string;
      if (!(seg in stly2026)) continue;
      stly2026[seg][idx] = Math.round(asNum(r.room_nights) - asNum(r.rn_change_vs_ly));
    }

    // CS Total (sum across all segments per day, prior year)
    const csTotal2025 = dates2025.map((_, i) => segments.reduce((acc, s) => acc + csRn2025[s][i], 0));
    const csRevTotal2025 = dates2025.map((_, i) => segments.reduce((acc, s) => acc + csRev2025[s][i], 0));

    // Budget monthly: Record<segment, number[12]>
    const budgetTcM: SegArrays = {};
    const budgetRevTcM: SegArrays = {};
    for (const s of segments) {
      budgetTcM[s] = new Array(12).fill(0);
      budgetRevTcM[s] = new Array(12).fill(0);
    }
    for (const r of budgetRes.rows) {
      const seg = r.segment_key as string;
      const m = Number(r.month) - 1; // 1-based → 0-based
      if (seg in budgetTcM && m >= 0 && m < 12) {
        budgetTcM[seg][m] = asNum(r.budget_rn);
        budgetRevTcM[seg][m] = asNum(r.budget_revenue);
      }
    }

    return NextResponse.json({
      property: {
        code: prop.property_code,
        name: prop.property_name,
        capacity: Number(prop.capacity),
        capacityLy: Number(prop.capacity_ly),
      },
      asOf: snapshot,
      snapshots,
      segments,
      dates2025,
      dates2026,
      actual2025,
      actual2026,
      stly2026,
      revenue2025,
      revenue2026,
      csRn2025,
      csRev2025,
      csTotal2025,
      csRevTotal2025,
      budgetTcM,
      budgetRevTcM,
    });
  } catch (error) {
    console.error("OTB dataset API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
