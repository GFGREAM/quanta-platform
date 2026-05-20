// Forecast dataset (currently a single hotel × 2026 × 3 scenarios).
// Values are sourced from the property's monthly P&L export and stored as
// "Non Converted" — i.e. expressed in the hotel's reporting currency, before
// FX conversion. `fxRate` (Tipo de Cambio) is kept for future USD/Local toggle.

export type Scenario = 'Actual' | 'Budget' | 'Outlook' | 'Forecast';

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;
export type Month = (typeof MONTHS)[number];

export const SCENARIOS: readonly Scenario[] = ['Actual', 'Budget', 'Outlook', 'Forecast'] as const;

/** Scenarios available in the comparison selector.
 *  - Actual: closed months only (real numbers, future months absent).
 *  - Outlook: closed months + projection, refreshed weekly.
 *  - Forecast: closed months + projection, refreshed monthly.
 *  Budget stays as the fixed reference baseline. */
export const COMPARISON_SCENARIOS: readonly Extract<Scenario, 'Actual' | 'Outlook' | 'Forecast'>[] = [
  'Actual',
  'Outlook',
  'Forecast',
] as const;

export interface ForecastRow {
  hotel: string;
  year: number;
  month: Month;
  ytd: 'MTD' | 'YTD';
  scenario: Scenario;
  company: string;
  complex: string;
  fxRate: number;
  rooms: number;
  availability: number;
  reportingCurrency: 'USD' | 'Local';
  roomsSold: number;
  roomsComp: number;
  roomsRevenue: number;
  clubMaintFee: number;
  timeshareMaintFee: number;
  otherRevenue: number;
  departmentalExpenses: number;
  undistributedExpenses: number;
  otherExpenses: number;
  nonOperating: number;
  guests: number;
  payingGuests: number;
}

const row = (
  month: Month,
  ytd: 'MTD' | 'YTD',
  scenario: Scenario,
  fxRate: number,
  availability: number,
  roomsSold: number,
  roomsComp: number,
  roomsRevenue: number,
  otherRevenue: number,
  departmentalExpenses: number,
  undistributedExpenses: number,
  otherExpenses: number,
  nonOperating: number,
  guests: number,
  payingGuests: number,
): ForecastRow => ({
  hotel: 'Dreams Aventuras',
  year: 2026,
  month,
  ytd,
  scenario,
  company: 'BBG',
  complex: 'BAL',
  fxRate,
  rooms: 305,
  availability,
  reportingCurrency: 'USD',
  roomsSold,
  roomsComp,
  roomsRevenue,
  clubMaintFee: 0,
  timeshareMaintFee: 0,
  otherRevenue,
  departmentalExpenses,
  undistributedExpenses,
  otherExpenses,
  nonOperating,
  guests,
  payingGuests,
});

// Placeholder LY scaling: until the prior-year Actual pipeline is wired,
// LY rows are derived from this year's Actual at LY_MOCK_SCALE.
// To swap with real DB data: drop the `lyMock` block below and append
// real ForecastRow entries for year - 1, scenario 'Actual'.
const LY_MOCK_SCALE = 0.88;

const lyMock = (base: ForecastRow): ForecastRow => ({
  ...base,
  year: base.year - 1,
  scenario: 'Actual',
  ytd: 'MTD',
  roomsSold: Math.round(base.roomsSold * LY_MOCK_SCALE),
  roomsComp: Math.round(base.roomsComp * LY_MOCK_SCALE),
  roomsRevenue: base.roomsRevenue * LY_MOCK_SCALE,
  clubMaintFee: base.clubMaintFee * LY_MOCK_SCALE,
  timeshareMaintFee: base.timeshareMaintFee * LY_MOCK_SCALE,
  otherRevenue: base.otherRevenue * LY_MOCK_SCALE,
  departmentalExpenses: base.departmentalExpenses * LY_MOCK_SCALE,
  undistributedExpenses: base.undistributedExpenses * LY_MOCK_SCALE,
  otherExpenses: base.otherExpenses * LY_MOCK_SCALE,
  nonOperating: base.nonOperating * LY_MOCK_SCALE,
  guests: Math.round(base.guests * LY_MOCK_SCALE),
  payingGuests: Math.round(base.payingGuests * LY_MOCK_SCALE),
});

const baseRows: ForecastRow[] = [
  // Actual — closed Jan-Mar; Apr-Dec carry the budget value as placeholder.
  row('Jan', 'MTD', 'Actual', 17.6768, 9455, 7724, 85, 2289822, 383917, 1073826, 781491, 65474, 118952, 16604, 16472),
  row('Feb', 'MTD', 'Actual', 17.2286, 8540, 7516, 86, 2251807, 328010, 980684, 754249, 67591, 153887, 16113, 15978),
  row('Mar', 'MTD', 'Actual', 17.7319, 9455, 8191, 100, 2407968, 279441, 1099065, 837472, 60070, 158540, 18046, 17912),
  row('Apr', 'MTD', 'Actual', 18, 9150, 7589, 88, 2244574.953, 338233.7722, 1011902.588, 820606.1346, 60024.00017, 109061.2376, 16122, 15937),
  row('May', 'MTD', 'Actual', 18, 9455, 6252, 298, 1573679.611, 327445.5003, 868801.6551, 739221.6205, 23448.14687, 108232.8482, 14410, 13754),
  row('Jun', 'MTD', 'Actual', 18, 9150, 6804, 103, 1783192.763, 307706.3084, 944513.9702, 791709.4806, 28374.04967, 126848.1549, 15195, 14968),
  row('Jul', 'MTD', 'Actual', 18.25, 9455, 6981, 107, 1911693.204, 290874.4591, 971486.305, 803561.7062, 34201.57216, 107524.9015, 15594, 15359),
  row('Aug', 'MTD', 'Actual', 18.25, 9455, 6636, 95, 1495619.898, 256279.4814, 946902.3754, 761363.8647, 3490.651116, 106782.6656, 15481, 15262),
  row('Sep', 'MTD', 'Actual', 18.25, 9150, 3923, 90, 806844.1102, 179073.229, 601469.503, 574354.6737, -15192.547, 124298.9266, 8427, 8238),
  row('Oct', 'MTD', 'Actual', 18.5, 9455, 4579, 130, 1011944.269, 211446.7162, 789707.2003, 674491.973, -19264.65503, 106032.2486, 9889, 9616),
  row('Nov', 'MTD', 'Actual', 18.5, 9150, 7628, 170, 1999077.695, 300746.8902, 984223.8521, 783503.2672, 42567.79728, 106497.1599, 16376, 16019),
  row('Dec', 'YTD', 'Actual', 18.5, 9455, 7886, 120, 2498692.595, 330269.0543, 1082206.642, 842698.2339, 72324.54182, 124724.2445, 17613, 17349),

  // Budget
  row('Jan', 'MTD', 'Budget', 18, 9455, 7785, 96, 2416573.03, 346938.2492, 1073473.952, 860893.8496, 66331.47819, 110727.5938, 16550, 16348),
  row('Feb', 'MTD', 'Budget', 18, 8540, 7648, 120, 2452462.538, 341763.0281, 897691.9862, 785017.749, 88921.26649, 110022.8333, 16313, 16061),
  row('Mar', 'MTD', 'Budget', 18, 9455, 8349, 151, 2737533.672, 350601.4164, 1087081.013, 876721.9113, 89946.57318, 129362.6021, 18700, 18368),
  row('Apr', 'MTD', 'Budget', 18, 9150, 7589, 88, 2244574.953, 338233.7722, 1011902.588, 820606.1346, 60024.00017, 109061.2376, 16122, 15937),
  row('May', 'MTD', 'Budget', 18, 9455, 6252, 298, 1573679.611, 327445.5003, 868801.6551, 739221.6205, 23448.14687, 108232.8482, 14410, 13754),
  row('Jun', 'MTD', 'Budget', 18, 9150, 6804, 103, 1783192.763, 307706.3084, 944513.9702, 791709.4806, 28374.04967, 126848.1549, 15195, 14968),
  row('Jul', 'MTD', 'Budget', 18.25, 9455, 6981, 107, 1911693.204, 290874.4591, 971486.305, 803561.7062, 34201.57216, 107524.9015, 15594, 15359),
  row('Aug', 'MTD', 'Budget', 18.25, 9455, 6636, 95, 1495619.898, 256279.4814, 946902.3754, 761363.8647, 3490.651116, 106782.6656, 15481, 15262),
  row('Sep', 'MTD', 'Budget', 18.25, 9150, 3923, 90, 806844.1102, 179073.229, 601469.503, 574354.6737, -15192.547, 124298.9266, 8427, 8238),
  row('Oct', 'MTD', 'Budget', 18.5, 9455, 4579, 130, 1011944.269, 211446.7162, 789707.2003, 674491.973, -19264.65503, 106032.2486, 9889, 9616),
  row('Nov', 'MTD', 'Budget', 18.5, 9150, 7628, 170, 1999077.695, 300746.8902, 984223.8521, 783503.2672, 42567.79728, 106497.1599, 16376, 16019),
  row('Dec', 'YTD', 'Budget', 18.5, 9455, 7886, 120, 2498692.595, 330269.0543, 1082206.642, 842698.2339, 72324.54182, 124724.2445, 17613, 17349),

  // Outlook — closed Jan-Mar, projection Apr onwards (refreshed weekly).
  row('Jan', 'MTD', 'Outlook', 17.6768, 9455, 7724, 85, 2289822, 383917, 1073826, 781491, 65474, 118952, 16604, 16472),
  row('Feb', 'MTD', 'Outlook', 17.2286, 8540, 7516, 86, 2251807, 328010, 980684, 754249, 67591, 153887, 16113, 15978),
  row('Mar', 'MTD', 'Outlook', 17.7319, 9455, 8191, 100, 2407968, 279441, 1099065, 837472, 60070, 158540, 18046, 17912),
  row('Apr', 'MTD', 'Outlook', 17.78, 9150, 7146, 104, 1774289, 338464, 1002596, 814127, 23682, 110431, 15447, 15226),
  row('May', 'MTD', 'Outlook', 17.78, 9455, 5664, 144, 1316162, 327445, 800645, 713938, 10322, 109592, 12518, 12208),
  row('Jun', 'MTD', 'Outlook', 17.78, 9150, 5873, 182, 1501520, 307706, 882795, 771680, 12380, 128441, 13053, 12660),
  row('Jul', 'MTD', 'Outlook', 17.92333333, 9455, 6824, 107, 1833293, 290875, 975928, 810661, 27006, 109485, 14944, 14710),
  row('Aug', 'MTD', 'Outlook', 17.92333333, 9455, 5885, 95, 1407752, 256279, 897260, 762983, 303, 108729, 13418, 13205),
  row('Sep', 'MTD', 'Outlook', 17.92333333, 9150, 3923, 90, 806844, 179435, 601469, 574355, -15193, 124299, 8604, 8411),
  row('Oct', 'MTD', 'Outlook', 18.5, 9455, 4579, 130, 1011944.269, 211446.7162, 789707.2003, 674491.973, -19264.65503, 106032.2486, 9889, 9616),
  row('Nov', 'MTD', 'Outlook', 18.5, 9150, 7628, 170, 1999077.695, 300746.8902, 984223.8521, 783503.2672, 42567.79728, 106497.1599, 16376, 16019),
  row('Dec', 'YTD', 'Outlook', 18.5, 9455, 7886, 120, 2498692.595, 330269.0543, 1082206.642, 842698.2339, 72324.54182, 124724.2445, 17613, 17349),

  // Forecast — closed Jan-Mar, projection Apr onwards (refreshed monthly).
  // Currently mirroring Outlook values; replace with the monthly snapshot when available.
  row('Jan', 'MTD', 'Forecast', 17.6768, 9455, 7724, 85, 2289822, 383917, 1073826, 781491, 65474, 118952, 16604, 16472),
  row('Feb', 'MTD', 'Forecast', 17.2286, 8540, 7516, 86, 2251807, 328010, 980684, 754249, 67591, 153887, 16113, 15978),
  row('Mar', 'MTD', 'Forecast', 17.7319, 9455, 8191, 100, 2407968, 279441, 1099065, 837472, 60070, 158540, 18046, 17912),
  row('Apr', 'MTD', 'Forecast', 17.78, 9150, 7146, 104, 1774289, 338464, 1002596, 814127, 23682, 110431, 15447, 15226),
  row('May', 'MTD', 'Forecast', 17.78, 9455, 5664, 144, 1316162, 327445, 800645, 713938, 10322, 109592, 12518, 12208),
  row('Jun', 'MTD', 'Forecast', 17.78, 9150, 5873, 182, 1501520, 307706, 882795, 771680, 12380, 128441, 13053, 12660),
  row('Jul', 'MTD', 'Forecast', 17.92333333, 9455, 6824, 107, 1833293, 290875, 975928, 810661, 27006, 109485, 14944, 14710),
  row('Aug', 'MTD', 'Forecast', 17.92333333, 9455, 5885, 95, 1407752, 256279, 897260, 762983, 303, 108729, 13418, 13205),
  row('Sep', 'MTD', 'Forecast', 17.92333333, 9150, 3923, 90, 806844, 179435, 601469, 574355, -15193, 124299, 8604, 8411),
  row('Oct', 'MTD', 'Forecast', 18.5, 9455, 4579, 130, 1011944.269, 211446.7162, 789707.2003, 674491.973, -19264.65503, 106032.2486, 9889, 9616),
  row('Nov', 'MTD', 'Forecast', 18.5, 9150, 7628, 170, 1999077.695, 300746.8902, 984223.8521, 783503.2672, 42567.79728, 106497.1599, 16376, 16019),
  row('Dec', 'YTD', 'Forecast', 18.5, 9455, 7886, 120, 2498692.595, 330269.0543, 1082206.642, 842698.2339, 72324.54182, 124724.2445, 17613, 17349),
];

// ─── Portfolio mock hotels ──────────────────────────────────────
// Until the multi-hotel pipeline is wired, the portfolio view borrows two
// additional properties by scaling Dreams Aventuras at plausible factors.
// Replace by appending real ForecastRow entries and removing this block.
interface PortfolioMock {
  hotel: string;
  code: string;
  rooms: number;
  scale: number;
}

const PORTFOLIO_MOCK_HOTELS: readonly PortfolioMock[] = [
  { hotel: 'Dreams Vista', code: 'DREVC', rooms: 425, scale: 1.6 },
  { hotel: 'Secrets & Dreams BM', code: 'SDBMI', rooms: 690, scale: 3.6 },
] as const;

function mockHotelRow(base: ForecastRow, hotel: string, rooms: number, scale: number): ForecastRow {
  const roomsRatio = rooms / base.rooms;
  return {
    ...base,
    hotel,
    rooms,
    availability: Math.round(base.availability * roomsRatio),
    roomsSold: Math.round(base.roomsSold * roomsRatio),
    roomsComp: Math.round(base.roomsComp * roomsRatio),
    roomsRevenue: base.roomsRevenue * scale,
    clubMaintFee: base.clubMaintFee * scale,
    timeshareMaintFee: base.timeshareMaintFee * scale,
    otherRevenue: base.otherRevenue * scale,
    departmentalExpenses: base.departmentalExpenses * scale,
    undistributedExpenses: base.undistributedExpenses * scale,
    otherExpenses: base.otherExpenses * scale,
    nonOperating: base.nonOperating * scale,
    guests: Math.round(base.guests * roomsRatio),
    payingGuests: Math.round(base.payingGuests * roomsRatio),
  };
}

const portfolioMockRows = PORTFOLIO_MOCK_HOTELS.flatMap(({ hotel, rooms, scale }) =>
  baseRows.map((r) => mockHotelRow(r, hotel, rooms, scale)),
);

const allBaseRows = [...baseRows, ...portfolioMockRows];

// Append derived LY (year - 1, Actual) rows for every hotel.
const lyRows = allBaseRows
  .filter((r) => r.scenario === 'Actual')
  .map(lyMock);

export const FORECAST_ROWS: ForecastRow[] = [...allBaseRows, ...lyRows];

export const HOTELS = Array.from(new Set(FORECAST_ROWS.map((r) => r.hotel))).sort();

/** Property-code mapping for portfolio table column headers. */
export const HOTEL_CODES: Record<string, string> = {
  'Dreams Aventuras': 'DREPA',
  ...Object.fromEntries(PORTFOLIO_MOCK_HOTELS.map((p) => [p.hotel, p.code])),
};

/** Hotels rendered in the portfolio comparison table, in display order. */
export const PORTFOLIO_HOTELS: readonly string[] = [
  'Dreams Aventuras',
  ...PORTFOLIO_MOCK_HOTELS.map((p) => p.hotel),
];

// ─── Weekly Outlook snapshots (mock) ────────────────────────────
// Until the weekly snapshot pipeline is wired, the WoW chart applies a fixed
// per-week multiplier to the current Outlook value. Index 0 is the oldest
// week shown; the last entry (Current) matches today's published Outlook.
// Replace with real `snapshotDate`-keyed rows once the pipeline lands.
export interface WeeklyOutlookDrift {
  weekLabel: string;
  multiplier: number;
}

export const WEEKLY_OUTLOOK_DRIFTS: readonly WeeklyOutlookDrift[] = [
  { weekLabel: 'W-7', multiplier: 1.045 },
  { weekLabel: 'W-6', multiplier: 1.052 },
  { weekLabel: 'W-5', multiplier: 1.038 },
  { weekLabel: 'W-4', multiplier: 1.022 },
  { weekLabel: 'W-3', multiplier: 1.028 },
  { weekLabel: 'W-2', multiplier: 1.012 },
  { weekLabel: 'W-1', multiplier: 1.005 },
  { weekLabel: 'Current', multiplier: 1.000 },
];
// Only expose years that have a Budget reference — LY years are implicit.
export const YEARS = Array.from(
  new Set(FORECAST_ROWS.filter((r) => r.scenario === 'Budget').map((r) => r.year)),
).sort((a, b) => b - a);

// ─── Metric definitions ─────────────────────────────────────────

export type MetricKey =
  | 'roomsRevenue'
  | 'totalRevenue'
  | 'departmentalExpenses'
  | 'undistributedExpenses'
  | 'totalExpenses'
  | 'gop'
  | 'ebitda'
  | 'roomsSold'
  | 'occupancy'
  | 'adr';

export type MetricFormat = 'money' | 'percent' | 'integer';

export interface MetricDef {
  key: MetricKey;
  label: string;
  format: MetricFormat;
  /** True when a higher value is the desirable outcome (revenues, GOP).
   *  Used to color variance badges (green/red). */
  higherIsBetter: boolean;
  calc: (r: ForecastRow) => number;
}

const totalRevenue = (r: ForecastRow) =>
  r.roomsRevenue + r.clubMaintFee + r.timeshareMaintFee + r.otherRevenue;

const totalExpenses = (r: ForecastRow) =>
  r.departmentalExpenses + r.undistributedExpenses + r.otherExpenses;

const gop = (r: ForecastRow) =>
  totalRevenue(r) - r.departmentalExpenses - r.undistributedExpenses;

const ebitda = (r: ForecastRow) => gop(r) - r.otherExpenses;

export const METRIC_DEFS: readonly MetricDef[] = [
  { key: 'totalRevenue', label: 'Total Revenue', format: 'money', higherIsBetter: true, calc: totalRevenue },
  { key: 'roomsRevenue', label: 'Rooms Revenue', format: 'money', higherIsBetter: true, calc: (r) => r.roomsRevenue },
  { key: 'departmentalExpenses', label: 'Departmental Expenses', format: 'money', higherIsBetter: false, calc: (r) => r.departmentalExpenses },
  { key: 'undistributedExpenses', label: 'Undistributed Expenses', format: 'money', higherIsBetter: false, calc: (r) => r.undistributedExpenses },
  { key: 'totalExpenses', label: 'Total Expenses', format: 'money', higherIsBetter: false, calc: totalExpenses },
  { key: 'gop', label: 'GOP', format: 'money', higherIsBetter: true, calc: gop },
  { key: 'ebitda', label: 'EBITDA', format: 'money', higherIsBetter: true, calc: ebitda },
  { key: 'roomsSold', label: 'Rooms Sold', format: 'integer', higherIsBetter: true, calc: (r) => r.roomsSold },
  { key: 'occupancy', label: 'Occupancy %', format: 'percent', higherIsBetter: true, calc: (r) => r.availability ? (r.roomsSold / r.availability) * 100 : 0 },
  { key: 'adr', label: 'ADR', format: 'money', higherIsBetter: true, calc: (r) => r.roomsSold ? r.roomsRevenue / r.roomsSold : 0 },
] as const;

export const METRICS_BY_KEY = METRIC_DEFS.reduce<Record<MetricKey, MetricDef>>((acc, m) => {
  acc[m.key] = m;
  return acc;
}, {} as Record<MetricKey, MetricDef>);

// ─── Formatters ─────────────────────────────────────────────────

export function fmtMoney(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
}

export function fmtMoneyFull(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

export function fmtPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

export function fmtInteger(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString('en-US');
}

export function fmtMetric(value: number, format: MetricFormat): string {
  switch (format) {
    case 'money': return fmtMoney(value);
    case 'percent': return fmtPercent(value);
    case 'integer': return fmtInteger(value);
  }
}

export function fmtVariance(actual: number, compare: number): { pct: number; label: string } | null {
  if (!compare) return null;
  const pct = ((actual - compare) / Math.abs(compare)) * 100;
  return { pct, label: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` };
}

// ─── Period scope ───────────────────────────────────────────────

export type Scope = 'mtd' | 'ytd' | 'fy';

export const SCOPES: readonly Scope[] = ['mtd', 'ytd', 'fy'] as const;

const MONTH_INDEX: Record<Month, number> = MONTHS.reduce(
  (acc, m, i) => ({ ...acc, [m]: i }),
  {} as Record<Month, number>,
);

/** Filter a row set to the months covered by the chosen period.
 *  - mtd: only the selected month
 *  - ytd: Jan through the selected month, inclusive
 *  - fy:  all months in the year */
export function filterByPeriod(rows: ForecastRow[], scope: Scope, month: Month): ForecastRow[] {
  if (scope === 'fy') return rows;
  const target = MONTH_INDEX[month];
  if (scope === 'mtd') return rows.filter((r) => MONTH_INDEX[r.month] === target);
  return rows.filter((r) => MONTH_INDEX[r.month] <= target);
}

export function scenarioAbbrev(scenario: Scenario): string {
  switch (scenario) {
    case 'Outlook': return 'OUT';
    case 'Forecast': return 'FCST';
    case 'Budget': return 'BUD';
    case 'Actual': return 'ACT';
  }
}

export function scopeLabel(scope: Scope, month: Month, year: number): string {
  if (scope === 'fy') return `FY ${year}`;
  if (scope === 'ytd') return `YTD ${month}`;
  return `${month} ${year}`;
}

// ─── Currency conversion ────────────────────────────────────────

export type Currency = 'USD' | 'Local';

export const CURRENCIES: readonly Currency[] = ['USD', 'Local'] as const;

/** Restate a row's monetary fields in the target currency.
 *  Each row carries its native `reportingCurrency` and `fxRate` (local→USD).
 *  Counts (rooms sold, guests) and rates (occupancy %) are NOT touched —
 *  they're either currency-agnostic or derived after conversion. */
export function convertRow(row: ForecastRow, target: Currency): ForecastRow {
  if (row.reportingCurrency === target) return row;
  // USD → Local: multiply by fxRate. Local → USD: divide by fxRate.
  const factor = target === 'Local' ? row.fxRate : 1 / row.fxRate;
  return {
    ...row,
    reportingCurrency: target,
    roomsRevenue: row.roomsRevenue * factor,
    clubMaintFee: row.clubMaintFee * factor,
    timeshareMaintFee: row.timeshareMaintFee * factor,
    otherRevenue: row.otherRevenue * factor,
    departmentalExpenses: row.departmentalExpenses * factor,
    undistributedExpenses: row.undistributedExpenses * factor,
    otherExpenses: row.otherExpenses * factor,
    nonOperating: row.nonOperating * factor,
  };
}

export function currencyLabel(c: Currency): string {
  return c === 'USD' ? 'US Dollars' : 'Local Currency';
}
