import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getPnlAllowedHotels } from "../permissions";

interface DimensionsResponse {
  years: number[];
  hotels: string[];
  weeks: string[];
}

const EMPTY_DIMENSIONS: DimensionsResponse = {
  years: [],
  hotels: [],
  weeks: [],
};

const SQL = `
WITH years AS (
  SELECT DISTINCT year AS y
  FROM at_a_glance.aag
  ORDER BY y
),
hotels AS (
  SELECT DISTINCT hotel AS h
  FROM at_a_glance.aag
  ORDER BY h
),
weeks AS (
  SELECT DISTINCT to_char(week, 'YYYY-MM-DD') AS w
  FROM at_a_glance.aag
  ORDER BY w
)
SELECT
  (SELECT array_agg(y ORDER BY y) FROM years) AS years,
  (SELECT array_agg(h ORDER BY h) FROM hotels) AS hotels,
  (SELECT array_agg(w ORDER BY w) FROM weeks) AS weeks;
`;

const SQL_FILTERED = `
WITH years AS (
  SELECT DISTINCT year AS y
  FROM at_a_glance.aag
  WHERE hotel = ANY($1::text[])
  ORDER BY y
),
hotels AS (
  SELECT DISTINCT hotel AS h
  FROM at_a_glance.aag
  WHERE hotel = ANY($1::text[])
  ORDER BY h
),
weeks AS (
  SELECT DISTINCT to_char(week, 'YYYY-MM-DD') AS w
  FROM at_a_glance.aag
  WHERE hotel = ANY($1::text[])
  ORDER BY w
)
SELECT
  (SELECT array_agg(y ORDER BY y) FROM years) AS years,
  (SELECT array_agg(h ORDER BY h) FROM hotels) AS hotels,
  (SELECT array_agg(w ORDER BY w) FROM weeks) AS weeks;
`;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const allowedHotels = await getPnlAllowedHotels(session.user.email);

    // User has no pnl access at all
    if (allowedHotels !== null && allowedHotels.length === 0) {
      return NextResponse.json(EMPTY_DIMENSIONS);
    }

    const result = allowedHotels
      ? await pool.query(SQL_FILTERED, [allowedHotels])
      : await pool.query(SQL);

    if (result.rows.length === 0) {
      return NextResponse.json(EMPTY_DIMENSIONS);
    }

    const row = result.rows[0];
    const payload: DimensionsResponse = {
      years: (row.years ?? []).map((y: string | number) => Number(y)),
      hotels: row.hotels ?? [],
      weeks: row.weeks ?? [],
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("AAG dimensions API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
