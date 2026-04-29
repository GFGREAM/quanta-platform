import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

interface DimensionsResponse {
  years: number[];
  hotels: string[];
}

const EMPTY_DIMENSIONS: DimensionsResponse = {
  years: [],
  hotels: [],
};

// Query: lista todos los años (cualquier data_type) y todos los hoteles
// distintos presentes en at_a_glance.aag. Una sola pasada con dos CTEs.
const SQL = `
WITH years AS (
  SELECT DISTINCT year_num AS y
  FROM at_a_glance.aag
  ORDER BY y
),
hotels AS (
  SELECT DISTINCT hotel AS h
  FROM at_a_glance.aag
  ORDER BY h
)
SELECT
  (SELECT array_agg(y ORDER BY y) FROM years) AS years,
  (SELECT array_agg(h ORDER BY h) FROM hotels) AS hotels;
`;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const result = await pool.query(SQL);

    if (result.rows.length === 0) {
      return NextResponse.json(EMPTY_DIMENSIONS);
    }

    const row = result.rows[0];
    const payload: DimensionsResponse = {
      years: (row.years ?? []).map((y: string | number) => Number(y)),
      hotels: row.hotels ?? [],
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("AAG dimensions API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
