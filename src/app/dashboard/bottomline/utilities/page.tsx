'use client';

import { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import {
  Bar, CartesianGrid, ComposedChart, Legend as RLegend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import KpiCard from '@/components/ui/KpiCard';
import {
  GUESTS, HOTELS, MONTHS_LONG, MONTHS_SHORT, ROOMS_AVAILABLE, ROOMS_OCCUPIED,
  UTILITIES, UTILITY_META, YEARS,
  type Utility,
} from './data';

type Timeframe = 'MTD' | 'YTD';
type RoomMetric = 'POR' | 'PAR' | 'GUEST';

const UTILITIES_ORDER: Utility[] = ['water', 'electricity', 'gas'];

// Chart series palette — Quanta brand colors (matches globals.css and
// UTILITY_META). Each series (Actual / Budget / LY) carries its own
// color regardless of which utility or sum is being plotted, so the
// chart always reads with the same three-color key.
const CHART_SERIES = [
  { key: 'actual', label: 'Actual', color: '#172951' }, // --primary (navy)
  { key: 'budget', label: 'Budget', color: '#00AFAD' }, // --accent (teal)
  { key: 'ly',     label: 'LY',     color: '#69D9D0' }, // --accent-light
] as const;

// Range driven by the View toggle:
//   MTD → just the selected month
//   YTD → January through the selected month, inclusive
function rangeIndices(timeframe: Timeframe, monthIdx: number): number[] {
  if (timeframe === 'MTD') return [monthIdx];
  return Array.from({ length: monthIdx + 1 }, (_, i) => i);
}

function sumOver(series: number[], indices: number[]): number {
  return indices.reduce((s, i) => s + (series[i] ?? 0), 0);
}

function fmtUsd(value: number, opts: { digits?: number } = {}): string {
  if (!Number.isFinite(value)) return '—';
  const digits = opts.digits ?? 0;
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

// Plain-number variance with sign — matches the Expenses dashboard style.
// No currency symbol on purpose, neutral color (sub text default), so both
// pages read the same. `digits` lets us stay precise for tiny values like
// $/m³ or $/POR deltas without inflating the integer rows.
function fmtVar(v: number, digits = 0): string {
  if (!Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}${Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function variancesSub(actual: number, budget: number, ly: number, digits = 0): string {
  return `vs BUD ${fmtVar(actual - budget, digits)} · vs LY ${fmtVar(actual - ly, digits)}`;
}

export default function UtilitiesPage() {
  const [hotel, setHotel] = useState<(typeof HOTELS)[number]>(HOTELS[0]);
  const [year, setYear] = useState<(typeof YEARS)[number]>('2026');
  const [monthIdx, setMonthIdx] = useState(4); // May
  const [timeframe, setTimeframe] = useState<Timeframe>('YTD');
  const [roomMetric, setRoomMetric] = useState<RoomMetric>('POR');
  const [utilitiesOn, setUtilitiesOn] = useState<Record<Utility, boolean>>({
    water: true,
    electricity: true,
    gas: true,
  });

  // Multi-select utility toggle for the chart — at least one must stay on
  // so the chart never goes blank when the user double-clicks the active pill.
  const toggleUtility = (u: Utility) => {
    setUtilitiesOn((prev) => {
      const next = { ...prev, [u]: !prev[u] };
      if (!Object.values(next).some(Boolean)) return prev;
      return next;
    });
  };

  const indices = useMemo(() => rangeIndices(timeframe, monthIdx), [timeframe, monthIdx]);

  // Denominators over the active range — Row 2 projects against one of
  // these depending on the POR / PAR / GUEST toggle. Row 1 and the chart
  // stay in $ totals.
  const rooms = useMemo(() => {
    const occupied = sumOver(ROOMS_OCCUPIED, indices);
    const available = sumOver(ROOMS_AVAILABLE, indices);
    const guests = sumOver(GUESTS, indices);
    return { occupied, available, guests };
  }, [indices]);

  // Per-utility totals over the active range.
  const totals = useMemo(() => {
    return UTILITIES_ORDER.map((u) => {
      const s = UTILITIES[u];
      const cost = sumOver(s.costCY, indices);
      const budget = sumOver(s.costBudget, indices);
      const ly = sumOver(s.costLY, indices);
      return { utility: u, cost, budget, ly };
    });
  }, [indices]);

  const grandTotal = useMemo(() => {
    const cost = totals.reduce((s, t) => s + t.cost, 0);
    const budget = totals.reduce((s, t) => s + t.budget, 0);
    const ly = totals.reduce((s, t) => s + t.ly, 0);
    return { cost, budget, ly };
  }, [totals]);

  // Months before "today" in the selected year are closed (actuals);
  // current month and beyond are forecast. Forecast data isn't loaded
  // yet, so the chart filters those months out entirely.
  const now = new Date();
  const isClosedMonth = (i: number): boolean => {
    const selectedYear = Number(year);
    if (selectedYear < now.getFullYear()) return true;
    if (selectedYear > now.getFullYear()) return false;
    return i < now.getMonth();
  };

  // Chart data — per-utility series + summed series across the active
  // utilities. Only closed months are kept; forecast months are dropped
  // from the X axis until real forecast data wires in.
  const chartData = useMemo(() => {
    const selected = UTILITIES_ORDER.filter((u) => utilitiesOn[u]);
    return MONTHS_SHORT
      .map((m, i) => ({ m, i }))
      .filter(({ i }) => isClosedMonth(i))
      .map(({ m, i }) => {
        const row: Record<string, number | string> = { month: m };
        let sumActual = 0;
        let sumBudget = 0;
        let sumLy = 0;
        for (const u of selected) {
          const s = UTILITIES[u];
          row[`${u}_actual`] = s.costCY[i];
          row[`${u}_budget`] = s.costBudget[i];
          row[`${u}_ly`] = s.costLY[i];
          sumActual += s.costCY[i];
          sumBudget += s.costBudget[i];
          sumLy += s.costLY[i];
        }
        row.sum_actual = sumActual;
        row.sum_budget = sumBudget;
        row.sum_ly = sumLy;
        row.occupancy =
          ROOMS_AVAILABLE[i] > 0 ? ROOMS_OCCUPIED[i] / ROOMS_AVAILABLE[i] : 0;
        row.guests = GUESTS[i];
        return row;
      });
    // year is read via isClosedMonth — kept in deps so the chart
    // re-derives when the Year selector changes.
  }, [utilitiesOn, year]);

  // Guest scale max — used to fit the guests line on its own hidden axis
  // without crowding the left $ axis. Padded so the curve never grazes
  // the chart's top.
  const guestsMax = Math.max(...GUESTS) * 1.1;

  // ─── Export (PNG / PDF) ──────────────────────────────────────
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<null | 'png' | 'pdf'>(null);

  const exportFileBase = () => {
    return `utilities-${hotel}-${year}-${MONTHS_SHORT[monthIdx]}-${timeframe}-${roomMetric}-${new Date()
      .toISOString()
      .slice(0, 10)}`;
  };

  const captureBoard = async () => {
    const node = exportRef.current;
    if (!node) throw new Error('export node not mounted');
    // Reveal the export-only title for the duration of the capture and
    // wait one frame so layout reflows before html-to-image snapshots it.
    const titleNode = node.querySelector<HTMLElement>('[data-export-title]');
    const prevDisplay = titleNode?.style.display ?? '';
    if (titleNode) {
      titleNode.style.display = '';
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
    try {
      const { toPng } = await import('html-to-image');
      const width = Math.max(node.scrollWidth, node.clientWidth);
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        width,
        style: { width: `${width}px` },
      });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(null);
        img.onerror = reject;
      });
      return { dataUrl, width: img.width, height: img.height };
    } finally {
      if (titleNode) titleNode.style.display = prevDisplay || 'none';
    }
  };

  const handleExportPng = async () => {
    if (exporting) return;
    setExporting('png');
    try {
      const { dataUrl } = await captureBoard();
      const link = document.createElement('a');
      link.download = `${exportFileBase()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    if (exporting) return;
    setExporting('pdf');
    try {
      const { dataUrl, width, height } = await captureBoard();
      const { default: JsPDF } = await import('jspdf');
      const pxToPt = 72 / 96 / 2;
      const margin = 24;
      const imgW = width * pxToPt;
      const imgH = height * pxToPt;
      const pageW = imgW + margin * 2;
      const pageH = imgH + margin * 2;
      const pdf = new JsPDF({
        orientation: pageW >= pageH ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pageW, pageH],
      });
      pdf.addImage(dataUrl, 'PNG', margin, margin, imgW, imgH);
      pdf.save(`${exportFileBase()}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  const rangeCaption =
    timeframe === 'YTD'
      ? `YTD · Jan – ${MONTHS_LONG[monthIdx]} ${year}`
      : `MTD · ${MONTHS_LONG[monthIdx]} ${year}`;

  return (
    <div>
      {/* Breadcrumb */}
      <div
        className="flex items-center gap-1 text-sm mb-4"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Bottom Line</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--primary)' }}>Utilities</span>
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--primary)' }}>
          Utilities
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPng}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-60 disabled:cursor-wait"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            title="Download board as PNG"
          >
            <Download size={13} /> {exporting === 'png' ? 'Generating…' : 'PNG'}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-60 disabled:cursor-wait"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            title="Download board as PDF"
          >
            <Download size={13} /> {exporting === 'pdf' ? 'Generating…' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Controls — Hotel → Year → Month → View → Per Room */}
      <div
        className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-white px-3 py-2.5 text-sm"
        style={{ borderColor: 'var(--border)' }}
      >
        <ControlSelect
          value={hotel}
          onChange={(v) => setHotel(v as (typeof HOTELS)[number])}
        >
          {HOTELS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </ControlSelect>
        <ControlSelect
          value={year}
          onChange={(v) => setYear(v as (typeof YEARS)[number])}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </ControlSelect>
        <ControlSelect
          value={String(monthIdx)}
          onChange={(v) => setMonthIdx(Number(v))}
        >
          {MONTHS_LONG.map((m, i) => (
            <option key={m} value={String(i)}>
              {m}
            </option>
          ))}
        </ControlSelect>
        <SegToggle
          value={timeframe}
          onChange={(v) => setTimeframe(v as Timeframe)}
          options={['MTD', 'YTD']}
        />
        <div className="h-6 border-l mx-1" style={{ borderColor: 'var(--border)' }} />
        <SegToggle
          value={roomMetric}
          onChange={(v) => setRoomMetric(v as RoomMetric)}
          options={['PAR', 'POR', 'GUEST']}
        />
      </div>

      {/* Exportable board */}
      <div ref={exportRef} className="bg-white">
        {/* Export-only title — hidden on screen, revealed by captureBoard
            so the exported PNG / PDF carries its own context header. */}
        <div data-export-title style={{ display: 'none' }} className="pb-3">
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--primary)' }}
          >
            Utilities · {hotel}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {rangeCaption} · {roomMetric}
          </p>
        </div>

        {/* Row 1 — $ totals, always with variance vs BUD / LY in the sub */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <KpiCard
            label={`Total Utilities · ${timeframe}`}
            value={fmtUsd(grandTotal.cost)}
            accent="var(--primary)"
            sub={variancesSub(grandTotal.cost, grandTotal.budget, grandTotal.ly)}
          />
          {totals.map((t) => {
            const meta = UTILITY_META[t.utility];
            return (
              <KpiCard
                key={t.utility}
                label={`Total ${meta.label}`}
                value={fmtUsd(t.cost)}
                accent={meta.color}
                sub={variancesSub(t.cost, t.budget, t.ly)}
              />
            );
          })}
        </div>

        {/* Row 2 — Costo por habitación ocupada (POR), disponible (PAR), o huésped (GUEST) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {totals.map((t) => {
            const meta = UTILITY_META[t.utility];
            const div =
              roomMetric === 'POR'
                ? rooms.occupied
                : roomMetric === 'PAR'
                  ? rooms.available
                  : rooms.guests;
            const valCY = div > 0 ? t.cost / div : NaN;
            const valBud = div > 0 ? t.budget / div : NaN;
            const valLy = div > 0 ? t.ly / div : NaN;
            const denomLabel =
              roomMetric === 'POR'
                ? 'hab. ocupada'
                : roomMetric === 'PAR'
                  ? 'hab. disponible'
                  : 'huésped';
            return (
              <KpiCard
                key={t.utility}
                label={`Costo por ${denomLabel} · ${meta.label}`}
                value={fmtUsd(valCY, { digits: 2 })}
                accent={meta.color}
                sub={variancesSub(valCY, valBud, valLy, 2)}
              />
            );
          })}
        </div>

        {/* Chart — always $ totals; occupancy on right axis */}
        <div
          className="bg-white rounded-xl border p-4"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
              Costo mensual por utility (USD)
            </h3>
            <div
              className="inline-flex rounded-md border overflow-hidden shrink-0"
              style={{ borderColor: 'var(--border)' }}
            >
              {UTILITIES_ORDER.map((u, idx) => (
                <button
                  key={u}
                  onClick={() => toggleUtility(u)}
                  className={`px-3 py-1.5 text-xs transition-colors ${idx > 0 ? 'border-l' : ''}`}
                  style={{
                    backgroundColor: utilitiesOn[u] ? 'var(--primary)' : 'white',
                    color: utilitiesOn[u] ? 'white' : 'var(--text-secondary)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {UTILITY_META[u].label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ width: '100%', height: 360 }}>
            <ResponsiveContainer>
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                barCategoryGap="12%"
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 1]}
                  hide
                />
                <YAxis
                  yAxisId="guests"
                  orientation="right"
                  domain={[0, guestsMax]}
                  hide
                />
                <Tooltip
                  formatter={
                    ((value: unknown, name: unknown) => {
                      const n = typeof value === 'number' ? value : Number(value);
                      if (name === 'Ocupación') return `${(n * 100).toFixed(1)}%`;
                      if (name === 'Huéspedes') return `${n.toLocaleString('en-US')} guest-nights`;
                      return fmtUsd(n);
                    }) as (value: unknown, name: unknown) => string
                  }
                  contentStyle={{ fontSize: 12 }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <RLegend wrapperStyle={{ fontSize: 12 }} />
                {(() => {
                  const selected = UTILITIES_ORDER.filter((u) => utilitiesOn[u]);
                  // 1 active → per-utility bars; 2+ → summed bars.
                  if (selected.length === 1) {
                    const u = selected[0];
                    return CHART_SERIES.map((s) => (
                      <Bar
                        key={`${u}_${s.key}`}
                        yAxisId="left"
                        dataKey={`${u}_${s.key}`}
                        name={`${UTILITY_META[u].label}${s.key === 'actual' ? '' : ` · ${s.label}`}`}
                        fill={s.color}
                        radius={[3, 3, 0, 0]}
                      />
                    ));
                  }
                  return CHART_SERIES.map((s) => (
                    <Bar
                      key={`sum_${s.key}`}
                      yAxisId="left"
                      dataKey={`sum_${s.key}`}
                      name={`Total${s.key === 'actual' ? '' : ` · ${s.label}`}`}
                      fill={s.color}
                      radius={[3, 3, 0, 0]}
                    />
                  ));
                })()}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="occupancy"
                  name="Ocupación"
                  stroke="#6b7280"
                  strokeWidth={2}
                  strokeDasharray="2 3"
                  dot={false}
                />
                <Line
                  yAxisId="guests"
                  type="monotone"
                  dataKey="guests"
                  name="Huéspedes"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────
// (label prop is optional — omit it for an unlabeled, compact control.)

function SegToggle<T extends string>({
  label,
  value,
  onChange,
  options,
  renderOption,
}: {
  label?: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  renderOption?: (opt: T) => string;
}) {
  return (
    <label className="flex items-center gap-2">
      {label && (
        <span
          className="text-xs uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
      )}
      <div
        className="inline-flex rounded-md border overflow-hidden"
        style={{ borderColor: 'var(--border)' }}
      >
        {options.map((opt, idx) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`px-3 py-1.5 text-xs transition-colors ${idx > 0 ? 'border-l' : ''}`}
              style={{
                backgroundColor: active ? 'var(--primary)' : 'white',
                color: active ? 'white' : 'var(--text-secondary)',
                borderColor: 'var(--border)',
              }}
            >
              {renderOption ? renderOption(opt) : opt}
            </button>
          );
        })}
      </div>
    </label>
  );
}

function ControlSelect({
  label,
  value,
  onChange,
  children,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2">
      {label && (
        <span
          className="text-xs uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none pl-3 pr-8 py-1.5 rounded-md border bg-white text-sm cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-secondary)' }}
        />
      </div>
    </label>
  );
}
