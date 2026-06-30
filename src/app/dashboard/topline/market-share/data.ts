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
  { key: 'month', label: 'May', days: 31 },
  { key: 'ytd', label: 'May YTD', days: 151 },
];

// Order of metrics within each section (drives row rendering).
export const KPM_METRICS: Metric[] = ['OCC', 'ADR', 'RevPAR'];
export const SALES_METRICS: Metric[] = ['RoomNights', 'Revenue'];

// ─── Filter options (mock — to be sourced from SQL alongside the data) ─
export const HOTELS: string[] = [
  'Waldorf Astoria Costa Rica Punta Cacique',
  'Grand Hyatt Playa del Carmen',
  'Dreams Vista Cancun',
  'JW Marriott Cancun',
  'Casa Dorada Los Cabos',
];

export const MONTH_OPTIONS: string[] = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const COMP_SETS: string[] = ['Comp Set #1', 'Comp Set #2', 'Comp Set #3'];

// ─── Monthly progression (mock) ───────────────────────────────────────
// Month-by-month penetration indices (MPI = OCC, ARI = ADR, RGI = RevPAR)
// and the hotel's rank vs the comp set (1 = best, 7 = worst). May lines up
// with the headline table; earlier months trend toward it.
export interface MonthlyPoint {
  month: string; // "Jan" … "Dec"
  mpi: number;   // OCC penetration index (%)
  ari: number;   // ADR penetration index (%)
  rgi: number;   // RevPAR penetration index (%)
  rankOcc: number;
  rankAdr: number;
  rankRev: number;
}

export const MONTHLY_PROGRESSION: MonthlyPoint[] = [
  { month: 'Jan', mpi: 103.2, ari: 94.1, rgi: 97.1, rankOcc: 4, rankAdr: 4, rankRev: 5 },
  { month: 'Feb', mpi: 105.8, ari: 92.8, rgi: 98.2, rankOcc: 3, rankAdr: 5, rankRev: 4 },
  { month: 'Mar', mpi: 108.1, ari: 91.5, rgi: 99.0, rankOcc: 3, rankAdr: 5, rankRev: 4 },
  { month: 'Apr', mpi: 109.4, ari: 90.9, rgi: 99.8, rankOcc: 2, rankAdr: 6, rankRev: 4 },
  { month: 'May', mpi: 110.7, ari: 90.7, rgi: 100.4, rankOcc: 2, rankAdr: 5, rankRev: 4 },
];

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
    hotelCY: [52.5, 76.8], compCY: [47.4, 70.9], hotelLY: [60.5, 78.9], compLY: [60.0, 76.4],
    ranks: [['2 of 7', '4 of 7', '3 of 7'], ['2 of 7', '3 of 7', '3 of 7']],
  },
  ADR: {
    hotelCY: [210.2, 278.6], compCY: [231.9, 308.0], hotelLY: [236.1, 326.7], compLY: [255.8, 351.7],
    ranks: [['5 of 7', '5 of 7', '6 of 7'], ['4 of 7', '4 of 7', '5 of 7']],
  },
  RevPAR: {
    hotelCY: [110.4, 213.9], compCY: [110.0, 218.4], hotelLY: [142.9, 257.7], compLY: [153.6, 268.9],
    ranks: [['4 of 7', '5 of 7', '3 of 7'], ['4 of 7', '4 of 7', '4 of 7']],
  },
  RoomNights: {
    hotelCY: [4963, 35362], compCY: [4484, 32662], hotelLY: [5724, 36332], compLY: [5677, 35202],
    ranks: [['2 of 7', '4 of 7', '3 of 7'], ['2 of 7', '3 of 7', '3 of 7']],
  },
  Revenue: {
    hotelCY: [1043400, 9850500], compCY: [1039700, 10058900], hotelLY: [1351200, 11869700], compLY: [1452300, 12382200],
    ranks: [['4 of 7', '5 of 7', '3 of 7'], ['4 of 7', '4 of 7', '4 of 7']],
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

// ─── Detail table: faithful transcription of the report image ─────────
// Each row holds 8 pre-formatted display cells laid out as two period
// groups of four: [May: Hotel, Comp Set, third, Rank#] then the same for
// [May YTD]. The values carry their own rounding so the table matches the
// source exactly; cell colouring is derived at render time (see page.tsx)
// from the leading sign plus the column rules below.

export type RowKind = 'cy' | 'ly' | 'change';

export interface DetailRow {
  label: string;       // leftmost cell, e.g. "OCC% CY" / "Change %"
  kind: RowKind;       // drives which Hotel/Comp/third cells get coloured
  cells: string[];     // 8 strings: May[H, C, third, Rank] + YTD[H, C, third, Rank]
}

export interface DetailGroup {
  name: string;            // section label: "KPM's" | "Sales" | "Sales x Day"
  thirdCol: string;        // header of the 3rd data column: "KPI's" | "vs CS"
  alwaysToneThird: boolean; // KPM: colour 3rd col only on change rows; Sales: always
  rows: DetailRow[];       // metric blocks of 3 rows each, in order
}

export const DETAIL_GROUPS: DetailGroup[] = [
  {
    name: "KPM's",
    thirdCol: "KPI's",
    alwaysToneThird: false,
    rows: [
      { label: 'OCC% CY',  kind: 'cy',     cells: ['52.5%', '47.4%', '110.7%', '2 of 7', '76.8%', '70.9%', '108.3%', '2 of 7'] },
      { label: 'OCC% LY',  kind: 'ly',     cells: ['60.5%', '60.0%', '100.8%', '4 of 7', '78.9%', '76.4%', '103.2%', '3 of 7'] },
      { label: 'Change %', kind: 'change', cells: ['-13.3%', '-21.0%', '9.8%', '3 of 7', '-2.7%', '-7.2%', '4.9%', '3 of 7'] },

      { label: 'ADR CY',   kind: 'cy',     cells: ['210.2', '231.9', '90.7%', '5 of 7', '278.6', '308.0', '90.5%', '4 of 7'] },
      { label: 'ADR LY',   kind: 'ly',     cells: ['236.1', '255.8', '92.3%', '5 of 7', '326.7', '351.7', '92.9%', '4 of 7'] },
      { label: 'Change %', kind: 'change', cells: ['-10.9%', '-9.4%', '-1.8%', '6 of 7', '-14.7%', '-12.4%', '-2.6%', '5 of 7'] },

      { label: 'RevPAR CY', kind: 'cy',     cells: ['110.4', '110.0', '100.4%', '4 of 7', '213.9', '218.4', '97.9%', '4 of 7'] },
      { label: 'RevPAR LY', kind: 'ly',     cells: ['142.9', '153.6', '93.0%', '5 of 7', '257.7', '268.9', '95.9%', '4 of 7'] },
      { label: 'Change %',  kind: 'change', cells: ['-22.8%', '-28.4%', '7.9%', '3 of 7', '-17.0%', '-18.8%', '2.2%', '4 of 7'] },
    ],
  },
  {
    name: 'Sales',
    thirdCol: 'vs CS',
    alwaysToneThird: true,
    rows: [
      { label: 'Room Nights CY', kind: 'cy',     cells: ['4,963', '4,484', '479', '2 of 7', '35,362', '32,662', '2,700', '2 of 7'] },
      { label: 'Room Nights LY', kind: 'ly',     cells: ['5,724', '5,677', '47', '4 of 7', '36,332', '35,202', '1,130', '3 of 7'] },
      { label: 'Change',         kind: 'change', cells: ['-761', '-1,194', '433', '3 of 7', '-970', '-2,540', '1,570', '3 of 7'] },

      { label: 'Revenue CY', kind: 'cy',     cells: ['1,043.4K', '1,039.7K', '3.7K', '4 of 7', '9,850.5K', '10,058.9K', '-208.4K', '4 of 7'] },
      { label: 'Revenue LY', kind: 'ly',     cells: ['1,351.2K', '1,452.3K', '-101.1K', '5 of 7', '11,869.7K', '12,382.2K', '-512.4K', '4 of 7'] },
      { label: 'Change$',    kind: 'change', cells: ['-307.8K', '-412.6K', '104.8K', '3 of 7', '-2,019.2K', '-2,323.2K', '304.1K', '4 of 7'] },
    ],
  },
  {
    name: 'Sales x Day',
    thirdCol: 'vs CS',
    alwaysToneThird: true,
    rows: [
      { label: 'Room Nights CY', kind: 'cy',     cells: ['160', '145', '15', '2 of 7', '234', '216', '18', '2 of 7'] },
      { label: 'Room Nights LY', kind: 'ly',     cells: ['185', '183', '2', '4 of 7', '241', '233', '7', '3 of 7'] },
      { label: 'Change',         kind: 'change', cells: ['-25', '-39', '14', '3 of 7', '-6', '-17', '10', '3 of 7'] },

      { label: 'Revenue CY', kind: 'cy',     cells: ['33.7K', '33.5K', '0.1K', '4 of 7', '65.2K', '66.6K', '-1.4K', '4 of 7'] },
      { label: 'Revenue LY', kind: 'ly',     cells: ['43.6K', '46.8K', '-3.3K', '5 of 7', '78.6K', '82.0K', '-3.4K', '4 of 7'] },
      { label: 'Change$',    kind: 'change', cells: ['-9.9K', '-13.3K', '3.4K', '3 of 7', '-13.4K', '-15.4K', '2.0K', '4 of 7'] },
    ],
  },
];
