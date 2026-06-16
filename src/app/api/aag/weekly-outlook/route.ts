import { NextResponse } from "next/server";
import { getSessionOrBypass } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getPnlAllowedHotels } from "../permissions";

const asNum = (v: unknown): number =>
  v === null || v === undefined ? 0 : Number(v);

// Weekly snapshots of the forecast for a stay-year: one row per (week, hotel, month,
// data_type). Unlike /forecast-rows (which collapses to the latest snapshot via MAX(week)),
// this keeps every weekly snapshot in the trailing window so the UI can plot how the
// Outlook total fluctuates week to week. Only the Outlook scenario is returned (the chart
// shows the Outlook progression); `week` is the ISO snapshot date.
const COLUMNS = `
  a.week::text                        AS week,
  a.hotel,
  a.year                              AS year,
  a.month_name                        AS month,
  a.data_type                         AS scenario,
  a.company,
  a.complex_name                      AS complex,
  a.exchange_rate                     AS fx_rate,
  COALESCE(a.rooms, 0)                AS rooms,
  COALESCE(a.availability, 0)         AS availability,
  a.rooms_sold,
  a.rooms_comp,
  CASE WHEN $2 = 'Local' THEN a.rooms_revenue_local             ELSE a.rooms_revenue             END AS rooms_revenue,
  CASE WHEN $2 = 'Local' THEN a.club_maintenance_fee_local      ELSE a.club_maintenance_fee      END AS club_maint_fee,
  CASE WHEN $2 = 'Local' THEN a.timeshare_maintenance_fee_local ELSE a.timeshare_maintenance_fee END AS timeshare_maint_fee,
  CASE WHEN $2 = 'Local' THEN a.other_revenue_local             ELSE a.other_revenue             END AS other_revenue,
  CASE WHEN $2 = 'Local' THEN a.departmental_expenses_local     ELSE a.departmental_expenses     END AS departmental_expenses,
  CASE WHEN $2 = 'Local' THEN a.undistributed_expenses_local    ELSE a.undistributed_expenses    END AS undistributed_expenses,
  CASE WHEN $2 = 'Local' THEN a.other_expenses_local            ELSE a.other_expenses            END AS other_expenses,
  CASE WHEN $2 = 'Local' THEN a.non_operating_local             ELSE a.non_operating             END AS non_operating,
  a.number_of_guests                  AS guests,
  a.number_of_paying_guests           AS paying_guests
`;

// $1=year, $2=currency, $3=months window
const SQL = `
SELECT ${COLUMNS}
FROM at_a_glance.aag a
WHERE a.year = $1
  AND a.data_type = 'Outlook'
  AND a.week >= (SELECT MAX(week) FROM at_a_glance.aag WHERE year = $1) - ($3::int * INTERVAL '1 month')
ORDER BY a.week, a.hotel, a.month_name;
`;

// $1=year, $2=currency, $3=months window, $4=hotels[]
const SQL_FILTERED = `
SELECT ${COLUMNS}
FROM at_a_glance.aag a
WHERE a.year = $1
  AND a.data_type = 'Outlook'
  AND a.week >= (SELECT MAX(week) FROM at_a_glance.aag WHERE year = $1) - ($3::int * INTERVAL '1 month')
  AND a.hotel = ANY($4::text[])
ORDER BY a.week, a.hotel, a.month_name;
`;

export async function GET(request: Request) {
  try {
    const session = await getSessionOrBypass();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const currencyParam = searchParams.get("currency") || "USD";
    const monthsParam = Number(searchParams.get("months") || "3");

    const year = Number(yearParam);
    if (!yearParam || !Number.isInteger(year)) {
      return NextResponse.json({ error: "year must be an integer" }, { status: 400 });
    }
    if (currencyParam !== "USD" && currencyParam !== "Local") {
      return NextResponse.json({ error: "currency must be USD or Local" }, { status: 400 });
    }
    const months = Number.isInteger(monthsParam) && monthsParam > 0 ? monthsParam : 3;

    const allowedHotels = await getPnlAllowedHotels(session.user.email);
    if (allowedHotels !== null && allowedHotels.length === 0) {
      return NextResponse.json([]);
    }

    const result = allowedHotels
      ? await pool.query(SQL_FILTERED, [year, currencyParam, months, allowedHotels])
      : await pool.query(SQL, [year, currencyParam, months]);

    const rows = result.rows.map((r) => ({
      week: r.week,
      hotel: r.hotel,
      year: Number(r.year),
      month: r.month,
      ytd: "MTD" as const,
      scenario: r.scenario,
      company: r.company,
      complex: r.complex,
      fxRate: asNum(r.fx_rate),
      reportingCurrency: currencyParam as "USD" | "Local",
      rooms: Number(r.rooms),
      availability: Number(r.availability),
      roomsSold: Number(r.rooms_sold),
      roomsComp: Number(r.rooms_comp),
      roomsRevenue: asNum(r.rooms_revenue),
      clubMaintFee: asNum(r.club_maint_fee),
      timeshareMaintFee: asNum(r.timeshare_maint_fee),
      otherRevenue: asNum(r.other_revenue),
      departmentalExpenses: asNum(r.departmental_expenses),
      undistributedExpenses: asNum(r.undistributed_expenses),
      otherExpenses: asNum(r.other_expenses),
      nonOperating: asNum(r.non_operating),
      guests: asNum(r.guests),
      payingGuests: Number(r.paying_guests),
    }));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("AAG weekly-outlook API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
