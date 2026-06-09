/**
 * Daily Segmentation Forecast — data access layer.
 *
 * Consumes the generated ./dataset.ts (raw daily RN + budget by TC segment) and exposes
 * derived, UI-ready accessors:
 *  - daily series per segment (2025 actual, 2026 actual+pace, budget spread to daily)
 *  - per-segment summary (full-year, YTD, budget, budget-to-date)
 *  - budget composition (which hotel segments feed each TC segment)
 *
 * Budget is annual per segment; it is spread to daily using the 2025 actual seasonality
 * curve. Segments whose 2025 history is too sparse to shape a curve fall back to the
 * hotel's Total 2025 curve so their daily budget is not deformed by stray days.
 */
import {
  AS_OF, TC_SEGMENTS, DATES_2025, DATES_2026, ACTUAL_2025, ACTUAL_2026, STLY_2026,
  CS_RN_2025, CS_TOTAL_2025, CS_REV_2025, CS_REV_TOTAL_2025, REVENUE_2025, REVENUE_2026, BUDGET_REVTC_M,
  BUDGET_TC, BUDGET_TC_M, HOTEL_BUDGET, DIRECT_MAP, OTHER_DISC_TARGETS, OTHER_DISC_BUDGET,
  CAPACITY_2025, CAPACITY_2026,
  type TcSegment,
} from './dataset';

export type { TcSegment };
export { TC_SEGMENTS, AS_OF, BUDGET_TC, CAPACITY_2025, CAPACITY_2026 };

/**
 * Properties available in the On the Books board.
 *
 * Only the bundled WACR-PC hotel has a daily dataset today (this module reads the single
 * generated ./dataset.ts). This list is the seam for the upcoming SQL connection: once the
 * query is wired, add the other hotels here and branch the daily accessors by `code` — the
 * Property selector and the rest of the page already pass the selected code through.
 */
export interface PropertyMeta { code: string; name: string; rooms: number }
export const PROPERTIES: PropertyMeta[] = [
  { code: 'WACR-PC', name: 'WACR-PC', rooms: CAPACITY_2026 },
];
export const DEFAULT_PROPERTY = PROPERTIES[0].code;

/** Days in the 2026 axis, and how many fall in the actual (<= AS_OF) window — for occupancy math. */
export const DAYS_2026 = DATES_2026.length;
export const YTD_DAYS_2026 = DATES_2026.filter((d) => d <= AS_OF).length;

/** Selectable key for the UI: any TC segment or the hotel-wide Total (sum of all). */
export type SegmentKey = TcSegment | 'Total';
export const TOTAL_KEY = 'Total' as const;

// Budget seasonality comes from the COMP SET (CS), which operated the full year, instead of
// the ramping hotel's own 2025 curve (≈0 early in the year, which zeroed the early-2026 budget).
// A segment's own CS curve is trusted only when its CS history has enough volume and spread;
// otherwise we borrow the CS Total curve. Tunable.
const MIN_CURVE_TOTAL = 200;     // min CS RN for the segment to shape its own curve
const MIN_CURVE_NONZERO_DAYS = 90;

/** Month index (0..11) for each day on the 2026 axis. */
const MONTH: number[] = DATES_2026.map((d) => Number(d.slice(5, 7)) - 1);

/** Raw Comp Set 2025 daily series that shapes a segment's budget within each month; falls back
 *  to the CS Total when the segment's own CS history is too sparse to trust. */
function segmentCs(seg: TcSegment): { cs: number[]; usedFallback: boolean } {
  const daily = CS_RN_2025[seg];
  const total = daily.reduce((a, b) => a + b, 0);
  const nonzero = daily.filter((v) => v > 0).length;
  if (total >= MIN_CURVE_TOTAL && nonzero >= MIN_CURVE_NONZERO_DAYS) return { cs: daily, usedFallback: false };
  return { cs: CS_TOTAL_2025, usedFallback: true };
}

/** CS 2025 daily Revenue shape that distributes a segment's monthly budget Revenue across days
 *  (mirrors segmentCs for RN). Falls back to the CS Total Revenue when the segment shares the RN
 *  curve fallback or has no own CS revenue history, so a sparse segment isn't deformed. */
function segmentCsRev(seg: TcSegment): number[] {
  const own = CS_REV_2025[seg];
  if (segmentCs(seg).usedFallback || !own.some((v) => v > 0)) return CS_REV_TOTAL_2025;
  return own;
}

/** Daily budget = the hotel's monthly budget taken as-is, then distributed across that month's
 *  days by the Comp Set shape. Each month's total matches the hotel's plan exactly; CS only
 *  supplies the within-month daily seasonality. */
function spreadBudget(cs: number[], mBudget: number[]): number[] {
  const mSum = new Array(12).fill(0);
  MONTH.forEach((m, i) => { mSum[m] += cs[i]; });
  return DATES_2026.map((_, i) => { const m = MONTH[i]; return mSum[m] ? (mBudget[m] * cs[i]) / mSum[m] : 0; });
}

/** Hotel Total 2025 / 2026 actual daily RN + Revenue (sum across all segments) for the Total view. */
const TOTAL_2025_DAILY: number[] = DATES_2025.map((_, i) => TC_SEGMENTS.reduce((acc, s) => acc + ACTUAL_2025[s][i], 0));
const TOTAL_2026_DAILY: number[] = DATES_2026.map((_, i) => TC_SEGMENTS.reduce((acc, s) => acc + ACTUAL_2026[s][i], 0));
const TOTAL_STLY_2026_DAILY: number[] = DATES_2026.map((_, i) => TC_SEGMENTS.reduce((acc, s) => acc + (STLY_2026[s][i] ?? 0), 0));
const TOTAL_REV_2025_DAILY: number[] = DATES_2025.map((_, i) => TC_SEGMENTS.reduce((acc, s) => acc + REVENUE_2025[s][i], 0));
const TOTAL_REV_2026_DAILY: number[] = DATES_2026.map((_, i) => TC_SEGMENTS.reduce((acc, s) => acc + REVENUE_2026[s][i], 0));
const TOTAL_BUDGET_M: number[] = Array.from({ length: 12 }, (_, m) => TC_SEGMENTS.reduce((acc, s) => acc + (BUDGET_TC_M[s]?.[m] ?? 0), 0));
const TOTAL_BUDGET_REV_M: number[] = Array.from({ length: 12 }, (_, m) => TC_SEGMENTS.reduce((acc, s) => acc + (BUDGET_REVTC_M[s]?.[m] ?? 0), 0));

interface SegmentSeries { a2025: number[]; a2026: number[]; stly: number[]; budgetDaily: number[]; budgetAnnual: number; usedFallback: boolean }

function seriesFor(seg: SegmentKey): SegmentSeries {
  if (seg === TOTAL_KEY) {
    return {
      a2025: TOTAL_2025_DAILY, a2026: TOTAL_2026_DAILY, stly: TOTAL_STLY_2026_DAILY,
      budgetDaily: spreadBudget(CS_TOTAL_2025, TOTAL_BUDGET_M),
      budgetAnnual: TOTAL_BUDGET_M.reduce((a, b) => a + b, 0), usedFallback: false,
    };
  }
  const { cs, usedFallback } = segmentCs(seg);
  const mBudget = BUDGET_TC_M[seg] ?? new Array(12).fill(0);
  return {
    a2025: ACTUAL_2025[seg], a2026: ACTUAL_2026[seg], stly: STLY_2026[seg],
    budgetDaily: spreadBudget(cs, mBudget),
    budgetAnnual: mBudget.reduce((a, b) => a + b, 0), usedFallback,
  };
}

export interface DailyPoint {
  date: string;        // ISO date on the 2026 axis
  actual2025: number;  // same calendar-day RN one year prior (index-aligned) — realized 2025
  stly2025: number;    // Same-Time-Last-Year RN (LY reported by D360 in the 2026 export)
  actual2026: number;  // 2026 RN (actual if date <= AS_OF, else on-the-books pace)
  budget: number;      // FY26 budget RN spread to this day
  isPace: boolean;     // true once date > AS_OF (future / on-the-books)
}

/** Daily series for one segment (or Total), aligned to the 2026 date axis. */
export function getSegmentDaily(seg: SegmentKey): DailyPoint[] {
  const { a2025, a2026, stly, budgetDaily } = seriesFor(seg);
  return DATES_2026.map((date, i) => ({
    date,
    actual2025: a2025[i] ?? 0,
    stly2025: stly[i] ?? 0,
    actual2026: a2026[i] ?? 0,
    budget: budgetDaily[i] ?? 0,
    isPace: date > AS_OF,
  }));
}

export interface SegmentSummary {
  segment: SegmentKey;
  actual2025Full: number;   // full-year 2025
  actual2026Ytd: number;    // 2026 actual through AS_OF
  actual2026Full: number;   // 2026 actual + remaining pace
  budgetFull: number;       // FY26 budget
  budgetYtd: number;        // budget spread, accumulated through AS_OF
  hasBudget: boolean;
  usedFallbackCurve: boolean;
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const ytd = (dates: string[], a: number[]) => dates.reduce((acc, d, i) => acc + (d <= AS_OF ? a[i] : 0), 0);

export function getSegmentSummary(seg: SegmentKey): SegmentSummary {
  const { a2025, a2026, budgetDaily, budgetAnnual, usedFallback } = seriesFor(seg);
  return {
    segment: seg,
    actual2025Full: sum(a2025),
    actual2026Ytd: ytd(DATES_2026, a2026),
    actual2026Full: sum(a2026),
    budgetFull: budgetAnnual,
    budgetYtd: ytd(DATES_2026, budgetDaily),
    hasBudget: budgetAnnual > 0,
    usedFallbackCurve: usedFallback,
  };
}

export function getAllSummaries(): SegmentSummary[] {
  return TC_SEGMENTS.map(getSegmentSummary);
}

/** Aggregate the daily series (2026 actual/pace, budget, 2025 LY) across a set of segments —
 *  used by the hierarchical segment selector so a macro group shows its combined trend. */
export function getGroupDaily(segs: TcSegment[]): DailyPoint[] {
  const parts = segs.map((s) => getSegmentDaily(s));
  return DATES_2026.map((date, i) => ({
    date,
    actual2025: parts.reduce((a, p) => a + (p[i]?.actual2025 ?? 0), 0),
    stly2025: parts.reduce((a, p) => a + (p[i]?.stly2025 ?? 0), 0),
    actual2026: parts.reduce((a, p) => a + (p[i]?.actual2026 ?? 0), 0),
    budget: parts.reduce((a, p) => a + (p[i]?.budget ?? 0), 0),
    isPace: date > AS_OF,
  }));
}

export interface BudgetComponent { hotelSegment: string; rn: number; viaOtherDisc: boolean }

/** Which hotel budget segments compose a TC segment's budget (for the mapping panel). */
export function getBudgetComposition(seg: SegmentKey): BudgetComponent[] {
  if (seg === TOTAL_KEY) {
    return Object.entries(HOTEL_BUDGET)
      .map(([hotelSegment, rn]) => ({ hotelSegment, rn, viaOtherDisc: hotelSegment === 'Other Disc' }))
      .sort((a, b) => b.rn - a.rn);
  }
  const out: BudgetComponent[] = [];
  for (const h of DIRECT_MAP[seg] ?? []) {
    const rn = HOTEL_BUDGET[h] ?? 0;
    if (rn) out.push({ hotelSegment: h, rn, viaOtherDisc: false });
  }
  if (OTHER_DISC_TARGETS.includes(seg)) {
    const share = BUDGET_TC[seg] ?? 0;
    if (share) out.push({ hotelSegment: 'Other Disc', rn: share, viaOtherDisc: true });
  }
  return out;
}

export const OTHER_DISC_INFO = { targets: OTHER_DISC_TARGETS, total: OTHER_DISC_BUDGET };

// ---- Daily RM grid (Room Nights / Revenue / ADR / RevPAR board) ----

export interface GridDay {
  date: string;
  isPace: boolean;       // date > AS_OF (on-the-books, not yet realized)
  rn: number;            // 2026 actual + pace Room Nights
  rev: number;           // 2026 actual + pace Rooms Revenue
  budgetRn: number;      // FY26 budget RN
  budgetRev: number;     // FY26 budget Rooms Revenue
  rnLy: number;          // 2025 Room Nights (vs Last Year)
  revLy: number;         // 2025 Rooms Revenue
}

/** Per-day Room Nights + Revenue for the grid: 2026 actual/pace, budget, and 2025 (LY).
 *  Budget RN and Revenue are the hotel's monthly budget spread to days by the CS shape;
 *  ADR/RevPAR derive from RN + Revenue. */
export function getGridDaily(seg: SegmentKey): GridDay[] {
  const isTotal = seg === TOTAL_KEY;
  const rn26 = isTotal ? TOTAL_2026_DAILY : ACTUAL_2026[seg];
  const rn25 = isTotal ? TOTAL_2025_DAILY : ACTUAL_2025[seg];
  const rev26 = isTotal ? TOTAL_REV_2026_DAILY : REVENUE_2026[seg];
  const rev25 = isTotal ? TOTAL_REV_2025_DAILY : REVENUE_2025[seg];
  // RN budget keeps the CS RN seasonality; Revenue budget uses the CS REVENUE seasonality so the
  // two curves differ within a month and the daily budget ADR (= budgetRev/budgetRn) varies by day
  // instead of being flat. Each month's RN and Revenue totals still match the plan exactly.
  const cs = isTotal ? CS_TOTAL_2025 : segmentCs(seg).cs;
  const csRev = isTotal ? CS_REV_TOTAL_2025 : segmentCsRev(seg);
  const budgetRn = spreadBudget(cs, isTotal ? TOTAL_BUDGET_M : (BUDGET_TC_M[seg] ?? new Array(12).fill(0)));
  const budgetRev = spreadBudget(csRev, isTotal ? TOTAL_BUDGET_REV_M : (BUDGET_REVTC_M[seg] ?? new Array(12).fill(0)));
  return DATES_2026.map((date, i) => ({
    date,
    isPace: date > AS_OF,
    rn: rn26[i] ?? 0,
    rev: rev26[i] ?? 0,
    budgetRn: budgetRn[i] ?? 0,
    budgetRev: budgetRev[i] ?? 0,
    rnLy: rn25[i] ?? 0,
    revLy: rev25[i] ?? 0,
  }));
}
