// Mock data for the Utilities dashboard. Replace with a fetch() once a SQL
// query lands; nothing in page.tsx assumes these are literals — only the
// shape matters.

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const YEARS = ['2026', '2025', '2024'] as const;

export const HOTELS = ['Fort'] as const;

const PROPERTY = { name: 'Fort', id: '12345', rooms: 200 } as const;

// Days per month (non-leap; calendar drift doesn't matter for a mock).
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Available room-nights per month = rooms × days. Used as PAR denominator.
export const ROOMS_AVAILABLE: number[] = DAYS.map((d) => d * PROPERTY.rooms);

// Occupancy % by month with seasonality: low Jan/Feb, peak Jul/Aug, lift Dec.
// Annual average lands ~66%, in line with the stated 65% baseline.
const OCC_PCT = [0.55, 0.58, 0.62, 0.68, 0.72, 0.76, 0.78, 0.78, 0.65, 0.62, 0.60, 0.66];

// Occupied room-nights per month. POR denominator.
export const ROOMS_OCCUPIED: number[] = ROOMS_AVAILABLE.map((avail, i) =>
  Math.round(avail * OCC_PCT[i]),
);

// Average guests per occupied room — lower in winter (leisure singles +
// business travel), higher in summer (families).
const GUESTS_PER_ROOM = [1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.0, 1.8, 1.7, 1.6, 1.5];

// Guest-nights per month. GUEST denominator.
export const GUESTS: number[] = ROOMS_OCCUPIED.map((occ, i) =>
  Math.round(occ * GUESTS_PER_ROOM[i]),
);

export type Utility = 'water' | 'electricity' | 'gas' | 'others';

// Per-utility: monthly consumption in its native unit (m³ / kWh / liters),
// plus monthly cost in USD for current year, budget, and last year.
export type UtilitySeries = {
  consumption: number[];
  costCY: number[];
  costBudget: number[];
  costLY: number[];
};

// Water — m³. Stable usage with a small summer bump (pool top-ups, irrigation).
// Tariff ~ $4/m³.
export const WATER: UtilitySeries = {
  consumption: [1450, 1380, 1520, 1610, 1740, 1980, 2120, 2080, 1830, 1620, 1490, 1560],
  costCY:      [5800, 5520, 6080, 6440, 6960, 7920, 8480, 8320, 7320, 6480, 5960, 6240],
  costBudget:  [5500, 5500, 5800, 6200, 6700, 7600, 8100, 8100, 7100, 6300, 5800, 6100],
  costLY:      [5400, 5300, 5700, 6100, 6500, 7400, 7900, 7800, 7000, 6200, 5750, 6000],
};

// Electricity — kWh. Strong summer peak (AC) Jun–Aug. Tariff ~ $0.14/kWh.
export const ELECTRICITY: UtilitySeries = {
  consumption: [82000,  78000,  85000,  98000,  118000, 165000, 188000, 182000, 142000, 108000, 92000,  95000],
  costCY:      [11480,  10920,  11900,  13720,  16520,  23100,  26320,  25480,  19880,  15120,  12880,  13300],
  costBudget:  [11000,  10800,  11500,  13500,  16000,  22000,  25000,  24500,  19500,  15000,  12500,  13000],
  costLY:      [10900,  10700,  11400,  13300,  15800,  21800,  24700,  24300,  19300,  14800,  12400,  12900],
};

// Gas — liters. Winter peak (Dec–Feb) for heating + steady kitchen baseline.
// Tariff ~ $1.20/L.
export const GAS: UtilitySeries = {
  consumption: [11800, 10900, 9200, 7600, 6400, 5800, 5500, 5600, 6100, 7400, 9200, 11400],
  costCY:      [14160, 13080, 11040, 9120, 7680, 6960, 6600, 6720, 7320, 8880, 11040, 13680],
  costBudget:  [13500, 12800, 10800, 9000, 7700, 7000, 6700, 6800, 7400, 8900, 10900, 13200],
  costLY:      [13800, 12950, 10900, 9050, 7650, 6950, 6650, 6750, 7350, 8850, 10950, 13400],
};

// Others — catch-all for misc utilities (sewer, waste, recycling, misc).
// No native consumption unit, so consumption is left at zero. Tariff n/a.
export const OTHERS: UtilitySeries = {
  consumption: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  costCY:      [2600, 2480, 2550, 2700, 2820, 3050, 3180, 3120, 2900, 2720, 2600, 2780],
  costBudget:  [2500, 2500, 2600, 2700, 2800, 3000, 3100, 3100, 2900, 2700, 2600, 2700],
  costLY:      [2450, 2400, 2520, 2650, 2760, 2950, 3050, 3020, 2850, 2680, 2560, 2680],
};

export const UTILITIES: Record<Utility, UtilitySeries> = {
  water: WATER,
  electricity: ELECTRICITY,
  gas: GAS,
  others: OTHERS,
};

// Quanta brand palette (from globals.css): --primary → --accent →
// --accent-light. Same three values feed UTILITY_META and CHART_SERIES,
// so KPI accents and chart bars share one corporate palette.
export const UTILITY_META = {
  water:       { label: 'Water',       unit: 'm³',  color: '#172951' }, // --primary (navy)
  electricity: { label: 'Electricity', unit: 'kWh', color: '#00AFAD' }, // --accent (teal)
  gas:         { label: 'Gas',         unit: 'L',   color: '#69D9D0' }, // --accent-light
  others:      { label: 'Others',      unit: '—',   color: '#64748B' }, // slate (neutral)
} as const satisfies Record<Utility, { label: string; unit: string; color: string }>;
