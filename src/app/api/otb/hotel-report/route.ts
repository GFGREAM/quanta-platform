import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

// On The Books · Hotel Report data source: weekly_pace.weekly_pace.
// Monthly pace (no segments). Grain: week (snapshot) × hotel × period (month).
//
// Column roles (per the source owner):
//   OTB current year (paces week-over-week): otb_rns_cy / otb_rev_cy
//   STLY (same-time-last-year; closed months read as the month close): otb_rns_ly / otb_rev_ly
//   Budget: bud_rns_cy / bud_rev_cy
//   Last Year (close): the prior YEAR's rows (year - 1), already closed.
// KPIs derived client-side (OCC = otb_rns/avail, ADR = otb_rev/otb_rns, RevPAR = otb_rev/avail).
// Risk/Surplus = (OTB + last year's rest-of-year pickup [LY close − STLY] for the still-open
// months) − reference. Projected final at last year's booking pace; no outlook/forecast.
// NULL measures are "no data" (not zero).

const asNum = (v: unknown): number =>
  v === null || v === undefined ? 0 : Number(v);

const SQL_HOTELS = `
  SELECT hotel, MAX(hotel_name) AS hotel_name, MAX(rooms) AS rooms
  FROM weekly_pace.weekly_pace
  GROUP BY hotel
  ORDER BY MAX(hotel_name)
`;

const SQL_WEEKS = `
  SELECT DISTINCT week::date::text AS week
  FROM weekly_pace.weekly_pace
  WHERE hotel = $1
  ORDER BY week DESC
`;

// Board: months of the selected year (CY) plus the prior year (year-1) rows, which
// carry the closed Last-Year actuals. `open` = the month hasn't fully closed at this week;
// the snapshot's own (in-progress) month counts as open so its remaining pickup is projected.
const SQL_MONTHS = `
  SELECT EXTRACT(MONTH FROM period)::int AS m,
         year::int                      AS yr,
         (date_trunc('month', period::date) >= date_trunc('month', $2::date)) AS open,
         days::int  AS days,
         avail::int AS avail,
         otb_rns_cy, otb_rev_cy, otb_rns_ly, otb_rev_ly, bud_rns_cy, bud_rev_cy
  FROM weekly_pace.weekly_pace
  WHERE hotel = $1 AND week::date = $2::date AND year IN ($3::int, $3::int - 1)
  ORDER BY period
`;

// FY total per week (progression). proj_* = projected final = OTB + last year's rest-of-year
// pickup (LY close − same-time-last-year) for the months still open at that week. lyc =
// prior-year close (taken at the latest week); w.otb_*_ly = same-time-LY position at that week.
const SQL_PROGRESSION = `
  WITH lyc AS (
    SELECT EXTRACT(MONTH FROM period)::int AS m,
           otb_rns_cy AS ly_rns, otb_rev_cy AS ly_rev
    FROM weekly_pace.weekly_pace
    WHERE hotel = $1 AND year = $2::int - 1
      AND week::date = (SELECT MAX(week::date) FROM weekly_pace.weekly_pace WHERE hotel = $1)
  )
  SELECT w.week::date::text AS week,
         SUM(w.otb_rns_cy) AS otb_rns_cy, SUM(w.otb_rev_cy) AS otb_rev_cy,
         SUM(w.bud_rns_cy) AS bud_rns_cy, SUM(w.bud_rev_cy) AS bud_rev_cy,
         SUM(w.avail) AS avail,
         SUM(w.otb_rns_cy + CASE WHEN date_trunc('month', w.period::date) >= date_trunc('month', w.week::date) THEN COALESCE(lyc.ly_rns, 0) - COALESCE(w.otb_rns_ly, 0) ELSE 0 END) AS proj_rns,
         SUM(w.otb_rev_cy + CASE WHEN date_trunc('month', w.period::date) >= date_trunc('month', w.week::date) THEN COALESCE(lyc.ly_rev, 0) - COALESCE(w.otb_rev_ly, 0) ELSE 0 END) AS proj_rev
  FROM weekly_pace.weekly_pace w
  LEFT JOIN lyc ON lyc.m = EXTRACT(MONTH FROM w.period)::int
  WHERE w.hotel = $1 AND w.year = $2::int
  GROUP BY w.week::date
  ORDER BY w.week::date
`;

export async function GET(request: Request) {
  try {
    const bypass = process.env.NODE_ENV === "development" && process.env.AUTH_BYPASS === "1";
    const session = await getServerSession(authOptions);
    if (!bypass && !session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hotel = searchParams.get("hotel");

    const hotelsRes = await pool.query(SQL_HOTELS);
    const hotels = hotelsRes.rows.map((r) => ({
      code: r.hotel as string,
      name: r.hotel_name as string,
      rooms: asNum(r.rooms),
    }));

    if (!hotel) {
      return NextResponse.json({ hotels });
    }

    const weeksRes = await pool.query(SQL_WEEKS, [hotel]);
    const weeks: string[] = weeksRes.rows.map((r) => r.week);
    if (weeks.length === 0) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    const week = searchParams.get("week") ?? weeks[0];
    const year = Number(searchParams.get("year") ?? week.slice(0, 4));

    const [monthsRes, progRes] = await Promise.all([
      pool.query(SQL_MONTHS, [hotel, week, year]),
      pool.query(SQL_PROGRESSION, [hotel, year]),
    ]);

    const months = Array.from({ length: 12 }, (_, i) => ({
      m: i, days: 0, avail: 0, open: false,
      otbRn: 0, otbRev: 0, stlyRn: 0, stlyRev: 0,
      budRn: 0, budRev: 0, lyCloseRn: 0, lyCloseRev: 0,
    }));
    for (const r of monthsRes.rows) {
      const i = asNum(r.m) - 1;
      if (i < 0 || i > 11) continue;
      if (asNum(r.yr) === year) {
        months[i].days = asNum(r.days);
        months[i].avail = asNum(r.avail);
        months[i].open = r.open === true;
        months[i].otbRn = asNum(r.otb_rns_cy); months[i].otbRev = asNum(r.otb_rev_cy);
        months[i].stlyRn = asNum(r.otb_rns_ly); months[i].stlyRev = asNum(r.otb_rev_ly);
        months[i].budRn = asNum(r.bud_rns_cy); months[i].budRev = asNum(r.bud_rev_cy);
      } else {
        // Prior-year row → Last-Year close for that month.
        months[i].lyCloseRn = asNum(r.otb_rns_cy); months[i].lyCloseRev = asNum(r.otb_rev_cy);
      }
    }

    const progression = progRes.rows.map((r) => ({
      week: r.week as string,
      otbRn: asNum(r.otb_rns_cy), otbRev: asNum(r.otb_rev_cy),
      budRn: asNum(r.bud_rns_cy), budRev: asNum(r.bud_rev_cy),
      avail: asNum(r.avail),
      projRn: asNum(r.proj_rns), projRev: asNum(r.proj_rev),
    }));

    const meta = hotels.find((h) => h.code === hotel);
    return NextResponse.json({
      hotels,
      hotel: { code: hotel, name: meta?.name ?? hotel, rooms: meta?.rooms ?? 0 },
      weeks,
      week,
      year,
      months,
      progression,
    });
  } catch (error) {
    console.error("Hotel Report API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
