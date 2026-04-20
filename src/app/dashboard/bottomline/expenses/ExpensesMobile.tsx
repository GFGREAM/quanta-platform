'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, SlidersHorizontal, X, TrendingUp, TrendingDown } from 'lucide-react';
import {
  DEPT_COSTS,
  NON_DISTRIBUTED,
  HOTELS,
  YEARS,
  MONTHS,
  MONTHS_SHORT,
  SCOPE_LABEL,
  SEGMENT_COLORS,
  selectStyle,
  viewItem,
  sumMonthlySeries,
  sumScalar,
  fmtMoneyShort,
  fmtVarDollar,
  fmtPct,
  varColor,
  varBg,
  type Timeframe,
  type TrendScope,
  type LineItem,
  type MonthlyLineItem,
  type Group,
} from './data';

type Props = {
  hotel: string; setHotel: (v: string) => void;
  year: string; setYear: (v: string) => void;
  month: string; setMonth: (v: string) => void;
  timeframe: Timeframe; setTimeframe: (v: Timeframe) => void;
};

export default function ExpensesMobile({
  hotel, setHotel, year, setYear, month, setMonth, timeframe, setTimeframe,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const monthIdx = MONTHS.indexOf(month as typeof MONTHS[number]);

  const viewedDept = useMemo(
    () => DEPT_COSTS.map((it) => viewItem(it, monthIdx, timeframe)),
    [monthIdx, timeframe],
  );
  const viewedNonDist = useMemo(
    () => NON_DISTRIBUTED.map((it) => viewItem(it, monthIdx, timeframe)),
    [monthIdx, timeframe],
  );
  const allItems = useMemo(() => [...viewedDept, ...viewedNonDist], [viewedDept, viewedNonDist]);

  const viewedGroups = useMemo<Group[]>(
    () => [
      { key: 'dept', label: 'Dept Costs', items: viewedDept },
      { key: 'nondist', label: 'Non-Distributed', items: viewedNonDist },
    ],
    [viewedDept, viewedNonDist],
  );

  const totals = useMemo(() => {
    const deptAct = sumScalar(viewedDept, 'act');
    const deptBud = sumScalar(viewedDept, 'bud');
    const deptLy = sumScalar(viewedDept, 'actLy');
    const ndAct = sumScalar(viewedNonDist, 'act');
    const ndBud = sumScalar(viewedNonDist, 'bud');
    const ndLy = sumScalar(viewedNonDist, 'actLy');
    return {
      deptAct, deptBud, deptLy,
      ndAct, ndBud, ndLy,
      gtAct: deptAct + ndAct,
      gtBud: deptBud + ndBud,
      gtLy: deptLy + ndLy,
    };
  }, [viewedDept, viewedNonDist]);

  const drivers = useMemo(() => {
    const withVar = allItems.map((it) => ({
      name: it.name.replace(/^Total /, ''),
      diff: it.act - it.bud,
      pct: it.bud !== 0 ? ((it.act - it.bud) / it.bud) * 100 : 0,
    }));
    const overruns = withVar.filter((d) => d.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 5);
    const savings = withVar.filter((d) => d.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 5);
    return { overruns, savings };
  }, [allItems]);

  const netVar = totals.gtAct - totals.gtBud;

  return (
    <div className="flex flex-col gap-4" style={{ color: 'var(--text-primary)' }}>
      {/* Compact breadcrumb */}
      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>Bottom Line</span>
        <ChevronRight size={12} />
        <span>Expenses</span>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--primary)' }}>Departmental</span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
          Expenses
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Operating expense vs Budget & LY
        </p>
      </div>

      {/* Filter summary chip row */}
      <button
        onClick={() => setFiltersOpen(true)}
        className="flex items-center justify-between gap-3 bg-white border rounded-lg px-3 py-2.5 cursor-pointer text-left"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SlidersHorizontal size={16} style={{ color: 'var(--text-secondary)' }} />
          <div className="flex items-center gap-1.5 flex-wrap text-[0.8125rem]" style={{ color: 'var(--primary)' }}>
            <span className="font-semibold">{hotel}</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span>{month} {year}</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span className="font-semibold">{timeframe}</span>
          </div>
        </div>
        <span className="text-[0.75rem] font-medium" style={{ color: 'var(--accent)' }}>Edit</span>
      </button>

      {/* KPI grid 2x2 */}
      <div className="grid grid-cols-2 gap-2.5">
        <MobileKpi
          label="Grand Total"
          value={fmtMoneyShort(totals.gtAct)}
          varValue={totals.gtAct - totals.gtBud}
          accent="var(--danger)"
        />
        <MobileKpi
          label="Dept Costs"
          value={fmtMoneyShort(totals.deptAct)}
          varValue={totals.deptAct - totals.deptBud}
          accent="var(--warning)"
        />
        <MobileKpi
          label="Non-Distributed"
          value={fmtMoneyShort(totals.ndAct)}
          varValue={totals.ndAct - totals.ndBud}
          accent="var(--info)"
        />
        <MobileKpi
          label="Net Variance"
          value={fmtVarDollar(netVar)}
          valueColor={netVar <= 0 ? 'var(--success)' : 'var(--danger)'}
          accent={netVar <= 0 ? 'var(--success)' : 'var(--danger)'}
          subLabel={netVar < 0 ? 'Favorable' : netVar > 0 ? 'Unfavorable' : 'On budget'}
        />
      </div>

      {/* Variance drivers */}
      <SectionHeader title="Variance Drivers" subtitle="Top ± vs Budget" />
      <MobileDriverCard
        title="Overruns" subtitle="Exceeded Budget"
        color="var(--danger)" icon={<TrendingUp size={15} />}
        rows={drivers.overruns} sign="+"
      />
      <MobileDriverCard
        title="Savings" subtitle="Below Budget"
        color="var(--success)" icon={<TrendingDown size={15} />}
        rows={drivers.savings} sign="−"
      />

      {/* Detailed breakdown as card list */}
      <SectionHeader title="Detailed Breakdown" subtitle="Tap any department to expand" />
      <div className="flex flex-col gap-2">
        {viewedGroups.map((g, gIdx) => (
          <Fragment key={g.key}>
            {g.items.map((it) => {
              const key = `${g.key}::${it.name}`;
              const isExpanded = expandedRows.has(key);
              return (
                <MobileBreakdownCard
                  key={key}
                  item={it}
                  expanded={isExpanded}
                  onToggle={() => toggleRow(key)}
                />
              );
            })}
            <MobileSubtotalCard
              label={g.label}
              act={gIdx === 0 ? totals.deptAct : totals.ndAct}
              bud={gIdx === 0 ? totals.deptBud : totals.ndBud}
              actLy={gIdx === 0 ? totals.deptLy : totals.ndLy}
            />
          </Fragment>
        ))}
        <MobileGrandTotalCard act={totals.gtAct} bud={totals.gtBud} actLy={totals.gtLy} />
      </div>

      {/* Expense composition — horizontal scrollable */}
      <SectionHeader title="Expense Composition" subtitle="Actual vs Budget" />
      <MobileComposition items={allItems} />

      {/* Expense progression — scrollable chart */}
      <MobileProgression currentMonthIndex={monthIdx} />

      {/* Filter sheet */}
      {filtersOpen && (
        <FilterSheet
          hotel={hotel} setHotel={setHotel}
          year={year} setYear={setYear}
          month={month} setMonth={setMonth}
          timeframe={timeframe} setTimeframe={setTimeframe}
          onClose={() => setFiltersOpen(false)}
        />
      )}
    </div>
  );
}

// ─── KPI card (mobile) ────────────────────────────────────────
function MobileKpi({
  label, value, varValue, valueColor, subLabel, accent,
}: {
  label: string;
  value: string;
  varValue?: number;
  valueColor?: string;
  subLabel?: string;
  accent: string;
}) {
  const varColorResolved = varValue === undefined
    ? undefined
    : varValue <= 0 ? 'var(--success)' : 'var(--danger)';
  const sub = subLabel ?? (varValue !== undefined ? `vs BUD ${fmtVarDollar(varValue)}` : undefined);

  return (
    <div
      className="relative overflow-hidden rounded-lg border bg-white p-3 flex flex-col gap-1"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-lg font-bold leading-tight tracking-tight" style={{ color: valueColor ?? 'var(--primary)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-[0.6875rem]" style={{ color: varColorResolved ?? 'var(--text-secondary)' }}>
          {sub}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: accent }} />
    </div>
  );
}

// ─── Driver card (mobile) ─────────────────────────────────────
function MobileDriverCard({
  title, subtitle, color, icon, rows, sign,
}: {
  title: string;
  subtitle: string;
  color: string;
  icon: React.ReactNode;
  rows: { name: string; diff: number; pct: number }[];
  sign: string;
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.diff)), 1);
  return (
    <div
      className="bg-white border rounded-lg p-4 flex flex-col gap-3"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <div>
          <div className="text-[0.8125rem] font-bold" style={{ color }}>{title}</div>
          <div className="text-[0.6875rem]" style={{ color: 'var(--text-secondary)' }}>{subtitle}</div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const width = (Math.abs(r.diff) / max) * 100;
          return (
            <div key={r.name} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.8125rem] font-medium truncate" style={{ color: 'var(--primary)' }}>
                  {r.name}
                </span>
                <span className="text-[0.75rem] font-semibold shrink-0" style={{ color }}>
                  {sign}${Math.abs(r.diff).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  <span className="ml-1 font-normal" style={{ color: 'var(--text-muted)' }}>
                    ({sign}{Math.abs(r.pct).toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="h-1.5 rounded-sm" style={{ background: 'var(--muted)' }}>
                <div
                  className="h-full rounded-sm border-l-2"
                  style={{
                    width: `${width}%`,
                    background: `color-mix(in srgb, ${color} 35%, transparent)`,
                    borderColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Breakdown card (mobile) ──────────────────────────────────
function MobileBreakdownCard({
  item, expanded, onToggle,
}: {
  item: LineItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const diffBud = item.act - item.bud;
  const pctBud = item.bud ? (diffBud / item.bud) * 100 : 0;
  const diffLy = item.act - item.actLy;
  const pctLy = item.actLy ? (diffLy / item.actLy) * 100 : 0;

  return (
    <div className="bg-white border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-3 text-left cursor-pointer"
        style={{ background: 'transparent', border: 'none' }}
      >
        <span className="shrink-0">
          {expanded
            ? <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
            : <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />}
        </span>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="text-[0.875rem] font-semibold" style={{ color: 'var(--primary)' }}>
            {item.name}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-[0.6875rem]">
            <span style={{ color: 'var(--text-secondary)' }}>
              ACT <span className="font-semibold" style={{ color: 'var(--primary)' }}>{fmtMoneyShort(item.act)}</span>
            </span>
            <VarChip label="BUD" diff={diffBud} pct={pctBud} act={item.act} bud={item.bud} />
            <VarChip label="LY" diff={diffLy} pct={pctLy} act={item.act} bud={item.actLy} />
          </div>
        </div>
      </button>
      {expanded && item.subLines && item.subLines.length > 0 && (
        <div className="border-t flex flex-col" style={{ borderColor: 'var(--border)', background: 'rgba(245,245,245,0.6)' }}>
          {item.subLines.map((sl) => (
            <MobileSubLine key={sl.name} item={sl} />
          ))}
        </div>
      )}
    </div>
  );
}

function MobileSubLine({ item }: { item: { name: string; act: number; bud: number; actLy: number } }) {
  const diffBud = item.act - item.bud;
  const pctBud = item.bud ? (diffBud / item.bud) * 100 : 0;
  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-2 border-t first:border-t-0"
      style={{ borderColor: 'var(--border)' }}
    >
      <span className="text-[0.8125rem] truncate" style={{ color: 'var(--text-secondary)' }}>
        {item.name}
      </span>
      <div className="flex items-center gap-2 shrink-0 text-[0.75rem]">
        <span style={{ color: 'var(--primary)' }}>{fmtMoneyShort(item.act)}</span>
        <span
          className="px-1.5 py-0.5 rounded-sm font-semibold"
          style={{ color: varColor(item.act, item.bud), background: varBg(item.act, item.bud) }}
        >
          {fmtPct(pctBud)}
        </span>
      </div>
    </div>
  );
}

function VarChip({
  label, diff, pct, act, bud,
}: {
  label: string; diff: number; pct: number; act: number; bud: number;
}) {
  const color = varColor(act, bud);
  const bg = varBg(act, bud);
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-semibold"
      style={{ color, background: bg }}
    >
      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      {fmtVarDollar(diff)}
      <span className="font-normal">({fmtPct(pct)})</span>
    </span>
  );
}

function MobileSubtotalCard({
  label, act, bud, actLy,
}: {
  label: string; act: number; bud: number; actLy: number;
}) {
  const diffBud = act - bud;
  const pctBud = bud ? (diffBud / bud) * 100 : 0;
  const diffLy = act - actLy;
  const pctLy = actLy ? (diffLy / actLy) * 100 : 0;
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-1.5 border"
      style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
    >
      <div className="text-[0.75rem] font-bold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
        {label} Subtotal
      </div>
      <div className="text-[1.125rem] font-bold" style={{ color: 'var(--primary)' }}>
        {fmtMoneyShort(act)}
      </div>
      <div className="flex items-center gap-2 flex-wrap text-[0.6875rem]">
        <VarChip label="BUD" diff={diffBud} pct={pctBud} act={act} bud={bud} />
        <VarChip label="LY" diff={diffLy} pct={pctLy} act={act} bud={actLy} />
      </div>
    </div>
  );
}

function MobileGrandTotalCard({ act, bud, actLy }: { act: number; bud: number; actLy: number }) {
  const diffBud = act - bud;
  const pctBud = bud ? (diffBud / bud) * 100 : 0;
  const diffLy = act - actLy;
  const pctLy = actLy ? (diffLy / actLy) * 100 : 0;
  const overBud = act > bud;
  const overLy = act > actLy;
  return (
    <div className="rounded-lg p-4 flex flex-col gap-2" style={{ background: 'var(--primary)' }}>
      <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-white/70">
        Grand Total Expenses
      </div>
      <div className="text-2xl font-bold text-white">{fmtMoneyShort(act)}</div>
      <div className="flex flex-col gap-1 text-[0.75rem]">
        <div className="flex items-center justify-between">
          <span className="text-white/70">vs Budget {fmtMoneyShort(bud)}</span>
          <span className="font-semibold" style={{ color: overBud ? '#FCA5A5' : '#6EE7B7' }}>
            {fmtVarDollar(diffBud)} ({fmtPct(pctBud)})
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/70">vs LY {fmtMoneyShort(actLy)}</span>
          <span className="font-semibold" style={{ color: overLy ? '#FCA5A5' : '#6EE7B7' }}>
            {fmtVarDollar(diffLy)} ({fmtPct(pctLy)})
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Composition (mobile) ─────────────────────────────────────
function MobileComposition({ items }: { items: LineItem[] }) {
  const totalAct = items.reduce((s, i) => s + i.act, 0);
  const totalBud = items.reduce((s, i) => s + i.bud, 0);
  const labels = items.map((i) => i.name.replace(/^Total /, ''));

  return (
    <div className="bg-white border rounded-lg p-4 flex flex-col gap-4" style={{ borderColor: 'var(--border)' }}>
      <MobileStackedBar label="Actual" items={items} total={totalAct} accessor="act" />
      <MobileStackedBar label="Budget" items={items} total={totalBud} accessor="bud" />
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1">
        {labels.map((l, idx) => (
          <div key={l} className="flex items-center gap-1.5 text-[0.6875rem]" style={{ color: 'var(--text-secondary)' }}>
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ background: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }}
            />
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileStackedBar({
  label, items, total, accessor,
}: {
  label: string; items: LineItem[]; total: number; accessor: 'act' | 'bud';
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[0.75rem] font-semibold" style={{ color: 'var(--primary)' }}>{label}</span>
        <span className="text-[0.75rem]" style={{ color: 'var(--text-secondary)' }}>{fmtMoneyShort(total)}</span>
      </div>
      <div className="h-8 rounded-md overflow-hidden flex border" style={{ borderColor: 'var(--border)' }}>
        {items.map((it, idx) => {
          const pct = (it[accessor] / total) * 100;
          const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
          const short = it.name.replace(/^Total /, '');
          return (
            <div
              key={it.name}
              title={`${short}: ${fmtMoneyShort(it[accessor])} (${pct.toFixed(1)}%)`}
              className="h-full"
              style={{ width: `${pct}%`, background: color }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Progression (mobile) ─────────────────────────────────────
function MobileProgression({ currentMonthIndex }: { currentMonthIndex: number }) {
  const [scope, setScope] = useState<TrendScope>('total');

  const scopeItems = useMemo<MonthlyLineItem[]>(() => {
    if (scope === 'dept') return DEPT_COSTS;
    if (scope === 'nondist') return NON_DISTRIBUTED;
    return [...DEPT_COSTS, ...NON_DISTRIBUTED];
  }, [scope]);

  const series = useMemo(() => ({
    cy: sumMonthlySeries(scopeItems, 'cy'),
    bud: sumMonthlySeries(scopeItems, 'bud'),
    ly: sumMonthlySeries(scopeItems, 'ly'),
  }), [scopeItems]);

  const safeIdx = currentMonthIndex >= 0 ? currentMonthIndex : 11;
  const currentCy = series.cy[safeIdx];
  const budDelta = currentCy - series.bud[safeIdx];
  const budPct = series.bud[safeIdx] ? (budDelta / series.bud[safeIdx]) * 100 : 0;
  const lyDelta = currentCy - series.ly[safeIdx];
  const lyPct = series.ly[safeIdx] ? (lyDelta / series.ly[safeIdx]) * 100 : 0;
  const budColor = budDelta <= 0 ? 'var(--success)' : 'var(--danger)';
  const lyColor = lyDelta <= 0 ? 'var(--success)' : 'var(--danger)';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold m-0" style={{ color: 'var(--primary)' }}>Expense Progression</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {SCOPE_LABEL[scope]}
          </p>
        </div>
      </div>

      {/* Scope toggle — horizontally scrollable */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div
          className="inline-flex h-9 rounded-md border overflow-hidden"
          style={{ borderColor: 'var(--border)' }}
        >
          {(['dept', 'nondist', 'total'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className="px-3 text-[0.75rem] font-medium cursor-pointer transition-colors border-none whitespace-nowrap"
              style={{
                background: scope === s ? 'var(--muted)' : 'transparent',
                color: scope === s ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: scope === s ? 600 : 500,
              }}
            >
              {SCOPE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-lg p-3 flex flex-col gap-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex gap-4 flex-wrap">
          <MiniStatMobile label={`${MONTHS_SHORT[safeIdx]} actual`} value={fmtMoneyShort(currentCy)} />
          <MiniStatMobile
            label="vs BUD"
            value={`${budDelta > 0 ? '+' : ''}${budPct.toFixed(1)}%`}
            valueColor={budColor}
          />
          <MiniStatMobile
            label="vs LY"
            value={`${lyDelta > 0 ? '+' : ''}${lyPct.toFixed(1)}%`}
            valueColor={lyColor}
          />
        </div>

        {/* Scrollable chart — keeps desktop fidelity */}
        <div className="overflow-x-auto -mx-1">
          <div className="min-w-[680px] px-1">
            <MobileLineChart
              cy={series.cy}
              bud={series.bud}
              ly={series.ly}
              currentIdx={safeIdx}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-[0.6875rem] pt-1 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5" style={{ background: 'var(--primary)' }} />
            CY
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-0" style={{ borderTop: '2px dashed var(--accent)' }} />
            BUD
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-0" style={{ borderTop: '2px dotted var(--text-secondary)' }} />
            LY
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniStatMobile({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <div className="text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-[0.9375rem] font-bold" style={{ color: valueColor ?? 'var(--primary)' }}>
        {value}
      </div>
    </div>
  );
}

function MobileLineChart({
  cy, bud, ly, currentIdx,
}: {
  cy: number[]; bud: number[]; ly: number[]; currentIdx: number;
}) {
  const W = 720, H = 260, padL = 50, padR = 12, padT = 12, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const all = [...cy, ...bud, ...ly];
  const minV = Math.min(...all);
  const maxV = Math.max(...all);
  const range = maxV - minV || 1;
  const yMin = minV - range * 0.08;
  const yMax = maxV + range * 0.08;

  const x = (i: number) => padL + (i / (MONTHS_SHORT.length - 1)) * innerW;
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;
  const pathFor = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');

  const ticks = 3;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      {tickVals.map((v, i) => (
        <g key={i}>
          <line
            x1={padL} x2={W - padR} y1={y(v)} y2={y(v)}
            stroke="var(--border)"
            strokeDasharray={i === 0 || i === ticks ? undefined : '3 3'}
            strokeWidth={1}
          />
          <text x={padL - 6} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="var(--text-muted)">
            {fmtMoneyShort(v)}
          </text>
        </g>
      ))}
      {MONTHS_SHORT.map((m, i) => (
        <text
          key={m} x={x(i)} y={H - padB + 16} textAnchor="middle" fontSize="10"
          fill={i === currentIdx ? 'var(--primary)' : 'var(--text-muted)'}
          fontWeight={i === currentIdx ? 600 : 400}
        >
          {m}
        </text>
      ))}
      <path d={pathFor(ly)} fill="none" stroke="var(--text-secondary)" strokeWidth={2} strokeDasharray="2 3"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d={pathFor(bud)} fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="6 4"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d={pathFor(cy)} fill="none" stroke="var(--primary)" strokeWidth={2.25}
        strokeLinecap="round" strokeLinejoin="round" />
      {cy.map((v, i) => (
        <circle
          key={i} cx={x(i)} cy={y(v)}
          r={i === currentIdx ? 5 : 3}
          fill={i === currentIdx ? 'var(--accent)' : 'var(--primary)'}
          stroke="#fff" strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

// ─── Filter sheet (mobile modal) ──────────────────────────────
function FilterSheet({
  hotel, setHotel, year, setYear, month, setMonth, timeframe, setTimeframe, onClose,
}: Props & { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end"
      style={{ background: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-t-2xl p-5 flex flex-col gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold m-0" style={{ color: 'var(--primary)' }}>Filters</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        <FilterRow label="Hotel">
          <select
            className="w-full h-10 px-3 pr-8 rounded-md border text-sm bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
            style={selectStyle}
            value={hotel}
            onChange={(e) => setHotel(e.target.value)}
          >
            {HOTELS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </FilterRow>

        <FilterRow label="Year">
          <select
            className="w-full h-10 px-3 pr-8 rounded-md border text-sm bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
            style={selectStyle}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </FilterRow>

        <FilterRow label="Month">
          <select
            className="w-full h-10 px-3 pr-8 rounded-md border text-sm bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
            style={selectStyle}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </FilterRow>

        <FilterRow label="Timeframe">
          <div className="flex h-10 rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            {(['MTD', 'YTD'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className="flex-1 text-sm font-medium cursor-pointer transition-colors border-none"
                style={{
                  background: timeframe === t ? 'var(--muted)' : 'transparent',
                  color: timeframe === t ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: timeframe === t ? 600 : 500,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </FilterRow>

        <button
          onClick={onClose}
          className="h-11 rounded-md text-sm font-semibold cursor-pointer mt-1"
          style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

// ─── Shared ───────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-[0.9375rem] font-bold m-0" style={{ color: 'var(--primary)' }}>{title}</h2>
      {subtitle && (
        <p className="text-[0.6875rem] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
      )}
    </div>
  );
}
