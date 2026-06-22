/**
 * Daily Segmentation Forecast — dataset generator.
 *
 * Reads the three raw CSV exports (2025 actuals, 2026 actuals+pace, hotel BUDGET)
 * and the segmentation crosswalk, then emits ./dataset.ts with compact, typed
 * structures consumed by ./data.ts.
 *
 * Run from this folder:  node build-dataset.mjs
 *
 * Anchor metric: Room Nights (RN / "Occ Rms"). Granularity: daily. Segment level: TC detail.
 *
 * Source layout (see project memory for full detail):
 * - Pace files (2025/2026): row0 = 18 segment blocks (Total + 17 TC detail), each block
 *   123 metric columns; RN is at block-start + 29. Rows 2..366 = daily; row 367 = Total;
 *   footer = filter metadata incl "As of Date".
 * - BUDGET file: Total-Year Working Budget "Occ Rms" per hotel segment lives in column 223.
 * - Crosswalk: hotel budget segment names -> TC detail segments (many-to-one, plus the
 *   "Other Disc" bucket which fans out across several TC segments, split proportionally).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const BASE = '260608.WACR.Future and Historical Pace v2 (1)';

const AS_OF = '2026-06-06'; // snapshot date (from the export footer) — 2026 actual/pace cutoff

// TC detail segments in canonical display order (matches pace-file block order, minus Total).
const TC_SEGMENTS = [
  'General Group', 'Unsold Block', 'General Retail', 'Advance Purchase', 'General Discount',
  'AAA', 'AARP', 'Government', 'OTA Opaque', 'Package-Promotion', 'Consortia', 'Corporate',
  'General Qualified', 'General Wholesale', 'Comp-Permanent-Other', 'Crew-Contract',
];

// Direct budget mapping: TC segment -> hotel budget segment(s) summed 1:1 (excludes the
// "Other Disc" bucket, which is handled proportionally below). Hotel rows not listed here
// (or with no budget value) contribute 0.
const DIRECT_MAP = {
  'General Group': ['SMERF', 'Group Tour', 'Company Mtg/Inc', 'Convention/Assn'],
  'General Retail': ['Best Available'],
  'Government': ["Gov't"],
  'Consortia': ['Consortia Rms'],
  'Corporate': ['Corp Negot', 'Local Negot', 'Corp Mktg Prog'],
  'General Wholesale': ['Ind. Tour'],
  'Comp-Permanent-Other': ['Permanent'],
};

// The hotel "Other Disc" budget bucket fans out across these TC segments, split proportionally
// to their combined actual weight (2025 full + 2026 YTD).
const OTHER_DISC_TARGETS = [
  'Advance Purchase', 'General Discount', 'AAA', 'AARP', 'OTA Opaque', 'Package-Promotion', 'General Qualified',
];

// ---- helpers ----
const splitSimple = (s) => s.split(',');
function parseQuoted(line) {
  const Q = '"'; const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === Q) { if (line[i + 1] === Q) { cur += Q; i++; } else q = false; } else cur += c; }
    else { if (c === Q) q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c; }
  }
  out.push(cur); return out;
}
const toNum = (v) => { const n = parseFloat(String(v ?? '').replace(/[$,%\s]/g, '')); return isNaN(n) ? 0 : n; };
const isDate = (s) => /^\d{2}\/\d{2}\/\d{4}$/.test(s);
const toIso = (mdy) => { const [mm, dd, yy] = mdy.split('/'); return `${yy}-${mm}-${dd}`; };

function read(name) { return readFileSync(join(DIR, name), 'utf8').replace(/^﻿/, '').split(/\r?\n/); }

// ---- 1. Daily RN per TC segment from a pace file ----
// Within each 123-col segment block: Occ is at offset 0, RN at offset 29.
function loadPace(tag) {
  const lines = read(`${BASE} ${tag}.csv`);
  const header = splitSimple(lines[0]);
  const blockStart = {}; // segment name -> column index of its block
  header.forEach((v, i) => { const n = v.trim(); if (n) blockStart[n] = i; });
  const totalStart = blockStart['Total'];
  const dates = [];
  const rn = {};   // segment -> hotel RN[] (offset 29)
  const rev = {};  // segment -> hotel Revenue[] (offset 102)
  const csRn = {}; // segment -> Comp Set RN[] (offset 30) — full-year seasonality reference
  const csRev = {}; // segment -> Comp Set Revenue[] (offset 103) — budget revenue daily shape
  const stly = {}; // segment -> Same-Time-Last-Year RN[] = RN − "RN Change Vs. LY" (offset 41)
  TC_SEGMENTS.forEach((s) => { rn[s] = []; rev[s] = []; csRn[s] = []; csRev[s] = []; stly[s] = []; });
  const csTotal = [];    // Comp Set Total RN[] (fallback RN curve)
  const csRevTotal = []; // Comp Set Total Revenue[] (budget revenue shape)
  const caps = []; // implied hotel capacity per day = TotalRN / TotalOcc (occ > 5%)
  for (let li = 2; li <= 366; li++) {
    const c = splitSimple(lines[li] || '');
    const d = c[0];
    if (!isDate(d)) continue;
    dates.push(toIso(d));
    TC_SEGMENTS.forEach((s) => {
      const start = blockStart[s];
      const rnv = start == null ? 0 : Math.round(toNum(c[start + 29]));
      rn[s].push(rnv);
      rev[s].push(start == null ? 0 : Math.round(toNum(c[start + 102])));
      csRn[s].push(start == null ? 0 : Math.round(toNum(c[start + 30])));
      csRev[s].push(start == null ? 0 : Math.round(toNum(c[start + 103])));
      const chgLy = start == null ? 0 : Math.round(toNum(c[start + 41])); // RN Change Vs. LY
      stly[s].push(rnv - chgLy); // implied LY (same-time-last-year) RN
    });
    csTotal.push(Math.round(toNum(c[totalStart + 30])));
    csRevTotal.push(Math.round(toNum(c[totalStart + 103])));
    const occ = toNum(c[totalStart]); // Total Occ %
    const totRn = toNum(c[totalStart + 29]);
    if (occ > 5) caps.push(totRn / (occ / 100));
  }
  caps.sort((a, b) => a - b);
  const capacity = caps.length ? Math.round(caps[Math.floor(caps.length / 2)]) : 0; // median, physical room count
  return { dates, rn, rev, capacity, csRn, csRev, csTotal, csRevTotal, stly };
}

// ---- 2. Budget RN per hotel segment, mapped to TC ----
// Only these hotel detail segments are real room-night budget lines. Restricting to them
// keeps subtotals (Transient Rms, Group Rooms), ADR/Revenue rows and Total* rows out of
// HOTEL_BUDGET — they share the same Occ-Rms column but are not segments.
const KNOWN_HOTEL_SEGMENTS = new Set([...Object.values(DIRECT_MAP).flat(), 'Other Disc']);

// Total-Year budget is col 223; the 12 monthly Working-Budget columns (Jan..Dec):
const M_COLS = [5, 16, 27, 49, 60, 71, 93, 104, 115, 137, 148, 159];

function loadBudget(actual2025Full, actual2026Ytd) {
  const rows = read(`${BASE} BUDGET.csv`).map(parseQuoted);
  const hotelBudget = {};  // hotel segment -> annual Occ Rms (col 223)
  const hotelBudgetM = {}; // hotel segment -> [Jan..Dec] Occ Rms
  const hotelRevM = {};    // hotel segment -> [Jan..Dec] Rooms Revenue
  // Each segment spans 3 rows: RN (named row), ADR (+1, empty col2), Revenue (+2, empty col2).
  rows.forEach((r, i) => {
    const label = (r[2] || '').trim(); // detail-segment column only
    if (!KNOWN_HOTEL_SEGMENTS.has(label)) return;
    const ty = toNum(r[223]);
    if (!ty) return;
    hotelBudget[label] = ty;
    hotelBudgetM[label] = M_COLS.map((c) => toNum(r[c]));
    const adrRow = rows[i + 1], revRow = rows[i + 2];
    const emptyC2 = (row) => row && (row[2] || '').trim() === '';
    hotelRevM[label] = (emptyC2(adrRow) && emptyC2(revRow))
      ? M_COLS.map((c) => toNum(revRow[c]))
      : new Array(12).fill(0);
  });

  // Monthly TC budget (RN and Revenue) — taken straight from the hotel's monthly budget (so each
  // month matches the hotel's plan exactly). Only the "Other Disc" fan-out is proportional.
  const weights = OTHER_DISC_TARGETS.map((s) => (actual2025Full[s] || 0) + (actual2026Ytd[s] || 0));
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;

  const mapMonthly = (hotelMonthly) => {
    const out = {};
    TC_SEGMENTS.forEach((s) => { out[s] = new Array(12).fill(0); });
    for (const [tc, hotelSegs] of Object.entries(DIRECT_MAP)) {
      out[tc] = Array.from({ length: 12 }, (_, m) => hotelSegs.reduce((sum, h) => sum + ((hotelMonthly[h] || [])[m] || 0), 0));
    }
    const otherDiscM = hotelMonthly['Other Disc'] || new Array(12).fill(0);
    OTHER_DISC_TARGETS.forEach((s, i) => { out[s] = otherDiscM.map((mv) => mv * weights[i] / wsum); });
    return out;
  };

  const budgetTcM = mapMonthly(hotelBudgetM);    // RN
  const budgetRevTcM = mapMonthly(hotelRevM);    // Rooms Revenue

  const budgetTc = {}; // annual RN = sum of months
  TC_SEGMENTS.forEach((s) => { budgetTc[s] = Math.round(budgetTcM[s].reduce((a, b) => a + b, 0)); });

  return { hotelBudget, budgetTc, budgetTcM, budgetRevTcM, otherDisc: hotelBudget['Other Disc'] || 0 };
}

// ---- main ----
const p2025 = loadPace('2025');
const p2026 = loadPace('2026');

const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const ytdSum = (dates, arr, asOf) => dates.reduce((acc, d, i) => acc + (d <= asOf ? arr[i] : 0), 0);

const full2025 = {}; const ytd2026 = {};
TC_SEGMENTS.forEach((s) => {
  full2025[s] = sum(p2025.rn[s]);
  ytd2026[s] = ytdSum(p2026.dates, p2026.rn[s], AS_OF);
});

const { hotelBudget, budgetTc, budgetTcM, budgetRevTcM, otherDisc } = loadBudget(full2025, ytd2026);
// round monthly to 2 decimals for a compact dataset (sums stay ≈ annual)
const budgetTcMRounded = {};
const budgetRevTcMRounded = {};
TC_SEGMENTS.forEach((s) => {
  budgetTcMRounded[s] = budgetTcM[s].map((v) => Math.round(v * 100) / 100);
  budgetRevTcMRounded[s] = budgetRevTcM[s].map((v) => Math.round(v));
});

// ---- emit dataset.ts ----
const j = (x) => JSON.stringify(x);
const out = `/**
 * Daily Segmentation Forecast — raw dataset (GENERATED by build-dataset.mjs, do not edit by hand).
 *
 * Room Nights (RN) by TC detail segment, daily. Derivations (budget daily spread, YTD sums,
 * mix) live in ./data.ts. See project memory for the source-CSV layout.
 */
export type TcSegment =
${TC_SEGMENTS.map((s) => `  | ${j(s)}`).join('\n')};

export const TC_SEGMENTS: TcSegment[] = ${j(TC_SEGMENTS)};

/** Snapshot date from the export footer; 2026 actual/pace cutoff (dates <= AS_OF are actual). */
export const AS_OF = ${j(AS_OF)};

/** Physical hotel room capacity per day (median implied by Total RN / Total Occ). Used for OCC = RN / capacity. */
export const CAPACITY_2025 = ${p2025.capacity};
export const CAPACITY_2026 = ${p2026.capacity};

/** ISO date axis for each year (daily). */
export const DATES_2025: string[] = ${j(p2025.dates)};
export const DATES_2026: string[] = ${j(p2026.dates)};

/** Daily actual RN per segment, aligned to DATES_<year>. */
export const ACTUAL_2025: Record<TcSegment, number[]> = ${j(p2025.rn)};
export const ACTUAL_2026: Record<TcSegment, number[]> = ${j(p2026.rn)};

/** Same-Time-Last-Year RN per segment on the 2026 axis = 2026 RN − "RN Change Vs. LY" (the LY
 * reference Demand360 reports in the 2026 export). Used as the 2025 line in the FUTURE (pace)
 * region of the progression chart; the realized 2025 actual is used for the past. */
export const STLY_2026: Record<TcSegment, number[]> = ${j(p2026.stly)};

/** Comp Set daily RN (2025 full year) — used as the budget seasonality curve, since the
 * comp set operated all year while the ramping hotel did not. Per segment + Total fallback. */
export const CS_RN_2025: Record<TcSegment, number[]> = ${j(p2025.csRn)};
export const CS_TOTAL_2025: number[] = ${j(p2025.csTotal)};

/** Daily Rooms Revenue per segment (actuals/OTBs). ADR/RevPAR are derived from Revenue & RN. */
export const REVENUE_2025: Record<TcSegment, number[]> = ${j(p2025.rev)};
export const REVENUE_2026: Record<TcSegment, number[]> = ${j(p2026.rev)};

/** Comp Set daily Revenue (2025 full year) — shapes the FY26 budget Revenue within each month,
 * mirroring how CS_RN shapes the budget RN. Per segment + Total fallback (sparse CS history). */
export const CS_REV_2025: Record<TcSegment, number[]> = ${j(p2025.csRev)};
export const CS_REV_TOTAL_2025: number[] = ${j(p2025.csRevTotal)};

/** FY26 budget Rooms Revenue per TC segment by month [Jan..Dec] (from the per-segment revenue
 * rows in the budget; "Other Disc" fanned out proportionally). ADR/RevPAR derive from this + RN. */
export const BUDGET_REVTC_M: Record<TcSegment, number[]> = ${j(budgetRevTcMRounded)};

/** FY26 budget RN per TC segment ("Other Disc" fanned out proportionally; total = ${sum(Object.values(budgetTc))}). */
export const BUDGET_TC: Record<TcSegment, number> = ${j(budgetTc)};

/** FY26 budget RN per TC segment, by month [Jan..Dec] — taken straight from the hotel's monthly
 * budget. Daily budget distributes each month across its days by the Comp Set seasonality shape. */
export const BUDGET_TC_M: Record<TcSegment, number[]> = ${j(budgetTcMRounded)};

/** Raw hotel-segment budget rows (Total-Year Working Budget Occ Rms), pre-mapping, for reference/UI. */
export const HOTEL_BUDGET: Record<string, number> = ${j(hotelBudget)};

/** Crosswalk for the UI: which hotel budget segments compose each TC segment. */
export const DIRECT_MAP: Record<string, string[]> = ${j(DIRECT_MAP)};
export const OTHER_DISC_TARGETS: string[] = ${j(OTHER_DISC_TARGETS)};
export const OTHER_DISC_BUDGET = ${otherDisc};
`;

writeFileSync(join(DIR, 'dataset.ts'), out);

// ---- console validation summary ----
const pad = (s, n) => String(s).padEnd(n); const padl = (s, n) => String(s).padStart(n);
console.log(pad('Segmento TC', 22) + padl('2025full', 9) + padl('26YTD', 8) + padl('26full', 8) + padl('Budget', 8));
console.log('-'.repeat(53));
TC_SEGMENTS.forEach((s) => {
  console.log(pad(s, 22) + padl(full2025[s], 9) + padl(ytd2026[s], 8) + padl(sum(p2026.rn[s]), 8) + padl(budgetTc[s], 8));
});
console.log('-'.repeat(53));
console.log(pad('TOTAL', 22) + padl(sum(Object.values(full2025)), 9) + padl(sum(Object.values(ytd2026)), 8)
  + padl(sum(TC_SEGMENTS.map((s) => sum(p2026.rn[s]))), 8) + padl(sum(Object.values(budgetTc)), 8));
console.log(`\nOther Disc bucket = ${otherDisc} (fanned out). dataset.ts written (${p2025.dates.length} days/year).`);
