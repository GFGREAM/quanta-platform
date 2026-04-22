"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { DollarSign, Info } from "lucide-react";
import type { PowerBIFilter } from "@/components/powerbi/PowerBIEmbed";
import { POWERBI_REPORTS } from "@/lib/powerbi-config";

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

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027] as const;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const METRICS = ["USD", "Local"] as const;

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
    <span className="text-base font-medium" style={{ color: isGood ? "#10B981" : "#EF4444" }}>
      {v.pct} <span className="font-normal" style={{ color: "var(--text-secondary)" }}>{label}</span>
    </span>
  );
}

function KpiCard({
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

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (string | number)[];
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: "#475569" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-3 pr-8 rounded-md border text-sm bg-white appearance-none cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
        style={{
          borderColor: "var(--border)",
          color: "var(--primary)",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23172951' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 8px center",
        }}
      >
        {options.map((opt) => (
          <option key={String(opt)} value={String(opt)}>
            {String(opt)}
          </option>
        ))}
      </select>
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allSelected = selected.length === options.length;

  function toggleAll() {
    onChange(allSelected ? [] : [...options]);
  }

  function toggleItem(item: string) {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  }

  const displayText = selected.length === 0 ? "All" : `${selected.length} selected`;

  return (
    <div className="flex flex-col gap-1 relative" ref={ref}>
      <label className="text-xs font-medium" style={{ color: "#475569" }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-9 px-3 pr-8 rounded-md border text-sm bg-white text-left cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
        style={{
          borderColor: "var(--border)",
          color: "var(--primary)",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23172951' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 8px center",
        }}
      >
        {displayText}
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-50 min-w-[180px] max-h-60 overflow-y-auto"
          style={{ borderColor: "var(--border)" }}
        >
          <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b" style={{ borderColor: "var(--border)", color: "var(--primary)" }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="accent-[var(--accent)]"
            />
            {allSelected ? "Clear" : "Select all"}
          </label>
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50"
              style={{ color: "var(--primary)" }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggleItem(opt)}
                className="accent-[var(--accent)]"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardHome() {
  const [selectedHotels, setSelectedHotels] = useState<string[]>([]);
  const [year, setYear] = useState("2026");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [metric, setMetric] = useState("USD");
  const emptyKpis: KpiData = { revenue: null, expenses: null, gop: null, ebitda: null, revenue_budget: null, expenses_budget: null, gop_budget: null, ebitda_budget: null, revenue_ly: null, expenses_ly: null, gop_ly: null, ebitda_ly: null };
  const [kpis, setKpis] = useState<KpiData>(emptyKpis);
  const [kpisLoading, setKpisLoading] = useState(false);

  const showLocalNote = metric === "Local" && selectedHotels.length === 0;
  const effectiveMetric = metric === "Local" && selectedHotels.length > 0 ? "Local" : "USD";

  const fetchKpis = useCallback(async (signal: AbortSignal) => {
    const params = new URLSearchParams();
    if (selectedHotels.length > 0) params.set("hotel", selectedHotels.join(","));
    params.set("year", year);
    if (selectedMonths.length > 0) params.set("month", selectedMonths.join(","));
    params.set("metric", effectiveMetric);

    try {
      const res = await fetch(`/api/kpis?${params.toString()}`, { signal });
      const data = await res.json();
      if (!signal.aborted) setKpis(data);
    } catch {
      if (!signal.aborted) setKpis(emptyKpis);
    }
  }, [selectedHotels, year, selectedMonths, effectiveMetric]);

  useEffect(() => {
    const controller = new AbortController();
    setKpisLoading(true);
    fetchKpis(controller.signal).finally(() => {
      if (!controller.signal.aborted) setKpisLoading(false);
    });
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
      target: { table: "Date Table", column: "Year" },
      operator: "In",
      values: [Number(year)],
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
  }, [selectedHotels, year, selectedMonths, metric]);

  return (
    <div className="p-6">
      {/* Header + Filters row */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--primary)" }}>
            At a Glance
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Performance Dashboard Summary
          </p>
        </div>
        <div className="grid grid-cols-2 md:flex md:flex-wrap items-end gap-3">
          <MultiSelect label="Hotel" options={HOTELS} selected={selectedHotels} onChange={setSelectedHotels} />
          <FilterSelect label="Year" value={year} options={YEARS} onChange={setYear} />
          <MultiSelect label="Month" options={MONTHS} selected={selectedMonths} onChange={setSelectedMonths} />
          <FilterSelect label="Metric" value={metric} options={METRICS} onChange={setMetric} />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {KPI_CONFIG.map(({ key, label, color, invertColor }) => (
          <KpiCard
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <PowerBIEmbed
          workspaceId={POWERBI_REPORTS.home.workspaceId}
          reportId={POWERBI_REPORTS.home.reportId}
          filters={filters}
        />
      </div>
      <p className="text-xs text-center mt-2" style={{ color: "var(--text-secondary)" }}>
        {new Date().getFullYear()} GFG Asset Management. All Rights Reserved. CONFIDENTIAL &amp; PROPRIETARY. May not be reproduced or distributed without written permission.
      </p>
    </div>
  );
}
