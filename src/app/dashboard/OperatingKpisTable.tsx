"use client";

type FmtType = "num" | "pct" | "usd" | "mxn";
type VsType  = "abs" | "pct" | "pp"  | "ph";

interface KpiRowDef {
  label:     string;
  fmt:       FmtType;
  vsType:    VsType;
  bad:       boolean;
  lm:        number;   // localMultiplier (placeholder only — see NOTE below)
  exch:      boolean;
  noActual?: boolean;  // hides the Actual cell (e.g. Flow Thru — no direct value, only variance)
  actual:    number;
  plan:      number;
  ly:        number;
}

// NOTE: lm is only used for placeholder visual differentiation between USD and Local.
// In production, monetary metrics in Local come from Non Converted columns in PostgreSQL
// (pre-calculated per hotel). Do NOT multiply in the frontend.

// TODO: replace all hardcoded values with PostgreSQL queries filtered by hotel/month/year
const KPI_ROWS: KpiRowDef[] = [
  // TODO: SUM(guests) / nights_sold
  { label: "Guests POR",                         fmt: "num", vsType: "abs", bad: false, lm: 1,    exch: false, actual: 1.85,  plan: 1.90,  ly: 1.80  },
  // TODO: rooms_sold / rooms_available
  { label: "OCC%",                               fmt: "pct", vsType: "pct", bad: false, lm: 1,    exch: false, actual: 72.3,  plan: 75.0,  ly: 70.1  },
  // TODO USD: SUM(AAG."Rooms Revenue") / rooms_sold  |  Local: "Rooms Revenue Non Converted" / rooms_sold
  { label: "ADR",                                fmt: "usd", vsType: "pct", bad: false, lm: 17.2, exch: false, actual: 185.5, plan: 180.0, ly: 175.0 },
  // TODO USD: SUM(AAG."Rooms Revenue") / rooms_available  |  Local: "Rooms Revenue Non Converted" / rooms_available
  { label: "RevPAR",                             fmt: "usd", vsType: "pct", bad: false, lm: 17.2, exch: false, actual: 134.1, plan: 135.0, ly: 122.8 },
  // TODO USD: total_rev / guests  |  Local: total_rev_nc / guests
  { label: "Total Rev$ per Guest",               fmt: "usd", vsType: "pct", bad: false, lm: 17.2, exch: false, actual: 280.5, plan: 275.0, ly: 265.0 },
  // TODO USD: total_exp / guests  |  Local: total_exp_nc / guests
  { label: "Total Exp$ per Guest",               fmt: "usd", vsType: "pct", bad: true,  lm: 17.2, exch: false, actual: 220.3, plan: 210.0, ly: 215.0 },
  // TODO USD: total_profit / guests  |  Local: total_profit_nc / guests
  { label: "Total Profit$ per Guest",            fmt: "usd", vsType: "pct", bad: false, lm: 17.2, exch: false, actual: 60.2,  plan: 65.0,  ly: 50.0  },
  // TODO: payroll / total_revenue (same in USD and Local as it's a margin)
  { label: "Payroll Margin%",                    fmt: "pct", vsType: "pp",  bad: true,  lm: 1,    exch: false, actual: 28.5,  plan: 27.0,  ly: 29.2  },
  // TODO: gop / total_revenue
  { label: "GOP Margin% (pp%)",                  fmt: "pct", vsType: "pp",  bad: false, lm: 1,    exch: false, actual: 14.7,  plan: 16.2,  ly: 13.8  },
  // TODO: ebitda / total_revenue
  { label: "EBITDA Margin% (pp%)",               fmt: "pct", vsType: "pp",  bad: false, lm: 1,    exch: false, actual: 1.0,   plan: 2.5,   ly: 1.2   },
  // TODO: (actual_gop - budget_gop) / (actual_rev - budget_rev)
  { label: "Flow Thru (Flex%)",                  fmt: "pct", vsType: "pp",  bad: false, lm: 1,    exch: false, noActual: true, actual: 18.5,  plan: 20.0,  ly: 17.0  },
  // TODO: hotel_revpar / compset_revpar (from Market Share table)
  { label: "Market Share Penetration%",          fmt: "pct", vsType: "pct", bad: false, lm: 1,    exch: false, actual: 105.2, plan: 103.0, ly: 101.8 },
  // TODO: guest_satisfaction_score (survey data)
  { label: "Guest Satisfaction Score",           fmt: "num", vsType: "abs", bad: false, lm: 1,    exch: false, actual: 8.40,  plan: 8.50,  ly: 8.20  },
  // TODO: hotel_occ / compset_occ (from Market Share table)
  { label: "Rooms Demand Penetration% (vs 100%)", fmt: "pct", vsType: "pct", bad: false, lm: 1,   exch: false, actual: 98.3,  plan: 100.0, ly: 96.5  },
  // TODO: hotel_revpar_index / compset_revpar_index (from Market Share table)
  { label: "GOP Penetration% (vs 100%)",         fmt: "pct", vsType: "pct", bad: false, lm: 1,    exch: false, actual: 112.4, plan: 110.0, ly: 108.0 },
  // TODO: AAG."Exchange Rate$" — single hotel only; show '—' when multiple hotels selected
  { label: "Exchange Rate$",                     fmt: "mxn", vsType: "pct", bad: false, lm: 1,    exch: true,  actual: 17,    plan: 16,    ly: 18    },
];

function fmtActual(value: number, fmt: FmtType): string {
  switch (fmt) {
    case "num": return value.toFixed(2);
    case "pct": return value.toFixed(1) + "%";
    case "usd": return "$" + value.toFixed(1);
    case "mxn": return "$" + Math.round(value).toLocaleString("en-US");
  }
}

type PillProps = { actual: number; compare: number; vsType: VsType; bad: boolean };

function VariancePill({ actual, compare, vsType, bad }: PillProps) {
  if (vsType === "ph") {
    return <span style={{ color: "var(--text-secondary)" }}>—</span>;
  }

  let display = "";
  let diff = 0;

  if (vsType === "abs") {
    diff = actual - compare;
    display = (diff >= 0 ? "+" : "") + diff.toFixed(1);
  } else if (vsType === "pct") {
    const pct = ((actual - compare) / Math.abs(compare)) * 100;
    diff = pct;
    display = (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
  } else if (vsType === "pp") {
    diff = actual - compare;
    display = (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%";
  }

  const isGood  = diff === 0 ? null : (bad ? diff < 0 : diff > 0);
  const bg      = isGood === null ? "var(--muted)"             : isGood ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)";
  const color   = isGood === null ? "var(--text-secondary)"    : isGood ? "#10B981"               : "#EF4444";

  return (
    <span
      className="inline-block px-1 py-[1px] rounded-sm text-[0.625rem] font-medium"
      style={{ background: bg, color }}
    >
      {display}
    </span>
  );
}

type Props = {
  selectedHotels: string[];
  metric: "USD" | "Local";
};

export default function OperatingKpisTable({ selectedHotels, metric }: Props) {
  const singleHotel = selectedHotels.length === 1;

  return (
    <div className="bg-white rounded-xl border flex flex-col" style={{ borderColor: "var(--border)" }}>
      <div className="border-b" style={{ borderColor: "var(--border)" }}>
        <table className="w-full" style={{ tableLayout: "fixed", borderCollapse: "collapse" }}>
          <colgroup>
            <col style={{ width: "46%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="px-3 py-2 text-left">
                <span className="text-[0.8125rem] font-semibold" style={{ color: "var(--primary)" }}>
                  Operating KPIs
                </span>
              </th>
              {["Actual", "vs Plan", "vs Last Year"].map((h) => (
                <th key={h} className="px-3 py-2 text-right">
                  <span className="text-[0.625rem] uppercase tracking-wider font-semibold whitespace-nowrap"
                    style={{ color: "var(--text-secondary)" }}>
                    {h}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>
      <div className="overflow-auto">
        <table className="w-full" style={{ tableLayout: "fixed", borderCollapse: "collapse" }}>
          <colgroup>
            <col style={{ width: "46%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
          </colgroup>
          <tbody>
            {KPI_ROWS.map((row) => {
              // Exchange Rate$ rule: show '—' when not exactly 1 hotel selected
              const exchHide = row.exch && !singleHotel;

              // Placeholder-only scale factor. In production, actual/plan/ly must come
              // from the correct currency columns in PostgreSQL — do NOT multiply here.
              // TODO: remove `lm` and `f` once DB queries supply pre-converted values.
              const f = metric === "Local" ? row.lm : 1;
              const scaledActual = row.actual * f;
              const scaledPlan   = row.plan   * f;
              const scaledLy     = row.ly     * f;

              const displayVal = exchHide || row.noActual
                ? "—"
                : fmtActual(scaledActual, row.fmt);

              return (
                <tr
                  key={row.label}
                  className="hover:bg-[var(--bg-hover)] transition-colors"
                  style={{ borderBottom: "1px solid var(--border-light)" }}
                >
                  <td className="px-3 py-[3px] text-[0.625rem] whitespace-nowrap" style={{ color: "var(--primary)" }}>
                    {row.label}
                  </td>
                  <td className="px-3 py-[3px] text-right text-[0.625rem] font-medium" style={{ color: "var(--primary)" }}>
                    {displayVal}
                  </td>
                  <td className="px-3 py-[3px] text-right">
                    {exchHide ? (
                      <span style={{ color: "var(--text-secondary)" }}>—</span>
                    ) : (
                      <VariancePill actual={scaledActual} compare={scaledPlan} vsType={row.vsType} bad={row.bad} />
                    )}
                  </td>
                  <td className="px-3 py-[3px] text-right">
                    {exchHide ? (
                      <span style={{ color: "var(--text-secondary)" }}>—</span>
                    ) : (
                      <VariancePill actual={scaledActual} compare={scaledLy} vsType={row.vsType} bad={row.bad} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
