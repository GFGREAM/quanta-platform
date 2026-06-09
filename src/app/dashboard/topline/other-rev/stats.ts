/**
 * Other Rev$ (Non Pack) — statistics (Estadística) layer.
 *
 * Stores only the additive BASE counts per month (real & budget); the 12 reported indicators are
 * DERIVED from them, so monthly values match the report exactly and YTD/FY aggregation is correct
 * (counts sum; ratios/percent recompute from the summed counts). Same MXN-thousands world for the
 * revenue-linked Average Check (AYB EP revenue / Cover EP). Mock until the SQL feed lands.
 */
import { ACTUAL_MONTHS, MONTHS, getConceptRealBudget, type MonthKey, type PeriodKey } from './data';

// Base tuple order: [roHotel, roClub, occHotel%, occClub%, guestAiHotel, guestAiClub, guestEp,
//                    coverAi, coverEp, pktConsumoDiario]
const B: Record<MonthKey, { r: number[]; b: number[] }> = {
  ene: { r: [5474, 5238, 65, 62, 11639, 929, 12225, 49986, 12623, 159], b: [4321, 5352.5, 52, 63, 8642, 2913, 13144, 34666, 20213, 158] },
  feb: { r: [5533, 6124, 73, 80, 11823, 1506, 14335, 53682, 15616, 146], b: [4925, 6038.8, 65, 79, 9850, 3287, 14829, 39410, 40310, 158] },
  mar: { r: [5417, 6283, 65, 75, 13477, 2017, 10461, 61899, 18928, 154], b: [5711, 6330.5, 68, 75, 11422, 3446, 15546, 44603, 42457, 158] },
  abr: { r: [4384, 4170, 54, 51, 10832, 2045, 10461, 49964, 11350, 131], b: [4808, 4449, 59, 55, 9616, 2422, 10925, 36113, 30153, 158] },
  may: { r: [3145, 3313, 38, 39, 6398, 1311, 8246, 31027, 7395, 142], b: [4198, 3534, 50, 42, 8396, 1924, 8678, 30959, 24105, 158] },
  jun: { r: [3452, 3104, 43, 38, 7903, 1310, 7881, 35886, 9181, 145], b: [3671, 3435.8, 45, 42, 7342, 1870, 8437, 27636, 13326, 158] },
  jul: { r: [4190, 2815, 50, 33, 8572, 1026, 7147, 38229, 8522, 146], b: [4659, 3432.3, 56, 41, 9318, 1868, 8429, 33558, 13460, 158] },
  ago: { r: [2829, 2306, 34, 27, 6057, 822, 5950, 26739, 6550, 146], b: [2829, 2561.4, 34, 30, 5658, 1394, 6290, 21156, 9983, 158] },
  sep: { r: [2810, 2222, 35, 27, 6059, 670, 5733, 26657, 5933, 146], b: [2503, 2133.7, 31, 26, 5006, 1161, 5240, 18502, 8388, 158] },
  oct: { r: [4281, 4610, 51, 55, 9266, 1374, 11895, 42071, 12595, 147], b: [4281, 4686.7, 51, 56, 8562, 2551, 11509, 33339, 17893, 158] },
  nov: { r: [5956, 6089, 74, 75, 12873, 1643, 15711, 58109, 15711, 160], b: [5796, 6343.5, 72, 78, 11592, 3453, 15578, 45134, 24190, 158] },
  dic: { r: [5825, 5381, 70, 64, 12588, 1452, 13884, 51202, 13884, 161], b: [5777, 5510.6, 69, 65, 11554, 2999, 13532, 43660, 21300, 158] },
};

function monthsOf(period: PeriodKey): MonthKey[] {
  return period === 'ytd' ? ACTUAL_MONTHS : period === 'fy' ? MONTHS.map((m) => m.key) : [period];
}

// Aggregated base counts for a scenario over a set of months. Counts sum; available room-nights
// (capacity) accumulate so % OCC recomputes correctly; PKT is guest-weighted.
interface Scn {
  roH: number; roC: number; capH: number; capC: number;
  gaiH: number; gaiC: number; gep: number; cai: number; cep: number; pkt: number;
}
function aggScn(ms: MonthKey[], which: 'r' | 'b'): Scn {
  let roH = 0, roC = 0, capH = 0, capC = 0, gaiH = 0, gaiC = 0, gep = 0, cai = 0, cep = 0, pktW = 0, gW = 0;
  for (const m of ms) {
    const a = B[m][which];
    roH += a[0]; roC += a[1]; gaiH += a[4]; gaiC += a[5]; gep += a[6]; cai += a[7]; cep += a[8];
    capH += a[2] ? a[0] / (a[2] / 100) : 0;
    capC += a[3] ? a[1] / (a[3] / 100) : 0;
    const g = a[4] + a[5] + a[6];
    pktW += a[9] * g; gW += g;
  }
  return { roH, roC, capH, capC, gaiH, gaiC, gep, cai, cep, pkt: gW ? pktW / gW : 0 };
}

export type StatUnit = 'count' | 'pct' | 'ratio' | 'money';
export interface StatCell { hotel: number | null; club: number | null; otros: number | null; total: number | null }
export interface StatRow { label: string; unit: StatUnit; real: StatCell; budget: number | null }

const cell = (hotel: number | null, club: number | null, otros: number | null, total: number | null): StatCell =>
  ({ hotel, club, otros, total });
const occTotal = (s: Scn) => (s.capH + s.capC) ? ((s.roH + s.roC) / (s.capH + s.capC)) * 100 : 0;
const porTotal = (s: Scn) => (s.roH + s.roC) ? (s.gaiH + s.gaiC + s.gep) / (s.roH + s.roC) : null;
const convSocios = (s: Scn) => (s.gaiC + s.gep) ? (s.gaiC / (s.gaiC + s.gep)) * 100 : 0;

export interface GuestSummary {
  aiHotel: number; aiClub: number; aiTotal: number;
  aiBudgetHotel: number; aiBudgetClub: number; aiBudget: number;
  ep: number; epBudget: number;        // EP guests belong to the Club channel
  total: number; totalBudget: number;
}

/** Guest counts for a period — shown atop the NPR table for context (AI Hotel/Club + EP),
 *  Real and Budget both split by channel. */
export function getGuestSummary(period: PeriodKey): GuestSummary {
  const r = aggScn(monthsOf(period), 'r');
  const b = aggScn(monthsOf(period), 'b');
  const aiTotal = r.gaiH + r.gaiC;
  const aiBudget = b.gaiH + b.gaiC;
  return {
    aiHotel: r.gaiH, aiClub: r.gaiC, aiTotal,
    aiBudgetHotel: b.gaiH, aiBudgetClub: b.gaiC, aiBudget,
    ep: r.gep, epBudget: b.gep,
    total: aiTotal + r.gep, totalBudget: aiBudget + b.gep,
  };
}

/** The 12 reported indicators for a period (Real by channel + Budget total). */
export function getStats(period: PeriodKey): StatRow[] {
  const r = aggScn(monthsOf(period), 'r');
  const b = aggScn(monthsOf(period), 'b');
  const aybEp = getConceptRealBudget(period, 'F&B EP'); // thousands MXN

  return [
    { label: 'Rooms OCC', unit: 'count', real: cell(r.roH, r.roC, null, r.roH + r.roC), budget: b.roH + b.roC },
    { label: '% OCC', unit: 'pct', real: cell((r.roH / r.capH) * 100 || 0, (r.roC / r.capC) * 100 || 0, null, occTotal(r)), budget: occTotal(b) },
    { label: 'Guest AI', unit: 'count', real: cell(r.gaiH, r.gaiC, null, r.gaiH + r.gaiC), budget: b.gaiH + b.gaiC },
    { label: 'Guest EP', unit: 'count', real: cell(null, r.gep, null, r.gep), budget: b.gep },
    { label: 'Members Conversion %', unit: 'pct', real: cell(null, null, null, convSocios(r)), budget: convSocios(b) },
    { label: 'Guest POR', unit: 'ratio', real: cell(r.roH ? r.gaiH / r.roH : null, r.roC ? (r.gaiC + r.gep) / r.roC : null, null, porTotal(r)), budget: porTotal(b) },
    { label: 'Cover AI', unit: 'count', real: cell(r.cai, null, null, r.cai), budget: b.cai },
    { label: 'Cover EP', unit: 'count', real: cell(r.cep, null, null, r.cep), budget: b.cep },
    { label: 'Cover P Guest', unit: 'ratio', real: cell(null, null, null, r.gaiH ? (r.cai + r.cep) / r.gaiH : null), budget: null },
    { label: 'Cover P Guest EP', unit: 'ratio', real: cell(null, null, null, r.gep ? r.cep / r.gep : null), budget: b.gep ? b.cep / b.gep : null },
    { label: 'Average Check EP', unit: 'money', real: cell(null, null, null, r.cep ? (aybEp.real * 1000) / r.cep : null), budget: b.cep ? (aybEp.budget * 1000) / b.cep : null },
    { label: 'PKT Daily Spend', unit: 'money', real: cell(null, null, null, r.pkt), budget: b.pkt },
  ];
}
