import { NextResponse } from "next/server";
import { getSessionOrBypass } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getPnlAllowedHotels } from "../permissions";

const asNum = (v: unknown): number =>
  v === null || v === undefined ? 0 : Number(v);

interface ForecastRow {
  hotel: string;
  year: number;
  month: string;
  ytd: "MTD" | "YTD";
  scenario: string;
  company: string;
  complex: string;
  fxRate: number;
  rooms: number;
  availability: number;
  reportingCurrency: "USD" | "Local";
  roomsSold: number;
  roomsComp: number;
  roomsRevenue: number;
  clubMaintFee: number;
  timeshareMaintFee: number;
  otherRevenue: number;
  departmentalExpenses: number;
  undistributedExpenses: number;
  otherExpenses: number;
  nonOperating: number;
  guests: number;
  payingGuests: number;
}

// ─── SQL templates ─────────────────────────────────────────────
// Each has an unfiltered and a hotel-filtered variant.
// The filtered variant appends a hotel = ANY($N) clause to both
// the CTE and the main query.

// Specific year: $1=year, $2=currency
const SQL_YEAR = `
WITH ultimos_snapshots AS (
  SELECT hotel, data_type, year, MAX(week) AS max_week
  FROM at_a_glance.aag
  WHERE year IN ($1::int, $1::int - 1)
  GROUP BY hotel, data_type, year
)
SELECT
  a.hotel,
  a.year                          AS year,
  a.month_name                        AS month,
  a.data_type                         AS scenario,
  a.company,
  a.complex_name                      AS complex,
  a.exchange_rate                     AS fx_rate,
  COALESCE(a.rooms, 0)                AS rooms,
  COALESCE(a.availability, 0)         AS availability,
  a.rooms_sold,
  a.rooms_comp,
  CASE WHEN $2 = 'Local' THEN a.rooms_revenue_local                ELSE a.rooms_revenue                END AS rooms_revenue,
  CASE WHEN $2 = 'Local' THEN a.club_maintenance_fee_local         ELSE a.club_maintenance_fee         END AS club_maint_fee,
  CASE WHEN $2 = 'Local' THEN a.timeshare_maintenance_fee_local    ELSE a.timeshare_maintenance_fee    END AS timeshare_maint_fee,
  CASE WHEN $2 = 'Local' THEN a.other_revenue_local                ELSE a.other_revenue                END AS other_revenue,
  CASE WHEN $2 = 'Local' THEN a.departmental_expenses_local        ELSE a.departmental_expenses        END AS departmental_expenses,
  CASE WHEN $2 = 'Local' THEN a.undistributed_expenses_local       ELSE a.undistributed_expenses       END AS undistributed_expenses,
  CASE WHEN $2 = 'Local' THEN a.other_expenses_local               ELSE a.other_expenses               END AS other_expenses,
  CASE WHEN $2 = 'Local' THEN a.non_operating_local                ELSE a.non_operating                END AS non_operating,
  a.number_of_guests                  AS guests,
  a.number_of_paying_guests           AS paying_guests
FROM at_a_glance.aag a
JOIN ultimos_snapshots us
  ON us.hotel = a.hotel
  AND us.data_type = a.data_type
  AND us.year = a.year
  AND us.max_week = a.week
ORDER BY a.hotel, a.year, a.month_name, a.data_type;
`;

// Specific year + hotel filter: $1=year, $2=currency, $3=hotels[]
const SQL_YEAR_FILTERED = `
WITH ultimos_snapshots AS (
  SELECT hotel, data_type, year, MAX(week) AS max_week
  FROM at_a_glance.aag
  WHERE year IN ($1::int, $1::int - 1)
    AND hotel = ANY($3::text[])
  GROUP BY hotel, data_type, year
)
SELECT
  a.hotel,
  a.year                          AS year,
  a.month_name                        AS month,
  a.data_type                         AS scenario,
  a.company,
  a.complex_name                      AS complex,
  a.exchange_rate                     AS fx_rate,
  COALESCE(a.rooms, 0)                AS rooms,
  COALESCE(a.availability, 0)         AS availability,
  a.rooms_sold,
  a.rooms_comp,
  CASE WHEN $2 = 'Local' THEN a.rooms_revenue_local                ELSE a.rooms_revenue                END AS rooms_revenue,
  CASE WHEN $2 = 'Local' THEN a.club_maintenance_fee_local         ELSE a.club_maintenance_fee         END AS club_maint_fee,
  CASE WHEN $2 = 'Local' THEN a.timeshare_maintenance_fee_local    ELSE a.timeshare_maintenance_fee    END AS timeshare_maint_fee,
  CASE WHEN $2 = 'Local' THEN a.other_revenue_local                ELSE a.other_revenue                END AS other_revenue,
  CASE WHEN $2 = 'Local' THEN a.departmental_expenses_local        ELSE a.departmental_expenses        END AS departmental_expenses,
  CASE WHEN $2 = 'Local' THEN a.undistributed_expenses_local       ELSE a.undistributed_expenses       END AS undistributed_expenses,
  CASE WHEN $2 = 'Local' THEN a.other_expenses_local               ELSE a.other_expenses               END AS other_expenses,
  CASE WHEN $2 = 'Local' THEN a.non_operating_local                ELSE a.non_operating                END AS non_operating,
  a.number_of_guests                  AS guests,
  a.number_of_paying_guests           AS paying_guests
FROM at_a_glance.aag a
JOIN ultimos_snapshots us
  ON us.hotel = a.hotel
  AND us.data_type = a.data_type
  AND us.year = a.year
  AND us.max_week = a.week
ORDER BY a.hotel, a.year, a.month_name, a.data_type;
`;

// All years: $1=currency
const SQL_ALL = `
WITH ultimos_snapshots AS (
  SELECT hotel, data_type, year, MAX(week) AS max_week
  FROM at_a_glance.aag
  GROUP BY hotel, data_type, year
)
SELECT
  a.hotel,
  a.year                          AS year,
  a.month_name                        AS month,
  a.data_type                         AS scenario,
  a.company,
  a.complex_name                      AS complex,
  a.exchange_rate                     AS fx_rate,
  COALESCE(a.rooms, 0)                AS rooms,
  COALESCE(a.availability, 0)         AS availability,
  a.rooms_sold,
  a.rooms_comp,
  CASE WHEN $1 = 'Local' THEN a.rooms_revenue_local                ELSE a.rooms_revenue                END AS rooms_revenue,
  CASE WHEN $1 = 'Local' THEN a.club_maintenance_fee_local         ELSE a.club_maintenance_fee         END AS club_maint_fee,
  CASE WHEN $1 = 'Local' THEN a.timeshare_maintenance_fee_local    ELSE a.timeshare_maintenance_fee    END AS timeshare_maint_fee,
  CASE WHEN $1 = 'Local' THEN a.other_revenue_local                ELSE a.other_revenue                END AS other_revenue,
  CASE WHEN $1 = 'Local' THEN a.departmental_expenses_local        ELSE a.departmental_expenses        END AS departmental_expenses,
  CASE WHEN $1 = 'Local' THEN a.undistributed_expenses_local       ELSE a.undistributed_expenses       END AS undistributed_expenses,
  CASE WHEN $1 = 'Local' THEN a.other_expenses_local               ELSE a.other_expenses               END AS other_expenses,
  CASE WHEN $1 = 'Local' THEN a.non_operating_local                ELSE a.non_operating                END AS non_operating,
  a.number_of_guests                  AS guests,
  a.number_of_paying_guests           AS paying_guests
FROM at_a_glance.aag a
JOIN ultimos_snapshots us
  ON us.hotel = a.hotel
  AND us.data_type = a.data_type
  AND us.year = a.year
  AND us.max_week = a.week
ORDER BY a.hotel, a.year, a.month_name, a.data_type;
`;

// All years + hotel filter: $1=currency, $2=hotels[]
const SQL_ALL_FILTERED = `
WITH ultimos_snapshots AS (
  SELECT hotel, data_type, year, MAX(week) AS max_week
  FROM at_a_glance.aag
  WHERE hotel = ANY($2::text[])
  GROUP BY hotel, data_type, year
)
SELECT
  a.hotel,
  a.year                          AS year,
  a.month_name                        AS month,
  a.data_type                         AS scenario,
  a.company,
  a.complex_name                      AS complex,
  a.exchange_rate                     AS fx_rate,
  COALESCE(a.rooms, 0)                AS rooms,
  COALESCE(a.availability, 0)         AS availability,
  a.rooms_sold,
  a.rooms_comp,
  CASE WHEN $1 = 'Local' THEN a.rooms_revenue_local                ELSE a.rooms_revenue                END AS rooms_revenue,
  CASE WHEN $1 = 'Local' THEN a.club_maintenance_fee_local         ELSE a.club_maintenance_fee         END AS club_maint_fee,
  CASE WHEN $1 = 'Local' THEN a.timeshare_maintenance_fee_local    ELSE a.timeshare_maintenance_fee    END AS timeshare_maint_fee,
  CASE WHEN $1 = 'Local' THEN a.other_revenue_local                ELSE a.other_revenue                END AS other_revenue,
  CASE WHEN $1 = 'Local' THEN a.departmental_expenses_local        ELSE a.departmental_expenses        END AS departmental_expenses,
  CASE WHEN $1 = 'Local' THEN a.undistributed_expenses_local       ELSE a.undistributed_expenses       END AS undistributed_expenses,
  CASE WHEN $1 = 'Local' THEN a.other_expenses_local               ELSE a.other_expenses               END AS other_expenses,
  CASE WHEN $1 = 'Local' THEN a.non_operating_local                ELSE a.non_operating                END AS non_operating,
  a.number_of_guests                  AS guests,
  a.number_of_paying_guests           AS paying_guests
FROM at_a_glance.aag a
JOIN ultimos_snapshots us
  ON us.hotel = a.hotel
  AND us.data_type = a.data_type
  AND us.year = a.year
  AND us.max_week = a.week
ORDER BY a.hotel, a.year, a.month_name, a.data_type;
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

    if (!yearParam) {
      return NextResponse.json({ error: "year is required" }, { status: 400 });
    }
    if (currencyParam !== "USD" && currencyParam !== "Local") {
      return NextResponse.json({ error: "currency must be USD or Local" }, { status: 400 });
    }

    const allowedHotels = await getPnlAllowedHotels(session.user.email);

    // User has no pnl access at all → empty result
    if (allowedHotels !== null && allowedHotels.length === 0) {
      return NextResponse.json([]);
    }

    const isAll = yearParam === "all";
    let result;

    if (isAll) {
      result = allowedHotels
        ? await pool.query(SQL_ALL_FILTERED, [currencyParam, allowedHotels])
        : await pool.query(SQL_ALL, [currencyParam]);
    } else {
      const year = Number(yearParam);
      if (!Number.isInteger(year)) {
        return NextResponse.json({ error: "year must be 'all' or an integer" }, { status: 400 });
      }
      result = allowedHotels
        ? await pool.query(SQL_YEAR_FILTERED, [year, currencyParam, allowedHotels])
        : await pool.query(SQL_YEAR, [year, currencyParam]);
    }

    const rows: ForecastRow[] = result.rows.map((r) => ({
      hotel: r.hotel,
      year: Number(r.year),
      month: r.month,
      ytd: "MTD" as const,
      scenario: r.scenario,
      company: r.company,
      complex: r.complex,
      fxRate: asNum(r.fx_rate),
      rooms: Number(r.rooms),
      availability: Number(r.availability),
      reportingCurrency: currencyParam as "USD" | "Local",
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
    console.error("AAG forecast-rows API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
