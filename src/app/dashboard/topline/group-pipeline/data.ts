/**
 * Group Pipeline — dataset access layer.
 *
 * The raw long-format records live in ./dataset.ts (RAW_DATASET, tab-delimited,
 * generated from dataset.tsv). This module parses them ONCE at load into compact
 * per-(property, year, snapshot) lookups and exposes property-scoped accessors.
 *
 * Long-format schema (11 columns):
 *   property_id  property_name  source  snapshot  as_of_date  year  month  status  level  metric  value
 *
 * Business rules (unchanged from the single-property version):
 * - Hotel source: only level = "My Hotel". Metrics: RN, ADR, REV, BKGS.
 * - D360 source: levels = My Hotel | Comp Set | Market. Metrics: OCC, RN, ADR, RevPAR.
 *   D360 does NOT track Prospect — Prospect always comes from the hotel's internal report.
 * - Budget source: level = "My Hotel", status "Budget", metrics RN/ADR/REV (one year, no snapshot).
 * - For CS/Market in D360, ADR/REV/RevPAR may be 0 or null for future months
 *   (Amadeus releases the figure once the month closes).
 * - A blank value parses to null.
 */
import { RAW_DATASET } from './dataset';

export type Source = 'Hotel' | 'D360' | 'Budget';
// Snapshot codes now vary per property (e.g. "Snap-Ene" for Waldorf,
// "Snap-Apr-09" for Hacienda), so this is just a string.
export type Snapshot = string;
export type Status = 'Prospect' | 'Tentative' | 'Definite';
export type Level = 'My Hotel' | 'Comp Set' | 'Market';
export type Metric = 'RN' | 'ADR' | 'REV' | 'BKGS' | 'OCC' | 'RevPAR';
export type Visual = 'V1' | 'V2';

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;
export type Month = typeof MONTHS[number];
const MONTH_INDEX: Record<string, number> = Object.fromEntries(MONTHS.map((m, i) => [m, i]));

export const STATUSES: Status[] = ['Prospect','Tentative','Definite'];
export const LEVELS: Level[] = ['My Hotel','Comp Set','Market'];
export const METRICS: Metric[] = ['RN','ADR','REV','OCC','RevPAR','BKGS'];

export const HOTEL_METRICS: Metric[] = ['RN','ADR','REV','BKGS'];
export const D360_METRICS: Metric[] = ['OCC','RN','ADR','RevPAR'];

// Neither 2026 nor 2027 is a leap year → identical day counts, so inventory is
// year-independent. Inventory[m] = rooms × days_in_month_m.
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// ─── Property registry (stable facts not derivable from the feed) ────────────
// rooms: Waldorf 188 (known); Hacienda 270 (confirmed: RN ÷ OCC ≈ 270 × days).
// amadeusId shown next to the title when present.
type RegistryEntry = { amadeusId?: number; rooms: number };
const REGISTRY: Record<string, RegistryEntry> = {
  'WACR-PC': { amadeusId: 531615, rooms: 188 },
  'HDMSJ': { rooms: 270 },
};

export type PropertyMeta = { code: string; name: string; amadeusId?: number; rooms: number };

type V = number | null;
type V12 = [V,V,V,V,V,V,V,V,V,V,V,V];
const N12 = (): V12 => [null,null,null,null,null,null,null,null,null,null,null,null];

// ─── Parse RAW_DATASET once ──────────────────────────────────────────────────
type Parsed = {
  order: string[]; // property codes in first-seen order (Waldorf first)
  names: Record<string, string>;
  snapDates: Record<string, Record<string, string>>; // code -> snapshot -> as_of_date
  years: Record<string, Set<number>>; // code -> years present
  hotel: Record<string, V12>; // `${code}|${year}|${snap}|${status}|${metric}`
  d360: Record<string, V12>;  // `${code}|${year}|${snap}|${status}|${level}|${metric}`
  budget: Record<string, V12>; // `${code}|${year}|${metric}`
};

const DATA: Parsed = (() => {
  const order: string[] = [];
  const names: Record<string, string> = {};
  const snapDates: Record<string, Record<string, string>> = {};
  const years: Record<string, Set<number>> = {};
  const hotel: Record<string, V12> = {};
  const d360: Record<string, V12> = {};
  const budget: Record<string, V12> = {};

  const lines = RAW_DATASET.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const c = line.split('\t');
    if (c.length < 11) continue; // skip malformed
    const code = c[0];
    const name = c[1];
    const source = c[2] as Source;
    const snap = c[3];
    const asOf = c[4];
    const year = Number(c[5]);
    const month = c[6];
    const status = c[7];
    const level = c[8];
    const metric = c[9];
    const raw = c[10];
    const mi = MONTH_INDEX[month];
    if (mi === undefined) continue;
    const value: V = raw === '' || raw === undefined ? null : Number(raw);

    if (!names[code]) { names[code] = name; order.push(code); }
    snapDates[code] = snapDates[code] || {};
    if (snap) snapDates[code][snap] = asOf;
    years[code] = years[code] || new Set<number>();
    years[code].add(year);

    if (source === 'Budget') {
      const k = `${code}|${year}|${metric}`;
      (budget[k] = budget[k] || N12())[mi] = value;
    } else if (source === 'Hotel') {
      const k = `${code}|${year}|${snap}|${status}|${metric}`;
      (hotel[k] = hotel[k] || N12())[mi] = value;
    } else if (source === 'D360') {
      const k = `${code}|${year}|${snap}|${status}|${level}|${metric}`;
      (d360[k] = d360[k] || N12())[mi] = value;
    }
  }
  return { order, names, snapDates, years, hotel, d360, budget };
})();

// ─── Property-scoped accessors ───────────────────────────────────────────────
export const PROPERTIES: PropertyMeta[] = DATA.order.map((code) => ({
  code,
  name: DATA.names[code],
  amadeusId: REGISTRY[code]?.amadeusId,
  rooms: REGISTRY[code]?.rooms ?? 0,
}));

export function getProperty(code: string): PropertyMeta {
  return PROPERTIES.find((p) => p.code === code) ?? PROPERTIES[0];
}

export function getSnapshotDates(code: string): Record<string, string> {
  return DATA.snapDates[code] ?? {};
}

// Snapshots ordered chronologically by as_of_date.
export function getSnapshots(code: string): Snapshot[] {
  const dates = DATA.snapDates[code] ?? {};
  return Object.keys(dates).sort((a, b) => (dates[a] < dates[b] ? -1 : dates[a] > dates[b] ? 1 : 0));
}

export function getYears(code: string): number[] {
  return [...(DATA.years[code] ?? new Set<number>())].sort((a, b) => a - b);
}

export function getInventory(code: string): number[] {
  const rooms = getProperty(code).rooms;
  return DAYS_IN_MONTH.map((d) => d * rooms);
}

// ─── Baselines (Budget from the feed; LY / Forecast blank for now) ───────────
export type Baseline = 'Budget' | 'LY' | 'Forecast';
export const BASELINE_LABELS: Record<Baseline, string> = {
  Budget: 'Budget 2026',
  LY: 'Last Year',
  Forecast: 'Forecast',
};
const BLANK_BASELINE = (): Record<'RN' | 'ADR' | 'REV', V12> => ({ RN: N12(), ADR: N12(), REV: N12() });

export function getBaselines(code: string, year: number): Record<Baseline, Record<'RN' | 'ADR' | 'REV', V12>> {
  const budget: Record<'RN' | 'ADR' | 'REV', V12> = {
    RN: DATA.budget[`${code}|${year}|RN`] ?? N12(),
    ADR: DATA.budget[`${code}|${year}|ADR`] ?? N12(),
    REV: DATA.budget[`${code}|${year}|REV`] ?? N12(),
  };
  return { Budget: budget, LY: BLANK_BASELINE(), Forecast: BLANK_BASELINE() };
}

// ─── Series lookup ──────────────────────────────────────────────────────────
// My Hotel OCC from the hotel's own report: the report carries RN but no OCC,
// so we derive it as RN ÷ inventory (rooms × days in month).
function hotelOccFromRN(code: string, year: number, snapshot: Snapshot, status: Status): V12 {
  const rn = DATA.hotel[`${code}|${year}|${snapshot}|${status}|RN`] ?? N12();
  const inv = getInventory(code);
  return rn.map((v, i) => (v === null ? null : v / inv[i])) as V12;
}

// Returns the 12-month series for a given cell, for a property + year.
// Visual 1 ("Operational reality"): My Hotel rows pull from Hotel source for all
// statuses; CS/Market rows pull from Hotel (=My Hotel) for Prospect and from
// D360 for Tentative/Definite. Since the hotel report has no OCC, My Hotel OCC
// is derived from RN ÷ inventory.
// Visual 2 ("All under D360"): same Prospect rule (D360 has no Prospect, so
// always Hotel), but My Hotel Tentative/Definite pulls from D360 too — including
// its reported OCC.
export function getSeries(
  code: string,
  year: number,
  visual: Visual,
  snapshot: Snapshot,
  status: Status,
  level: Level,
  metric: Metric
): V12 {
  if (status === 'Prospect') {
    // Prospect only exists in the hotel report. OCC isn't reported there, so
    // derive My Hotel OCC from RN ÷ inventory; CS/Market have no meaningful OCC.
    if (metric === 'OCC') return level === 'My Hotel' ? hotelOccFromRN(code, year, snapshot, 'Prospect') : N12();
    if (!HOTEL_METRICS.includes(metric)) return N12();
    return DATA.hotel[`${code}|${year}|${snapshot}|Prospect|${metric}`] ?? N12();
  }
  if (visual === 'V1' && level === 'My Hotel') {
    if (HOTEL_METRICS.includes(metric)) {
      return DATA.hotel[`${code}|${year}|${snapshot}|${status}|${metric}`] ?? N12();
    }
    // OCC derived from RN ÷ inventory; RevPAR isn't derivable from the hotel report alone.
    return metric === 'OCC' ? hotelOccFromRN(code, year, snapshot, status) : N12();
  }
  if (!D360_METRICS.includes(metric)) return N12();
  return DATA.d360[`${code}|${year}|${snapshot}|${status}|${level}|${metric}`] ?? N12();
}
