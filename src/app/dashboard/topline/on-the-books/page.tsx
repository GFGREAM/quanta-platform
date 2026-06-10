'use client';

import { createContext, Fragment, useContext, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import KpiCard from '@/components/ui/KpiCard';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { selectStyle } from '@/lib/selectStyle';
import {
  useOtbData, TOTAL_KEY,
  type OtbData, type TcSegment, type SegmentKey, type GridDay,
} from './data';

// Context so sub-components (SegmentGrid, SegmentTree) can access the OTB data
// without prop drilling through every intermediate component.
const OtbCtx = createContext<OtbData | null>(null);
function useOtb(): OtbData { return useContext(OtbCtx)!; }

type ViewMode = 'cumulative' | 'daily';
type Metric = 'RN' | 'OCC';

const fmtRn = (v: number | null | undefined) =>
  v == null ? '—' : Math.round(v).toLocaleString('en-US');
const fmtPct = (v: number | null | undefined) =>
  v == null ? '—' : `${v.toFixed(1)}%`;
// occupancy % = room nights / (capacity × days)
const occOf = (rn: number, cap: number, days: number) => (cap && days ? (rn / (cap * days)) * 100 : 0);
const fmtVar = (cur: number, ref: number) =>
  !ref ? '—' : `${cur >= ref ? '+' : ''}${(((cur - ref) / ref) * 100).toFixed(1)}%`;
const varColor = (cur: number, ref: number) =>
  !ref ? 'var(--text-secondary)' : cur >= ref ? 'var(--success)' : 'var(--danger)';

const COLORS = {
  a2025: 'var(--text-secondary)',
  a2026: 'var(--primary)',
  budget: 'var(--accent)',
};

type MonthFilter = number | 'all';

type BoardView = 'monthly' | 'daily' | 'dailySegment';
const BOARD_VIEWS: { key: BoardView; label: string }[] = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'daily', label: 'Daily' },
  { key: 'dailySegment', label: 'Daily Segment' },
];

export default function OnTheBooksPage() {
  const [boardView, setBoardView] = useState<BoardView>('daily');

  const [propertyCode, setPropertyCode] = useState<string>('WACCR');
  const otb = useOtbData(propertyCode);
  const { loading, AS_OF, TC_SEGMENTS, CAPACITY_2025, CAPACITY_2026, PROPERTIES, getSegmentSummary, getGridDaily, getGroupDaily } = otb;
  const property = PROPERTIES.find((p) => p.code === propertyCode) ?? PROPERTIES[0];
  const [segSel, setSegSel] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>('cumulative');
  const [month, setMonth] = useState<MonthFilter>('all');
  const [metric, setMetric] = useState<Metric>('RN');
  const isOcc = metric === 'OCC';
  const showTrend = boardView !== 'monthly'; // controls + KPIs + chart (Daily & Daily Segment; Monthly is blank)
  // Daily is hotel-wide (Total); Daily Segment uses a multi-select over the segment
  // hierarchy. Indentation is carried in the option label (NBSP per depth) so the
  // checkbox list keeps the macro → micro shape; the Total node is dropped because
  // "no selection" already means all.
  const segChoices = useMemo(
    () => buildSegOptions(TC_SEGMENTS).filter((o) => o.id !== '__total').map((o) => ({
      key: '  '.repeat(o.depth) + o.label,
      plain: o.label,
      segs: o.segs,
    })),
    [TC_SEGMENTS],
  );
  const segLabels = useMemo(() => segChoices.map((c) => c.key), [segChoices]);

  // Union of the selected groupings' segments (deduped). Empty selection = all.
  const selectedSegs = useMemo(() => {
    if (boardView !== 'dailySegment' || segSel.length === 0) return TC_SEGMENTS;
    const set = new Set<string>();
    for (const key of segSel) segChoices.find((c) => c.key === key)?.segs.forEach((s) => set.add(s));
    return [...set] as TcSegment[];
  }, [boardView, segSel, segChoices]);

  const selectedLabel = boardView !== 'dailySegment' || segSel.length === 0 ? 'Total'
    : segSel.length === 1 ? (segChoices.find((c) => c.key === segSel[0])?.plain ?? 'Total')
    : `${segSel.length} segments`;

  const groupDaily = useMemo(() => getGroupDaily(selectedSegs), [selectedSegs]);
  const hasBudget = useMemo(() => groupDaily.some((d) => d.budget > 0), [groupDaily]);
  const usedFallback = useMemo(() => selectedSegs.some((s) => getSegmentSummary(s).usedFallbackCurve), [selectedSegs]);

  // Build chart rows on the 2026 date axis. In cumulative mode every series is a
  // running total (the natural "pace" view); in daily mode they are raw daily RN.
  // The 2026 line is split actual/pace at AS_OF so the future shows dashed.
  const chartData = useMemo(() => {
    const daily = groupDaily;
    // When a month is picked, restrict to that period; cumulative then runs
    // within the month so the chart shows only that period's data.
    const rows = month === 'all' ? daily : daily.filter((d) => Number(d.date.slice(5, 7)) === month);
    const boundaryPace = rows.find((d) => d.isPace)?.date ?? '';
    let c25 = 0, c26 = 0, cBud = 0;
    return rows.map((d, i) => {
      // 2025 line: realized actual through AS_OF, then the LY/STLY reported by D360 for the pace days.
      const ly2025 = d.isPace ? d.stly2025 : d.actual2025;
      c25 += ly2025; c26 += d.actual2026; cBud += d.budget;
      // For RN: daily value or running total. For OCC: rn/(capacity×days) — daily
      // uses 1 day, cumulative uses days elapsed in the window (running occupancy).
      const conv = (rnDay: number, rnCum: number, cap: number) => {
        if (!isOcc) return view === 'cumulative' ? rnCum : rnDay;
        return view === 'cumulative' ? occOf(rnCum, cap, i + 1) : occOf(rnDay, cap, 1);
      };
      const a2025 = conv(ly2025, c25, CAPACITY_2025);
      const a2026 = conv(d.actual2026, c26, CAPACITY_2026);
      const budget = conv(d.budget, cBud, CAPACITY_2026);
      // boundary day belongs to both so the solid/dashed lines connect
      const actCell = (v: number, isPace: boolean) => (!isPace ? v : (d.date === boundaryPace ? v : null));
      const paceCell = (v: number, isPace: boolean) => (isPace || d.date === AS_OF ? v : null);
      return {
        date: d.date,
        // 2025 split act/pace at AS_OF, same as 2026: solid actual in the past, dashed STLY ahead.
        a2025Actual: actCell(a2025, d.isPace),
        a2025Pace: paceCell(a2025, d.isPace),
        a2026Actual: actCell(a2026, d.isPace),
        a2026Pace: paceCell(a2026, d.isPace),
        budget,
      };
    });
  }, [groupDaily, view, month, isOcc]);

  // Which line series actually carry data in the current window — so the chart and its legend
  // only show "actual" for past months and "pace" for future months (the as-of month shows both).
  const present = useMemo(() => ({
    a2025Actual: chartData.some((r) => r.a2025Actual != null),
    a2025Pace: chartData.some((r) => r.a2025Pace != null),
    a2026Actual: chartData.some((r) => r.a2026Actual != null),
    a2026Pace: chartData.some((r) => r.a2026Pace != null),
  }), [chartData]);
  // Word used in the chart title for the 2026 series, matching the selected month's region.
  const seriesWord = !present.a2026Actual ? 'pace' : !present.a2026Pace ? 'actual' : 'act + pace';

  // Full year → one tick per month; single month → a tick every few days.
  const xTicks = useMemo(() => (
    month === 'all'
      ? chartData.filter((r) => r.date.endsWith('-01')).map((r) => r.date)
      : chartData.filter((_, i) => i % 5 === 0).map((r) => r.date)
  ), [chartData, month]);

  // Aggregate over the selected period (full year, or just the chosen month) so the KPIs
  // track the Month filter. ytd* = realized portion (days <= AS_OF); *full = act + pace.
  const periodAgg = useMemo(() => {
    const daily = groupDaily;
    const rows = month === 'all' ? daily : daily.filter((d) => Number(d.date.slice(5, 7)) === month);
    let a2025 = 0, a2025Ytd = 0, a2026Full = 0, a2026Ytd = 0, budgetFull = 0, budgetYtd = 0, days = 0, ytdDays = 0;
    for (const d of rows) {
      a2025 += d.actual2025; a2026Full += d.actual2026; budgetFull += d.budget; days++;
      if (!d.isPace) { a2025Ytd += d.actual2025; a2026Ytd += d.actual2026; budgetYtd += d.budget; ytdDays++; }
    }
    return { a2025, a2025Ytd, a2026Full, a2026Ytd, budgetFull, budgetYtd, days, ytdDays };
  }, [groupDaily, month]);

  // KPI values respect the selected metric: RN counts, or occupancy % (rn / capacity / days).
  const kpi = useMemo(() => {
    const p = periodAgg;
    const v = (rn: number, cap: number, days: number) => (isOcc ? occOf(rn, cap, days) : rn);
    // "On The Books" = the pace-only portion (future days, after AS_OF): full − realized.
    const paceDays = p.days - p.ytdDays;
    return {
      ytdActual: v(p.a2026Ytd, CAPACITY_2026, p.ytdDays),
      ytdBudget: v(p.budgetYtd, CAPACITY_2026, p.ytdDays),
      // LY (2025) on the same time window — to-date / pace / full — on 2025 capacity.
      ytdLy: v(p.a2025Ytd, CAPACITY_2025, p.ytdDays),
      paceLy: v(p.a2025 - p.a2025Ytd, CAPACITY_2025, paceDays),
      paceActual: v(p.a2026Full - p.a2026Ytd, CAPACITY_2026, paceDays),
      paceBudget: v(p.budgetFull - p.budgetYtd, CAPACITY_2026, paceDays),
      fullActual: v(p.a2026Full, CAPACITY_2026, p.days),
      fullBudget: v(p.budgetFull, CAPACITY_2026, p.days),
      a2025: v(p.a2025, CAPACITY_2025, p.days),
    };
  }, [periodAgg, isOcc]);

  const periodLabel = month === 'all' ? null : MONTH_FULL[month - 1];
  const fmtVal = (v: number) => (isOcc ? fmtPct(v) : fmtRn(v));
  const varSub = (cur: number, ref: number) =>
    isOcc ? `${cur - ref >= 0 ? '+' : ''}${(cur - ref).toFixed(1)} pts` : fmtVar(cur, ref);

  if (loading || TC_SEGMENTS.length === 0) {
    return (
      <div className="animate-pulse flex flex-col gap-4">
        <div className="h-4 w-48 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-8 w-64 rounded" style={{ background: 'var(--border)' }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg" style={{ background: 'var(--muted)' }} />
          ))}
        </div>
        <div className="h-64 rounded-lg" style={{ background: 'var(--muted)' }} />
      </div>
    );
  }

  return (
    <OtbCtx.Provider value={otb}>
    <div className="flex flex-col gap-5 font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif]" style={{ color: 'var(--text-primary)' }}>
      <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Top Line</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--primary)' }}>On the Books</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
          Daily On The Books — {selectedLabel}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {property.name} · Room Nights by TC segment · FY26 budget mapped onto actuals · pace as of {AS_OF}
        </p>
      </div>

      {/* view toggle — Monthly / Daily / Daily Segment */}
      <div className="flex rounded-lg p-[3px] gap-0.5 self-start" style={{ background: 'var(--muted)' }}>
        {BOARD_VIEWS.map((v) => (
          <button key={v.key} type="button" onClick={() => setBoardView(v.key)}
            className={`px-3.5 py-1.5 rounded-md text-[0.8125rem] font-medium border-none cursor-pointer transition-all whitespace-nowrap ${boardView === v.key ? 'bg-white shadow-sm' : 'bg-transparent'}`}
            style={{ color: boardView === v.key ? 'var(--primary)' : 'var(--text-secondary)' }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* controls */}
      {showTrend && (
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Property
          </label>
          <select
            value={propertyCode}
            onChange={(e) => setPropertyCode(e.target.value)}
            style={selectStyle}
            className="h-9 w-52 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          >
            {PROPERTIES.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>

        {boardView === 'dailySegment' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Segment
          </label>
          <MultiSelect
            options={segLabels}
            selected={segSel}
            onChange={setSegSel}
            width="15rem"
            noun="segments"
            placeholder="All segments"
          />
        </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Month
          </label>
          <select
            value={String(month)}
            onChange={(e) => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            style={selectStyle}
            className="h-9 w-44 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          >
            <option value="all">Full year</option>
            {MONTH_ABBR.map((m, i) => <option key={m} value={i + 1}>{MONTH_FULL[i]}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Chart
          </label>
          <div className="flex gap-1">
            {(['cumulative', 'daily'] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setView(m)}
                className="h-9 px-4 rounded-md border text-[0.75rem] font-medium cursor-pointer transition-colors capitalize"
                style={{
                  background: view === m ? 'var(--primary)' : 'white',
                  color: view === m ? '#fff' : 'var(--text-secondary)',
                  borderColor: view === m ? 'var(--primary)' : 'var(--border)',
                }}
              >
                {m === 'cumulative' ? 'Cumulative (pace)' : 'Daily'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Metric
          </label>
          <div className="flex gap-1">
            {(['RN', 'OCC'] as Metric[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className="h-9 px-4 rounded-md border text-[0.75rem] font-medium cursor-pointer transition-colors"
                style={{
                  background: metric === m ? 'var(--primary)' : 'white',
                  color: metric === m ? '#fff' : 'var(--text-secondary)',
                  borderColor: metric === m ? 'var(--primary)' : 'var(--border)',
                }}
              >
                {m === 'RN' ? 'Room Nights' : 'Occupancy %'}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {showTrend && (<>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 max-[860px]:grid-cols-2 max-[480px]:grid-cols-1">
        <KpiCard
          label={`${periodLabel ? `${periodLabel} 2026 actual` : '2026 YTD actual'}${isOcc ? ' occ' : ''}${periodLabel ? ' (to date)' : ''}`}
          value={fmtVal(kpi.ytdActual)}
          sub={`${varSub(kpi.ytdActual, kpi.ytdBudget)} vs budget`}
          subColor={varColor(kpi.ytdActual, kpi.ytdBudget)}
          subRight={`${varSub(kpi.ytdActual, kpi.ytdLy)} vs LY`}
          subRightColor={varColor(kpi.ytdActual, kpi.ytdLy)}
          color="var(--primary)"
        />
        <KpiCard
          label={`${periodLabel ? `${periodLabel} 2026 (On The Books)` : '2026 (On The Books)'}${isOcc ? ' occ' : ''}`}
          value={fmtVal(kpi.paceActual)}
          sub={`${varSub(kpi.paceActual, kpi.paceBudget)} vs budget`}
          subColor={varColor(kpi.paceActual, kpi.paceBudget)}
          subRight={`${varSub(kpi.paceActual, kpi.paceLy)} vs LY`}
          subRightColor={varColor(kpi.paceActual, kpi.paceLy)}
        />
        <KpiCard
          label={`${periodLabel ? `${periodLabel} 2026 (act + pace)` : '2026 (act + pace)'}${isOcc ? ' occ' : ''}`}
          value={fmtVal(kpi.fullActual)}
          sub={`${varSub(kpi.fullActual, kpi.fullBudget)} vs budget`}
          subColor={varColor(kpi.fullActual, kpi.fullBudget)}
          subRight={`${varSub(kpi.fullActual, kpi.a2025)} vs LY`}
          subRightColor={varColor(kpi.fullActual, kpi.a2025)}
          accent="var(--accent)"
        />
        <KpiCard
          label={`${periodLabel ? `${periodLabel} budget` : 'FY26 budget'}${isOcc ? ' occ' : ''}`}
          value={hasBudget ? fmtVal(kpi.fullBudget) : '—'}
          sub={hasBudget ? 'mapped from hotel segments' : 'no budget mapped'}
          color="var(--accent)"
        />
      </div>

      {/* chart */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
        <div className="px-3 py-1.5 border-b flex items-center justify-between" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            {view === 'cumulative'
              ? `Cumulative ${isOcc ? 'occupancy' : 'room nights'} — 2026 ${seriesWord} vs budget vs 2025`
              : `Daily ${isOcc ? 'occupancy' : 'room nights'}`}
            {month !== 'all' && ` — ${MONTH_FULL[month - 1]}`}
          </span>
          {hasBudget && (
            <span className="text-[0.625rem]" style={{ color: 'var(--text-muted)' }}>
              budget curve: Comp Set{usedFallback ? ' Total (sparse CS history)' : ' seasonality'}
            </span>
          )}
        </div>
        <div className="h-[420px] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                ticks={xTicks}
                tickFormatter={month === 'all' ? fmtMonth : (iso: string) => String(Number(iso.slice(8, 10)))}
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E5E5' }}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#E5E5E5' }}
                tickFormatter={(v) => (isOcc ? `${Math.round(Number(v))}%` : fmtRn(Number(v)))}
                width={isOcc ? 44 : 56}
              />
              <Tooltip content={<ChartTooltip fmt={isOcc ? fmtPct : fmtRn} />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="plainline" />
              <ReferenceLine x={AS_OF} stroke="var(--text-muted)" strokeDasharray="4 4"
                label={{ value: 'as of', position: 'top', fontSize: 10, fill: '#9CA3AF' }} />
              {present.a2025Actual && (
                <Line type="monotone" dataKey="a2025Actual" name="2025 actual" stroke={COLORS.a2025}
                  strokeWidth={1.75} dot={false} connectNulls />
              )}
              {present.a2025Pace && (
                <Line type="monotone" dataKey="a2025Pace" name="2025 STLY (pace)" stroke={COLORS.a2025}
                  strokeWidth={1.75} strokeDasharray="5 4" dot={false} connectNulls />
              )}
              <Line type="monotone" dataKey="budget" name="FY26 budget" stroke={COLORS.budget}
                strokeWidth={2} dot={false} connectNulls />
              {present.a2026Actual && (
                <Line type="monotone" dataKey="a2026Actual" name="2026 actual" stroke={COLORS.a2026}
                  strokeWidth={2.5} dot={false} connectNulls />
              )}
              {present.a2026Pace && (
                <Line type="monotone" dataKey="a2026Pace" name="2026 pace" stroke={COLORS.a2026}
                  strokeWidth={2.5} strokeDasharray="6 4" dot={false} connectNulls />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      </>)}

      {/* lower section — Daily: pace board · Daily Segment: hierarchical drill-down · Monthly: TBD */}
      {boardView === 'daily' && <SegmentGrid segment={TOTAL_KEY} month={month} isOcc={isOcc} granularity="daily" />}
      {boardView === 'dailySegment' && <SegmentTree month={month} />}
      {boardView === 'monthly' && <BlankView label="Monthly" />}
    </div>
    </OtbCtx.Provider>
  );
}

// ---- Daily RM grid: Room Nights / Rooms Revenue / ADR / RevPAR ----
type GridUnit = 'rn' | 'money' | 'rate' | 'pct';
interface GridFamily { key: string; label: string; unit: GridUnit }
const GRID_FAMILIES: GridFamily[] = [
  { key: 'rn', label: 'Room Nights', unit: 'rn' },
  { key: 'rev', label: 'Rooms Revenue', unit: 'money' },
  { key: 'adr', label: 'ADR', unit: 'rate' },
  { key: 'revpar', label: 'RevPAR', unit: 'rate' },
];
const GRID_SUBROWS = ['act', 'budget', 'variance', 'variancePct', 'pickupW', 'pickup4'] as const;

const fmtMoneyC = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
};
const fmtUnit = (unit: GridUnit, v: number | null) =>
  v == null ? '—' : unit === 'rn' ? fmtRn(v) : unit === 'money' ? fmtMoneyC(v) : unit === 'pct' ? `${v.toFixed(1)}%` : `$${Math.round(v)}`;
const fmtSignedUnit = (unit: GridUnit, v: number | null) =>
  v == null ? '—' : unit === 'pct' ? `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(1)} pts` : (v >= 0 ? '+' : '-') + fmtUnit(unit, Math.abs(v));

// Room Nights family becomes Occupancy % when the Metric toggle is set to OCC.
const OCC_FAMILY: GridFamily = { key: 'occ', label: 'Occupancy', unit: 'pct' };

type CompareBasis = 'budget' | 'ly' | 'forecast';
const COMPARE_OPTIONS: { key: CompareBasis; label: string; row: string }[] = [
  { key: 'budget', label: 'vs Budget', row: 'Budget' },
  { key: 'ly', label: 'vs Last Year', row: 'Last Year' },
  { key: 'forecast', label: 'vs Forecast', row: 'Forecast' },
];

type DayType = 'all' | 'weekday' | 'weekend';
const DAYTYPE_OPTIONS: { key: DayType; label: string }[] = [
  { key: 'all', label: 'All days' },
  { key: 'weekday', label: 'Weekday' },
  { key: 'weekend', label: 'Weekend' },
];
// Hotel weekend = Friday & Saturday nights.
function isWeekend(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0 Sun .. 6 Sat
  return dow === 5 || dow === 6;
}
const DOW_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function dowAbbr(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return DOW_ABBR[new Date(y, m - 1, d).getDay()];
}

interface FamVals { a: number | null; b: number | null }
interface ColMetrics { rn: FamVals; occ: FamVals; rev: FamVals; adr: FamVals; revpar: FamVals; pickupW: number | null; pickup4w: number | null }

// `b` is the comparison series chosen in the header: Budget, Last Year (2025), or Forecast (no data yet).
function computeMetrics(days: GridDay[], compare: CompareBasis, cap26: number, cap25: number): ColMetrics {
  const n = days.length || 1;
  let rnA = 0, revA = 0, rnB = 0, revB = 0;
  let pwSum = 0, pwHas = false, p4wSum = 0, p4wHas = false;
  for (const d of days) {
    rnA += d.rn; revA += d.rev;
    if (compare === 'budget') { rnB += d.budgetRn; revB += d.budgetRev; }
    else if (compare === 'ly') { rnB += d.rnLy; revB += d.revLy; }
    if (d.pickupW != null) { pwSum += d.pickupW; pwHas = true; }
    if (d.pickup4w != null) { p4wSum += d.pickup4w; p4wHas = true; }
  }
  const hasB = compare !== 'forecast';
  const capB = compare === 'ly' ? cap25 : cap26;
  const div = (x: number, y: number) => (y ? x / y : null);
  return {
    rn: { a: rnA, b: hasB ? rnB : null },
    occ: { a: (rnA / (cap26 * n)) * 100, b: hasB ? (rnB / (capB * n)) * 100 : null },
    rev: { a: revA, b: hasB ? revB : null },
    adr: { a: div(revA, rnA), b: hasB && rnB ? div(revB, rnB) : null },
    revpar: { a: revA / (cap26 * n), b: hasB ? revB / (capB * n) : null },
    pickupW: pwHas ? pwSum : null,
    pickup4w: p4wHas ? p4wSum : null,
  };
}

function cellValue(m: ColMetrics, famKey: string, sub: string): { v: number | null; pct?: boolean; signed?: boolean } {
  if (sub === 'pickupW') return { v: famKey === 'rn' ? m.pickupW : null, signed: true };
  if (sub === 'pickup4') return { v: famKey === 'rn' ? m.pickup4w : null, signed: true };
  const x = m[famKey as keyof ColMetrics] as FamVals;
  switch (sub) {
    case 'act': return { v: x.a };
    case 'budget': return { v: x.b };
    case 'variance': return { v: x.a != null && x.b != null ? x.a - x.b : null, signed: true };
    case 'variancePct': return { v: x.b ? ((x.a! - x.b) / x.b) * 100 : null, pct: true, signed: true };
    default: return { v: null };
  }
}

// Shared cell formatting for both the standard and transposed grids.
function formatCell(fam: typeof GRID_FAMILIES[number], sub: string, m: ColMetrics): { text: string; color: string; emphasize: boolean } {
  const { v, pct, signed } = cellValue(m, fam.key, sub);
  const emphasize = sub === 'act';
  if (v == null) return { text: '—', color: 'var(--text-muted)', emphasize };
  if (pct) return { text: `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, color: v >= 0 ? 'var(--success)' : 'var(--danger)', emphasize };
  if (signed) return { text: fmtSignedUnit(fam.unit, v), color: v >= 0 ? 'var(--success)' : 'var(--danger)', emphasize };
  return { text: fmtUnit(fam.unit, v), color: emphasize ? 'var(--primary)' : 'var(--text-secondary)', emphasize };
}

function SegmentGrid({ segment, month, isOcc, granularity }: { segment: SegmentKey; month: MonthFilter; isOcc: boolean; granularity: 'monthly' | 'daily' }) {
  const { getGridDaily, CAPACITY_2025, CAPACITY_2026 } = useOtb();
  const [compare, setCompare] = useState<CompareBasis>('budget');
  const [dayType, setDayType] = useState<DayType>('all');
  const compareRow = COMPARE_OPTIONS.find((o) => o.key === compare)!.row;
  // First family follows the Metric toggle: Room Nights or Occupancy %.
  const families = isOcc ? [OCC_FAMILY, ...GRID_FAMILIES.slice(1)] : GRID_FAMILIES;
  const daily = useMemo(() => getGridDaily(segment), [segment, getGridDaily]);

  // Monthly → 12 month columns. Daily → one column per day (full year = 365 cols w/ scroll,
  // or just the selected month). Both honour the weekday / weekend filter.
  const { columns, totalDays } = useMemo(() => {
    let days = granularity === 'daily' && month !== 'all'
      ? daily.filter((d) => Number(d.date.slice(5, 7)) === month)
      : daily;
    if (dayType !== 'all') days = days.filter((d) => isWeekend(d.date) === (dayType === 'weekend'));
    if (granularity === 'monthly') {
      const buckets = MONTH_ABBR.map((label) => ({ label, days: [] as GridDay[], pace: false, dow: '' }));
      days.forEach((d) => buckets[Number(d.date.slice(5, 7)) - 1].days.push(d));
      buckets.forEach((b) => { b.pace = b.days.length > 0 && b.days.every((x) => x.isPace); });
      return { columns: buckets.filter((b) => b.days.length > 0), totalDays: days };
    }
    const cols = days.map((d) => ({
      label: month === 'all' ? `${Number(d.date.slice(5, 7))}/${Number(d.date.slice(8, 10))}` : String(Number(d.date.slice(8, 10))),
      days: [d],
      pace: d.isPace,
      dow: dowAbbr(d.date),
    }));
    return { columns: cols, totalDays: days };
  }, [daily, month, dayType, granularity]);

  const colMetrics = useMemo(() => columns.map((c) => computeMetrics(c.days, compare, CAPACITY_2026, CAPACITY_2025)), [columns, compare, CAPACITY_2026, CAPACITY_2025]);
  const totalMetrics = useMemo(() => computeMetrics(totalDays, compare, CAPACITY_2026, CAPACITY_2025), [totalDays, compare, CAPACITY_2026, CAPACITY_2025]);

  const renderCell = (fam: typeof GRID_FAMILIES[number], sub: string, m: ColMetrics, key: string | number, isTotal: boolean) => {
    const { text, color, emphasize } = formatCell(fam, sub, m);
    return (
      <td key={key} className={`px-2 py-1 text-right tabular-nums ${isTotal ? 'sticky right-0 z-10 border-l' : ''}`}
        style={{ color, fontWeight: emphasize ? 600 : 400, borderColor: 'var(--border)', background: isTotal ? 'var(--muted)' : undefined }}>
        {text}
      </td>
    );
  };

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <div className="px-3 py-1.5 border-b flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {segment} — {granularity === 'monthly' ? 'monthly' : 'daily'} pace board{granularity === 'daily' ? (month === 'all' ? ' — full year' : ` — ${MONTH_FULL[month - 1]}`) : ''}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {DAYTYPE_OPTIONS.map((o) => (
              <button key={o.key} type="button" onClick={() => setDayType(o.key)}
                className="px-2.5 py-0.5 rounded border text-[0.625rem] font-semibold cursor-pointer transition-colors"
                style={{
                  background: dayType === o.key ? 'var(--accent)' : 'white',
                  color: dayType === o.key ? '#fff' : 'var(--text-secondary)',
                  borderColor: dayType === o.key ? 'var(--accent)' : 'var(--border)',
                }}>
                {o.label}
              </button>
            ))}
          </div>
          <span style={{ color: 'var(--border)' }}>|</span>
          <div className="flex gap-1">
            {COMPARE_OPTIONS.map((o) => (
              <button key={o.key} type="button" onClick={() => setCompare(o.key)}
                className="px-2.5 py-0.5 rounded border text-[0.625rem] font-semibold cursor-pointer transition-colors"
                style={{
                  background: compare === o.key ? 'var(--primary)' : 'white',
                  color: compare === o.key ? '#fff' : 'var(--text-secondary)',
                  borderColor: compare === o.key ? 'var(--primary)' : 'var(--border)',
                }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse text-[0.75rem] whitespace-nowrap">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="sticky left-0 z-10 bg-white px-3 py-1.5 text-left text-[0.625rem] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)', minWidth: 180 }}>Metric</th>
              {columns.map((c, i) => (
                <th key={i} className="px-2 py-1.5 text-right text-[0.625rem] font-semibold tabular-nums"
                  style={{ color: c.pace ? 'var(--text-muted)' : 'var(--text-secondary)', minWidth: 54 }}>
                  {c.dow && <div className="text-[0.5rem] font-normal" style={{ color: 'var(--text-muted)', lineHeight: 1 }}>{c.dow}</div>}
                  <div>{c.label}</div>
                </th>
              ))}
              <th className="sticky right-0 z-10 px-2 py-1.5 text-right text-[0.625rem] font-semibold uppercase tracking-wider border-l"
                style={{ color: 'var(--primary)', borderColor: 'var(--border)', minWidth: 66, background: 'var(--muted)' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {families.flatMap((fam, fi) => GRID_SUBROWS.map((sub) => {
              const label = sub === 'act' ? `${fam.label} (ACT/OTBs)`
                : sub === 'budget' ? `${fam.label} ${compareRow}`
                : sub === 'variance' ? 'Variance'
                : sub === 'variancePct' ? 'Variance%'
                : sub === 'pickupW' ? 'Last Week Pick Up' : 'Last 4 Weeks Pick Up';
              const emphasize = sub === 'act';
              return (
                <tr key={`${fam.key}-${sub}`}
                  style={{ borderTop: sub === 'act' && fi > 0 ? '2px solid var(--border)' : '1px solid var(--border)' }}>
                  <td className="sticky left-0 z-10 bg-white px-3 py-1 text-left"
                    style={{ color: emphasize ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: emphasize ? 600 : 400, minWidth: 180 }}>
                    {label}
                  </td>
                  {colMetrics.map((m, i) => renderCell(fam, sub, m, i, false))}
                  {renderCell(fam, sub, totalMetrics, 'total', true)}
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Placeholder for views not built yet (Monthly).
function BlankView({ label }: { label: string }) {
  return (
    <div className="bg-white border rounded-lg shadow-sm flex items-center justify-center" style={{ borderColor: 'var(--border)', minHeight: 260 }}>
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label} — próximamente</span>
    </div>
  );
}

// ---- Daily Segment: macro → micro hierarchical drill-down (segments × days) ----
// 3 levels per the budget mapping (the hotel level is already folded into the TC detail).
interface TreeNode { id: string; label: string; seg?: string; children?: TreeNode[] }
const leaf = (seg: string, label?: string): TreeNode => ({ id: label ?? seg, label: label ?? seg, seg });
const SEG_TREE: TreeNode[] = [
  { id: 'transient', label: 'Transient', children: [
    { id: 'retail', label: 'Retail', children: [leaf('General Retail')] },
    { id: 'discount', label: 'Discount', children: ['Advance Purchase', 'General Discount', 'OTA Opaque', 'Package-Promotion'].map((s) => leaf(s)) },
    { id: 'qualified', label: 'Qualified Discount', children: ['AAA', 'AARP', 'Government', 'General Qualified'].map((s) => leaf(s)) },
    { id: 'negotiated', label: 'Negotiated', children: ['Consortia', 'Corporate'].map((s) => leaf(s)) },
    { id: 'wholesale', label: 'Wholesale', children: [leaf('General Wholesale')] },
  ] },
  leaf('General Group', 'Group Sold'),
  leaf('Unsold Block'),
  { id: 'other', label: 'Other', children: [leaf('Comp-Permanent-Other'), leaf('Crew-Contract')] },
];
function segmentsOf(n: TreeNode): string[] {
  return n.seg ? [n.seg] : (n.children ?? []).flatMap(segmentsOf);
}

// Flattened hierarchical options for the Segment selector (Total → macro → sub → detail).
interface SegOption { id: string; label: string; depth: number; segs: TcSegment[] }
function buildSegOptions(tcSegments: TcSegment[]): SegOption[] {
  const out: SegOption[] = [{ id: '__total', label: 'Total', depth: 0, segs: tcSegments }];
  const walk = (nodes: TreeNode[], depth: number) => {
    for (const n of nodes) {
      out.push({ id: n.id, label: n.label, depth, segs: segmentsOf(n) as TcSegment[] });
      if (n.children) walk(n.children, depth + 1);
    }
  };
  walk(SEG_TREE, 0);
  return out;
}

const TREE_METRICS = [
  { key: 'rn', label: 'Room Nights', short: 'RN' },
  { key: 'occ', label: 'Occupancy %', short: 'OCC' },
  { key: 'rev', label: 'Rooms Revenue', short: 'Revenue' },
  { key: 'adr', label: 'ADR', short: 'ADR' },
  { key: 'revpar', label: 'RevPAR', short: 'RevPAR' },
];

function SegmentTree({ month }: { month: MonthFilter }) {
  const { getGridDaily, TC_SEGMENTS, CAPACITY_2025, CAPACITY_2026 } = useOtb();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dayType, setDayType] = useState<DayType>('all');
  const [compare, setCompare] = useState<CompareBasis>('budget');
  const [metricSel, setMetricSel] = useState('rn');
  const compareRow = COMPARE_OPTIONS.find((o) => o.key === compare)!.row;
  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const sample = useMemo(() => getGridDaily('General Discount'), [getGridDaily]);
  const dates = useMemo(() => sample.map((d) => d.date), [sample]);
  const paceFlags = useMemo(() => sample.map((d) => d.isPace), [sample]);
  const series = useMemo(() => {
    const mk = () => ({} as Record<string, number[]>);
    const rn = mk(), bud = mk(), ly = mk(), rev = mk(), budRev = mk(), revLy = mk();
    TC_SEGMENTS.forEach((seg) => {
      const g = getGridDaily(seg);
      rn[seg] = g.map((d) => d.rn); bud[seg] = g.map((d) => d.budgetRn); ly[seg] = g.map((d) => d.rnLy);
      rev[seg] = g.map((d) => d.rev); budRev[seg] = g.map((d) => d.budgetRev); revLy[seg] = g.map((d) => d.revLy);
    });
    return { rn, bud, ly, rev, budRev, revLy };
  }, [TC_SEGMENTS, getGridDaily]);

  const columns = useMemo(() => dates
    .map((dt, i) => ({ dt, i }))
    .filter(({ dt }) => (month === 'all' || Number(dt.slice(5, 7)) === month) && (dayType === 'all' || isWeekend(dt) === (dayType === 'weekend')))
    .map(({ dt, i }) => ({ idx: i, pace: paceFlags[i], dow: dowAbbr(dt), label: month === 'all' ? `${Number(dt.slice(5, 7))}/${Number(dt.slice(8, 10))}` : String(Number(dt.slice(8, 10))) })),
    [dates, paceFlags, month, dayType]);

  // Visible rows = depth-first walk honouring the expand state.
  const rows: { node: TreeNode; depth: number; expandable: boolean; segs: string[] }[] = [];
  const walk = (nodes: TreeNode[], depth: number) => {
    for (const n of nodes) {
      const expandable = !!n.children?.length;
      rows.push({ node: n, depth, expandable, segs: segmentsOf(n) });
      if (expandable && expanded.has(n.id)) walk(n.children!, depth + 1);
    }
  };
  walk(SEG_TREE, 0);

  const ALL = TC_SEGMENTS as unknown as string[];
  const colIdxs = columns.map((c) => c.idx);
  const actSeries = { rn: series.rn, rev: series.rev, cap: CAPACITY_2026 };
  const cmpSeries = compare === 'ly'
    ? { rn: series.ly, rev: series.revLy, cap: CAPACITY_2025 }
    : { rn: series.bud, rev: series.budRev, cap: CAPACITY_2026 };

  type Ser = { rn: Record<string, number[]>; rev: Record<string, number[]>; cap: number };
  const agg = (s: Ser, segs: string[], idxs: number[]) => {
    let rn = 0, rev = 0;
    for (const i of idxs) for (const seg of segs) { rn += s.rn[seg]?.[i] ?? 0; rev += s.rev[seg]?.[i] ?? 0; }
    return { rn, rev, n: idxs.length || 1 };
  };
  // Aggregate a metric (additive RN/Rev summed; ADR/RevPAR/OCC derived) for segs over day indices.
  const metricVal = (metric: string, s: Ser, segs: string[], idxs: number[]): number | null => {
    const { rn, rev, n } = agg(s, segs, idxs);
    if (metric === 'rn') return rn;
    if (metric === 'occ') return (rn / (s.cap * n)) * 100;
    if (metric === 'rev') return rev;
    if (metric === 'adr') return rn ? rev / rn : null;
    return rev / (s.cap * n); // revpar
  };
  const unitOf = (metric: string): GridUnit => (metric === 'rn' ? 'rn' : metric === 'occ' ? 'pct' : metric === 'rev' ? 'money' : 'rate');

  const actualText = (metric: string, segs: string[], idxs: number[], macro: boolean) => {
    const v = metricVal(metric, actSeries, segs, idxs);
    if (!v) return { t: '—', c: 'var(--text-muted)' };
    return { t: fmtUnit(unitOf(metric), v), c: macro ? 'var(--primary)' : 'var(--text-primary)' };
  };
  const varText = (metric: string, segs: string[], idxs: number[]) => {
    if (compare === 'forecast') return { t: '—', c: 'var(--text-muted)' };
    const a = metricVal(metric, actSeries, segs, idxs);
    const b = metricVal(metric, cmpSeries, segs, idxs);
    if (a == null || b == null) return { t: '—', c: 'var(--text-muted)' };
    const v = a - b;
    if (Math.abs(v) < (unitOf(metric) === 'pct' ? 0.05 : 0.5)) return { t: '—', c: 'var(--text-muted)' };
    return { t: fmtSignedUnit(unitOf(metric), v), c: v >= 0 ? 'var(--success)' : 'var(--danger)' };
  };

  // Variance % = (actual − comparison) / comparison, relative.
  const varPctText = (metric: string, segs: string[], idxs: number[]) => {
    if (compare === 'forecast') return { t: '—', c: 'var(--text-muted)' };
    const a = metricVal(metric, actSeries, segs, idxs);
    const b = metricVal(metric, cmpSeries, segs, idxs);
    if (a == null || b == null || !b) return { t: '—', c: 'var(--text-muted)' };
    const pct = ((a - b) / b) * 100;
    if (Math.abs(pct) < 0.05) return { t: '—', c: 'var(--text-muted)' };
    return { t: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, c: pct >= 0 ? 'var(--success)' : 'var(--danger)' };
  };
  type CellMode = 'actual' | 'var' | 'pct';
  const cellText = (mode: CellMode, metric: string, segs: string[], idxs: number[], macro: boolean) =>
    mode === 'actual' ? actualText(metric, segs, idxs, macro) : mode === 'var' ? varText(metric, segs, idxs) : varPctText(metric, segs, idxs);

  const rowCells = (mode: CellMode, metric: string, segs: string[], macro: boolean) =>
    columns.map((c, i) => {
      const { t, c: color } = cellText(mode, metric, segs, [c.idx], macro);
      return <td key={i} className="px-2 py-0.5 text-right tabular-nums" style={{ color, fontWeight: mode === 'actual' && macro ? 600 : 400 }}>{t}</td>;
    });
  const totalCell = (mode: CellMode, metric: string, segs: string[], macro: boolean, bold: boolean) => {
    const { t, c } = cellText(mode, metric, segs, colIdxs, macro);
    return <td className={`sticky right-0 z-10 px-2 py-0.5 text-right tabular-nums border-l ${bold ? 'font-bold' : 'font-semibold'}`} style={{ background: 'var(--muted)', color: c, borderColor: 'var(--border)' }}>{t}</td>;
  };
  const subLabelCell = (depth: number, macro: boolean, text: string) => (
    <td className="sticky left-0 z-10 px-3 text-left" style={{ background: macro ? 'var(--muted)' : 'white', minWidth: 210 }}>
      <span className="uppercase tracking-wider" style={{ paddingLeft: depth * 16 + 18, color: 'var(--text-muted)', fontSize: '0.5625rem' }}>{text}</span>
    </td>
  );

  // Single hierarchical drill-down table; metric selector + filters live inside the header.
  const metricTable = (metric: string) => (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <div className="px-3 py-1.5 border-b flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
        <div className="flex gap-1">
          {TREE_METRICS.map((m) => (
            <button key={m.key} type="button" onClick={() => setMetricSel(m.key)}
              className="px-3 py-0.5 rounded-md border text-[0.6875rem] font-semibold cursor-pointer transition-colors"
              style={{ background: metricSel === m.key ? 'var(--primary)' : 'white', color: metricSel === m.key ? '#fff' : 'var(--text-secondary)', borderColor: metricSel === m.key ? 'var(--primary)' : 'var(--border)' }}>
              {m.short}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {DAYTYPE_OPTIONS.map((o) => (
              <button key={o.key} type="button" onClick={() => setDayType(o.key)}
                className="px-2.5 py-0.5 rounded border text-[0.625rem] font-semibold cursor-pointer transition-colors"
                style={{ background: dayType === o.key ? 'var(--accent)' : 'white', color: dayType === o.key ? '#fff' : 'var(--text-secondary)', borderColor: dayType === o.key ? 'var(--accent)' : 'var(--border)' }}>
                {o.label}
              </button>
            ))}
          </div>
          <span style={{ color: 'var(--border)' }}>|</span>
          <div className="flex gap-1">
            {COMPARE_OPTIONS.map((o) => (
              <button key={o.key} type="button" onClick={() => setCompare(o.key)}
                className="px-2.5 py-0.5 rounded border text-[0.625rem] font-semibold cursor-pointer transition-colors"
                style={{ background: compare === o.key ? 'var(--primary)' : 'white', color: compare === o.key ? '#fff' : 'var(--text-secondary)', borderColor: compare === o.key ? 'var(--primary)' : 'var(--border)' }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-auto" style={{ maxHeight: 560 }}>
        <table className="border-collapse text-[0.75rem] whitespace-nowrap">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="sticky left-0 top-0 z-20 bg-white px-3 py-1 text-left text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', minWidth: 210 }}>Segment</th>
              {columns.map((c, i) => (
                <th key={i} className="sticky top-0 z-10 px-2 py-1 text-right text-[0.625rem] font-semibold tabular-nums" style={{ color: c.pace ? 'var(--text-muted)' : 'var(--text-secondary)', background: 'white', minWidth: 50 }}>
                  <div className="text-[0.5rem] font-normal" style={{ color: 'var(--text-muted)', lineHeight: 1 }}>{c.dow}</div>
                  <div>{c.label}</div>
                </th>
              ))}
              <th className="sticky right-0 top-0 z-20 px-2 py-1 text-right text-[0.625rem] font-semibold uppercase border-l" style={{ color: 'var(--primary)', background: 'var(--muted)', borderColor: 'var(--border)', minWidth: 64 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ node, depth, expandable, segs }) => {
              const macro = depth === 0;
              const isOpen = expanded.has(node.id);
              return (
                <Fragment key={node.id}>
                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td className="sticky left-0 z-10 px-3 pt-1 text-left" style={{ background: macro ? 'var(--muted)' : 'white', minWidth: 210 }}>
                      <button type="button" onClick={() => expandable && toggle(node.id)}
                        className={`inline-flex items-center gap-1 ${expandable ? 'cursor-pointer' : 'cursor-default'}`}
                        style={{ paddingLeft: depth * 16, color: macro ? 'var(--primary)' : 'var(--text-primary)', fontWeight: macro ? 700 : depth === 1 ? 600 : 400 }}>
                        {expandable ? (isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <span style={{ width: 13, display: 'inline-block' }} />}
                        {node.label}
                      </button>
                    </td>
                    {rowCells('actual', metric, segs, macro)}
                    {totalCell('actual', metric, segs, macro, false)}
                  </tr>
                  <tr>
                    {subLabelCell(depth, macro, `vs ${compareRow}`)}
                    {rowCells('var', metric, segs, macro)}
                    {totalCell('var', metric, segs, macro, false)}
                  </tr>
                  <tr>
                    {subLabelCell(depth, macro, `vs ${compareRow} %`)}
                    {rowCells('pct', metric, segs, macro)}
                    {totalCell('pct', metric, segs, macro, false)}
                  </tr>
                </Fragment>
              );
            })}
            <tr style={{ borderTop: '2px solid var(--border)' }}>
              <td className="sticky left-0 z-10 px-3 pt-1 text-left font-bold" style={{ background: 'var(--muted)', color: 'var(--primary)', minWidth: 210 }}>Total</td>
              {rowCells('actual', metric, ALL, true)}
              {totalCell('actual', metric, ALL, true, true)}
            </tr>
            <tr>
              {subLabelCell(0, true, `vs ${compareRow}`)}
              {rowCells('var', metric, ALL, true)}
              {totalCell('var', metric, ALL, true, true)}
            </tr>
            <tr>
              {subLabelCell(0, true, `vs ${compareRow} %`)}
              {rowCells('pct', metric, ALL, true)}
              {totalCell('pct', metric, ALL, true, true)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return metricTable(metricSel);
}

// ---- helpers ----
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function fmtMonth(iso: string) {
  const m = Number(iso.slice(5, 7));
  return MONTH_ABBR[m - 1] ?? iso;
}

interface TooltipEntry { dataKey: string | number; value: number | string | null; color?: string; name?: string }
function ChartTooltip({ active, payload, label, fmt }: {
  active?: boolean; payload?: TooltipEntry[]; label?: string | number;
  fmt?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((e) => e.value != null);
  if (!rows.length) return null;
  const format = fmt ?? fmtRn;
  return (
    <div className="bg-white border rounded-lg px-3 py-2 shadow-sm text-xs" style={{ borderColor: 'var(--border)' }}>
      <div className="font-semibold mb-1" style={{ color: 'var(--primary)' }}>{label}</div>
      {rows.map((e) => (
        <div key={String(e.dataKey)} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: e.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{e.name}</span>
          </span>
          <span className="font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>
            {format(typeof e.value === 'number' ? e.value : Number(e.value))}
          </span>
        </div>
      ))}
    </div>
  );
}
