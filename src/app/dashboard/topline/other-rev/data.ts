/**
 * Other Rev$ (Non Pack) — data access layer.
 *
 * Non-package revenue (NPR) for a single hotel, by operated concept and split across the three
 * commercial channels Hotel / Club / Otros, Real vs Budget. Figures are in THOUSANDS of MXN.
 *
 * Real monthly closes Enero–Mayo 2026 (YTD = sum of months, computed). When the SQL feed lands it
 * should produce this same shape (concept × channel × scenario × month); add months/properties
 * here and the page picks them up. Seam: PROPERTIES (one hotel today) + per-month structure.
 */

export interface PropertyMeta { code: string; name: string; rooms: number }
export const PROPERTIES: PropertyMeta[] = [
  { code: 'HDMLC', name: 'Hacienda del Mar los Cabos', rooms: 320 },
];
export const DEFAULT_PROPERTY = PROPERTIES[0].code;

export type MonthKey = 'ene' | 'feb' | 'mar' | 'abr' | 'may' | 'jun' | 'jul' | 'ago' | 'sep' | 'oct' | 'nov' | 'dic';
export const MONTHS: { key: MonthKey; label: string }[] = [
  { key: 'ene', label: 'January 2026' },
  { key: 'feb', label: 'February 2026' },
  { key: 'mar', label: 'March 2026' },
  { key: 'abr', label: 'April 2026' },
  { key: 'may', label: 'May 2026' },
  { key: 'jun', label: 'June 2026' },
  { key: 'jul', label: 'July 2026' },
  { key: 'ago', label: 'August 2026' },
  { key: 'sep', label: 'September 2026' },
  { key: 'oct', label: 'October 2026' },
  { key: 'nov', label: 'November 2026' },
  { key: 'dic', label: 'December 2026' },
];

// Closed (actual) months to date; Jun–Dic are forecast. YTD sums the actuals, FY sums all months.
export const ACTUAL_MONTHS: MonthKey[] = ['ene', 'feb', 'mar', 'abr', 'may'];

export type PeriodKey = MonthKey | 'ytd' | 'fy';
export const DEFAULT_PERIOD: PeriodKey = 'fy';
export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'ytd', label: 'YTD (Jan–May)' },
  { key: 'fy', label: 'FY 2026 (Jan–Dec)' },
  ...MONTHS.map((m) => ({ key: m.key as PeriodKey, label: m.label })),
];
export function periodLabel(p: PeriodKey): string {
  if (p === 'ytd') return 'YTD (Jan–May 2026)';
  if (p === 'fy') return 'FY 2026 (Jan–Dec)';
  return MONTHS.find((m) => m.key === p)?.label ?? p;
}

export type Channel = 'hotel' | 'club' | 'otros';
export const CHANNELS: { key: Channel; label: string }[] = [
  { key: 'hotel', label: 'Hotel' },
  { key: 'club', label: 'Club' },
  { key: 'otros', label: 'Other' },
];

// Top-level NPR concepts. A concept with `children` is an expandable bucket whose value = the SUM
// of its detail rows (e.g. AYB). A childless concept is a plain leaf carrying its own value (SPA,
// Tiendas, Otros). `pending: true` marks a bucket whose detail hasn't been shared yet (Up Selling)
// — it shows its known total and a "detalle pendiente" note until the breakdown arrives.
export interface BucketDef { bucket: string; children: string[]; pending?: boolean }
export const BUCKETS: BucketDef[] = [
  { bucket: 'Up Selling', children: [], pending: true },
  { bucket: 'F&B', children: ['F&B Package', 'F&B EP', 'F&B Other'] },
  { bucket: 'Spa', children: [] },
  { bucket: 'Retail', children: [] },
  { bucket: 'Other Income', children: [] },
];

// Per concept, per month: [Real Hotel, Real Club, Real Otros, Budget Total] in thousands MXN.
type Vals = [hotel: number, club: number, otros: number, budget: number];
const DATA: Record<MonthKey, Record<string, Vals>> = {
  ene: {
    'Up Selling': [9.4, 0, 0, 15],
    'F&B Package': [2.4, 147.6, 0, 459],
    'F&B EP': [77.8, 289.0, 21.4, 535],
    'F&B Other': [59.2, 2.5, 0, 44],
    'Spa': [71.2, 20.2, 2.9, 108],
    'Retail': [43.5, 0, 0, 27],
    'Other Income': [19.3, 0, 0, 25],
  },
  feb: {
    'Up Selling': [24.32, 0, 0, 15],
    'F&B Package': [1.1, 219.2, 0, 518],
    'F&B EP': [83.0, 354.3, 21.2, 607],
    'F&B Other': [56.1, 2.1, 0, 37],
    'Spa': [65.4, 20.1, 1.9, 108],
    'Retail': [36.6, 0, 0, 31],
    'Other Income': [19.9, 0, 0, 28],
  },
  mar: {
    'Up Selling': [46.06, 0, 0, 15],
    'F&B Package': [19.6, 310.9, 0, 543],
    'F&B EP': [204.0, 392.2, 18.5, 647],
    'F&B Other': [53.5, 2.3, 0, 39],
    'Spa': [62.6, 23.5, 3.9, 108],
    'Retail': [35.8, 0, 0, 34],
    'Other Income': [121.4, 0, 0, 31],
  },
  abr: {
    'Up Selling': [29.52, 0, 0, 15],
    'F&B Package': [5.7, 268.8, 0, 381],
    'F&B EP': [61.2, 252.3, 13.1, 465],
    'F&B Other': [10.0, 0.1, 0.0, 32],
    'Spa': [52.4, 19.1, 9.6, 108],
    'Retail': [32.9, 0, 0, 26],
    'Other Income': [27.3, 0, 0, 27],
  },
  may: {
    'Up Selling': [17.83, 0, 0, 15],
    'F&B Package': [3.7, 186.7, 0, 303],
    'F&B EP': [37.7, 182.0, 12.0, 378],
    'F&B Other': [59.1, 0.4, 0, 42],
    'Spa': [50.7, 14.1, 2.5, 75],
    'Retail': [23.8, 0, 0, 22],
    'Other Income': [34.2, 0, 0, 24],
  },
  // ── Forecast (Jun–Dic 2026) ──
  jun: {
    'Up Selling': [25.0, 0, 0, 15],
    'F&B Package': [0, 190.0, 0, 295],
    'F&B EP': [76.6, 197.0, 11.6, 360],
    'F&B Other': [15.1, 0.5, 0, 28],
    'Spa': [39.5, 12.7, 2.7, 74],
    'Retail': [20.6, 0, 0, 20],
    'Other Income': [13.2, 0, 0, 22],
  },
  jul: {
    'Up Selling': [20.0, 0, 0, 15],
    'F&B Package': [0, 150.0, 0, 294],
    'F&B EP': [83.1, 171.9, 10.1, 365],
    'F&B Other': [5.0, 0.2, 0, 23],
    'Spa': [37.2, 11.9, 2.6, 75],
    'Retail': [30.1, 0, 0, 21],
    'Other Income': [16.1, 0, 0, 24],
  },
  ago: {
    'Up Selling': [20.0, 0, 0, 15],
    'F&B Package': [0, 120.0, 0, 220],
    'F&B EP': [47.1, 149.2, 8.8, 270],
    'F&B Other': [20.1, 0.6, 0, 37],
    'Spa': [31.2, 10.0, 2.1, 74],
    'Retail': [18.8, 0, 0, 15],
    'Other Income': [10.8, 0, 0, 18],
  },
  sep: {
    'Up Selling': [15.0, 0, 0, 15],
    'F&B Package': [0, 97.5, 0, 183],
    'F&B EP': [42.1, 133.3, 7.8, 228],
    'F&B Other': [30.1, 1.0, 0, 28],
    'Spa': [53.2, 17.1, 3.7, 74],
    'Retail': [22.6, 0, 0, 13],
    'Other Income': [10.7, 0, 0, 17],
  },
  oct: {
    'Up Selling': [15.0, 0, 0, 15],
    'F&B Package': [0, 201.9, 0, 402],
    'F&B EP': [90.8, 287.9, 16.9, 477],
    'F&B Other': [40.2, 1.3, 0, 37],
    'Spa': [80.2, 25.7, 5.5, 75],
    'Retail': [35.5, 0, 0, 25],
    'Other Income': [14.1, 0, 0, 25],
  },
  nov: {
    'Up Selling': [15.0, 0, 0, 15],
    'F&B Package': [0, 263.0, 0, 544],
    'F&B EP': [109.9, 348.5, 20.5, 647],
    'F&B Other': [128.5, 4.1, 0, 111],
    'Spa': [90.9, 29.2, 6.2, 108],
    'Retail': [42.0, 0, 0, 34],
    'Other Income': [18.0, 0, 0, 32],
  },
  dic: {
    'Up Selling': [15.0, 0, 0, 15],
    'F&B Package': [0, 233.8, 0, 473],
    'F&B EP': [338.1, 339.6, 19.9, 585],
    'F&B Other': [65.2, 2.1, 0, 28],
    'Spa': [75.7, 24.3, 5.2, 108],
    'Retail': [43.2, 0, 0, 32],
    'Other Income': [17.7, 0, 0, 31],
  },
};

const relPct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);

interface LeafVals { hotel: number; club: number; otros: number; budget: number }

// Aggregate one leaf concept over a period (single month, or YTD = sum of months).
function leafVals(period: PeriodKey, concept: string): LeafVals {
  const months: MonthKey[] =
    period === 'ytd' ? ACTUAL_MONTHS
      : period === 'fy' ? MONTHS.map((m) => m.key)
        : [period];
  let hotel = 0, club = 0, otros = 0, budget = 0;
  for (const mk of months) {
    const v = DATA[mk][concept];
    if (!v) continue; // tolerate concepts not present in a month (e.g. pending detail)
    hotel += v[0]; club += v[1]; otros += v[2]; budget += v[3];
  }
  return { hotel, club, otros, budget };
}

export interface RevenueRow {
  concept: string;
  hotel: number;
  club: number;
  otros: number;
  budget: number;
  total: number;             // Real total across channels
  varBudget: number;         // Real total − Budget
  varBudgetPct: number | null;
  mixPct: number;            // share of grand-total Real
}

export interface RevenueBucket extends RevenueRow {
  children: RevenueRow[];    // detail rows ([] when the detail hasn't been shared yet)
  detailPending: boolean;
}

function mkRow(concept: string, v: LeafVals): RevenueRow {
  const total = v.hotel + v.club + v.otros;
  return { concept, ...v, total, varBudget: total - v.budget, varBudgetPct: relPct(total, v.budget), mixPct: 0 };
}

/** NPR buckets for a period as an expand/collapse tree: each bucket = sum of its detail rows. */
export function getRevenueTree(period: PeriodKey): RevenueBucket[] {
  const buckets = BUCKETS.map((def) => {
    if (def.children.length === 0) {
      // Childless concept — a plain leaf, or a bucket whose detail is still pending.
      return { ...mkRow(def.bucket, leafVals(period, def.bucket)), children: [] as RevenueRow[], detailPending: !!def.pending };
    }
    const children = def.children.map((c) => mkRow(c, leafVals(period, c)));
    const agg: LeafVals = {
      hotel: children.reduce((s, r) => s + r.hotel, 0),
      club: children.reduce((s, r) => s + r.club, 0),
      otros: children.reduce((s, r) => s + r.otros, 0),
      budget: children.reduce((s, r) => s + r.budget, 0),
    };
    return { ...mkRow(def.bucket, agg), children, detailPending: false };
  });
  const grand = buckets.reduce((s, b) => s + b.total, 0);
  const withMix = <T extends RevenueRow>(r: T): T => ({ ...r, mixPct: grand ? (r.total / grand) * 100 : 0 });
  return buckets.map((b) => ({ ...withMix(b), children: b.children.map(withMix) }));
}

// ── Monthly matrix (concept × month) for the horizontal "Mensual" view ──
export interface MonthlyCell { real: number; budget: number }
export interface MonthlyRow {
  concept: string;
  cells: MonthlyCell[];
  fy: MonthlyCell;
  children?: MonthlyRow[];
  detailPending?: boolean;
}

/** Each NPR bucket (with its detail children) and the grand total laid out across the 12 months
 *  + an FY column. */
export function getMonthlyMatrix(): { rows: MonthlyRow[]; total: MonthlyRow } {
  const trees = MONTHS.map((m) => getRevenueTree(m.key));
  const fyTree = getRevenueTree('fy');
  const bucketAt = (tree: ReturnType<typeof getRevenueTree>, name: string) => tree.find((x) => x.concept === name);
  const cellsFor = (pick: (t: ReturnType<typeof getRevenueTree>) => { total: number; budget: number } | undefined) =>
    trees.map((t) => { const v = pick(t); return { real: v?.total ?? 0, budget: v?.budget ?? 0 }; });

  const rows: MonthlyRow[] = BUCKETS.map((def) => {
    const fb = bucketAt(fyTree, def.bucket);
    const children: MonthlyRow[] = def.children.map((childName) => ({
      concept: childName,
      cells: cellsFor((t) => bucketAt(t, def.bucket)?.children.find((c) => c.concept === childName)),
      fy: (() => { const fc = fb?.children.find((c) => c.concept === childName); return { real: fc?.total ?? 0, budget: fc?.budget ?? 0 }; })(),
    }));
    return {
      concept: def.bucket,
      cells: cellsFor((t) => bucketAt(t, def.bucket)),
      fy: { real: fb?.total ?? 0, budget: fb?.budget ?? 0 },
      children,
      detailPending: fb?.detailPending ?? false,
    };
  });

  const totalCells = MONTHS.map((m) => { const t = getTotals(m.key); return { real: t.total, budget: t.budget }; });
  const fyT = getTotals('fy');
  const total: MonthlyRow = { concept: 'Total NPR', cells: totalCells, fy: { real: fyT.total, budget: fyT.budget } };
  return { rows, total };
}

export interface ChannelMix { hotel: number; club: number; otros: number }

export interface RevenueTotals {
  hotel: number;
  club: number;
  otros: number;
  total: number;
  budget: number;
  varBudget: number;
  varBudgetPct: number | null;
  mix: ChannelMix; // % of Real total by channel ("% NPR")
}

/** Real + Budget total (thousands MXN) for one leaf concept over a period.
 *  Used by the statistics layer (e.g. Average Check EP = AYB EP revenue / Cover EP). */
export function getConceptRealBudget(period: PeriodKey, concept: string): { real: number; budget: number } {
  const v = leafVals(period, concept);
  return { real: v.hotel + v.club + v.otros, budget: v.budget };
}

/** Grand totals + channel mix (the "% NPR" line) for a period. */
export function getTotals(period: PeriodKey): RevenueTotals {
  const tree = getRevenueTree(period);
  const hotel = tree.reduce((s, b) => s + b.hotel, 0);
  const club = tree.reduce((s, b) => s + b.club, 0);
  const otros = tree.reduce((s, b) => s + b.otros, 0);
  const total = hotel + club + otros;
  const budget = tree.reduce((s, b) => s + b.budget, 0);
  return {
    hotel,
    club,
    otros,
    total,
    budget,
    varBudget: total - budget,
    varBudgetPct: relPct(total, budget),
    mix: {
      hotel: total ? (hotel / total) * 100 : 0,
      club: total ? (club / total) * 100 : 0,
      otros: total ? (otros / total) * 100 : 0,
    },
  };
}
