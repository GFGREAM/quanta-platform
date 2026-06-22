"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { DollarSign, Info } from "lucide-react";
import type { PowerBIFilter } from "@/components/powerbi/PowerBIEmbed";
import { POWERBI_REPORTS } from "@/lib/powerbi-config";
import { selectStyle } from "@/lib/selectStyle";
import { MultiSelect } from "@/components/ui/MultiSelect";
import EbitdaBridge from "./EbitdaBridge";
import CompositeCharts from "./CompositeCharts";
import OperatingKpisTable from "./OperatingKpisTable";

const PowerBIEmbed = dynamic(
  () => import("@/components/powerbi/PowerBIEmbed"),
  { ssr: false }
);

const HOTELS = [
  "Almare Isla Mujeres",
  "Casa Dorada",
  "Dreams Aventuras",
  "Dreams Karibana",
  "Dreams Vista",
  "Grand Hyatt",
  "Hacienda del Mar Club",
  "Hacienda del Mar Hotel",
  "HP Bogota",
  "Hyatt House Santa Fe",
  "Izla Hotel",
  "JW Cancun",
  "LC Solaz Club",
  "LC Solaz Hotel",
  "MI Cancun",
  "Secrets & Dreams BM",
  "St Regis Mexico",
  "Waldorf Astoria Costa Rica",
  "Zoetry Marigot Bay",
];

const YEARS = [2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018] as const;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const METRICS = ["USD", "Local"] as const;

const COMP_SETS = ["CS1", "CS2", "CS3", "CS4", "CS5"] as const;

const BASIC_SCHEMA = "http://powerbi.com/product/schema#basic";

interface KpiData {
  revenue: number | null;
  expenses: number | null;
  gop: number | null;
  ebitda: number | null;
  revenue_budget: number | null;
  expenses_budget: number | null;
  gop_budget: number | null;
  ebitda_budget: number | null;
  revenue_ly: number | null;
  expenses_ly: number | null;
  gop_ly: number | null;
  ebitda_ly: number | null;
}

const EMPTY_KPIS: KpiData = { revenue: null, expenses: null, gop: null, ebitda: null, revenue_budget: null, expenses_budget: null, gop_budget: null, ebitda_budget: null, revenue_ly: null, expenses_ly: null, gop_ly: null, ebitda_ly: null };

function formatValue(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

type KpiKey = "revenue" | "expenses" | "gop" | "ebitda";

const KPI_CONFIG: { key: KpiKey; label: string; color: string; invertColor?: boolean }[] = [
  { key: "revenue", label: "Revenue", color: "#00AFAD" },
  { key: "expenses", label: "Expenses", color: "#EF4444", invertColor: true },
  { key: "gop", label: "GOP", color: "#00AFAD" },
  { key: "ebitda", label: "EBITDA", color: "#00AFAD" },
];

function calcVariance(actual: number | null, compare: number | null): { pct: string; positive: boolean } | null {
  if (!actual || !compare) return null;
  const pct = ((actual - compare) / Math.abs(compare)) * 100;
  return { pct: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

function VarianceBadge({ label, actual, compare, loading, invert }: { label: string; actual: number | null; compare: number | null; loading: boolean; invert?: boolean }) {
  if (loading) return <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />;
  const v = calcVariance(actual, compare);
  if (!v) return <span className="text-base" style={{ color: "#9CA3AF" }}>N/A <span className="font-normal">{label}</span></span>;
  const isGood = invert ? !v.positive : v.positive;
  return (
    <span className="text-base font-medium" style={{ color: isGood ? "var(--success)" : "var(--danger)" }}>
      {v.pct} <span className="font-normal" style={{ color: "var(--text-secondary)" }}>{label}</span>
    </span>
  );
}

function HomeKpiCard({
  label,
  value,
  budget,
  ly,
  color,
  loading,
  invertColor,
}: {
  label: string;
  value: number | null;
  budget: number | null;
  ly: number | null;
  color: string;
  loading: boolean;
  invertColor?: boolean;
}) {
  return (
    <div
      className="bg-white rounded-lg border px-6 py-5 transition-shadow hover:shadow-md"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Row 1: Label + Icon */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-base font-medium" style={{ color: "var(--text-secondary)" }}>
          {label}
        </p>
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
          style={{ backgroundColor: `${color}1A` }}
        >
          <DollarSign size={16} color={color} />
        </div>
      </div>
      {/* Row 2: Value */}
      {loading ? (
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-3" />
      ) : (
        <p className="text-2xl font-bold truncate mb-3" style={{ color: "var(--primary)" }}>
          {formatValue(value)}
        </p>
      )}
      {/* Row 3: Variances */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--border)" }}>
        <VarianceBadge label="vs plan" actual={value} compare={budget} loading={loading} invert={invertColor} />
        <VarianceBadge label="vs LY" actual={value} compare={ly} loading={loading} invert={invertColor} />
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const [selectedHotels, setSelectedHotels] = useState<string[]>([]);
  const [compSet, setCompSet] = useState("CS1");
  const [selectedYears, setSelectedYears] = useState<string[]>(["2026"]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [metric, setMetric] = useState("USD");
  const [kpis, setKpis] = useState<KpiData>(EMPTY_KPIS);
  const [kpisLoading, setKpisLoading] = useState(false);
  const oktRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState<number | undefined>();

  useEffect(() => {
    const el = oktRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setRowHeight(el.offsetHeight));
    ro.observe(el);
    setRowHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  const showLocalNote = metric === "Local" && selectedHotels.length === 0;
  const effectiveMetric = metric === "Local" && selectedHotels.length > 0 ? "Local" : "USD";

  const fetchKpis = useCallback(async (signal: AbortSignal) => {
    setKpisLoading(true);
    const params = new URLSearchParams();
    if (selectedHotels.length > 0) params.set("hotel", selectedHotels.join(","));
    if (selectedYears.length > 0) params.set("year", selectedYears.join(","));
    if (selectedMonths.length > 0) params.set("month", selectedMonths.join(","));
    params.set("metric", effectiveMetric);

    try {
      const res = await fetch(`/api/kpis?${params.toString()}`, { signal });
      const data = await res.json();
      if (!signal.aborted) setKpis(data);
    } catch {
      if (!signal.aborted) setKpis(EMPTY_KPIS);
    } finally {
      if (!signal.aborted) setKpisLoading(false);
    }
  }, [selectedHotels, selectedYears, selectedMonths, effectiveMetric]);

  useEffect(() => {
    const controller = new AbortController();
    fetchKpis(controller.signal);
    return () => controller.abort();
  }, [fetchKpis]);

  const filters = useMemo(() => {
    const f: PowerBIFilter[] = [];

    if (selectedHotels.length > 0) {
      f.push({
        $schema: BASIC_SCHEMA,
        target: { table: "AAG", column: "Hotel" },
        operator: "In",
        values: selectedHotels,
      });
    }

    f.push({
      $schema: BASIC_SCHEMA,
      target: { table: "Market Share", column: "Comp Set" },
      operator: "In",
      values: [compSet],
    });

    f.push({
      $schema: BASIC_SCHEMA,
      target: { table: "Date Table", column: "Year" },
      operator: "In",
      values: selectedYears.map(Number),
    });

    if (selectedMonths.length > 0) {
      f.push({
        $schema: BASIC_SCHEMA,
        target: { table: "Date Table", column: "Month Name" },
        operator: "In",
        values: selectedMonths,
      });
    }

    f.push({
      $schema: BASIC_SCHEMA,
      target: { table: "Currency Slicer", column: "Metric" },
      operator: "In",
      values: [metric],
    });

    return f;
  }, [selectedHotels, compSet, selectedYears, selectedMonths, metric]);

  return (
    <div className="p-6 pb-0">
      {/* Header + Filters row — patrón StatementDesktop */}
      <div className="mb-3">
        <h1 className="text-2xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
          At a Glance
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Performance Dashboard Summary
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <MultiSelect
          options={HOTELS}
          selected={selectedHotels}
          onChange={setSelectedHotels}
          width="14rem"
          placeholder="All hotels"
          noun="hotels"
        />
        <MultiSelect
          options={YEARS.map(String)}
          selected={selectedYears}
          onChange={setSelectedYears}
          width="7.5rem"
          placeholder="All years"
          noun="years"
        />
        <MultiSelect
          options={MONTHS}
          selected={selectedMonths}
          onChange={setSelectedMonths}
          width="7.5rem"
          placeholder="All months"
          noun="months"
        />
        <select
          className="h-9 w-24 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={selectStyle}
          value={compSet}
          onChange={(e) => setCompSet(e.target.value)}
        >
          {COMP_SETS.map((cs) => <option key={cs} value={cs}>{cs}</option>)}
        </select>
        <div className="flex rounded-lg p-[3px] gap-0.5" style={{ background: 'var(--muted)' }}>
          {METRICS.map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1.5 rounded-md text-[0.75rem] font-medium border-none cursor-pointer transition-all ${metric === m ? 'bg-white shadow-sm' : 'bg-transparent'}`}
              style={{ color: metric === m ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      {showLocalNote && (
        <div className="flex items-center gap-1.5 mb-4">
          <Info size={14} style={{ color: "var(--text-secondary)" }} />
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            KPIs shown in USD. Select a specific hotel to view values in local currency.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        {KPI_CONFIG.map(({ key, label, color, invertColor }) => (
          <HomeKpiCard
            key={key}
            label={label}
            value={kpis[key]}
            budget={kpis[`${key}_budget` as keyof KpiData]}
            ly={kpis[`${key}_ly` as keyof KpiData]}
            color={color}
            loading={kpisLoading}
            invertColor={invertColor}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-2 items-start">
        <div className="flex flex-col gap-4" style={rowHeight ? { height: rowHeight } : {}}>
          <div className="flex-1 min-h-0">
            <EbitdaBridge
              selectedHotels={selectedHotels}
              selectedMonths={selectedMonths}
              year={selectedYears[0] ?? "2026"}
              metric={metric as "USD" | "Local"}
            />
          </div>
          <div style={{ height: 196, flexShrink: 0 }}>
            <CompositeCharts
              selectedHotels={selectedHotels}
              selectedMonths={selectedMonths}
              year={selectedYears[0] ?? "2026"}
              metric={metric as "USD" | "Local"}
            />
          </div>
        </div>
        <div ref={oktRef}>
          <OperatingKpisTable
            selectedHotels={selectedHotels}
            selectedMonths={selectedMonths}
            year={selectedYears[0] ?? "2026"}
            compSet={compSet}
            metric={metric as "USD" | "Local"}
          />
        </div>
      </div>
      {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <PowerBIEmbed
          workspaceId={POWERBI_REPORTS.home.workspaceId}
          reportId={POWERBI_REPORTS.home.reportId}
          filters={filters}
        />
      </div> */}
    </div>
  );
}
