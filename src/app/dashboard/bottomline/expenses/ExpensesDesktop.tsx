'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import KpiCard from '@/components/ui/KpiCard';
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

export default function ExpensesDesktop({
  hotel, setHotel, year, setYear, month, setMonth, timeframe, setTimeframe,
}: Props) {
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
      { key: 'dept', label: 'Grand Total Dept Costs', items: viewedDept },
      { key: 'nondist', label: 'Grand Total Non-Distributed', items: viewedNonDist },
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
    const gtAct = deptAct + ndAct;
    const gtBud = deptBud + ndBud;
    const gtLy = deptLy + ndLy;
    return { deptAct, deptBud, deptLy, ndAct, ndBud, ndLy, gtAct, gtBud, gtLy };
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
    <div className="flex flex-col gap-5" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Bottom Line</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Expenses</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--primary)' }}>Departmental</span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
          Expenses
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Operating expense performance vs Budget and Last Year
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          className="h-9 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={selectStyle}
          value={hotel}
          onChange={(e) => setHotel(e.target.value)}
        >
          {HOTELS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select
          className="h-9 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={selectStyle}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          className="h-9 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={selectStyle}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <div className="flex h-9 rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {(['MTD', 'YTD'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className="px-3.5 text-[0.8125rem] font-medium cursor-pointer transition-colors border-none"
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
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2">
        <KpiCard
          label="Grand Total Expenses"
          value={fmtMoneyShort(totals.gtAct)}
          sub={`vs BUD ${fmtVarDollar(totals.gtAct - totals.gtBud)} · vs LY ${fmtVarDollar(totals.gtAct - totals.gtLy)}`}
          color="var(--primary)"
          accent="var(--danger)"
        />
        <KpiCard
          label="Dept Costs"
          value={fmtMoneyShort(totals.deptAct)}
          sub={`vs BUD ${fmtVarDollar(totals.deptAct - totals.deptBud)} · vs LY ${fmtVarDollar(totals.deptAct - totals.deptLy)}`}
          color="var(--primary)"
          accent="var(--warning)"
        />
        <KpiCard
          label="Non-Distributed"
          value={fmtMoneyShort(totals.ndAct)}
          sub={`vs BUD ${fmtVarDollar(totals.ndAct - totals.ndBud)} · vs LY ${fmtVarDollar(totals.ndAct - totals.ndLy)}`}
          color="var(--primary)"
          accent="var(--info)"
        />
        <KpiCard
          label="Net Variance vs Budget"
          value={fmtVarDollar(netVar)}
          sub={netVar < 0 ? 'Favorable' : netVar > 0 ? 'Unfavorable' : 'On budget'}
          color={netVar <= 0 ? 'var(--success)' : 'var(--danger)'}
          accent={netVar <= 0 ? 'var(--success)' : 'var(--danger)'}
        />
      </div>

      <VarianceDrivers overruns={drivers.overruns} savings={drivers.savings} />
      <DetailedBreakdown
        groups={viewedGroups}
        totals={totals}
        expandedRows={expandedRows}
        toggleRow={toggleRow}
      />
      <ExpenseComposition items={allItems} />
      <ExpenseProgression currentMonthIndex={monthIdx} />
    </div>
  );
}

// ─── Variance drivers ─────────────────────────────────────────
function VarianceDrivers({
  overruns,
  savings,
}: {
  overruns: { name: string; diff: number; pct: number }[];
  savings: { name: string; diff: number; pct: number }[];
}) {
  const maxOver = Math.max(...overruns.map((o) => Math.abs(o.diff)), 1);
  const maxSave = Math.max(...savings.map((s) => Math.abs(s.diff)), 1);

  return (
    <div>
      <SectionHeader title="Variance Drivers vs Budget" />
      <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
        <DriverCard
          title="Overruns"
          subtitle="Exceeded Budget"
          color="var(--danger)"
          icon={<TrendingUp size={16} />}
          rows={overruns}
          max={maxOver}
          sign="+"
        />
        <DriverCard
          title="Savings"
          subtitle="Below Budget"
          color="var(--success)"
          icon={<TrendingDown size={16} />}
          rows={savings}
          max={maxSave}
          sign="−"
        />
      </div>
    </div>
  );
}

function DriverCard({
  title, subtitle, color, icon, rows, max, sign,
}: {
  title: string;
  subtitle: string;
  color: string;
  icon: React.ReactNode;
  rows: { name: string; diff: number; pct: number }[];
  max: number;
  sign: string;
}) {
  return (
    <div
      className="bg-white border rounded-lg p-5 flex flex-col gap-4"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <div>
          <div className="text-sm font-bold" style={{ color }}>{title}</div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{subtitle}</div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const width = (Math.abs(r.diff) / max) * 100;
          return (
            <div key={r.name} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[0.8125rem] font-medium truncate" style={{ color: 'var(--primary)' }}>
                  {r.name}
                </div>
                <div
                  className="h-2 rounded-sm mt-1.5 relative"
                  style={{ background: 'var(--muted)' }}
                >
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
              <div className="text-right shrink-0 w-[110px]">
                <div className="text-[0.8125rem] font-semibold" style={{ color }}>
                  {sign}${Math.abs(r.diff).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>
                  {sign}{Math.abs(r.pct).toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Expense composition ──────────────────────────────────────
function ExpenseComposition({ items }: { items: LineItem[] }) {
  const totalAct = items.reduce((s, i) => s + i.act, 0);
  const totalBud = items.reduce((s, i) => s + i.bud, 0);
  const labels = items.map((i) => i.name.replace(/^Total /, ''));

  return (
    <div>
      <SectionHeader title="Expense Composition" subtitle="Actual vs Budget" />
      <div
        className="bg-white border rounded-lg p-5 flex flex-col gap-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <StackedBar label="Actual" items={items} total={totalAct} accessor="act" />
        <StackedBar label="Budget" items={items} total={totalBud} accessor="bud" />
        <Legend labels={labels} />
      </div>
    </div>
  );
}

function StackedBar({
  label, items, total, accessor,
}: {
  label: string;
  items: LineItem[];
  total: number;
  accessor: 'act' | 'bud';
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[0.8125rem] font-semibold" style={{ color: 'var(--primary)' }}>{label}</span>
        <span className="text-[0.8125rem]" style={{ color: 'var(--text-secondary)' }}>
          {fmtMoneyShort(total)}
        </span>
      </div>
      <div
        className="h-10 rounded-md overflow-hidden flex border"
        style={{ borderColor: 'var(--border)' }}
      >
        {items.map((it, idx) => {
          const pct = (it[accessor] / total) * 100;
          const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
          const short = it.name.replace(/^Total /, '');
          return (
            <div
              key={it.name}
              title={`${short}: ${fmtMoneyShort(it[accessor])} (${pct.toFixed(1)}%)`}
              className="h-full flex items-center justify-center text-[0.6875rem] font-semibold text-white overflow-hidden whitespace-nowrap px-1"
              style={{ width: `${pct}%`, background: color }}
            >
              {pct >= 6 ? short : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ labels }: { labels: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
      {labels.map((l, idx) => (
        <div key={l} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{ background: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }}
          />
          {l}
        </div>
      ))}
    </div>
  );
}

// ─── Detailed breakdown table ─────────────────────────────────
function DetailedBreakdown({
  groups, totals, expandedRows, toggleRow,
}: {
  groups: Group[];
  totals: {
    deptAct: number; deptBud: number; deptLy: number;
    ndAct: number; ndBud: number; ndLy: number;
    gtAct: number; gtBud: number; gtLy: number;
  };
  expandedRows: Set<string>;
  toggleRow: (key: string) => void;
}) {
  return (
    <div>
      <SectionHeader title="Detailed Breakdown" subtitle="Click any department to expand sub-lines" />
      <div
        className="bg-white border rounded-lg overflow-hidden"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.8125rem]">
            <thead>
              <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                {['Department', 'ACT', 'BUD', 'Var. $', 'Var. %', 'ACT LY', 'Var. $ LY', 'Var. % LY'].map((h, i) => (
                  <th
                    key={h}
                    className="px-3.5 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--text-secondary)', textAlign: i === 0 ? 'left' : 'right' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <GroupRows
                  key={g.key}
                  group={g}
                  expandedRows={expandedRows}
                  toggleRow={toggleRow}
                  subtotalLabel={g.label}
                  subtotal={
                    g.key === 'dept'
                      ? { act: totals.deptAct, bud: totals.deptBud, actLy: totals.deptLy }
                      : { act: totals.ndAct, bud: totals.ndBud, actLy: totals.ndLy }
                  }
                />
              ))}
              <GrandTotalRow act={totals.gtAct} bud={totals.gtBud} actLy={totals.gtLy} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GroupRows({
  group, expandedRows, toggleRow, subtotalLabel, subtotal,
}: {
  group: Group;
  expandedRows: Set<string>;
  toggleRow: (k: string) => void;
  subtotalLabel: string;
  subtotal: { act: number; bud: number; actLy: number };
}) {
  return (
    <>
      {group.items.map((it) => {
        const key = `${group.key}::${it.name}`;
        const isExpanded = expandedRows.has(key);
        return (
          <Fragment key={key}>
            <DataRow
              name={it.name}
              act={it.act}
              bud={it.bud}
              actLy={it.actLy}
              expandable={!!it.subLines?.length}
              expanded={isExpanded}
              onToggle={() => toggleRow(key)}
            />
            {isExpanded && it.subLines?.map((sl) => (
              <DataRow
                key={`${key}::${sl.name}`}
                name={sl.name}
                act={sl.act}
                bud={sl.bud}
                actLy={sl.actLy}
                indent
              />
            ))}
          </Fragment>
        );
      })}
      <SubtotalRow label={subtotalLabel} act={subtotal.act} bud={subtotal.bud} actLy={subtotal.actLy} />
    </>
  );
}

function DataRow({
  name, act, bud, actLy, expandable, expanded, onToggle, indent,
}: {
  name: string;
  act: number;
  bud: number;
  actLy: number;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  indent?: boolean;
}) {
  const diffBud = act - bud;
  const diffLy = act - actLy;
  const pctBud = bud ? (diffBud / bud) * 100 : 0;
  const pctLy = actLy ? (diffLy / actLy) * 100 : 0;
  const budColor = varColor(act, bud);
  const budBg = varBg(act, bud);
  const lyColor = varColor(act, actLy);
  const lyBg = varBg(act, actLy);

  return (
    <tr
      className={`border-b transition-colors ${expandable ? 'cursor-pointer hover:bg-[#F3F4F6]' : ''}`}
      style={{ borderColor: 'var(--border)', background: indent ? 'rgba(245,245,245,0.6)' : undefined }}
      onClick={expandable ? onToggle : undefined}
    >
      <td
        className="px-3.5 py-2.5 font-medium whitespace-nowrap"
        style={{
          paddingLeft: indent ? 44 : undefined,
          color: indent ? 'var(--text-secondary)' : 'var(--primary)',
          fontWeight: indent ? 400 : 500,
        }}
      >
        <span className="inline-flex items-center gap-1.5">
          {expandable && (
            expanded
              ? <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
              : <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
          )}
          {!expandable && !indent && <span className="w-[14px] inline-block" />}
          {name}
        </span>
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">{fmtMoneyShort(act)}</td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
        {fmtMoneyShort(bud)}
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
        <span className="inline-block px-2 py-0.5 rounded-sm font-semibold" style={{ color: budColor, background: budBg }}>
          {fmtVarDollar(diffBud)}
        </span>
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
        <span className="inline-block px-2 py-0.5 rounded-sm font-semibold" style={{ color: budColor, background: budBg }}>
          {fmtPct(pctBud)}
        </span>
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
        {fmtMoneyShort(actLy)}
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
        <span className="inline-block px-2 py-0.5 rounded-sm font-semibold" style={{ color: lyColor, background: lyBg }}>
          {fmtVarDollar(diffLy)}
        </span>
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
        <span className="inline-block px-2 py-0.5 rounded-sm font-semibold" style={{ color: lyColor, background: lyBg }}>
          {fmtPct(pctLy)}
        </span>
      </td>
    </tr>
  );
}

function SubtotalRow({
  label, act, bud, actLy,
}: {
  label: string;
  act: number;
  bud: number;
  actLy: number;
}) {
  const diffBud = act - bud;
  const diffLy = act - actLy;
  const pctBud = bud ? (diffBud / bud) * 100 : 0;
  const pctLy = actLy ? (diffLy / actLy) * 100 : 0;
  const budColor = varColor(act, bud);
  const lyColor = varColor(act, actLy);

  return (
    <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
      <td className="px-3.5 py-2.5 font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>{label}</td>
      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>
        {fmtMoneyShort(act)}
      </td>
      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>
        {fmtMoneyShort(bud)}
      </td>
      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: budColor }}>
        {fmtVarDollar(diffBud)}
      </td>
      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: budColor }}>
        {fmtPct(pctBud)}
      </td>
      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>
        {fmtMoneyShort(actLy)}
      </td>
      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: lyColor }}>
        {fmtVarDollar(diffLy)}
      </td>
      <td className="px-3.5 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: lyColor }}>
        {fmtPct(pctLy)}
      </td>
    </tr>
  );
}

function GrandTotalRow({ act, bud, actLy }: { act: number; bud: number; actLy: number }) {
  const diffBud = act - bud;
  const diffLy = act - actLy;
  const pctBud = bud ? (diffBud / bud) * 100 : 0;
  const pctLy = actLy ? (diffLy / actLy) * 100 : 0;

  return (
    <tr style={{ background: 'var(--primary)' }}>
      <td className="px-3.5 py-3 font-bold whitespace-nowrap text-white">GRAND TOTAL EXPENSES</td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap text-white">{fmtMoneyShort(act)}</td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap text-white/80">{fmtMoneyShort(bud)}</td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap" style={{ color: act > bud ? '#FCA5A5' : '#6EE7B7' }}>
        {fmtVarDollar(diffBud)}
      </td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap" style={{ color: act > bud ? '#FCA5A5' : '#6EE7B7' }}>
        {fmtPct(pctBud)}
      </td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap text-white/80">{fmtMoneyShort(actLy)}</td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap" style={{ color: act > actLy ? '#FCA5A5' : '#6EE7B7' }}>
        {fmtVarDollar(diffLy)}
      </td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap" style={{ color: act > actLy ? '#FCA5A5' : '#6EE7B7' }}>
        {fmtPct(pctLy)}
      </td>
    </tr>
  );
}

// ─── Expense progression ──────────────────────────────────────
function ExpenseProgression({ currentMonthIndex }: { currentMonthIndex: number }) {
  const [scope, setScope] = useState<TrendScope>('total');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

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
  const currentBud = series.bud[safeIdx];
  const currentLy = series.ly[safeIdx];
  const budDelta = currentCy - currentBud;
  const budPct = currentBud ? (budDelta / currentBud) * 100 : 0;
  const lyDelta = currentCy - currentLy;
  const lyPct = currentLy ? (lyDelta / currentLy) * 100 : 0;
  const budColor = budDelta <= 0 ? 'var(--success)' : 'var(--danger)';
  const lyColor = lyDelta <= 0 ? 'var(--success)' : 'var(--danger)';

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold m-0" style={{ color: 'var(--primary)' }}>Expense Progression</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Current Year vs Last Year — {SCOPE_LABEL[scope]}
          </p>
        </div>
        <div className="flex h-9 rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {(['dept', 'nondist', 'total'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className="px-3.5 text-[0.8125rem] font-medium cursor-pointer transition-colors border-none whitespace-nowrap"
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

      <div
        className="bg-white border rounded-lg p-5 flex flex-col gap-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex gap-6 flex-wrap">
          <MiniStat label={`${MONTHS_SHORT[safeIdx]} actual`} value={fmtMoneyShort(currentCy)} />
          <MiniStat label="vs Budget" value={`${budDelta > 0 ? '+' : ''}${budPct.toFixed(1)}%`} valueColor={budColor} />
          <MiniStat label="vs LY same month" value={`${lyDelta > 0 ? '+' : ''}${lyPct.toFixed(1)}%`} valueColor={lyColor} />
        </div>

        <LineChart
          cy={series.cy}
          bud={series.bud}
          ly={series.ly}
          currentIdx={safeIdx}
          hoverIdx={hoverIdx}
          onHover={setHoverIdx}
        />

        <div className="flex items-center gap-5 text-xs pt-1 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-5 h-0.5" style={{ background: 'var(--primary)' }} />
            Current Year
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-5 h-0" style={{ borderTop: '2px dashed var(--accent)' }} />
            Budget
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-5 h-0" style={{ borderTop: '2px dotted var(--text-secondary)' }} />
            Last Year
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <div className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-base font-bold" style={{ color: valueColor ?? 'var(--primary)' }}>
        {value}
      </div>
    </div>
  );
}

function LineChart({
  cy, bud, ly, currentIdx, hoverIdx, onHover,
}: {
  cy: number[]; bud: number[]; ly: number[];
  currentIdx: number; hoverIdx: number | null;
  onHover: (i: number | null) => void;
}) {
  const W = 800, H = 280, padL = 56, padR = 16, padT = 16, padB = 32;
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

  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks);
  const activeIdx = hoverIdx ?? currentIdx;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
        onMouseLeave={() => onHover(null)}
      >
        {tickVals.map((v, i) => (
          <g key={i}>
            <line
              x1={padL} x2={W - padR} y1={y(v)} y2={y(v)}
              stroke="var(--border)"
              strokeDasharray={i === 0 || i === ticks ? undefined : '3 3'}
              strokeWidth={1}
            />
            <text
              x={padL - 8} y={y(v)} textAnchor="end" dominantBaseline="middle"
              fontSize="11" fill="var(--text-muted)"
            >
              {fmtMoneyShort(v)}
            </text>
          </g>
        ))}

        {MONTHS_SHORT.map((m, i) => (
          <text
            key={m} x={x(i)} y={H - padB + 18} textAnchor="middle"
            fontSize="11"
            fill={i === currentIdx ? 'var(--primary)' : 'var(--text-muted)'}
            fontWeight={i === currentIdx ? 600 : 400}
          >
            {m}
          </text>
        ))}

        <path d={pathFor(ly)} fill="none" stroke="var(--text-secondary)" strokeWidth={2}
          strokeDasharray="2 3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathFor(bud)} fill="none" stroke="var(--accent)" strokeWidth={2}
          strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathFor(cy)} fill="none" stroke="var(--primary)" strokeWidth={2.25}
          strokeLinecap="round" strokeLinejoin="round" />

        {cy.map((v, i) => (
          <circle
            key={i} cx={x(i)} cy={y(v)}
            r={i === activeIdx ? 5 : 3}
            fill={i === currentIdx ? 'var(--accent)' : 'var(--primary)'}
            stroke="#fff" strokeWidth={1.5}
          />
        ))}

        {activeIdx != null && (
          <line
            x1={x(activeIdx)} x2={x(activeIdx)} y1={padT} y2={H - padB}
            stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3"
          />
        )}

        {MONTHS_SHORT.map((_, i) => {
          const zoneW = innerW / MONTHS_SHORT.length;
          return (
            <rect
              key={i}
              x={x(i) - zoneW / 2} y={padT} width={zoneW} height={innerH}
              fill="transparent" style={{ cursor: 'crosshair' }}
              onMouseEnter={() => onHover(i)}
            />
          );
        })}

        {activeIdx != null && (() => {
          const cyV = cy[activeIdx], budV = bud[activeIdx], lyV = ly[activeIdx];
          const budDeltaV = cyV - budV;
          const budPctV = budV ? (budDeltaV / budV) * 100 : 0;
          const lyDeltaV = cyV - lyV;
          const lyPctV = lyV ? (lyDeltaV / lyV) * 100 : 0;
          const tx = x(activeIdx);
          const ty = Math.min(y(cyV), y(budV), y(lyV)) - 12;
          const boxW = 148, boxH = 100;
          const leftEdge = tx + 10 + boxW > W - padR;
          const boxX = leftEdge ? tx - 10 - boxW : tx + 10;
          const boxY = Math.max(ty - boxH, padT + 4);
          return (
            <g pointerEvents="none">
              <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={6} fill="#fff" stroke="var(--border)" />
              <text x={boxX + 10} y={boxY + 16} fontSize="11" fontWeight={600} fill="var(--primary)">
                {MONTHS_SHORT[activeIdx]}
              </text>
              <text x={boxX + 10} y={boxY + 32} fontSize="11" fill="var(--text-secondary)">
                CY <tspan fill="var(--primary)" fontWeight={600}>{fmtMoneyShort(cyV)}</tspan>
              </text>
              <text x={boxX + 10} y={boxY + 46} fontSize="11" fill="var(--text-secondary)">
                BUD <tspan fill="var(--accent)" fontWeight={600}>{fmtMoneyShort(budV)}</tspan>
              </text>
              <text x={boxX + 10} y={boxY + 60} fontSize="11" fill="var(--text-secondary)">
                LY <tspan fill="var(--text-secondary)" fontWeight={600}>{fmtMoneyShort(lyV)}</tspan>
              </text>
              <text
                x={boxX + 10} y={boxY + 76} fontSize="11" fontWeight={600}
                fill={budDeltaV <= 0 ? 'var(--success)' : 'var(--danger)'}
              >
                vs BUD {budDeltaV > 0 ? '+' : ''}{budPctV.toFixed(1)}%
              </text>
              <text
                x={boxX + 10} y={boxY + 90} fontSize="11" fontWeight={600}
                fill={lyDeltaV <= 0 ? 'var(--success)' : 'var(--danger)'}
              >
                vs LY {lyDeltaV > 0 ? '+' : ''}{lyPctV.toFixed(1)}%
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold m-0" style={{ color: 'var(--primary)' }}>{title}</h2>
      {subtitle && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
      )}
    </div>
  );
}
