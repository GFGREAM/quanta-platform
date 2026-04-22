import { NextResponse } from "next/server";
import { ConfidentialClientApplication } from "@azure/msal-node";

const DATASET_ID = process.env.POWERBI_DATASET_ID || "";

const REVENUE = "[Total Rev$]";
const EXPENSES = "[Total Exp$]";
const GOP = "[GOP$]";
const EBITDA = "[EBITDA$]";

function getMsalClient() {
  return new ConfidentialClientApplication({
    auth: {
      clientId: process.env.POWERBI_CLIENT_ID || "",
      clientSecret: process.env.POWERBI_CLIENT_SECRET || "",
      authority: `https://login.microsoftonline.com/${process.env.POWERBI_TENANT_ID || ""}`,
    },
  });
}

function buildBaseFiltersMultiMonth(hotels: string[], months: string[]): string[] {
  const filters: string[] = [];
  if (hotels.length === 1) {
    filters.push(`'AAG'[Hotel] = "${hotels[0]}"`);
  } else if (hotels.length > 1) {
    const quoted = hotels.map((h) => `"${h}"`).join(", ");
    filters.push(`'AAG'[Hotel] IN {${quoted}}`);
  }
  if (months.length === 1) {
    filters.push(`'Date Table'[Month Name] = "${months[0]}"`);
  } else if (months.length > 1) {
    const quoted = months.map((m) => `"${m}"`).join(", ");
    filters.push(`'Date Table'[Month Name] IN {${quoted}}`);
  }
  return filters;
}

function joinFilters(base: string[], year: string | null, data: string, metric: string): string {
  const filters = [...base];
  if (year && year !== "All") {
    filters.push(`'Date Table'[Year] = ${year}`);
  }
  filters.push(`'AAG'[Data] = "${data}"`);
  filters.push(`'AAG'[Week Rank] = 1`);
  filters.push(`'Currency Slicer'[Currency] = "${metric}"`);
  return filters.join(", ");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelParam = searchParams.get("hotel");
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const metric = searchParams.get("metric") || "USD";

    const hotels = hotelParam ? hotelParam.split(",").filter(Boolean) : [];
    const months = month ? month.split(",").filter(Boolean) : [];

    const base = buildBaseFiltersMultiMonth(hotels, months);
    const outlookFilters = joinFilters(base, year, "Outlook", metric);
    const budgetFilters = joinFilters(base, year, "Budget", metric);

    const lyYear = year && year !== "All" ? String(Number(year) - 1) : null;
    const lyFilters = joinFilters(base, lyYear, "Outlook", metric);

    const query = `EVALUATE ROW(
  "Revenue", CALCULATE(${REVENUE}, ${outlookFilters}),
  "Expenses", CALCULATE(${EXPENSES}, ${outlookFilters}),
  "GOP", CALCULATE(${GOP}, ${outlookFilters}),
  "EBITDA", CALCULATE(${EBITDA}, ${outlookFilters}),
  "Revenue_Budget", CALCULATE(${REVENUE}, ${budgetFilters}),
  "Expenses_Budget", CALCULATE(${EXPENSES}, ${budgetFilters}),
  "GOP_Budget", CALCULATE(${GOP}, ${budgetFilters}),
  "EBITDA_Budget", CALCULATE(${EBITDA}, ${budgetFilters}),
  "Revenue_LY", CALCULATE(${REVENUE}, ${lyFilters}),
  "Expenses_LY", CALCULATE(${EXPENSES}, ${lyFilters}),
  "GOP_LY", CALCULATE(${GOP}, ${lyFilters}),
  "EBITDA_LY", CALCULATE(${EBITDA}, ${lyFilters})
)`;

    const cca = getMsalClient();
    const tokenResponse = await cca.acquireTokenByClientCredential({
      scopes: ["https://analysis.windows.net/powerbi/api/.default"],
    });

    if (!tokenResponse?.accessToken) {
      return NextResponse.json({ error: "Failed to acquire token" }, { status: 500 });
    }

    const response = await fetch(
      `https://api.powerbi.com/v1.0/myorg/datasets/${DATASET_ID}/executeQueries`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queries: [{ query }],
          serializerSettings: { includeNulls: true },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DAX query error:", errorText);
      return NextResponse.json({ error: "DAX query failed" }, { status: 500 });
    }

    const result = await response.json();
    const row = result.results[0].tables[0].rows[0];

    return NextResponse.json({
      revenue: row["[Revenue]"],
      expenses: row["[Expenses]"],
      gop: row["[GOP]"],
      ebitda: row["[EBITDA]"],
      revenue_budget: row["[Revenue_Budget]"],
      expenses_budget: row["[Expenses_Budget]"],
      gop_budget: row["[GOP_Budget]"],
      ebitda_budget: row["[EBITDA_Budget]"],
      revenue_ly: row["[Revenue_LY]"],
      expenses_ly: row["[Expenses_LY]"],
      gop_ly: row["[GOP_LY]"],
      ebitda_ly: row["[EBITDA_LY]"],
    });
  } catch (error) {
    console.error("KPIs API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";