/**
 * Group Pipeline — static dataset (frontend-only for now).
 * Data structure mirrors the UNIFIED long-format Excel sheet, but pivoted by
 * (snapshot, status, [level,] metric) -> 12 monthly values (Jan..Dec) for compactness.
 *
 * Business rules (see module context):
 * - Hotel source: only level = "My Hotel". Metrics: RN, ADR, REV, BKGS.
 * - D360 source: levels = My Hotel | Comp Set | Market. Metrics: OCC, RN, ADR, RevPAR.
 *   D360 does NOT track Prospect — Prospect always comes from the hotel's internal report.
 * - BKGS only appears in Snap-Feb and Snap-Mar (the hotel report's extended format).
 * - For CS/Market in D360, ADR/REV/RevPAR may be 0 or null for future months
 *   (Amadeus releases the figure once the month closes).
 */

export type Source = 'Hotel' | 'D360';
export type Snapshot = 'Snap-Ene' | 'Snap-Feb' | 'Snap-Mar' | 'Snap-Apr' | 'Snap-May-11' | 'Snap-May-18' | 'Snap-May-25';
export type Status = 'Prospect' | 'Tentative' | 'Definite';
export type Level = 'My Hotel' | 'Comp Set' | 'Market';
export type Metric = 'RN' | 'ADR' | 'REV' | 'BKGS' | 'OCC' | 'RevPAR';
export type Visual = 'V1' | 'V2';

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;
export type Month = typeof MONTHS[number];

export const SNAPSHOTS: Snapshot[] = ['Snap-Ene','Snap-Feb','Snap-Mar','Snap-Apr','Snap-May-11','Snap-May-18','Snap-May-25'];

export const SNAPSHOT_DATES: Record<Snapshot, string> = {
  'Snap-Ene': '2026-01-14',
  'Snap-Feb': '2026-02-02',
  'Snap-Mar': '2026-03-02',
  'Snap-Apr': '2026-04-06',
  'Snap-May-11': '2026-05-11',
  'Snap-May-18': '2026-05-18',
  'Snap-May-25': '2026-05-25',
};

export const STATUSES: Status[] = ['Prospect','Tentative','Definite'];
export const LEVELS: Level[] = ['My Hotel','Comp Set','Market'];
export const METRICS: Metric[] = ['RN','ADR','REV','OCC','RevPAR','BKGS'];

export const HOTEL_METRICS: Metric[] = ['RN','ADR','REV','BKGS'];
export const D360_METRICS: Metric[] = ['OCC','RN','ADR','RevPAR'];

export const PROPERTY = { id: 531615, name: 'Waldorf Astoria Costa Rica Punta Cacique', rooms: 188 };

// 2026 is not a leap year. Inventory[m] = rooms × days_in_month_m.
// Cross-checked: Snap-Apr Apr MyHotel D360 has OCC=0.176 and RN=993 → 993/0.176≈5642 = 188×30 ✓
const DAYS_IN_MONTH_2026 = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const INVENTORY_2026: number[] = DAYS_IN_MONTH_2026.map((d) => d * PROPERTY.rooms);

// ─── Budget 2026 (My Hotel, full-year plan) ──────────────────────────
// Finance plan for My Hotel. 12-month series (Jan..Dec). ADR is the planned
// rate; REV ≈ RN × ADR (rounding aside). Jan is 0 (no budgeted business).
export const BUDGET_2026: Record<'RN' | 'ADR' | 'REV', number[]> = {
  RN:  [0, 799, 963, 992, 915, 863, 308, 283, 223, 230, 807, 250],
  ADR: [0, 1447.64, 1182.06, 1180.52, 1081.3, 838.69, 957.12, 642.65, 684.64, 771.7, 881.11, 969.13],
  REV: [0, 1156668, 1138324, 1171075, 989385, 723791, 294794, 181871, 152675, 177491, 711058, 242283],
};

type V = number | null;
type V12 = [V,V,V,V,V,V,V,V,V,V,V,V];

const Z: V12 = [0,0,0,0,0,0,0,0,0,0,0,0];
const N: V12 = [null,null,null,null,null,null,null,null,null,null,null,null];

// ─── Hotel source data (level = My Hotel) ────────────────────────────
type HotelKey = `${Snapshot}|${Status}|${'RN'|'ADR'|'REV'|'BKGS'}`;

export const HOTEL_DATA: Record<HotelKey, V12> = {
  // Snap-Ene
  'Snap-Ene|Prospect|RN':   [636, 2263, 1677, 1957, 5105, 911, 361, 363, 821, 1420, 491, 410],
  'Snap-Ene|Prospect|ADR':  [688.68, 652.21, 583.93, 3100.35, 545.02, 687.09, 752.02, 895.95, 658.19, 470.93, 687.93, 643.9],
  'Snap-Ene|Prospect|REV':  [438000, 697600, 979250, 6067385, 2782328, 625941, 271480, 325230, 540375, 668725, 337774, 264000],
  'Snap-Ene|Prospect|BKGS': N,
  'Snap-Ene|Tentative|RN':   [0,0,219,0,0,0,0,0,0,0,0,0],
  'Snap-Ene|Tentative|ADR':  [0,0,800,0,0,0,0,0,0,0,0,0],
  'Snap-Ene|Tentative|REV':  [0,0,175200,0,0,0,0,0,0,0,0,0],
  'Snap-Ene|Tentative|BKGS': N,
  'Snap-Ene|Definite|RN':   [0,566,564,705,398,462,0,0,0,0,0,0],
  'Snap-Ene|Definite|ADR':  [0,1413.43,1392.16,1230.31,1208.91,701.51,0,0,0,0,0,0],
  'Snap-Ene|Definite|REV':  [0,800000,785181,867370,481145,324097,0,0,0,0,0,0],
  'Snap-Ene|Definite|BKGS': N,
  // Snap-Feb
  'Snap-Feb|Prospect|RN':   [0,147,800,5125,2231,1059,1210,363,1089,1075,745,400],
  'Snap-Feb|Prospect|ADR':  [0,1154,368,1191,1014,723,750,896,637,649,623,660],
  'Snap-Feb|Prospect|REV':  [0,169650,774050,6107185,2263388,766267,907500,325230,693907,697325,463874,264000],
  'Snap-Feb|Prospect|BKGS': [0,1,8,28,15,5,5,2,7,8,7,1],
  'Snap-Feb|Tentative|RN':   [0,0,219,0,336,0,0,0,0,0,0,0],
  'Snap-Feb|Tentative|ADR':  [0,0,800,0,700,0,0,0,0,0,0,0],
  'Snap-Feb|Tentative|REV':  [0,0,175200,0,235200,0,0,0,0,0,0,0],
  'Snap-Feb|Tentative|BKGS': [0,0,1,0,1,0,0,0,0,0,0,0],
  'Snap-Feb|Definite|RN':   [0,837,508,845,454,519,0,0,0,0,0,0],
  'Snap-Feb|Definite|ADR':  [0,1314.57,1382.18,1182.7,1210.01,679.12,0,0,0,0,0,0],
  'Snap-Feb|Definite|REV':  [0,1184860,720112,1007220,532545,363642,0,0,0,0,0,0],
  'Snap-Feb|Definite|BKGS': [0,4,3,5,2,2,0,0,0,0,0,0],
  // Snap-Mar
  'Snap-Mar|Prospect|RN':   [0,0,0,530,1115,933,385,75,386,1048,1369,480],
  'Snap-Mar|Prospect|ADR':  [0,0,0,1120,942,816,690,650,672,645,707,658],
  'Snap-Mar|Prospect|REV':  [0,0,0,594000,1051398,762032,265650,48750,259401,676025,968591,316000],
  'Snap-Mar|Prospect|BKGS': [0,0,0,4,2,4,1,1,4,8,8,2],
  'Snap-Mar|Tentative|RN':   [0,0,0,0,0,0,0,0,0,0,48,82],
  'Snap-Mar|Tentative|ADR':  [0,0,0,0,0,0,0,0,0,0,435,650],
  'Snap-Mar|Tentative|REV':  [0,0,0,0,0,0,0,0,0,0,20880,53300],
  'Snap-Mar|Tentative|BKGS': [0,0,0,0,0,0,0,0,0,0,1,1],
  'Snap-Mar|Definite|RN':   [0,837,969,865,454,519,0,0,0,0,189,0],
  'Snap-Mar|Definite|ADR':  [0,1314.57,1249,1182.7,1210.01,679.12,0,0,0,0,454.49,0],
  'Snap-Mar|Definite|REV':  [0,1184860,1133912,1016320,532545,363642,0,0,0,0,85900,0],
  'Snap-Mar|Definite|BKGS': [0,4,5,7,2,2,0,0,0,0,1,0],
  // Snap-Apr
  'Snap-Apr|Prospect|RN':   [0,0,0,129,868,382,435,315,649,2357,2233,585],
  'Snap-Apr|Prospect|ADR':  [0,0,0,950,862.79,819.63,685.4,607.14,602.9,581.24,713.22,668.46],
  'Snap-Apr|Prospect|REV':  [0,0,0,122550,748900,313099,298149,191249,391282,1369983,1592620,391050],
  'Snap-Apr|Prospect|BKGS': N,
  'Snap-Apr|Tentative|RN':   [0,0,0,0,143,0,0,0,390,0,0,0],
  'Snap-Apr|Tentative|ADR':  [0,0,0,0,692.98,0,0,0,506.88,0,0,0],
  'Snap-Apr|Tentative|REV':  [0,0,0,0,99096,0,0,0,197683,0,0,0],
  'Snap-Apr|Tentative|BKGS': N,
  'Snap-Apr|Definite|RN':   [0,771,1028,990,398,462,0,0,0,0,254,74],
  'Snap-Apr|Definite|ADR':  [0,1486.39,1219.29,1228.14,1208.91,701.51,0,0,0,0,492.36,650],
  'Snap-Apr|Definite|REV':  [0,1146005,1253429,1215861,481145,324097,0,0,0,0,125059,48100],
  'Snap-Apr|Definite|BKGS': N,
  // Snap-May-11
  'Snap-May-11|Prospect|RN':   [0,0,0,0,0,340,435,440,356,1001,1423,485],
  'Snap-May-11|Prospect|ADR':  [0,0,0,0,0,840.59,685.4,573.86,629.5,623.55,700.43,658.25],
  'Snap-May-11|Prospect|REV':  [0,0,0,0,0,285801,298149,252498,224102,624174,996712,319250],
  'Snap-May-11|Prospect|BKGS': N,
  'Snap-May-11|Tentative|RN':   Z,
  'Snap-May-11|Tentative|ADR':  Z,
  'Snap-May-11|Tentative|REV':  Z,
  'Snap-May-11|Tentative|BKGS': N,
  'Snap-May-11|Definite|RN':   [0,771,1028,967,566,462,0,0,351,0,254,74],
  'Snap-May-11|Definite|ADR':  [0,1486.39,1219.29,1252.44,1119.27,701.51,0,0,508.29,0,492.36,650],
  'Snap-May-11|Definite|REV':  [0,1146005,1253429,1211105,633506,324097,0,0,178410,0,125059,48100],
  'Snap-May-11|Definite|BKGS': N,
  // Snap-May-18
  'Snap-May-18|Prospect|RN':   [0,0,0,0,0,0,50,415,84,1001,1513,485],
  'Snap-May-18|Prospect|ADR':  [0,0,0,0,0,0,650,611.57,600,623.55,691.17,658.25],
  'Snap-May-18|Prospect|REV':  [0,0,0,0,0,0,32500,253802,50400,624174,1045740,319250],
  'Snap-May-18|Prospect|BKGS': N,
  'Snap-May-18|Tentative|RN':   Z,
  'Snap-May-18|Tentative|ADR':  Z,
  'Snap-May-18|Tentative|REV':  Z,
  'Snap-May-18|Tentative|BKGS': N,
  'Snap-May-18|Definite|RN':   [0,771,1028,990,564,496,0,0,351,0,254,74],
  'Snap-May-18|Definite|ADR':  [0,1486.39,1219.29,1252.44,1121.11,701.51,0,0,508.29,0,492.36,650],
  'Snap-May-18|Definite|REV':  [0,1146005,1253429,1211105,632306,350554,0,0,178410,0,125059,48100],
  'Snap-May-18|Definite|BKGS': N,
  // Snap-May-25
  'Snap-May-25|Prospect|RN':   [0,0,0,0,0,0,50,415,84,1562,1513,540],
  'Snap-May-25|Prospect|ADR':  [0,0,0,0,0,0,650,611.57,600,575.66,691.17,644.17],
  'Snap-May-25|Prospect|REV':  [0,0,0,0,0,0,32500,253802,50400,899181,1045740,319250],
  'Snap-May-25|Prospect|BKGS': N,
  'Snap-May-25|Tentative|RN':   Z,
  'Snap-May-25|Tentative|ADR':  Z,
  'Snap-May-25|Tentative|REV':  Z,
  'Snap-May-25|Tentative|BKGS': N,
  'Snap-May-25|Definite|RN':   [0,771,1028,990,564,504,0,0,351,0,254,74],
  'Snap-May-25|Definite|ADR':  [0,1486.39,1219.29,1252.44,1121.11,701.51,0,0,508.29,0,492.36,650],
  'Snap-May-25|Definite|REV':  [0,1146005,1253429,1211105,632306,357033,0,0,178410,0,125059,48100],
  'Snap-May-25|Definite|BKGS': N,
};

// ─── D360 source data (Tentative & Definite only) ────────────────────
type D360Key = `${Snapshot}|${'Tentative'|'Definite'}|${Level}|${'OCC'|'RN'|'ADR'|'RevPAR'}`;

export const D360_DATA: Record<D360Key, V12> = {
  // ─── Snap-Ene ────────────────────────────────────────────────
  'Snap-Ene|Definite|My Hotel|OCC':    [0,0.033,0.001,0.057,0,0,0,0,0,0,0,0],
  'Snap-Ene|Definite|My Hotel|RN':     [0,173,4,321,0,0,0,0,0,0,0,0],
  'Snap-Ene|Definite|My Hotel|ADR':    [673,658,996,1434,null,null,null,null,null,null,null,null],
  'Snap-Ene|Definite|My Hotel|RevPAR': [166,69,43,20,null,null,null,null,null,null,null,null],
  'Snap-Ene|Definite|Comp Set|OCC':    [0.246,0.104,0.043,0.014,0.019,0.008,0.001,0.001,0,0,0.003,0.002],
  'Snap-Ene|Definite|Comp Set|RN':     [8255,3161,1450,456,632,252,27,49,13,0,98,67],
  'Snap-Ene|Definite|Comp Set|ADR':    [669,688,859,982,null,null,null,null,null,null,null,null],
  'Snap-Ene|Definite|Comp Set|RevPAR': [115,72,32,25,null,null,null,null,null,null,null,null],
  'Snap-Ene|Definite|Market|OCC':      [0.172,0.104,0.037,0.026,0.015,0.014,0.003,0.002,0.001,0.001,0.002,0.004],
  'Snap-Ene|Definite|Market|RN':       [8965,4897,1927,1306,799,706,131,95,42,75,121,218],
  'Snap-Ene|Definite|Market|ADR':      Z,
  'Snap-Ene|Definite|Market|RevPAR':   Z,
  'Snap-Ene|Tentative|My Hotel|OCC':   [0,0.128,0.13,0.099,0.071,0.091,0,0,0,0,0,0],
  'Snap-Ene|Tentative|My Hotel|RN':    [0,674,758,561,414,514,0,0,0,0,0,0],
  'Snap-Ene|Tentative|My Hotel|ADR':   N,
  'Snap-Ene|Tentative|My Hotel|RevPAR':N,
  'Snap-Ene|Tentative|Comp Set|OCC':   [0.007,0.117,0.208,0.295,0.245,0.15,0.112,0.059,0.016,0.034,0.058,0.062],
  'Snap-Ene|Tentative|Comp Set|RN':    [223,3552,6973,9564,8210,4865,3744,1977,509,1135,1879,2080],
  'Snap-Ene|Tentative|Comp Set|ADR':   N,
  'Snap-Ene|Tentative|Comp Set|RevPAR':N,
  'Snap-Ene|Tentative|Market|OCC':     [0.005,0.126,0.155,0.213,0.247,0.152,0.078,0.058,0.03,0.037,0.059,0.07],
  'Snap-Ene|Tentative|Market|RN':      [285,5906,8090,10710,12857,7683,4062,3031,1535,1946,2958,3669],
  'Snap-Ene|Tentative|Market|ADR':     N,
  'Snap-Ene|Tentative|Market|RevPAR':  N,
  // ─── Snap-Feb ────────────────────────────────────────────────
  'Snap-Feb|Definite|My Hotel|OCC':    [0,0.149,0.026,0.059,0,0,0,0,0,0,0,0],
  'Snap-Feb|Definite|My Hotel|RN':     [0,786,150,332,0,0,0,0,0,0,0,0],
  'Snap-Feb|Definite|My Hotel|ADR':    [671,584,780,1311,null,null,null,null,null,null,null,null],
  'Snap-Feb|Definite|My Hotel|RevPAR': [164,125,75,29,null,null,null,null,null,null,null,null],
  'Snap-Feb|Definite|Comp Set|OCC':    [0.245,0.214,0.096,0.022,0.028,0.01,0.001,0.002,0,0,0.005,0.004],
  'Snap-Feb|Definite|Comp Set|RN':     [8205,6481,3219,721,926,340,33,57,13,6,162,131],
  'Snap-Feb|Definite|Comp Set|ADR':    [672,741,936,974,null,null,null,null,null,null,null,null],
  'Snap-Feb|Definite|Comp Set|RevPAR': [113,125,45,32,null,null,null,null,null,null,null,null],
  'Snap-Feb|Definite|Market|OCC':      [0.169,0.169,0.048,0.033,0.021,0.016,0.003,0.002,0.001,0.002,0.004,0.006],
  'Snap-Feb|Definite|Market|RN':       [8795,7955,2509,1676,1082,825,164,100,45,97,185,294],
  'Snap-Feb|Definite|Market|ADR':      Z,
  'Snap-Feb|Definite|Market|RevPAR':   Z,
  'Snap-Feb|Tentative|My Hotel|OCC':   [0,0.002,0.173,0.099,0.074,0.091,0,0,0,0,0.039,0],
  'Snap-Feb|Tentative|My Hotel|RN':    [0,11,1011,557,434,514,0,0,0,0,219,0],
  'Snap-Feb|Tentative|My Hotel|ADR':   N,
  'Snap-Feb|Tentative|My Hotel|RevPAR':N,
  'Snap-Feb|Tentative|Comp Set|OCC':   [0,0.019,0.16,0.291,0.234,0.149,0.114,0.058,0.016,0.035,0.092,0.063],
  'Snap-Feb|Tentative|Comp Set|RN':    [0,568,5372,9441,7863,4840,3810,1953,509,1173,2983,2124],
  'Snap-Feb|Tentative|Comp Set|ADR':   N,
  'Snap-Feb|Tentative|Comp Set|RevPAR':N,
  'Snap-Feb|Tentative|Market|OCC':     [0,0.03,0.141,0.21,0.257,0.165,0.095,0.07,0.039,0.046,0.075,0.079],
  'Snap-Feb|Tentative|Market|RN':      [0,1406,7365,10606,13375,8328,4953,3642,1975,2373,3757,4101],
  'Snap-Feb|Tentative|Market|ADR':     N,
  'Snap-Feb|Tentative|Market|RevPAR':  N,
  // ─── Snap-Mar ────────────────────────────────────────────────
  'Snap-Mar|Definite|My Hotel|OCC':    [0,0.147,0.193,0.059,0,0,0,0,0,0,0,0],
  'Snap-Mar|Definite|My Hotel|RN':     [0,772,1123,330,0,0,0,0,0,0,0,0],
  'Snap-Mar|Definite|My Hotel|ADR':    [672,595,763,1168,null,null,null,null,null,null,null,null],
  'Snap-Mar|Definite|My Hotel|RevPAR': [164,125,159,47,null,null,null,null,null,null,null,null],
  'Snap-Mar|Definite|Comp Set|OCC':    [0.245,0.211,0.209,0.04,0.042,0.017,0.007,0.002,0.001,0,0.009,0.006],
  'Snap-Mar|Definite|Comp Set|RN':     [8205,6379,6998,1293,1410,537,233,74,18,15,284,208],
  'Snap-Mar|Definite|Comp Set|ADR':    [672,754,811,973,null,null,null,null,null,null,null,null],
  'Snap-Mar|Definite|Comp Set|RevPAR': [113,135,133,44,null,null,null,null,null,null,null,null],
  'Snap-Mar|Definite|Market|OCC':      [0.169,0.179,0.164,0.045,0.029,0.021,0.008,0.004,0.001,0.004,0.006,0.007],
  'Snap-Mar|Definite|Market|RN':       [8795,8400,8524,2272,1532,1045,414,186,51,214,325,375],
  'Snap-Mar|Definite|Market|ADR':      Z,
  'Snap-Mar|Definite|Market|RevPAR':   Z,
  'Snap-Mar|Tentative|My Hotel|OCC':   [0,0,0,0.114,0.085,0.091,0,0,0,0,0.035,0],
  'Snap-Mar|Tentative|My Hotel|RN':    [0,0,0,643,497,514,0,0,0,0,198,0],
  'Snap-Mar|Tentative|My Hotel|ADR':   N,
  'Snap-Mar|Tentative|My Hotel|RevPAR':N,
  'Snap-Mar|Tentative|Comp Set|OCC':   [0,0,0.007,0.277,0.229,0.159,0.123,0.061,0.019,0.038,0.108,0.071],
  'Snap-Mar|Tentative|Comp Set|RN':    [0,0,219,8984,7681,5147,4124,2059,604,1285,3493,2376],
  'Snap-Mar|Tentative|Comp Set|ADR':   N,
  'Snap-Mar|Tentative|Comp Set|RevPAR':N,
  'Snap-Mar|Tentative|Market|OCC':     [0,0,0.008,0.208,0.254,0.164,0.096,0.069,0.043,0.047,0.085,0.085],
  'Snap-Mar|Tentative|Market|RN':      [0,0,403,10497,13208,8272,5003,3616,2190,2442,4260,4413],
  'Snap-Mar|Tentative|Market|ADR':     N,
  'Snap-Mar|Tentative|Market|RevPAR':  N,
  // ─── Snap-Apr ────────────────────────────────────────────────
  'Snap-Apr|Definite|My Hotel|OCC':    [0,0.147,0.176,0.176,0.031,0,0,0,0,0,0,0.007],
  'Snap-Apr|Definite|My Hotel|RN':     [0,772,1028,993,183,0,0,0,0,0,0,41],
  'Snap-Apr|Definite|My Hotel|ADR':    [672,595,744,729,null,null,null,null,null,null,null,null],
  'Snap-Apr|Definite|My Hotel|RevPAR': [164,125,157,200,null,null,null,null,null,null,null,null],
  'Snap-Apr|Definite|Comp Set|OCC':    [0.245,0.21,0.211,0.274,0.099,0.021,0.01,0.005,0.001,0.001,0.016,0.01],
  'Snap-Apr|Definite|Comp Set|RN':     [8205,6375,7072,8894,3331,695,351,183,25,44,527,324],
  'Snap-Apr|Definite|Comp Set|ADR':    [672,754,802,761,null,null,null,null,null,null,null,null],
  'Snap-Apr|Definite|Comp Set|RevPAR': [113,135,131,175,null,null,null,null,null,null,null,null],
  'Snap-Apr|Definite|Market|OCC':      [0.169,0.178,0.163,0.23,0.082,0.026,0.012,0.006,0.001,0.005,0.012,0.011],
  'Snap-Apr|Definite|Market|RN':       [8795,8396,8473,11616,4278,1292,612,334,70,278,603,552],
  'Snap-Apr|Definite|Market|ADR':      [0,0,0,0,0.21,0,0,0,0,0,0,0],
  'Snap-Apr|Definite|Market|RevPAR':   [0,0,0,0,-0.1,0,0,0,0,0,0,0],
  'Snap-Apr|Tentative|My Hotel|OCC':   [0,0,0,0.009,0.056,0.091,0,0,0,0,0.054,0.016],
  'Snap-Apr|Tentative|My Hotel|RN':    [0,0,0,51,324,514,0,0,0,0,306,94],
  'Snap-Apr|Tentative|My Hotel|ADR':   N,
  'Snap-Apr|Tentative|My Hotel|RevPAR':N,
  'Snap-Apr|Tentative|Comp Set|OCC':   [0,0,0,0.006,0.19,0.154,0.122,0.067,0.027,0.053,0.103,0.077],
  'Snap-Apr|Tentative|Comp Set|RN':    [0,0,0,196,6378,5001,4087,2252,862,1787,3333,2581],
  'Snap-Apr|Tentative|Comp Set|ADR':   N,
  'Snap-Apr|Tentative|Comp Set|RevPAR':N,
  'Snap-Apr|Tentative|Market|OCC':     [0,0,0,0.012,0.215,0.161,0.095,0.073,0.05,0.054,0.116,0.09],
  'Snap-Apr|Tentative|Market|RN':      [0,0,0,615,11200,8120,4942,3799,2536,2802,5836,4696],
  'Snap-Apr|Tentative|Market|ADR':     N,
  'Snap-Apr|Tentative|Market|RevPAR':  N,
  // ─── Snap-May-11 ─────────────────────────────────────────────
  'Snap-May-11|Definite|My Hotel|OCC':    [0,0.147,0.176,0.175,0.097,0.024,0,0,0,0,0,0.011],
  'Snap-May-11|Definite|My Hotel|RN':     [0,772,1028,987,563,137,0,0,0,0,0,62],
  'Snap-May-11|Definite|My Hotel|ADR':    [672,595,744,728,null,null,null,null,null,null,null,null],
  'Snap-May-11|Definite|My Hotel|RevPAR': [164,125,157,199,null,null,null,null,null,null,null,null],
  'Snap-May-11|Definite|Comp Set|OCC':    [0.245,0.21,0.211,0.273,0.241,0.1,0.024,0.034,0.002,0.004,0.022,0.015],
  'Snap-May-11|Definite|Comp Set|RN':     [8205,6375,7072,8874,8078,3239,803,1151,49,138,722,497],
  'Snap-May-11|Definite|Comp Set|ADR':    [672,754,802,785,null,null,null,null,null,null,null,null],
  'Snap-May-11|Definite|Comp Set|RevPAR': [113,135,131,182,null,null,null,null,null,null,null,null],
  'Snap-May-11|Definite|Market|OCC':      [0.169,0.178,0.163,0.231,0.251,0.118,0.021,0.025,0.002,0.008,0.017,0.014],
  'Snap-May-11|Definite|Market|RN':       [8795,8396,8473,11666,13076,5954,1106,1327,98,426,838,726],
  'Snap-May-11|Definite|Market|ADR':      [0,0,0,0,0.012,0,0,0,0,0,0,0],
  'Snap-May-11|Definite|Market|RevPAR':   [0,0,0,0,0.369,0,0,0,0,0,0,0],
  'Snap-May-11|Tentative|My Hotel|OCC':   [0,0,0,0,0,0.07,0,0,0.069,0,0.054,0.006],
  'Snap-May-11|Tentative|My Hotel|RN':    [0,0,0,0,0,396,0,0,390,0,306,36],
  'Snap-May-11|Tentative|My Hotel|ADR':   N,
  'Snap-May-11|Tentative|My Hotel|RevPAR':N,
  'Snap-May-11|Tentative|Comp Set|OCC':   [0,0,0,0,0.004,0.065,0.1,0.062,0.034,0.065,0.109,0.092],
  'Snap-May-11|Tentative|Comp Set|RN':    [0,0,0,0,121,2105,3358,2064,1097,2183,3526,3090],
  'Snap-May-11|Tentative|Comp Set|ADR':   N,
  'Snap-May-11|Tentative|Comp Set|RevPAR':N,
  'Snap-May-11|Tentative|Market|OCC':     [0,0,0,0,0.006,0.055,0.089,0.076,0.06,0.076,0.087,0.091],
  'Snap-May-11|Tentative|Market|RN':      [0,0,0,0,331,2783,4656,3952,3003,3937,4373,4758],
  'Snap-May-11|Tentative|Market|ADR':     N,
  'Snap-May-11|Tentative|Market|RevPAR':  N,
  // ─── Snap-May-18 ─────────────────────────────────────────────
  'Snap-May-18|Definite|My Hotel|OCC':    [0,0.147,0.176,0.175,0.097,0.027,0,0,0,0,0,0.011],
  'Snap-May-18|Definite|My Hotel|RN':     [0,772,1028,987,564,152,0,0,0,0,0,62],
  'Snap-May-18|Definite|My Hotel|ADR':    [672,595,744,728,null,null,null,null,null,null,null,null],
  'Snap-May-18|Definite|My Hotel|RevPAR': [164,125,157,199,null,null,null,null,null,null,null,null],
  'Snap-May-18|Definite|Comp Set|OCC':    [0.245,0.21,0.211,0.273,0.242,0.114,0.025,0.035,0.003,0.004,0.024,0.016],
  'Snap-May-18|Definite|Comp Set|RN':     [8205,6375,7072,8874,8121,3704,837,1176,103,149,775,524],
  'Snap-May-18|Definite|Comp Set|ADR':    [672,754,802,785,null,null,null,null,null,null,null,null],
  'Snap-May-18|Definite|Comp Set|RevPAR': [113,135,131,182,null,null,null,null,null,null,null,null],
  'Snap-May-18|Definite|Market|OCC':      [0.169,0.178,0.163,0.231,0.253,0.13,0.022,0.026,0.003,0.008,0.018,0.014],
  'Snap-May-18|Definite|Market|RN':       [8795,8396,8473,11666,13168,6573,1144,1363,160,435,909,755],
  'Snap-May-18|Definite|Market|ADR':      [0,0,0,0,0.109,0.752,0,0,0,0,0,0],
  'Snap-May-18|Definite|Market|RevPAR':   [0,0,0,0,0.465,1.927,0,0,0,0,0,0],
  'Snap-May-18|Tentative|My Hotel|OCC':   [0,0,0,0,0,0,0,0,0.069,0,0.054,0.006],
  'Snap-May-18|Tentative|My Hotel|RN':    [0,0,0,0,0,0,0,0,390,0,306,36],
  'Snap-May-18|Tentative|My Hotel|ADR':   N,
  'Snap-May-18|Tentative|My Hotel|RevPAR':N,
  'Snap-May-18|Tentative|Comp Set|OCC':   [0,0,0,0,0.002,0.045,0.098,0.035,0.041,0.065,0.118,0.097],
  'Snap-May-18|Tentative|Comp Set|RN':    [0,0,0,0,52,1458,3278,1190,1316,2195,3831,3254],
  'Snap-May-18|Tentative|Comp Set|ADR':   N,
  'Snap-May-18|Tentative|Comp Set|RevPAR':N,
  'Snap-May-18|Tentative|Market|OCC':     [0,0,0,0,0.003,0.032,0.087,0.059,0.064,0.058,0.087,0.09],
  'Snap-May-18|Tentative|Market|RN':      [0,0,0,0,157,1622,4550,3065,3223,3032,4389,4674],
  'Snap-May-18|Tentative|Market|ADR':     N,
  'Snap-May-18|Tentative|Market|RevPAR':  N,
  // ─── Snap-May-25 ─────────────────────────────────────────────
  'Snap-May-25|Definite|My Hotel|OCC':    [0,0.147,0.176,0.175,0.097,0.089,0,0,0,0,0,0.011],
  'Snap-May-25|Definite|My Hotel|RN':     [0,772,1028,987,564,504,0,0,0,0,0,62],
  'Snap-May-25|Definite|My Hotel|ADR':    [672,595,744,728,null,null,null,null,null,null,null,null],
  'Snap-May-25|Definite|My Hotel|RevPAR': [164,125,157,199,null,null,null,null,null,null,null,null],
  'Snap-May-25|Definite|Comp Set|OCC':    [0.245,0.21,0.211,0.273,0.241,0.124,0.026,0.035,0.003,0.006,0.024,0.017],
  'Snap-May-25|Definite|Comp Set|RN':     [8205,6375,7072,8874,8085,4036,881,1184,111,208,794,558],
  'Snap-May-25|Definite|Comp Set|ADR':    [672,754,802,785,null,null,null,null,null,null,null,null],
  'Snap-May-25|Definite|Comp Set|RevPAR': [113,135,131,182,null,null,null,null,null,null,null,null],
  'Snap-May-25|Definite|Market|OCC':      [0.169,0.178,0.163,0.231,0.254,0.144,0.024,0.028,0.003,0.009,0.018,0.015],
  'Snap-May-25|Definite|Market|RN':       [8795,8396,8473,11666,13215,7282,1254,1446,176,476,930,785],
  'Snap-May-25|Definite|Market|ADR':      [0,0,0,0,0.12,0.868,0,0,0,0,0,0],
  'Snap-May-25|Definite|Market|RevPAR':   [0,0,0,0,0.486,18.617,0,0,0,0,0,0],
  'Snap-May-25|Tentative|My Hotel|OCC':   [0,0,0,0,0,0,0,0,0.069,0,0.053,0.006],
  'Snap-May-25|Tentative|My Hotel|RN':    [0,0,0,0,0,0,0,0,390,0,297,36],
  'Snap-May-25|Tentative|My Hotel|ADR':   N,
  'Snap-May-25|Tentative|My Hotel|RevPAR':N,
  'Snap-May-25|Tentative|Comp Set|OCC':   [0,0,0,0,0.002,0.015,0.102,0.035,0.04,0.064,0.121,0.1],
  'Snap-May-25|Tentative|Comp Set|RN':    [0,0,0,0,82,502,3406,1179,1299,2132,3913,3362],
  'Snap-May-25|Tentative|Comp Set|ADR':   N,
  'Snap-May-25|Tentative|Comp Set|RevPAR':N,
  'Snap-May-25|Tentative|Market|OCC':     [0,0,0,0,0.002,0.013,0.089,0.058,0.063,0.057,0.089,0.092],
  'Snap-May-25|Tentative|Market|RN':      [0,0,0,0,115,669,4648,3042,3192,2994,4467,4777],
  'Snap-May-25|Tentative|Market|ADR':     N,
  'Snap-May-25|Tentative|Market|RevPAR':  N,
};

// ─── Lookup ──────────────────────────────────────────────────────────
// My Hotel OCC from the hotel's own report: the report carries RN but no OCC,
// so we derive it as RN ÷ inventory (rooms × days in month). This is the same
// identity used to cross-check INVENTORY_2026 above (RN / OCC ≈ inventory).
function hotelOccFromRN(snapshot: Snapshot, status: Status): V12 {
  const rn = HOTEL_DATA[`${snapshot}|${status}|RN` as HotelKey] ?? N;
  return rn.map((v, i) => (v === null ? null : v / INVENTORY_2026[i])) as V12;
}

// Returns the 12-month series for a given cell.
// Visual 1 ("Operational reality"): My Hotel rows pull from Hotel source for all
// statuses; CS/Market rows pull from Hotel (=My Hotel) for Prospect and from
// D360 for Tentative/Definite. Since the hotel report has no OCC, My Hotel OCC
// is derived from RN ÷ inventory.
// Visual 2 ("All under D360"): same Prospect rule (D360 has no Prospect, so
// always Hotel), but My Hotel Tentative/Definite pulls from D360 too — including
// its reported OCC.
export function getSeries(visual: Visual, snapshot: Snapshot, status: Status, level: Level, metric: Metric): V12 {
  if (status === 'Prospect') {
    // Prospect only exists in the hotel report. OCC isn't reported there, so
    // derive My Hotel OCC from RN ÷ inventory; CS/Market have no meaningful OCC.
    if (metric === 'OCC') return level === 'My Hotel' ? hotelOccFromRN(snapshot, 'Prospect') : N;
    if (!HOTEL_METRICS.includes(metric)) return N;
    const key = `${snapshot}|Prospect|${metric}` as HotelKey;
    return HOTEL_DATA[key] ?? N;
  }
  if (visual === 'V1' && level === 'My Hotel') {
    if (HOTEL_METRICS.includes(metric)) {
      const key = `${snapshot}|${status}|${metric}` as HotelKey;
      return HOTEL_DATA[key] ?? N;
    }
    // OCC derived from RN ÷ inventory; RevPAR isn't derivable from the hotel report alone.
    return metric === 'OCC' ? hotelOccFromRN(snapshot, status) : N;
  }
  if (!D360_METRICS.includes(metric)) return N;
  const key = `${snapshot}|${status}|${level}|${metric}` as D360Key;
  return D360_DATA[key] ?? N;
}
