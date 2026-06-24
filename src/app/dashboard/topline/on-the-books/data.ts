/**
 * Daily Segmentation Forecast — data access layer.
 *
 * Fetches from /api/otb/dataset (Postgres-backed) and exposes the same
 * accessor functions the page expects: getSegmentDaily, getGridDaily,
 * getSegmentSummary, getGroupDaily.
 *
 * Budget daily spread (CS curve + fallback) runs client-side — the API
 * delivers monthly budget + CS seasonality curves from the DB.
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

// ─── Types (stable exports — same as before) ───────────────────

export type TcSegment =
  | 'General Group' | 'Unsold Block' | 'General Retail' | 'Advance Purchase'
  | 'General Discount' | 'AAA' | 'AARP' | 'Government' | 'OTA Opaque'
  | 'Package-Promotion' | 'Consortia' | 'Corporate' | 'General Qualified'
  | 'General Wholesale' | 'Comp-Permanent-Other' | 'Crew-Contract';

export type SegmentKey = TcSegment | 'Total';
export const TOTAL_KEY = 'Total' as const;

export interface PropertyMeta { code: string; name: string; rooms: number }

export interface DailyPoint {
  date: string;
  actual2025: number;
  stly2025: number;
  actual2026: number;
  budget: number;
  isPace: boolean;
}

export interface SegmentSummary {
  segment: SegmentKey;
  actual2025Full: number;
  actual2026Ytd: number;
  actual2026Full: number;
  budgetFull: number;
  budgetYtd: number;
  hasBudget: boolean;
  usedFallbackCurve: boolean;
}

export interface GridDay {
  date: string;
  isPace: boolean;
  rn: number;
  rev: number;
  budgetRn: number;
  budgetRev: number;
  rnLy: number;
  revLy: number;
  rnStly: number;            // 2025 STLY room nights (D360, on the 2026 axis)
  stlyRev: number;           // STLY revenue (rooms_revenue - rev_change_vs_ly)
  csStlyRn: number;          // Comp Set STLY room nights
  csStlyRev: number;         // Comp Set STLY revenue
  pickupW: number | null;     // RN change vs last week (from D360)
  revPickupW: number | null;  // Revenue change vs last week (from D360)
  pickup4w: number | null;    // RN diff vs snapshot ~28 days ago
  revPickup4w: number | null; // Revenue diff vs snapshot ~28 days ago
}

// ─── API response shape ────────────────────────────────────────

interface OtbApiResponse {
  property: { code: string; name: string; capacity: number; capacityLy: number };
  properties: { code: string; name: string; capacity: number; capacityLy: number }[];
  asOf: string;
  snapshots: string[];
  segments: string[];
  dates2025: string[];
  dates2026: string[];
  actual2025: Record<string, number[]>;
  actual2026: Record<string, number[]>;
  stly2026: Record<string, number[]>;
  stlyRev2026: Record<string, number[]>;
  csStlyRn2026: Record<string, number[]>;
  csStlyRev2026: Record<string, number[]>;
  revenue2025: Record<string, number[]>;
  revenue2026: Record<string, number[]>;
  csRn2025: Record<string, number[]>;
  csRev2025: Record<string, number[]>;
  csTotal2025: number[];
  csRevTotal2025: number[];
  budgetTcM: Record<string, number[]>;
  budgetRevTcM: Record<string, number[]>;
  pickupLw2026: Record<string, number[]>;
  revPickupLw2026: Record<string, number[]>;
  pickup4w2026: Record<string, number[]> | null;
  pickup4wRev2026: Record<string, number[]> | null;
}

// ─── Budget spread (runs client-side, same logic as before) ────

const MIN_CURVE_TOTAL = 200;
const MIN_CURVE_NONZERO_DAYS = 90;

function selectCs(
  seg: string,
  csRn: Record<string, number[]>,
  csTotal: number[],
): { cs: number[]; usedFallback: boolean } {
  const daily = csRn[seg];
  if (!daily) return { cs: csTotal, usedFallback: true };
  const total = daily.reduce((a, b) => a + b, 0);
  const nonzero = daily.filter((v) => v > 0).length;
  if (total >= MIN_CURVE_TOTAL && nonzero >= MIN_CURVE_NONZERO_DAYS) return { cs: daily, usedFallback: false };
  return { cs: csTotal, usedFallback: true };
}

function selectCsRev(
  seg: string,
  csRev: Record<string, number[]>,
  csRevTotal: number[],
  rnUsedFallback: boolean,
): number[] {
  if (rnUsedFallback) return csRevTotal;
  const own = csRev[seg];
  if (!own || !own.some((v) => v > 0)) return csRevTotal;
  return own;
}

function spreadBudget(cs: number[], mBudget: number[], dates: string[]): number[] {
  const month: number[] = dates.map((d) => Number(d.slice(5, 7)) - 1);
  const mSum = new Array(12).fill(0);
  month.forEach((m, i) => { mSum[m] += cs[i]; });
  return dates.map((_, i) => { const m = month[i]; return mSum[m] ? (mBudget[m] * cs[i]) / mSum[m] : 0; });
}

// ─── Hook ──────────────────────────────────────────────────────

export interface OtbData {
  loading: boolean;
  AS_OF: string;
  TC_SEGMENTS: TcSegment[];
  CAPACITY_2025: number;
  CAPACITY_2026: number;
  DAYS_2026: number;
  YTD_DAYS_2026: number;
  PROPERTIES: PropertyMeta[];
  DEFAULT_PROPERTY: string;
  snapshots: string[];
  snapshot: string;
  setSnapshot: (s: string) => void;
  getSegmentDaily: (seg: SegmentKey) => DailyPoint[];
  getGridDaily: (seg: SegmentKey) => GridDay[];
  getGroupDaily: (segs: TcSegment[]) => DailyPoint[];
  getSegmentSummary: (seg: SegmentKey) => SegmentSummary;
}

const EMPTY_DAILY: DailyPoint[] = [];
const EMPTY_GRID: GridDay[] = [];
const EMPTY_SUMMARY: SegmentSummary = {
  segment: 'Total', actual2025Full: 0, actual2026Ytd: 0, actual2026Full: 0,
  budgetFull: 0, budgetYtd: 0, hasBudget: false, usedFallbackCurve: false,
};

export function useOtbData(propertyCode: string, enabled = true): OtbData {
  const [data, setData] = useState<OtbApiResponse | null>(null);
  const [properties, setProperties] = useState<PropertyMeta[]>([]);
  const [loading, setLoading] = useState(true);
  // Selected weekly snapshot (null = latest). Lets the Monthly board view a prior week.
  const [snapshot, setSnapshot] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const url = `/api/otb/dataset?property=${encodeURIComponent(propertyCode)}${snapshot ? `&snapshot=${encodeURIComponent(snapshot)}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) { if (!cancelled) setLoading(false); return; }
        const json = await res.json();
        if (!cancelled) {
          if (json.properties) {
            setProperties(json.properties.map((p: { code: string; name: string; capacity: number }) => ({ code: p.code, name: p.name, rooms: p.capacity })));
          }
          if (json.property) setData(json as OtbApiResponse);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [propertyCode, snapshot, enabled]);

  // Derived values from the fetched dataset
  const derived = useMemo(() => {
    if (!data) return null;

    const { segments, dates2025, dates2026, actual2025, actual2026, stly2026,
      stlyRev2026, csStlyRn2026, csStlyRev2026,
      revenue2025, revenue2026, csRn2025, csRev2025, csTotal2025, csRevTotal2025,
      budgetTcM, budgetRevTcM, pickupLw2026, pickup4w2026,
      revPickupLw2026, pickup4wRev2026, asOf } = data;

    const tcSegments = segments as TcSegment[];

    // Precompute totals (sum across all segments per day)
    const total2025 = dates2025.map((_, i) => tcSegments.reduce((acc, s) => acc + (actual2025[s]?.[i] ?? 0), 0));
    const total2026 = dates2026.map((_, i) => tcSegments.reduce((acc, s) => acc + (actual2026[s]?.[i] ?? 0), 0));
    const totalStly = dates2026.map((_, i) => tcSegments.reduce((acc, s) => acc + (stly2026[s]?.[i] ?? 0), 0));
    const totalRevStly = dates2026.map((_, i) => tcSegments.reduce((acc, s) => acc + (stlyRev2026[s]?.[i] ?? 0), 0));
    const totalRev2025 = dates2025.map((_, i) => tcSegments.reduce((acc, s) => acc + (revenue2025[s]?.[i] ?? 0), 0));
    const totalRev2026 = dates2026.map((_, i) => tcSegments.reduce((acc, s) => acc + (revenue2026[s]?.[i] ?? 0), 0));
    const totalBudgetM = Array.from({ length: 12 }, (_, m) => tcSegments.reduce((acc, s) => acc + (budgetTcM[s]?.[m] ?? 0), 0));
    const totalBudgetRevM = Array.from({ length: 12 }, (_, m) => tcSegments.reduce((acc, s) => acc + (budgetRevTcM[s]?.[m] ?? 0), 0));

    // CS curve selection + budget spread per segment (cached)
    const segBudgetRn: Record<string, number[]> = {};
    const segBudgetRev: Record<string, number[]> = {};
    const segFallback: Record<string, boolean> = {};

    for (const s of tcSegments) {
      const { cs, usedFallback } = selectCs(s, csRn2025, csTotal2025);
      segFallback[s] = usedFallback;
      segBudgetRn[s] = spreadBudget(cs, budgetTcM[s] ?? new Array(12).fill(0), dates2026);
      const csRev = selectCsRev(s, csRev2025, csRevTotal2025, usedFallback);
      segBudgetRev[s] = spreadBudget(csRev, budgetRevTcM[s] ?? new Array(12).fill(0), dates2026);
    }

    // Total budget spread
    const totalBudgetDailyRn = spreadBudget(csTotal2025, totalBudgetM, dates2026);
    const totalBudgetDailyRev = spreadBudget(csRevTotal2025, totalBudgetRevM, dates2026);

    return {
      tcSegments, dates2025, dates2026, asOf,
      actual2025, actual2026, stly2026, stlyRev2026, csStlyRn2026, csStlyRev2026,
      revenue2025, revenue2026,
      total2025, total2026, totalStly, totalRevStly, totalRev2025, totalRev2026,
      totalBudgetM, totalBudgetRevM, totalBudgetDailyRn, totalBudgetDailyRev,
      budgetTcM, budgetRevTcM,
      segBudgetRn, segBudgetRev, segFallback,
      csTotal2025, csRevTotal2025, csRn2025, csRev2025,
      pickupLw2026, pickup4w2026, revPickupLw2026, pickup4wRev2026,
    };
  }, [data]);

  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

  const getSegmentDaily = useCallback((seg: SegmentKey): DailyPoint[] => {
    if (!derived) return EMPTY_DAILY;
    const { dates2026, actual2025, actual2026, stly2026, asOf, tcSegments,
      total2025, total2026, totalStly, totalBudgetDailyRn, segBudgetRn } = derived;
    const isTotal = seg === TOTAL_KEY;
    const a2025 = isTotal ? total2025 : actual2025[seg];
    const a2026 = isTotal ? total2026 : actual2026[seg];
    const stly = isTotal ? totalStly : stly2026[seg];
    const budgetDaily = isTotal ? totalBudgetDailyRn : segBudgetRn[seg];
    if (!a2025 || !a2026) return EMPTY_DAILY;
    return dates2026.map((date, i) => ({
      date,
      actual2025: a2025[i] ?? 0,
      stly2025: stly?.[i] ?? 0,
      actual2026: a2026[i] ?? 0,
      budget: budgetDaily?.[i] ?? 0,
      isPace: date > asOf,
    }));
  }, [derived]);

  const getGridDaily = useCallback((seg: SegmentKey): GridDay[] => {
    if (!derived) return EMPTY_GRID;
    const { dates2026, actual2025, actual2026, stly2026, revenue2025, revenue2026, asOf,
      total2025, total2026, totalStly, totalRevStly, totalRev2025, totalRev2026,
      totalBudgetDailyRn, totalBudgetDailyRev, segBudgetRn, segBudgetRev,
      csTotal2025, csRevTotal2025, csRn2025, csRev2025,
      stlyRev2026, csStlyRn2026, csStlyRev2026,
      pickupLw2026, pickup4w2026, revPickupLw2026, pickup4wRev2026 } = derived;
    const isTotal = seg === TOTAL_KEY;
    const tcSegs = derived.tcSegments;
    const rn26 = isTotal ? total2026 : actual2026[seg];
    const rn25 = isTotal ? total2025 : actual2025[seg];
    const rnStlyArr = isTotal ? totalStly : stly2026[seg];
    const rev26 = isTotal ? totalRev2026 : revenue2026[seg];
    const rev25 = isTotal ? totalRev2025 : revenue2025[seg];
    const budRn = isTotal ? totalBudgetDailyRn : segBudgetRn[seg];
    const budRev = isTotal ? totalBudgetDailyRev : segBudgetRev[seg];
    // STLY revenue & CS STLY: for Total, sum across all segments per day
    const sRevArr = isTotal ? totalRevStly : (stlyRev2026[seg] ?? null);
    const csStlyRnArr = isTotal
      ? dates2026.map((_, i) => tcSegs.reduce((acc, s) => acc + (csStlyRn2026[s]?.[i] ?? 0), 0))
      : (csStlyRn2026[seg] ?? null);
    const csStlyRevArr = isTotal
      ? dates2026.map((_, i) => tcSegs.reduce((acc, s) => acc + (csStlyRev2026[s]?.[i] ?? 0), 0))
      : (csStlyRev2026[seg] ?? null);
    // Pickups: for Total, sum across all segments per day
    const lwArr = isTotal
      ? (pickupLw2026 ? dates2026.map((_, i) => tcSegs.reduce((acc, s) => acc + (pickupLw2026[s]?.[i] ?? 0), 0)) : null)
      : (pickupLw2026?.[seg] ?? null);
    const p4wArr = isTotal
      ? (pickup4w2026 ? dates2026.map((_, i) => tcSegs.reduce((acc, s) => acc + (pickup4w2026[s]?.[i] ?? 0), 0)) : null)
      : (pickup4w2026?.[seg] ?? null);
    const revLwArr = isTotal
      ? (revPickupLw2026 ? dates2026.map((_, i) => tcSegs.reduce((acc, s) => acc + (revPickupLw2026[s]?.[i] ?? 0), 0)) : null)
      : (revPickupLw2026?.[seg] ?? null);
    const revP4wArr = isTotal
      ? (pickup4wRev2026 ? dates2026.map((_, i) => tcSegs.reduce((acc, s) => acc + (pickup4wRev2026[s]?.[i] ?? 0), 0)) : null)
      : (pickup4wRev2026?.[seg] ?? null);
    if (!rn26) return EMPTY_GRID;
    return dates2026.map((date, i) => ({
      date,
      isPace: date > asOf,
      rn: rn26[i] ?? 0,
      rev: rev26?.[i] ?? 0,
      budgetRn: budRn?.[i] ?? 0,
      budgetRev: budRev?.[i] ?? 0,
      rnLy: rn25?.[i] ?? 0,
      revLy: rev25?.[i] ?? 0,
      rnStly: rnStlyArr?.[i] ?? 0,
      stlyRev: sRevArr?.[i] ?? 0,
      csStlyRn: csStlyRnArr?.[i] ?? 0,
      csStlyRev: csStlyRevArr?.[i] ?? 0,
      pickupW: lwArr?.[i] ?? null,
      revPickupW: revLwArr?.[i] ?? null,
      pickup4w: p4wArr?.[i] ?? null,
      revPickup4w: revP4wArr?.[i] ?? null,
    }));
  }, [derived]);

  const getSegmentSummary = useCallback((seg: SegmentKey): SegmentSummary => {
    if (!derived) return { ...EMPTY_SUMMARY, segment: seg };
    const { dates2026, actual2025, actual2026, asOf, tcSegments,
      total2025, total2026, totalBudgetDailyRn, totalBudgetM,
      budgetTcM, segBudgetRn, segFallback } = derived;
    const isTotal = seg === TOTAL_KEY;
    const a2025 = isTotal ? total2025 : actual2025[seg];
    const a2026 = isTotal ? total2026 : actual2026[seg];
    const budgetDaily = isTotal ? totalBudgetDailyRn : segBudgetRn[seg];
    const mBudget = isTotal ? totalBudgetM : (budgetTcM[seg] ?? new Array(12).fill(0));
    if (!a2025 || !a2026) return { ...EMPTY_SUMMARY, segment: seg };
    const budgetAnnual = mBudget.reduce((a, b) => a + b, 0);
    const ytdFn = (dates: string[], a: number[]) => dates.reduce((acc, d, i) => acc + (d <= asOf ? a[i] : 0), 0);
    return {
      segment: seg,
      actual2025Full: sum(a2025),
      actual2026Ytd: ytdFn(dates2026, a2026),
      actual2026Full: sum(a2026),
      budgetFull: budgetAnnual,
      budgetYtd: ytdFn(dates2026, budgetDaily ?? []),
      hasBudget: budgetAnnual > 0,
      usedFallbackCurve: isTotal ? false : (segFallback[seg] ?? false),
    };
  }, [derived]);

  const getGroupDaily = useCallback((segs: TcSegment[]): DailyPoint[] => {
    if (!derived) return EMPTY_DAILY;
    const parts = segs.map((s) => getSegmentDaily(s));
    if (parts.length === 0 || parts[0].length === 0) return EMPTY_DAILY;
    return derived.dates2026.map((date, i) => ({
      date,
      actual2025: parts.reduce((a, p) => a + (p[i]?.actual2025 ?? 0), 0),
      stly2025: parts.reduce((a, p) => a + (p[i]?.stly2025 ?? 0), 0),
      actual2026: parts.reduce((a, p) => a + (p[i]?.actual2026 ?? 0), 0),
      budget: parts.reduce((a, p) => a + (p[i]?.budget ?? 0), 0),
      isPace: date > derived.asOf,
    }));
  }, [derived, getSegmentDaily]);

  return {
    loading: enabled ? loading : false,
    AS_OF: data?.asOf ?? '',
    TC_SEGMENTS: (data?.segments ?? []) as TcSegment[],
    CAPACITY_2025: data?.property.capacityLy ?? 0,
    CAPACITY_2026: data?.property.capacity ?? 0,
    DAYS_2026: data?.dates2026.length ?? 365,
    YTD_DAYS_2026: data ? data.dates2026.filter((d) => d <= data.asOf).length : 0,
    PROPERTIES: properties,
    DEFAULT_PROPERTY: data?.property.code ?? '',
    snapshots: data?.snapshots ?? [],
    snapshot: snapshot ?? data?.asOf ?? '',
    setSnapshot,
    getSegmentDaily,
    getGridDaily,
    getGroupDaily,
    getSegmentSummary,
  };
}
