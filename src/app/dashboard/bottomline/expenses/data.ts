// Shared data, types, and helpers for the Expenses page.
// Both the Desktop and Mobile views import from here so they stay in sync.

export type Timeframe = 'MTD' | 'YTD';
export type TrendScope = 'dept' | 'nondist' | 'total';

// ── Data shapes ──────────────────────────────────────────────
// MonthlyLineItem is the raw shape that a SQL query should return per row:
// one 12-element array for current-year actuals, budget, and last-year
// actuals. Drop-in replace the literals below with a fetch() + map when the
// database lands; nothing else on the page should need to change.
export type MonthlySeries = number[]; // 12 entries, Jan..Dec
export type MonthlyLineItem = {
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
export type LineItem = {
  name: string;
  act: number;
  bud: number;
  actLy: number;
  subLines?: { name: string; act: number; bud: number; actLy: number }[];
};

export type Group = {
  key: string;
  label: string;
  items: LineItem[];
};

// ── Static options ──────────────────────────────────────────
export const HOTELS = ['Fort'] as const;
export const YEARS = ['2026', '2025', '2024'] as const;
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const MONTHS_SHORT = [
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

export const DEPT_COSTS: MonthlyLineItem[] = [
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

export const NON_DISTRIBUTED: MonthlyLineItem[] = [
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

export const SCOPE_LABEL: Record<TrendScope, string> = {
  dept: 'Dept Costs',
  nondist: 'Non-Distributed',
  total: 'Total Expenses',
};

// Data-viz palette for composition segments. Mixes CSS tokens with a few
// data-only hues — one segment per expense line in order.
export const SEGMENT_COLORS = [
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

export const selectStyle = {
  borderColor: 'var(--border)',
  color: 'var(--primary)',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23172951' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
} as const;

// ── Helpers ──────────────────────────────────────────────────
// Pick a scalar from a 12-month series for the active timeframe. MTD returns
// the selected month; YTD sums Jan..selectedMonth inclusive.
export function pickMonthly(series: MonthlySeries, monthIdx: number, tf: Timeframe): number {
  const idx = monthIdx >= 0 ? monthIdx : 11;
  if (tf === 'MTD') return series[idx] ?? 0;
  return series.slice(0, idx + 1).reduce((a, b) => a + b, 0);
}

// Collapse a MonthlyLineItem (raw) into a LineItem (scalar) for the current view.
export function viewItem(it: MonthlyLineItem, monthIdx: number, tf: Timeframe): LineItem {
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
export function sumMonthlySeries(items: MonthlyLineItem[], field: 'cy' | 'bud' | 'ly'): MonthlySeries {
  return Array.from({ length: 12 }, (_, i) =>
    items.reduce((s, it) => s + it[field][i], 0),
  );
}

export const sumScalar = (items: LineItem[], key: 'act' | 'bud' | 'actLy') =>
  items.reduce((s, i) => s + i[key], 0);

export function fmtMoneyShort(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function fmtVarDollar(v: number) {
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function fmtPct(v: number) {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

// Expense semantics: ACT > BUD is UNFAVORABLE (over budget → red).
// ACT < BUD is FAVORABLE (under budget → green).
export function varColor(act: number, bud: number) {
  if (act > bud) return 'var(--danger)';
  if (act < bud) return 'var(--success)';
  return 'var(--text-secondary)';
}

export function varBg(act: number, bud: number) {
  if (act > bud) return 'rgba(239, 68, 68, 0.1)';
  if (act < bud) return 'rgba(16, 185, 129, 0.1)';
  return 'transparent';
}
