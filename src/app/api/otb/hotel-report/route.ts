import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { hasAccessToSection, getAllowedProperties } from "@/lib/permissions";

const SECTION_KEY = "topline-otb-hotel-report";

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

const SQL_HOTELS_ALL = `
  SELECT hotel, MAX(hotel_name) AS hotel_name, MAX(rooms) AS rooms
  FROM weekly_pace.weekly_pace
  GROUP BY hotel
  ORDER BY MAX(hotel_name)
`;

const SQL_HOTELS_FILTERED = `
  SELECT hotel, MAX(hotel_name) AS hotel_name, MAX(rooms) AS rooms
  FROM weekly_pace.weekly_pace
  WHERE hotel = ANY($1::text[]) OR hotel_name = ANY($1::text[])
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

// Pickup baseline: OTB for the same CY months at a prior weekly snapshot. Last Week = the
// snapshot immediately before the selected week; Last 4 Weeks = 4 snapshots back. Pickup is
// then current − prior, computed per month client-side. NULL prior row → no pickup ("—").
const SQL_PICKUP = `
  SELECT EXTRACT(MONTH FROM period)::int AS m,
         week::date::text AS w,
         otb_rns_cy, otb_rev_cy
  FROM weekly_pace.weekly_pace
  WHERE hotel = $1 AND year = $2::int AND week::date = ANY($3::date[])
`;

export async function GET(request: Request) {
  try {
    const bypass = process.env.NODE_ENV === "development" && process.env.AUTH_BYPASS === "1";
    const session = await getServerSession(authOptions);
    if (!bypass && !session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const email = session?.user?.email ?? "";
    if (!bypass && !(await hasAccessToSection(email, SECTION_KEY))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // allowed_properties stores hotel display names (e.g. "Zoetry Marigot Bay").
    // null = all hotels allowed.
    const allowedProps = bypass ? null : await getAllowedProperties(email, SECTION_KEY);

    const { searchParams } = new URL(request.url);
    const hotel = searchParams.get("hotel");

    const hotelsRes = allowedProps
      ? await pool.query(SQL_HOTELS_FILTERED, [allowedProps])
      : await pool.query(SQL_HOTELS_ALL);
    const hotels = hotelsRes.rows.map((r) => ({
      code: r.hotel as string,
      name: r.hotel_name as string,
      rooms: asNum(r.rooms),
    }));

    if (!hotel) {
      return NextResponse.json({ hotels });
    }

    // Verify the requested hotel is in the allowed list.
    if (!hotels.some((h) => h.code === hotel)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const weeksRes = await pool.query(SQL_WEEKS, [hotel]);
    const weeks: string[] = weeksRes.rows.map((r) => r.week);
    if (weeks.length === 0) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
    }

    const week = searchParams.get("week") ?? weeks[0];
    const year = Number(searchParams.get("year") ?? week.slice(0, 4));

    // weeks is ordered newest-first; the prior snapshots feed the pickup baselines.
    const selIdx = weeks.indexOf(week);
    const prevWeek = selIdx >= 0 && selIdx + 1 < weeks.length ? weeks[selIdx + 1] : null;
    const week4 = selIdx >= 0 && selIdx + 4 < weeks.length ? weeks[selIdx + 4] : null;
    const priorWeeks = [prevWeek, week4].filter((w): w is string => w !== null);

    const [monthsRes, progRes, pickupRes] = await Promise.all([
      pool.query(SQL_MONTHS, [hotel, week, year]),
      pool.query(SQL_PROGRESSION, [hotel, year]),
      pool.query(SQL_PICKUP, [hotel, year, priorWeeks]),
    ]);

    const months = Array.from({ length: 12 }, (_, i) => ({
      m: i, days: 0, avail: 0, open: false,
      otbRn: 0, otbRev: 0, stlyRn: 0, stlyRev: 0,
      budRn: 0, budRev: 0, lyCloseRn: 0, lyCloseRev: 0,
      puRn: null as number | null, puRev: null as number | null,
      pu4Rn: null as number | null, pu4Rev: null as number | null,
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

    // Pickup = current OTB − prior-snapshot OTB, per month (RN + Rev). Missing prior row → null.
    const prevRn = new Map<number, number>(), prevRev = new Map<number, number>();
    const w4Rn = new Map<number, number>(), w4Rev = new Map<number, number>();
    for (const r of pickupRes.rows) {
      const m = asNum(r.m);
      if (prevWeek && r.w === prevWeek) { prevRn.set(m, asNum(r.otb_rns_cy)); prevRev.set(m, asNum(r.otb_rev_cy)); }
      else if (week4 && r.w === week4) { w4Rn.set(m, asNum(r.otb_rns_cy)); w4Rev.set(m, asNum(r.otb_rev_cy)); }
    }
    for (let i = 0; i < 12; i++) {
      const mo = i + 1;
      if (prevWeek && prevRn.has(mo)) {
        months[i].puRn = months[i].otbRn - (prevRn.get(mo) ?? 0);
        months[i].puRev = months[i].otbRev - (prevRev.get(mo) ?? 0);
      }
      if (week4 && w4Rn.has(mo)) {
        months[i].pu4Rn = months[i].otbRn - (w4Rn.get(mo) ?? 0);
        months[i].pu4Rev = months[i].otbRev - (w4Rev.get(mo) ?? 0);
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
