// Row config and aggregation/formatting helpers for the comparison table.
// Each row's `calc` aggregates a set of period-filtered ForecastRows into a
// single number; the renderer then formats it according to `format`.

import type React from 'react';
import type { ForecastRow } from './data';

export type RowFormat = 'integer' | 'k' | 'pct' | 'rate' | 'fx' | 'x_room' | 'ratio';
export type RowKind = 'data' | 'spacer' | 'flow_thru' | 'section_header' | 'group';

export interface TableRow {
  kind: RowKind;
  label?: string;
  format?: RowFormat;
  /** Aggregate the period-filtered rows into a single value. */
  calc?: (rows: ForecastRow[]) => number;
  /** Visual emphasis — bold label + value. */
  bold?: boolean;
  /** Strong visual emphasis — navy background + white text (used for grand
   *  totals like GOP / EBITDA). Implies bold. */
  highlight?: boolean;
  /** Drives green/red coloring of variance cells.
   *  Revenue/profit metrics → true; expenses → false; neutral → undefined. */
  higherIsBetter?: boolean;
  /** Drill-down rows revealed when a 'group' parent is expanded. */
  children?: TableRow[];
  /** Use the FX-stripped row sets (current/LY restated at Budget FX) so the
   *  result reflects operational performance without FX impact. Budget passes
   *  through unchanged because Budget @ Budget FX is identity. */
  useNoXR?: boolean;
}

// ─── Aggregation primitives ─────────────────────────────────────

const sum = (rows: ForecastRow[], f: (r: ForecastRow) => number) =>
  rows.reduce((s, r) => s + f(r), 0);

const avg = (rows: ForecastRow[], f: (r: ForecastRow) => number) =>
  rows.length === 0 ? 0 : sum(rows, f) / rows.length;

const sumRevenue = (rs: ForecastRow[]) =>
  sum(rs, (r) => r.roomsRevenue + r.clubMaintFee + r.timeshareMaintFee + r.otherRevenue);

const sumOperatingExpenses = (rs: ForecastRow[]) =>
  sum(rs, (r) => r.departmentalExpenses + r.undistributedExpenses);

const sumNonOps = (rs: ForecastRow[]) =>
  sum(rs, (r) => r.otherExpenses + r.nonOperating);

const totalOccupied = (rs: ForecastRow[]) =>
  sum(rs, (r) => r.roomsSold + r.roomsComp);

const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);

/** Sum of distinct hotels' room inventories in the row set.
 *  - Single-hotel rows: returns that hotel's room count
 *  - Multi-hotel rows: sums each property only once (dedup by hotel name) */
const totalRooms = (rs: ForecastRow[]) => {
  const seen = new Map<string, number>();
  for (const r of rs) seen.set(r.hotel, r.rooms);
  return Array.from(seen.values()).reduce((s, n) => s + n, 0);
};

const sumGuests = (rs: ForecastRow[]) => sum(rs, (r) => r.guests);
const sumPayingGuests = (rs: ForecastRow[]) => sum(rs, (r) => r.payingGuests);
const sumRoomsRevenue = (rs: ForecastRow[]) => sum(rs, (r) => r.roomsRevenue);
const sumOtherRevenue = (rs: ForecastRow[]) => sum(rs, (r) => r.otherRevenue);
const sumAvailability = (rs: ForecastRow[]) => sum(rs, (r) => r.availability);
const sumFees = (rs: ForecastRow[]) => sum(rs, (r) => r.otherExpenses);
const sumOtherNonOps = (rs: ForecastRow[]) => sum(rs, (r) => r.nonOperating);
const gopAbs = (rs: ForecastRow[]) => sumRevenue(rs) - sumOperatingExpenses(rs);

/** Build a per-guest derivation: numerator(rs) / total guests in the period. */
const perGuest =
  (numerator: (rs: ForecastRow[]) => number) =>
  (rs: ForecastRow[]) => safeDiv(numerator(rs), sumGuests(rs));

const perPayingGuest =
  (numerator: (rs: ForecastRow[]) => number) =>
  (rs: ForecastRow[]) => safeDiv(numerator(rs), sumPayingGuests(rs));

// ─── Row config ─────────────────────────────────────────────────

const SP: TableRow = { kind: 'spacer' };

export const TABLE_ROWS: TableRow[] = [
  // #Guests POR — surfaced above the Total Guests group so the per-room
  // density stays visible regardless of whether the group is expanded.
  { kind: 'data', label: '#Guests POR', format: 'ratio', higherIsBetter: true,
    calc: (rs) => safeDiv(sumGuests(rs), totalOccupied(rs)) },

  // Total Guests — collapsed shows the count; expanded reveals per-guest econ.
  { kind: 'group', label: 'Total Guests', format: 'integer', higherIsBetter: true,
    calc: sumGuests,
    children: [
      { kind: 'data', label: 'Rooms Revenue (Package) PG', format: 'rate', higherIsBetter: true,
        calc: perGuest(sumRoomsRevenue) },
      { kind: 'data', label: 'Other Revenue (Non-Package) PG', format: 'rate', higherIsBetter: true,
        calc: perGuest(sumOtherRevenue) },
      { kind: 'data', label: 'Average Rev$ per Guest', format: 'rate', higherIsBetter: true,
        calc: perGuest(sumRevenue) },
      { kind: 'data', label: 'Average Cost$ per Guest', format: 'rate', higherIsBetter: false,
        calc: perGuest(sumOperatingExpenses) },
      { kind: 'data', label: 'Average Profit$ per Guest', format: 'rate', higherIsBetter: true,
        calc: perGuest(gopAbs) },
    ],
  },
  SP,

  // Paying Guests — same pattern, denominator = paying guests only.
  { kind: 'group', label: 'Paying Guests', format: 'integer', higherIsBetter: true,
    calc: sumPayingGuests,
    children: [
      { kind: 'data', label: '#Paying Guests POR', format: 'ratio', higherIsBetter: true,
        calc: (rs) => safeDiv(sumPayingGuests(rs), totalOccupied(rs)) },
      { kind: 'data', label: 'Rooms Revenue PPG', format: 'rate', higherIsBetter: true,
        calc: perPayingGuest(sumRoomsRevenue) },
      { kind: 'data', label: 'Other Revenue PPG', format: 'rate', higherIsBetter: true,
        calc: perPayingGuest(sumOtherRevenue) },
      { kind: 'data', label: 'Average Rev$ per paying Guest', format: 'rate', higherIsBetter: true,
        calc: perPayingGuest(sumRevenue) },
      { kind: 'data', label: 'Average Cost$ per paying Guest', format: 'rate', higherIsBetter: false,
        calc: perPayingGuest(sumOperatingExpenses) },
      { kind: 'data', label: 'Average Profit$ per paying Guest', format: 'rate', higherIsBetter: true,
        calc: perPayingGuest(gopAbs) },
    ],
  },
  SP,

  // Occupied rooms — group reveals capacity + Total occupancy metrics.
  { kind: 'group', label: 'Total Occupied Rooms', format: 'integer', higherIsBetter: true,
    calc: totalOccupied,
    children: [
      { kind: 'data', label: 'Rooms', format: 'integer', calc: totalRooms },
      { kind: 'data', label: 'Availability', format: 'integer', calc: sumAvailability },
      { kind: 'data', label: 'Total Occupancy', format: 'pct', higherIsBetter: true,
        calc: (rs) => safeDiv(totalOccupied(rs), sumAvailability(rs)) * 100 },
      { kind: 'data', label: 'Total ADR', format: 'rate', higherIsBetter: true,
        calc: (rs) => safeDiv(sumRoomsRevenue(rs), totalOccupied(rs)) },
      { kind: 'data', label: 'Total RevPAR', format: 'rate', higherIsBetter: true,
        calc: (rs) => safeDiv(sumRoomsRevenue(rs), sumAvailability(rs)) },
    ],
  },
  { kind: 'data', label: 'Comps', format: 'integer',
    calc: (rs) => sum(rs, (r) => r.roomsComp) },
  { kind: 'data', label: 'Paid Occupied Rooms', format: 'integer', higherIsBetter: true,
    calc: (rs) => sum(rs, (r) => r.roomsSold) },
  SP,

  // Paid occupancy metrics (Total* live as children of Total Occupied Rooms).
  { kind: 'data', label: 'Paid Occupancy', format: 'pct', higherIsBetter: true,
    calc: (rs) => safeDiv(sum(rs, (r) => r.roomsSold), sumAvailability(rs)) * 100 },
  { kind: 'data', label: 'Paid ADR', format: 'rate', higherIsBetter: true,
    calc: (rs) => safeDiv(sumRoomsRevenue(rs), sum(rs, (r) => r.roomsSold)) },
  { kind: 'data', label: 'Paid RevPAR', format: 'rate', higherIsBetter: true,
    calc: (rs) => safeDiv(sumRoomsRevenue(rs), sumAvailability(rs)) },
  SP,

  // Revenue — Package, Non-Package and the combined Club/Timeshare line shown
  // flat above the Total Revenue subtotal (often $0 for non-club hotels).
  { kind: 'data', label: 'Rooms Revenue (Package)', format: 'k', higherIsBetter: true,
    calc: sumRoomsRevenue },
  { kind: 'data', label: 'Other Revenue (Non Package)', format: 'k', higherIsBetter: true,
    calc: sumOtherRevenue },
  { kind: 'group', label: 'Club/Timeshare Revenue', format: 'k', higherIsBetter: true,
    calc: (rs) => sum(rs, (r) => r.clubMaintFee + r.timeshareMaintFee),
    children: [
      { kind: 'data', label: 'Club Revenue', format: 'k', higherIsBetter: true,
        calc: (rs) => sum(rs, (r) => r.clubMaintFee) },
      { kind: 'data', label: 'Time Share Revenue', format: 'k', higherIsBetter: true,
        calc: (rs) => sum(rs, (r) => r.timeshareMaintFee) },
    ],
  },
  { kind: 'data', label: 'Total Revenue', format: 'k', higherIsBetter: true, bold: true,
    calc: sumRevenue },
  SP,

  // Expenses
  { kind: 'data', label: 'Departmental Expenses', format: 'k', higherIsBetter: false,
    calc: (rs) => sum(rs, (r) => r.departmentalExpenses) },
  { kind: 'data', label: 'Undistributed Expenses', format: 'k', higherIsBetter: false,
    calc: (rs) => sum(rs, (r) => r.undistributedExpenses) },
  { kind: 'data', label: 'Total Expenses', format: 'k', higherIsBetter: false, bold: true,
    calc: sumOperatingExpenses },
  SP,

  // GOP block
  { kind: 'data', label: 'GOP', format: 'k', higherIsBetter: true, bold: true, highlight: true,
    calc: gopAbs },
  { kind: 'data', label: 'GOP%', format: 'pct', higherIsBetter: true, bold: true, highlight: true,
    calc: (rs) => safeDiv(gopAbs(rs), sumRevenue(rs)) * 100 },
  { kind: 'flow_thru', label: 'Flow Thru% (Flex)', higherIsBetter: true },
  SP,

  // Total Non Ops — group reveals the Fees vs Other Non-Ops split.
  { kind: 'group', label: 'Total Non Ops Expenses', format: 'k', higherIsBetter: false,
    calc: sumNonOps,
    children: [
      { kind: 'data', label: 'Fees', format: 'k', higherIsBetter: false, calc: sumFees },
      { kind: 'data', label: 'Other Non-Ops Expenses', format: 'k', higherIsBetter: false,
        calc: sumOtherNonOps },
    ],
  },
  SP,
  { kind: 'data', label: 'EBITDA', format: 'k', higherIsBetter: true, bold: true, highlight: true,
    calc: (rs) => gopAbs(rs) - sumNonOps(rs) },
  { kind: 'data', label: 'EBITDA%', format: 'pct', higherIsBetter: true, bold: true, highlight: true,
    calc: (rs) => safeDiv(gopAbs(rs) - sumNonOps(rs), sumRevenue(rs)) * 100 },
  SP,

  // Per-room contribution (sums rooms across distinct hotels for portfolio TOTAL)
  { kind: 'data', label: 'GOP x Room', format: 'x_room', higherIsBetter: true,
    calc: (rs) => safeDiv(gopAbs(rs), totalRooms(rs) * 1000) },
  { kind: 'data', label: 'EBITDA x Room', format: 'x_room', higherIsBetter: true,
    calc: (rs) => safeDiv(gopAbs(rs) - sumNonOps(rs), totalRooms(rs) * 1000) },
  SP,

  // FX (average across the period)
  { kind: 'data', label: 'Exchange Rate (X/R)', format: 'fx',
    calc: (rs) => avg(rs, (r) => r.fxRate) },
  SP,

  // FX-stripped variants — restate each expense field at the matching month's
  // Budget FX rate, leaving Revenue alone (USD-native). Driven by useNoXR; the
  // renderer swaps in the noXR row sets before calling these calcs.
  { kind: 'data', label: 'Total Expenses (w/o XR)', format: 'k', higherIsBetter: false,
    calc: sumOperatingExpenses, useNoXR: true },
  { kind: 'data', label: 'GOP (w/o XR)', format: 'k', higherIsBetter: true, bold: true, highlight: true,
    calc: gopAbs, useNoXR: true },
  { kind: 'data', label: 'GOP% (w/o XR)', format: 'pct', higherIsBetter: true, bold: true, highlight: true,
    calc: (rs) => safeDiv(gopAbs(rs), sumRevenue(rs)) * 100, useNoXR: true },
  { kind: 'flow_thru', label: 'Flow Thru% (w/o X/R)', higherIsBetter: true, useNoXR: true },
];

// ─── Summary table rows (compact view) ──────────────────────────
// Smaller subset of TABLE_ROWS optimized for quick read of a single hotel.
// FX-stripped section uses `useNoXR: true` so the renderer feeds it the
// noXR row sets (current and LY restated at the period's Budget FX).

export const SUMMARY_ROWS: TableRow[] = [
  // Operations
  { kind: 'data', label: 'Occupancy%', format: 'pct', higherIsBetter: true,
    calc: (rs) => safeDiv(sum(rs, (r) => r.roomsSold), sum(rs, (r) => r.availability)) * 100 },
  { kind: 'data', label: 'ADR', format: 'rate', higherIsBetter: true,
    calc: (rs) => safeDiv(sum(rs, (r) => r.roomsRevenue), sum(rs, (r) => r.roomsSold)) },
  { kind: 'data', label: 'RevPAR', format: 'rate', higherIsBetter: true,
    calc: (rs) => safeDiv(sum(rs, (r) => r.roomsRevenue), sum(rs, (r) => r.availability)) },
  SP,

  // P&L
  { kind: 'data', label: 'Total Revenue', format: 'k', higherIsBetter: true,
    calc: sumRevenue },
  { kind: 'data', label: 'Total Expenses', format: 'k', higherIsBetter: false,
    calc: sumOperatingExpenses },
  { kind: 'data', label: 'GOP$', format: 'k', higherIsBetter: true, bold: true, highlight: true,
    calc: (rs) => sumRevenue(rs) - sumOperatingExpenses(rs) },
  { kind: 'data', label: 'EBITDA$', format: 'k', higherIsBetter: true, bold: true, highlight: true,
    calc: (rs) => sumRevenue(rs) - sumOperatingExpenses(rs) - sumNonOps(rs) },
  { kind: 'data', label: 'GOP%', format: 'pct', higherIsBetter: true, bold: true, highlight: true,
    calc: (rs) => safeDiv(sumRevenue(rs) - sumOperatingExpenses(rs), sumRevenue(rs)) * 100 },
  { kind: 'data', label: 'EBITDA%', format: 'pct', higherIsBetter: true, bold: true, highlight: true,
    calc: (rs) => safeDiv(sumRevenue(rs) - sumOperatingExpenses(rs) - sumNonOps(rs), sumRevenue(rs)) * 100 },
  { kind: 'flow_thru', label: 'Flow Thru/Flex%', higherIsBetter: true },
  SP,

  // FX impact section — restated at the matching month's Budget FX rate.
  { kind: 'section_header', label: 'w/o Exchange Rate Impact' },
  { kind: 'data', label: 'Exchange Rate (XR)', format: 'fx',
    calc: (rs) => avg(rs, (r) => r.fxRate) },
  { kind: 'data', label: 'Total Expenses (w/o XR Impact)', format: 'k', higherIsBetter: false,
    calc: sumOperatingExpenses, useNoXR: true },
  { kind: 'data', label: 'GOP$', format: 'k', higherIsBetter: true, bold: true, highlight: true,
    calc: gopAbs, useNoXR: true },
  { kind: 'data', label: 'EBITDA$', format: 'k', higherIsBetter: true, bold: true, highlight: true,
    calc: (rs) => gopAbs(rs) - sumNonOps(rs), useNoXR: true },
  { kind: 'data', label: 'GOP%', format: 'pct', higherIsBetter: true, bold: true, highlight: true,
    calc: (rs) => safeDiv(gopAbs(rs), sumRevenue(rs)) * 100, useNoXR: true },
  { kind: 'data', label: 'EBITDA%', format: 'pct', higherIsBetter: true, bold: true, highlight: true,
    calc: (rs) => safeDiv(gopAbs(rs) - sumNonOps(rs), sumRevenue(rs)) * 100, useNoXR: true },
  { kind: 'flow_thru', label: 'Flow Thru/Flex% (w/o XR)', higherIsBetter: true, useNoXR: true },
];

// ─── Cell formatters ────────────────────────────────────────────

function withParens(absText: string, isNegative: boolean): string {
  return isNegative ? `(${absText})` : absText;
}

const groupInt = (n: number) => Math.round(n).toLocaleString('en-US');
const groupOneDecimal = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Format a value cell (current/budget/LY column). */
export function fmtValue(value: number, format: RowFormat): string {
  if (!Number.isFinite(value)) return '—';
  switch (format) {
    case 'integer':
      return groupInt(value);
    case 'k':
      return groupOneDecimal(value / 1000);
    case 'pct':
      return `${value.toFixed(1)}%`;
    case 'rate':
      return groupOneDecimal(value);
    case 'fx':
      return value.toFixed(2);
    case 'x_room':
      return value.toFixed(3);
    case 'ratio':
      return value.toFixed(2);
  }
}

/** Format a Var cell (absolute delta between two columns). */
export function fmtVar(varValue: number, format: RowFormat): string {
  if (!Number.isFinite(varValue)) return '—';
  if (varValue === 0) return '-';
  const isNeg = varValue < 0;
  const abs = Math.abs(varValue);
  switch (format) {
    case 'integer':
      return withParens(groupInt(abs), isNeg);
    case 'k':
      return withParens(groupInt(abs / 1000), isNeg);
    case 'pct':
      // Delta in percentage points; sign shown literally.
      return `${varValue >= 0 ? '' : '-'}${abs.toFixed(1)}%`;
    case 'rate':
      return withParens(groupInt(abs), isNeg);
    case 'fx':
      return withParens(abs.toFixed(1), isNeg);
    case 'x_room':
      return withParens(abs.toFixed(3), isNeg);
    case 'ratio':
      return withParens(abs.toFixed(2), isNeg);
  }
}

/** Format a Var% cell (relative change vs reference). */
export function fmtVarPct(currentValue: number, refValue: number): string {
  if (!Number.isFinite(currentValue) || !Number.isFinite(refValue) || refValue === 0) return '—';
  const pct = ((currentValue - refValue) / Math.abs(refValue)) * 100;
  return `${pct >= 0 ? '' : '-'}${Math.abs(pct).toFixed(1)}%`;
}

/** Flatten group rows into a sequential list (parent followed by children),
 *  for renderers that don't support drill-down (Portfolio). The 'group' kind
 *  still renders as a normal data row in the data-path of PortfolioRow. */
export function flattenRows(rows: TableRow[]): TableRow[] {
  const out: TableRow[] = [];
  for (const r of rows) {
    out.push(r);
    if (r.kind === 'group' && r.children) {
      for (const c of r.children) out.push(c);
    }
  }
  return out;
}

/** Tooltip text shown next to Flow Thru / Flex% cells in the visuals. */
export const FLOW_THRU_FORMULA =
  'Hospitality convention:\n' +
  '• When ΔRevenue > 0 → Flow Thru% = ΔGOP / ΔRevenue\n' +
  '   (share of incremental revenue that converted to GOP)\n' +
  '• When ΔRevenue < 0 → Flex% = ΔExpenses / ΔRevenue\n' +
  '   (both deltas negative → positive Flex = good cost discipline)';

/** Flow Thru% / Flex calculation (cross-column, hospitality convention).
 *  - When current revenue is ABOVE the reference: Flow Thru% = ΔGOP / ΔRev
 *    (share of incremental revenue that converted to GOP).
 *  - When current revenue is BELOW the reference: Flex% = ΔExp / ΔRev (signed).
 *    Both deltas negative → positive Flex (expenses flexed down with revenue,
 *    good). dExp positive while dRev negative → negative Flex (expenses rose
 *    despite revenue miss, bad). Operators read the sign to judge discipline.
 *  Returns null when there's no revenue delta. */
export function flowThruPct(current: ForecastRow[], reference: ForecastRow[]): number | null {
  const dRev = sumRevenue(current) - sumRevenue(reference);
  if (dRev === 0) return null;
  const dExp = sumOperatingExpenses(current) - sumOperatingExpenses(reference);
  if (dRev < 0) {
    return (dExp / dRev) * 100;
  }
  const dGop = dRev - dExp;
  return (dGop / dRev) * 100;
}

// ─── Variance cell styling ──────────────────────────────────────
// Shared across all three table components.

export const BG_GOOD = 'rgba(16, 185, 129, 0.10)';  // success @ 10%
export const BG_BAD = 'rgba(239, 68, 68, 0.10)';    // danger @ 10%

/** Green/red tinted style for variance cells.
 *  Accepts `number | null` so callers don't need to guard. */
export function varianceStyle(varValue: number | null, higherIsBetter?: boolean): React.CSSProperties {
  if (higherIsBetter === undefined) return { color: 'var(--text-primary)' };
  if (varValue === null || varValue === 0 || !Number.isFinite(varValue)) {
    return { color: 'var(--text-secondary)' };
  }
  const isGood = higherIsBetter ? varValue > 0 : varValue < 0;
  return isGood
    ? { color: 'var(--success)', background: BG_GOOD }
    : { color: 'var(--danger)', background: BG_BAD };
}
