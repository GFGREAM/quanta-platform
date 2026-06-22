/**
 * Market Share vs Comp Set — static dataset (frontend mock).
 *
 * Shaped to mirror what a SQL query will eventually return: one record per
 * (section, metric, period) carrying the Hotel and Comp Set figures for the
 * current year (CY) and last year (LY), plus the three rank strings.
 *
 * Everything derived — penetration indices (MPI/ARI/RGI), YoY change %,
 * "vs CS" differences, absolute changes and the per-day figures — is COMPUTED
 * by the helpers below, never stored. Swapping this mock for live SQL is then
 * just replacing MARKET_SHARE_ROWS (same shape) without touching any math.
 */

export type Section = 'KPM' | 'Sales';
export type Metric = 'OCC' | 'ADR' | 'RevPAR' | 'RoomNights' | 'Revenue';
export type PeriodKey = 'month' | 'ytd';

// Display "kind" drives number formatting per metric.
//   pct   → percentage value, e.g. OCC 57.9% and all the index columns
//   rate  → money rate with 1 decimal (ADR, RevPAR)
//   count → integer with thousands separator (Room Nights)
//   money → abbreviated thousands, e.g. 258.1K (Revenue)
export type MetricKind = 'pct' | 'rate' | 'count' | 'money';

export const METRIC_KIND: Record<Metric, MetricKind> = {
  OCC: 'pct',
  ADR: 'rate',
  RevPAR: 'rate',
  RoomNights: 'count',
  Revenue: 'money',
};

export interface Period {
  key: PeriodKey;
  label: string; // "April", "April YTD"
  days: number;  // days covered by the period — used for Sales x Day
}

// One SQL row: a metric in a period with the four raw values + ranks.
// ranks map to the three display rows of the metric: [CY, LY, Change].
export interface ShareRow {
  section: Section;
  metric: Metric;
  period: PeriodKey;
  hotelCY: number;
  compCY: number;
  hotelLY: number;
  compLY: number;
  rankCY: string;
  rankLY: string;
  rankChange: string;
}

export const REPORT_TITLE = 'MARKET SHARE VS COMP SET #1';

export const PROPERTY = {
  name: 'Waldorf Astoria Costa Rica Punta Cacique',
  compSet: 'Comp Set #1 · 7 properties',
};

export const PERIODS: Period[] = [
  { key: 'month', label: 'April', days: 30 },
  { key: 'ytd', label: 'April YTD', days: 120 },
];

// Order of metrics within each section (drives row rendering).
export const KPM_METRICS: Metric[] = ['OCC', 'ADR', 'RevPAR'];
export const SALES_METRICS: Metric[] = ['RoomNights', 'Revenue'];

// ─── Mock data (April example from the spec) ─────────────────────────
// period index: 0 = month, 1 = ytd.
const SRC: Record<Metric, {
  hotelCY: [number, number];
  compCY: [number, number];
  hotelLY: [number, number];
  compLY: [number, number];
  ranks: [[string, string, string], [string, string, string]];
}> = {
  OCC: {
    hotelCY: [57.9, 57.6], compCY: [60.9, 61.3], hotelLY: [63.7, 62.2], compLY: [60.1, 61.1],
    ranks: [['5 of 7', '4 of 7', '6 of 7'], ['5 of 7', '5 of 7', '7 of 7']],
  },
  ADR: {
    hotelCY: [104.6, 104.3], compCY: [98.0, 100.4], hotelLY: [112.1, 99.7], compLY: [101.4, 91.8],
    ranks: [['2 of 7', '3 of 7', '6 of 7'], ['3 of 7', '3 of 7', '6 of 7']],
  },
  RevPAR: {
    hotelCY: [60.6, 60.1], compCY: [59.6, 61.6], hotelLY: [71.5, 62.1], compLY: [60.9, 56.1],
    ranks: [['3 of 7', '2 of 7', '7 of 7'], ['4 of 7', '2 of 7', '7 of 7']],
  },
  RoomNights: {
    hotelCY: [2467, 9821], compCY: [2593, 10452], hotelLY: [2715, 10607], compLY: [2558, 10408],
    ranks: [['5 of 7', '4 of 7', '6 of 7'], ['5 of 7', '5 of 7', '7 of 7']],
  },
  Revenue: {
    hotelCY: [258100, 1023900], compCY: [254000, 1049100], hotelLY: [304400, 1057700], compLY: [259400, 955200],
    ranks: [['3 of 7', '2 of 7', '7 of 7'], ['4 of 7', '2 of 7', '7 of 7']],
  },
};

const sectionOf = (m: Metric): Section =>
  m === 'OCC' || m === 'ADR' || m === 'RevPAR' ? 'KPM' : 'Sales';

// Flatten SRC into the SQL-row shape the UI consumes.
export const MARKET_SHARE_ROWS: ShareRow[] = (Object.keys(SRC) as Metric[]).flatMap((metric) =>
  PERIODS.map((p, i): ShareRow => ({
    section: sectionOf(metric),
    metric,
    period: p.key,
    hotelCY: SRC[metric].hotelCY[i],
    compCY: SRC[metric].compCY[i],
    hotelLY: SRC[metric].hotelLY[i],
    compLY: SRC[metric].compLY[i],
    rankCY: SRC[metric].ranks[i][0],
    rankLY: SRC[metric].ranks[i][1],
    rankChange: SRC[metric].ranks[i][2],
  }))
);

export function getRow(metric: Metric, period: PeriodKey): ShareRow {
  const row = MARKET_SHARE_ROWS.find((r) => r.metric === metric && r.period === period);
  if (!row) throw new Error(`No data for ${metric} / ${period}`);
  return row;
}

export const daysFor = (period: PeriodKey): number =>
  PERIODS.find((p) => p.key === period)!.days;

// ─── Calc helpers (pure) ─────────────────────────────────────────────
// Penetration index: Hotel ÷ Comp Set × 100. MPI (OCC), ARI (ADR), RGI (RevPAR).
export const penetrationIndex = (hotel: number, comp: number): number =>
  comp === 0 ? 0 : (hotel / comp) * 100;

// YoY change %: (CY − LY) / LY × 100.
export const changePct = (cy: number, ly: number): number =>
  ly === 0 ? 0 : ((cy - ly) / ly) * 100;

// vs Comp Set: absolute difference Hotel − Comp Set.
export const vsCompSet = (hotel: number, comp: number): number => hotel - comp;

// Absolute change CY − LY.
export const change = (cy: number, ly: number): number => cy - ly;

// Per-day value over the period.
export const perDay = (value: number, days: number): number =>
  days === 0 ? 0 : value / days;

// ─── Formatters ──────────────────────────────────────────────────────
const sign = (v: number) => (v > 0 ? '+' : v < 0 ? '-' : '');

// Level value (no sign): used for CY/LY cells and the index level.
export function fmtLevel(v: number, kind: MetricKind): string {
  switch (kind) {
    case 'pct': return `${v.toFixed(1)}%`;
    case 'rate': return v.toFixed(1);
    case 'count': return Math.round(v).toLocaleString('en-US');
    case 'money': return `${(v / 1000).toFixed(1)}K`;
  }
}

// Signed value: used for change / variance / vs-CS cells.
export function fmtSigned(v: number, kind: MetricKind): string {
  const a = Math.abs(v);
  switch (kind) {
    case 'pct': return `${sign(v)}${a.toFixed(1)}%`;
    case 'rate': return `${sign(v)}${a.toFixed(1)}`;
    case 'count': return `${sign(v)}${Math.round(a).toLocaleString('en-US')}`;
    case 'money': return `${sign(v)}${(a / 1000).toFixed(1)}K`;
  }
}

// Signed percentage (for the index Change % column, always a percentage).
export const fmtSignedPct = (v: number): string => `${sign(v)}${Math.abs(v).toFixed(1)}%`;

// Index level as a percentage (e.g. 95.2%).
export const fmtIndex = (v: number): string => `${v.toFixed(1)}%`;
