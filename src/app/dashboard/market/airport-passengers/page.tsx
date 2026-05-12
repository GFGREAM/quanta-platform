'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import KpiCard from '@/components/ui/KpiCard';
import { selectStyle } from '@/lib/selectStyle';
import {
  AVAILABLE_YEARS, DESTINATIONS, MONTHS, PASSENGER_ROWS,
  fmtPax, fmtVarPct,
  type Destination,
} from './data';

const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_MONTH = TODAY.getMonth() + 1;

// Default selection: current year + previous year overlaid for YoY comparison.
const DEFAULT_YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR].filter((y) => AVAILABLE_YEARS.includes(y));
const ALL_MONTHS = MONTHS.map((_, i) => i + 1);
// Prefer Los Cabos as the initial destination (matches the GFG hotel
// portfolio) and fall back to the first available one if not present.
const DEFAULT_DESTINATION: Destination =
  DESTINATIONS.find((d) => d === 'Los Cabos') ?? DESTINATIONS[0];

const YEAR_STYLE = (y: number, mostRecent: number) => {
  if (y === mostRecent) return { stroke: 'var(--primary)', dash: undefined, width: 2.5 };
  if (y === mostRecent - 1) return { stroke: 'var(--accent)', dash: '6 4', width: 2 };
  return { stroke: 'var(--text-secondary)', dash: '2 4', width: 1.75 };
};

export default function AirportPassengersPage() {
  const [destination, setDestination] = useState<Destination>(DEFAULT_DESTINATION);
  const [selectedYears, setSelectedYears] = useState<number[]>(DEFAULT_YEARS);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(ALL_MONTHS);

  const sortedYears = useMemo(() => [...selectedYears].sort((a, b) => a - b), [selectedYears]);
  const focusYear = sortedYears.length ? sortedYears[sortedYears.length - 1] : CURRENT_YEAR;

  // KPI aggregates — most-recent selected year vs the year immediately before,
  // both filtered by the same set of months so the comparison is symmetric.
  const kpis = useMemo(() => {
    const sumFor = (year: number) =>
      PASSENGER_ROWS
        .filter((r) =>
          r.destination === destination
          && r.year === year
          && selectedMonths.includes(r.month),
        )
        .reduce((acc, r) => ({
          intl: acc.intl + r.international,
          dom: acc.dom + r.domestic,
        }), { intl: 0, dom: 0 });
    const cur = sumFor(focusYear);
    const ly = sumFor(focusYear - 1);
    return {
      cur: { intl: cur.intl, dom: cur.dom, total: cur.intl + cur.dom },
      ly:  { intl: ly.intl,  dom: ly.dom,  total: ly.intl + ly.dom },
    };
  }, [destination, focusYear, selectedMonths]);

  // Chart data — one row per month with a column per selected year, plus a
  // final row aggregating the selected months (labeled YTD/FY/Total).
  const chartData = useMemo(() => {
    type Row = Record<string, string | number | null>;
    const monthRows: Row[] = MONTHS.map((label, idx) => {
      const m = idx + 1;
      const row: Row = { month: label };
      for (const y of sortedYears) {
        if (!selectedMonths.includes(m)) {
          row[String(y)] = null;
          continue;
        }
        const hit = PASSENGER_ROWS.find((r) =>
          r.destination === destination && r.year === y && r.month === m,
        );
        row[String(y)] = hit ? hit.international + hit.domestic : null;
      }
      return row;
    });

    // When all 12 months are selected the chart already shows the full year;
    // a trailing FY column would be redundant, so we skip it. For partial
    // selections we append a "YTD" or "Total" aggregate.
    if (selectedMonths.length === 12) return monthRows;

    const aggLabel = aggregateLabel(selectedMonths, sortedYears);
    const aggRow: Row = { month: aggLabel };
    for (const y of sortedYears) {
      aggRow[String(y)] = PASSENGER_ROWS
        .filter((r) =>
          r.destination === destination
          && r.year === y
          && selectedMonths.includes(r.month),
        )
        .reduce((s, r) => s + r.international + r.domestic, 0);
    }
    return [...monthRows, aggRow];
  }, [destination, sortedYears, selectedMonths]);

  const toggleYear = (y: number) =>
    setSelectedYears((prev) => prev.includes(y) ? prev.filter((x) => x !== y) : [...prev, y]);
  const toggleMonth = (m: number) =>
    setSelectedMonths((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);

  const intlPct = fmtVarPct(kpis.cur.intl, kpis.ly.intl);
  const domPct = fmtVarPct(kpis.cur.dom, kpis.ly.dom);
  const totalPct = fmtVarPct(kpis.cur.total, kpis.ly.total);
  const subColorFor = (cur: number, ref: number) =>
    !ref ? 'var(--text-secondary)' : cur >= ref ? 'var(--success)' : 'var(--danger)';

  return (
    <div className="flex flex-col gap-5 font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif]" style={{ color: 'var(--text-primary)' }}>
      <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Market</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--primary)' }}>Airport Passengers</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
          Airport Passengers — {destination}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Monthly arrivals + departures, international and domestic
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Destination
          </label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value as Destination)}
            style={selectStyle}
            className="h-9 w-52 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          >
            {DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Year
          </label>
          <YearMultiSelect
            options={AVAILABLE_YEARS}
            selected={selectedYears}
            onToggle={toggleYear}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Months
          </label>
          <div className="flex gap-1 flex-wrap">
            {MONTHS.map((label, idx) => {
              const m = idx + 1;
              return (
                <PillToggle key={label} active={selectedMonths.includes(m)} onClick={() => toggleMonth(m)} width="w-11">
                  {label}
                </PillToggle>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedMonths(selectedMonths.length === 12 ? [] : ALL_MONTHS)}
              className="h-9 px-3 rounded-md border text-[0.75rem] font-medium cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              title={selectedMonths.length === 12 ? 'Clear all months' : 'Select all months'}
            >
              {selectedMonths.length === 12 ? 'Clear' : 'All'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 max-[720px]:grid-cols-1">
        <KpiCard
          label="International"
          value={fmtPax(kpis.cur.intl)}
          sub={`${intlPct} vs LY`}
          subColor={subColorFor(kpis.cur.intl, kpis.ly.intl)}
          color="var(--primary)"
        />
        <KpiCard
          label="Domestic"
          value={fmtPax(kpis.cur.dom)}
          sub={`${domPct} vs LY`}
          subColor={subColorFor(kpis.cur.dom, kpis.ly.dom)}
          color="var(--primary)"
        />
        <KpiCard
          label="Total"
          value={fmtPax(kpis.cur.total)}
          sub={`${totalPct} vs LY`}
          subColor={subColorFor(kpis.cur.total, kpis.ly.total)}
          color="var(--accent)"
        />
      </div>

      <MonthlyBreakdown
        destination={destination}
        focusYear={focusYear}
        selectedMonths={selectedMonths}
        selectedYears={selectedYears}
      />

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
        <div className="px-3 py-1.5 border-b" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Monthly progression — Total passengers
          </span>
        </div>
        <div className="h-[400px] p-4">
          {selectedYears.length === 0 || selectedMonths.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              Select at least one year and one month to plot the progression.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E5E5' }}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E5E5' }}
                  tickFormatter={(v) => fmtPax(typeof v === 'number' ? v : Number(v))}
                  width={70}
                  domain={[(min: number) => Math.max(0, min * 0.9), (max: number) => max * 1.08]}
                />
                <Tooltip content={<ProgressionTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                {sortedYears.map((y) => {
                  const style = YEAR_STYLE(y, focusYear);
                  return (
                    <Line
                      key={y}
                      type="monotone"
                      dataKey={String(y)}
                      name={String(y)}
                      stroke={style.stroke}
                      strokeWidth={style.width}
                      strokeDasharray={style.dash}
                      dot={{ r: 3, fill: style.stroke }}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

interface TooltipPayloadEntry {
  dataKey: string | number;
  value: number | string | null;
  color?: string;
}

// Custom chart tooltip — shows each selected year's value plus the absolute
// passenger delta vs the prior year in the series. Colored green/red.
function ProgressionTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const entries = [...payload].sort(
    (a, b) => Number(a.dataKey) - Number(b.dataKey),
  );
  return (
    <div
      className="bg-white border rounded-lg px-3 py-2 shadow-sm text-xs"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="font-semibold mb-1" style={{ color: 'var(--primary)' }}>{label}</div>
      {entries.map((e, i) => {
        const v = typeof e.value === 'number' ? e.value : null;
        const prevRaw = i > 0 ? entries[i - 1].value : null;
        const prevV = typeof prevRaw === 'number' ? prevRaw : null;
        const delta = v != null && prevV != null ? v - prevV : null;
        const deltaColor = delta == null
          ? undefined
          : delta >= 0 ? 'var(--success)' : 'var(--danger)';
        return (
          <div key={String(e.dataKey)} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: e.color }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>{e.dataKey}</span>
            </span>
            <span className="font-semibold" style={{ color: 'var(--primary)' }}>
              {v == null ? '—' : fmtPax(v)}
              {delta != null && (
                <span className="ml-2 font-semibold" style={{ color: deltaColor }}>
                  ({delta >= 0 ? '+' : ''}{fmtPax(delta)})
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type MetricKey = 'domestic' | 'international' | 'total';

function MonthlyBreakdown({
  destination, focusYear, selectedMonths, selectedYears,
}: {
  destination: string;
  focusYear: number;
  selectedMonths: number[];
  selectedYears: number[];
}) {
  const months = useMemo(
    () => [...selectedMonths].sort((a, b) => a - b),
    [selectedMonths],
  );

  // Per-metric, per-month value. Returns null when the row is missing or the
  // metric is structurally absent (intl-only airports etc. are surfaced as 0).
  const valueFor = (year: number, month: number, key: MetricKey): number | null => {
    const hit = PASSENGER_ROWS.find(
      (r) => r.destination === destination && r.year === year && r.month === month,
    );
    if (!hit) return null;
    if (key === 'domestic') return hit.domestic;
    if (key === 'international') return hit.international;
    return hit.international + hit.domestic;
  };

  // Apples-to-apples aggregate: sums focusYear and refYear over the same set of
  // months — only those where BOTH years have data. This avoids the bogus
  // "+30% YoY" when, e.g., 2026 only has Jan-Apr reported and would otherwise
  // be compared against a full 2025.
  const comparableAggregate = (
    year: number, refYear: number, key: MetricKey,
  ): { cur: number | null; ref: number | null } => {
    let cur = 0;
    let ref = 0;
    let any = false;
    for (const m of months) {
      const c = valueFor(year, m, key);
      const r = valueFor(refYear, m, key);
      if (c == null || r == null) continue;
      cur += c;
      ref += r;
      any = true;
    }
    return any ? { cur, ref } : { cur: null, ref: null };
  };

  if (months.length === 0) return null;

  const metrics: { key: MetricKey; label: string; primary?: boolean }[] = [
    { key: 'domestic', label: 'Domestic' },
    { key: 'international', label: 'International' },
    { key: 'total', label: 'Total', primary: true },
  ];

  const aggLabel = aggregateLabel(months, selectedYears);

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <div className="px-3 py-1.5 border-b" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Monthly passengers — {focusYear} vs {focusYear - 1}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.8125rem]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th
                className="px-3 py-2 text-left text-[0.6875rem] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Metric
              </th>
              {months.map((m) => (
                <th
                  key={m}
                  className="px-3 py-2 text-right text-[0.6875rem] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {MONTHS[m - 1]}
                </th>
              ))}
              <th
                className="px-3 py-2 text-right text-[0.6875rem] font-semibold uppercase tracking-wider border-l"
                style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
              >
                {aggLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(({ key, label, primary }, idx) => (
              <MetricPair
                key={key}
                label={label}
                months={months}
                focusYear={focusYear}
                valueFor={(y, m) => valueFor(y, m, key)}
                comparableAggregate={() => comparableAggregate(focusYear, focusYear - 1, key)}
                emphasize={!!primary}
                groupBorderTop={idx > 0}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricPair({
  label, months, focusYear, valueFor, comparableAggregate, emphasize, groupBorderTop,
}: {
  label: string;
  months: number[];
  focusYear: number;
  valueFor: (year: number, month: number) => number | null;
  comparableAggregate: () => { cur: number | null; ref: number | null };
  emphasize: boolean;
  groupBorderTop: boolean;
}) {
  const topBorder = groupBorderTop ? { borderTop: '1px solid var(--border)' } : undefined;
  const { cur: aggCur, ref: aggLy } = comparableAggregate();
  return (
    <>
      <tr style={topBorder}>
        <td
          className="px-3 py-2 font-semibold whitespace-nowrap"
          style={{ color: emphasize ? 'var(--primary)' : 'var(--text-primary)' }}
        >
          {label}
        </td>
        {months.map((m) => {
          const v = valueFor(focusYear, m);
          return (
            <td
              key={m}
              className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${emphasize ? 'font-bold' : 'font-semibold'}`}
              style={{ color: v == null ? 'var(--text-muted)' : 'var(--primary)' }}
            >
              {v == null ? '—' : fmtPax(v)}
            </td>
          );
        })}
        <td
          className={`px-3 py-2 text-right tabular-nums whitespace-nowrap border-l ${emphasize ? 'font-bold' : 'font-semibold'}`}
          style={{
            color: aggCur == null ? 'var(--text-muted)' : 'var(--primary)',
            borderColor: 'var(--border)',
            background: 'var(--muted)',
          }}
        >
          {aggCur == null ? '—' : fmtPax(aggCur)}
        </td>
      </tr>
      <tr>
        <td
          className="px-3 py-2 whitespace-nowrap text-[0.75rem]"
          style={{ color: 'var(--text-secondary)' }}
        >
          vs LY ({focusYear - 1})
        </td>
        {months.map((m) => {
          const cur = valueFor(focusYear, m);
          const ly = valueFor(focusYear - 1, m);
          return (
            <td
              key={m}
              className="px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap"
            >
              {renderVar(cur, ly)}
            </td>
          );
        })}
        <td
          className="px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap border-l"
          style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
        >
          {renderVar(aggCur, aggLy)}
        </td>
      </tr>
    </>
  );
}

function renderVar(cur: number | null, ref: number | null) {
  if (cur == null || ref == null || ref === 0) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }
  const pct = ((cur - ref) / ref) * 100;
  const color = pct >= 0 ? 'var(--success)' : 'var(--danger)';
  const bg = pct >= 0 ? 'rgba(16, 185, 129, 0.10)' : 'rgba(239, 68, 68, 0.10)';
  return (
    <span className="inline-block px-1.5 py-0.5 rounded" style={{ color, background: bg }}>
      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

function YearMultiSelect({
  options, selected, onToggle,
}: {
  options: number[];
  selected: number[];
  onToggle: (y: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const sorted = [...selected].sort((a, b) => a - b);
  const summary =
    sorted.length === 0
      ? 'No years'
      : sorted.length <= 3
        ? sorted.join(', ')
        : `${sorted.length} years`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 w-44 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white cursor-pointer transition-colors outline-none flex items-center justify-between focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
      </button>
      {open && (
        <div
          className="absolute z-20 mt-1 left-0 min-w-full w-44 max-h-72 overflow-y-auto rounded-md border bg-white shadow-lg py-1"
          style={{ borderColor: 'var(--border)' }}
        >
          {options.map((y) => {
            const isActive = selected.includes(y);
            return (
              <button
                key={y}
                type="button"
                onClick={() => onToggle(y)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[0.8125rem] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: isActive ? 'var(--primary)' : 'var(--text-primary)', fontWeight: isActive ? 600 : 400 }}
              >
                <span
                  className="w-4 h-4 inline-flex items-center justify-center rounded border shrink-0"
                  style={{
                    background: isActive ? 'var(--primary)' : 'white',
                    borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                  }}
                >
                  {isActive && <Check size={12} color="#fff" />}
                </span>
                {y}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PillToggle({
  active, onClick, children, width,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  width: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 ${width} rounded-md border text-[0.75rem] font-medium cursor-pointer transition-colors`}
      style={{
        background: active ? 'var(--primary)' : 'white',
        color: active ? '#fff' : 'var(--text-secondary)',
        borderColor: active ? 'var(--primary)' : 'var(--border)',
      }}
    >
      {children}
    </button>
  );
}

// Label for the trailing aggregate column. "FY" when all 12 months are
// selected; "YTD" when the selection is a Jan..currentMonth prefix and the
// current year is included; "Total" otherwise.
function aggregateLabel(monthsSel: number[], yearsSel: number[]): string {
  if (monthsSel.length === 12) return 'FY';
  const sorted = [...monthsSel].sort((a, b) => a - b);
  const isPrefix = sorted.every((m, i) => m === i + 1);
  const reachesCurrent = sorted[sorted.length - 1] === CURRENT_MONTH;
  if (isPrefix && reachesCurrent && yearsSel.includes(CURRENT_YEAR)) return 'YTD';
  return 'Total';
}

