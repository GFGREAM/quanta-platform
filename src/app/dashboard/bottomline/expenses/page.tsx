'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import KpiCard from '@/components/ui/KpiCard';

type Timeframe = 'MTD' | 'YTD';
type TrendScope = 'dept' | 'nondist' | 'total';

// ── Data shapes ──────────────────────────────────────────────
// MonthlyLineItem is the raw shape that a SQL query should return per row:
// one 12-element array for current-year actuals, budget, and last-year
// actuals. Drop-in replace the literals below with a fetch() + map when the
// database lands; nothing else on the page should need to change.
type MonthlySeries = number[]; // 12 entries, Jan..Dec
type MonthlyLineItem = {
  name: string;
  cy: MonthlySeries;
  bud: MonthlySeries;
  ly: MonthlySeries;
  subLines?: {
    name: string;
    cy: MonthlySeries;
    bud: MonthlySeries;
    ly: MonthlySeries;
  }[];
};

// LineItem is the scalar shape consumed by every viz component on this page.
// It is produced from a MonthlyLineItem by picking MTD or summing YTD for the
// active month.
type LineItem = {
  name: string;
  act: number;
  bud: number;
  actLy: number;
  subLines?: { name: string; act: number; bud: number; actLy: number }[];
};

type Group = {
  key: string;
  label: string;
  items: LineItem[];
};

// ── Static options ──────────────────────────────────────────
const HOTELS = ['Fort'] as const;
const YEARS = ['2026', '2025', '2024'] as const;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

// Seasonality factor relative to March. Used only to synthesize mock
// monthly series from a single March scalar — delete and replace expandMonthly
// calls below with real monthly arrays once the SQL query is wired up.
const SEASONALITY = [
  0.90, 0.88, 1.00, 1.02, 1.03, 1.08,
  1.14, 1.12, 1.00, 0.97, 0.95, 1.09,
];
const expandMonthly = (marchValue: number): MonthlySeries =>
  SEASONALITY.map((f) => Math.round(marchValue * f));

const selectStyle = {
  borderColor: 'var(--border)',
  color: 'var(--primary)',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23172951' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
} as const;

const DEPT_COSTS: MonthlyLineItem[] = [
  {
    name: 'Total Rooms',
    cy: expandMonthly(322480), bud: expandMonthly(282110), ly: expandMonthly(310200),
    subLines: [
      { name: 'Salaries & Wages', cy: expandMonthly(180000), bud: expandMonthly(155000), ly: expandMonthly(172000) },
      { name: 'Linen', cy: expandMonthly(25000), bud: expandMonthly(22500), ly: expandMonthly(24100) },
      { name: 'Guest Supplies', cy: expandMonthly(42480), bud: expandMonthly(38610), ly: expandMonthly(40500) },
      { name: 'Cleaning Supplies', cy: expandMonthly(38000), bud: expandMonthly(34000), ly: expandMonthly(36600) },
      { name: 'Other Rooms', cy: expandMonthly(37000), bud: expandMonthly(32000), ly: expandMonthly(37000) },
    ],
  },
  {
    name: 'Total F&B',
    cy: expandMonthly(634028), bud: expandMonthly(650300), ly: expandMonthly(612300),
    subLines: [
      { name: 'Food Cost', cy: expandMonthly(310000), bud: expandMonthly(320000), ly: expandMonthly(298000) },
      { name: 'Beverage Cost', cy: expandMonthly(95000), bud: expandMonthly(98500), ly: expandMonthly(92000) },
      { name: 'Banquets', cy: expandMonthly(78000), bud: expandMonthly(82000), ly: expandMonthly(74500) },
      { name: 'F&B Labor', cy: expandMonthly(125028), bud: expandMonthly(124800), ly: expandMonthly(121800) },
      { name: 'Other F&B', cy: expandMonthly(26000), bud: expandMonthly(25000), ly: expandMonthly(26000) },
    ],
  },
  {
    name: 'Total Entertainment',
    cy: expandMonthly(40130), bud: expandMonthly(37010), ly: expandMonthly(38750),
    subLines: [
      { name: 'Events', cy: expandMonthly(22000), bud: expandMonthly(20000), ly: expandMonthly(21200) },
      { name: 'Programs', cy: expandMonthly(12130), bud: expandMonthly(11010), ly: expandMonthly(11500) },
      { name: 'Equipment', cy: expandMonthly(6000), bud: expandMonthly(6000), ly: expandMonthly(6050) },
    ],
  },
  {
    name: 'Total Others',
    cy: expandMonthly(79712), bud: expandMonthly(87117), ly: expandMonthly(84200),
    subLines: [
      { name: 'Retail', cy: expandMonthly(35000), bud: expandMonthly(38000), ly: expandMonthly(36200) },
      { name: 'Spa', cy: expandMonthly(28000), bud: expandMonthly(30500), ly: expandMonthly(29800) },
      { name: 'Miscellaneous', cy: expandMonthly(16712), bud: expandMonthly(18617), ly: expandMonthly(18200) },
    ],
  },
];

const NON_DISTRIBUTED: MonthlyLineItem[] = [
  {
    name: 'Total A&G',
    cy: expandMonthly(253140), bud: expandMonthly(276620), ly: expandMonthly(244100),
    subLines: [
      { name: 'Admin Salaries', cy: expandMonthly(150000), bud: expandMonthly(165000), ly: expandMonthly(145000) },
      { name: 'Professional Fees', cy: expandMonthly(58000), bud: expandMonthly(62000), ly: expandMonthly(55000) },
      { name: 'Credit Card Fees', cy: expandMonthly(28140), bud: expandMonthly(30120), ly: expandMonthly(26800) },
      { name: 'Other A&G', cy: expandMonthly(17000), bud: expandMonthly(19500), ly: expandMonthly(17300) },
    ],
  },
  {
    name: 'Total Information & Telecommunication',
    cy: expandMonthly(53150), bud: expandMonthly(51700), ly: expandMonthly(50900),
    subLines: [
      { name: 'Software Licenses', cy: expandMonthly(32000), bud: expandMonthly(31000), ly: expandMonthly(30400) },
      { name: 'Telecom', cy: expandMonthly(15000), bud: expandMonthly(14500), ly: expandMonthly(14500) },
      { name: 'Hardware & Support', cy: expandMonthly(6150), bud: expandMonthly(6200), ly: expandMonthly(6000) },
    ],
  },
  {
    name: 'Total Promotions & Advertising',
    cy: expandMonthly(85870), bud: expandMonthly(80950), ly: expandMonthly(78200),
    subLines: [
      { name: 'Digital Marketing', cy: expandMonthly(48000), bud: expandMonthly(45000), ly: expandMonthly(43000) },
      { name: 'Print & Collateral', cy: expandMonthly(18870), bud: expandMonthly(18000), ly: expandMonthly(17500) },
      { name: 'PR & Events', cy: expandMonthly(19000), bud: expandMonthly(17950), ly: expandMonthly(17700) },
    ],
  },
  {
    name: 'Total Energy Costs',
    cy: expandMonthly(106210), bud: expandMonthly(114561), ly: expandMonthly(102800),
    subLines: [
      { name: 'Electricity', cy: expandMonthly(68000), bud: expandMonthly(74000), ly: expandMonthly(66000) },
      { name: 'Water', cy: expandMonthly(22000), bud: expandMonthly(23500), ly: expandMonthly(21500) },
      { name: 'Gas', cy: expandMonthly(16210), bud: expandMonthly(17061), ly: expandMonthly(15300) },
    ],
  },
  {
    name: 'Total Maintenance & Repairs',
    cy: expandMonthly(139500), bud: expandMonthly(133842), ly: expandMonthly(128000),
    subLines: [
      { name: 'Building M&R', cy: expandMonthly(72000), bud: expandMonthly(68000), ly: expandMonthly(65000) },
      { name: 'Equipment M&R', cy: expandMonthly(44500), bud: expandMonthly(43000), ly: expandMonthly(42000) },
      { name: 'Grounds & Landscaping', cy: expandMonthly(23000), bud: expandMonthly(22842), ly: expandMonthly(21000) },
    ],
  },
  {
    name: 'Total Management Fees',
    cy: expandMonthly(66990), bud: expandMonthly(77008), ly: expandMonthly(71500),
    subLines: [
      { name: 'Base Management Fee', cy: expandMonthly(48000), bud: expandMonthly(55000), ly: expandMonthly(51000) },
      { name: 'Incentive Fee', cy: expandMonthly(18990), bud: expandMonthly(22008), ly: expandMonthly(20500) },
    ],
  },
];

// Data-viz palette for composition segments. Mixes CSS tokens with a few data-only
// hues. Kept small on purpose — one segment per expense line in order.
const SEGMENT_COLORS = [
  'var(--primary)',
  'var(--accent)',
  'var(--accent-light)',
  'var(--info)',
  'var(--warning)',
  '#7C3AED',
  '#F472B6',
  '#0D9488',
  '#64748B',
  '#94A3B8',
];

// Pick a scalar from a 12-month series for the active timeframe. MTD returns
// the selected month; YTD sums Jan..selectedMonth inclusive.
function pickMonthly(series: MonthlySeries, monthIdx: number, tf: Timeframe): number {
  const idx = monthIdx >= 0 ? monthIdx : 11;
  if (tf === 'MTD') return series[idx] ?? 0;
  return series.slice(0, idx + 1).reduce((a, b) => a + b, 0);
}

// Collapse a MonthlyLineItem (raw) into a LineItem (scalar) for the current view.
function viewItem(it: MonthlyLineItem, monthIdx: number, tf: Timeframe): LineItem {
  return {
    name: it.name,
    act: pickMonthly(it.cy, monthIdx, tf),
    bud: pickMonthly(it.bud, monthIdx, tf),
    actLy: pickMonthly(it.ly, monthIdx, tf),
    subLines: it.subLines?.map((sl) => ({
      name: sl.name,
      act: pickMonthly(sl.cy, monthIdx, tf),
      bud: pickMonthly(sl.bud, monthIdx, tf),
      actLy: pickMonthly(sl.ly, monthIdx, tf),
    })),
  };
}

// Sum a field (cy/bud/ly) across a list of monthly items, month-by-month.
// Used by the progression chart to build the 12-point scope series.
function sumMonthlySeries(items: MonthlyLineItem[], field: 'cy' | 'bud' | 'ly'): MonthlySeries {
  return Array.from({ length: 12 }, (_, i) =>
    items.reduce((s, it) => s + it[field][i], 0),
  );
}

const sum = (items: LineItem[], key: 'act' | 'bud' | 'actLy') =>
  items.reduce((s, i) => s + i[key], 0);

function fmtMoneyShort(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtVarDollar(v: number) {
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtPct(v: number) {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

// Guard against divide-by-zero when a base (e.g. Budget or LY actual) is 0.
function safePct(diff: number, base: number) {
  return base !== 0 ? (diff / base) * 100 : 0;
}

// Expense semantics: ACT > BUD is UNFAVORABLE (over budget → red).
// ACT < BUD is FAVORABLE (under budget → green).
function varColor(act: number, bud: number) {
  if (act > bud) return 'var(--danger)';
  if (act < bud) return 'var(--success)';
  return 'var(--text-secondary)';
}

function varBg(act: number, bud: number) {
  if (act > bud) return 'rgba(239, 68, 68, 0.1)';
  if (act < bud) return 'rgba(16, 185, 129, 0.1)';
  return 'transparent';
}

export default function ExpensesPage() {
  const [hotel, setHotel] = useState<string>('Fort');
  const [year, setYear] = useState<string>('2026');
  const [month, setMonth] = useState<string>('March');
  const [timeframe, setTimeframe] = useState<Timeframe>('MTD');
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

  // Collapse the raw monthly data into the scalar view shape once per
  // (month, timeframe) change — every downstream component reads from here.
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
    const deptAct = sum(viewedDept, 'act');
    const deptBud = sum(viewedDept, 'bud');
    const deptLy = sum(viewedDept, 'actLy');
    const ndAct = sum(viewedNonDist, 'act');
    const ndBud = sum(viewedNonDist, 'bud');
    const ndLy = sum(viewedNonDist, 'actLy');
    const gtAct = deptAct + ndAct;
    const gtBud = deptBud + ndBud;
    const gtLy = deptLy + ndLy;
    return { deptAct, deptBud, deptLy, ndAct, ndBud, ndLy, gtAct, gtBud, gtLy };
  }, [viewedDept, viewedNonDist]);

  // Rank variance drivers by absolute dollar size.
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

        {/* MTD / YTD segmented toggle */}
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
      <div className="grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
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

      {/* Variance drivers */}
      <VarianceDrivers
        overruns={drivers.overruns}
        savings={drivers.savings}
      />

      {/* Detailed breakdown */}
      <DetailedBreakdown
        groups={viewedGroups}
        totals={totals}
        expandedRows={expandedRows}
        toggleRow={toggleRow}
      />

      {/* Expense composition */}
      <ExpenseComposition items={allItems} />

      {/* Expense progression */}
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
      <SectionHeader
        title="Expense Composition"
        subtitle="Actual vs Budget"
      />
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
        <span className="text-[0.8125rem] font-semibold" style={{ color: 'var(--primary)' }}>
          {label}
        </span>
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
      <SectionHeader
        title="Detailed Breakdown"
        subtitle="Click any department to expand sub-lines"
      />
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
                    style={{
                      color: 'var(--text-secondary)',
                      textAlign: i === 0 ? 'left' : 'right',
                    }}
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
  const pctBud = safePct(diffBud, bud);
  const pctLy = safePct(diffLy, actLy);
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
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
        {fmtMoneyShort(act)}
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
        {fmtMoneyShort(bud)}
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
        <span
          className="inline-block px-2 py-0.5 rounded-sm font-semibold"
          style={{ color: budColor, background: budBg }}
        >
          {fmtVarDollar(diffBud)}
        </span>
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
        <span
          className="inline-block px-2 py-0.5 rounded-sm font-semibold"
          style={{ color: budColor, background: budBg }}
        >
          {fmtPct(pctBud)}
        </span>
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
        {fmtMoneyShort(actLy)}
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
        <span
          className="inline-block px-2 py-0.5 rounded-sm font-semibold"
          style={{ color: lyColor, background: lyBg }}
        >
          {fmtVarDollar(diffLy)}
        </span>
      </td>
      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
        <span
          className="inline-block px-2 py-0.5 rounded-sm font-semibold"
          style={{ color: lyColor, background: lyBg }}
        >
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
  const pctBud = safePct(diffBud, bud);
  const pctLy = safePct(diffLy, actLy);
  const budColor = varColor(act, bud);
  const lyColor = varColor(act, actLy);

  return (
    <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
      <td className="px-3.5 py-2.5 font-bold whitespace-nowrap" style={{ color: 'var(--primary)' }}>
        {label}
      </td>
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
  const pctBud = safePct(diffBud, bud);
  const pctLy = safePct(diffLy, actLy);
  const budColor = varColor(act, bud);
  const lyColor = varColor(act, actLy);

  return (
    <tr style={{ background: 'var(--primary)' }}>
      <td className="px-3.5 py-3 font-bold whitespace-nowrap text-white">GRAND TOTAL EXPENSES</td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap text-white">
        {fmtMoneyShort(act)}
      </td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap text-white/80">
        {fmtMoneyShort(bud)}
      </td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap" style={{ color: act > bud ? '#FCA5A5' : '#6EE7B7' }}>
        {fmtVarDollar(diffBud)}
      </td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap" style={{ color: act > bud ? '#FCA5A5' : '#6EE7B7' }}>
        {fmtPct(pctBud)}
      </td>
      <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap text-white/80">
        {fmtMoneyShort(actLy)}
      </td>
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
const SCOPE_LABEL: Record<TrendScope, string> = {
  dept: 'Dept Costs',
  nondist: 'Non-Distributed',
  total: 'Total Expenses',
};

function ExpenseProgression({ currentMonthIndex }: { currentMonthIndex: number }) {
  const [scope, setScope] = useState<TrendScope>('total');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const scopeItems = useMemo(() => {
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

  // For expenses, lower is better: negative delta = success, positive = danger.
  const budColor = budDelta <= 0 ? 'var(--success)' : 'var(--danger)';
  const lyColor = lyDelta <= 0 ? 'var(--success)' : 'var(--danger)';

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold m-0" style={{ color: 'var(--primary)' }}>
            Expense Progression
          </h2>
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
        {/* Summary strip */}
        <div className="flex gap-6 flex-wrap">
          <MiniStat label={`${MONTHS_SHORT[safeIdx]} actual`} value={fmtMoneyShort(currentCy)} />
          <MiniStat
            label="vs Budget"
            value={`${budDelta > 0 ? '+' : ''}${budPct.toFixed(1)}%`}
            valueColor={budColor}
          />
          <MiniStat
            label="vs LY same month"
            value={`${lyDelta > 0 ? '+' : ''}${lyPct.toFixed(1)}%`}
            valueColor={lyColor}
          />
        </div>

        <LineChart
          cy={series.cy}
          bud={series.bud}
          ly={series.ly}
          currentIdx={safeIdx}
          hoverIdx={hoverIdx}
          onHover={setHoverIdx}
        />

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs pt-1 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-5 h-0.5" style={{ background: 'var(--primary)' }} />
            Current Year
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block w-5 h-0"
              style={{ borderTop: '2px dashed var(--accent)' }}
            />
            Budget
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block w-5 h-0"
              style={{ borderTop: '2px dotted var(--text-secondary)' }}
            />
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
  cy: number[];
  bud: number[];
  ly: number[];
  currentIdx: number;
  hoverIdx: number | null;
  onHover: (i: number | null) => void;
}) {
  const W = 800;
  const H = 280;
  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 32;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const all = [...cy, ...bud, ...ly];
  const minV = Math.min(...all);
  const maxV = Math.max(...all);
  // Pad the y-domain by 8% on each side so lines don't hug the edges.
  const range = maxV - minV || 1;
  const yMin = minV - range * 0.08;
  const yMax = maxV + range * 0.08;

  const x = (i: number) => padL + (i / (MONTHS_SHORT.length - 1)) * innerW;
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const pathFor = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');

  // Y-axis gridlines (5 steps)
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
        {/* Grid */}
        {tickVals.map((v, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--border)"
              strokeDasharray={i === 0 || i === ticks ? undefined : '3 3'}
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={y(v)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="11"
              fill="var(--text-muted)"
            >
              {fmtMoneyShort(v)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {MONTHS_SHORT.map((m, i) => (
          <text
            key={m}
            x={x(i)}
            y={H - padB + 18}
            textAnchor="middle"
            fontSize="11"
            fill={i === currentIdx ? 'var(--primary)' : 'var(--text-muted)'}
            fontWeight={i === currentIdx ? 600 : 400}
          >
            {m}
          </text>
        ))}

        {/* LY dotted line */}
        <path
          d={pathFor(ly)}
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth={2}
          strokeDasharray="2 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Budget dashed line */}
        <path
          d={pathFor(bud)}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* CY solid line */}
        <path
          d={pathFor(cy)}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* CY dots */}
        {cy.map((v, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(v)}
            r={i === activeIdx ? 5 : 3}
            fill={i === currentIdx ? 'var(--accent)' : 'var(--primary)'}
            stroke="#fff"
            strokeWidth={1.5}
          />
        ))}

        {/* Hover vertical line */}
        {activeIdx != null && (
          <line
            x1={x(activeIdx)}
            x2={x(activeIdx)}
            y1={padT}
            y2={H - padB}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {/* Invisible hover zones */}
        {MONTHS_SHORT.map((_, i) => {
          const zoneW = innerW / MONTHS_SHORT.length;
          return (
            <rect
              key={i}
              x={x(i) - zoneW / 2}
              y={padT}
              width={zoneW}
              height={innerH}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onMouseEnter={() => onHover(i)}
            />
          );
        })}

        {/* Tooltip */}
        {activeIdx != null && (() => {
          const cyV = cy[activeIdx];
          const budV = bud[activeIdx];
          const lyV = ly[activeIdx];
          const budDeltaV = cyV - budV;
          const budPctV = (budDeltaV / budV) * 100;
          const lyDeltaV = cyV - lyV;
          const lyPctV = (lyDeltaV / lyV) * 100;
          const tx = x(activeIdx);
          const ty = Math.min(y(cyV), y(budV), y(lyV)) - 12;
          const boxW = 148;
          const boxH = 100;
          const leftEdge = tx + 10 + boxW > W - padR;
          const boxX = leftEdge ? tx - 10 - boxW : tx + 10;
          const boxY = Math.max(ty - boxH, padT + 4);
          return (
            <g pointerEvents="none">
              <rect
                x={boxX}
                y={boxY}
                width={boxW}
                height={boxH}
                rx={6}
                fill="#fff"
                stroke="var(--border)"
              />
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
                x={boxX + 10}
                y={boxY + 76}
                fontSize="11"
                fontWeight={600}
                fill={budDeltaV <= 0 ? 'var(--success)' : 'var(--danger)'}
              >
                vs BUD {budDeltaV > 0 ? '+' : ''}{budPctV.toFixed(1)}%
              </text>
              <text
                x={boxX + 10}
                y={boxY + 90}
                fontSize="11"
                fontWeight={600}
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
      <h2 className="text-base font-bold m-0" style={{ color: 'var(--primary)' }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
