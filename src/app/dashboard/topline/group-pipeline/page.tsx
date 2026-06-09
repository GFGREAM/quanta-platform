'use client';
import { useState, useMemo, useEffect, useCallback, useRef, Fragment } from 'react';
import { Star, RefreshCw, Maximize2, ChevronRight, ChevronDown, Download } from 'lucide-react';
import {
  METRICS,
  STATUSES,
  LEVELS,
  MONTHS,
  PROPERTIES,
  BASELINE_LABELS,
  HOTEL_METRICS,
  D360_METRICS,
  getProperty,
  getSnapshots,
  getSnapshotDates,
  getYears,
  getInventory,
  getBaselines,
  getSeries,
  getGrowthAnalysis,
  GROWTH_STATUSES,
  GROWTH_METRICS,
  type Snapshot,
  type Metric,
  type Status,
  type Level,
  type Visual,
  type Baseline,
  type GrowthDelta,
  type GrowthRow,
  type GrowthAnalysis,
} from './data';


type Sums = { sum: number; count: number };

function fmt(value: number | null, metric: Metric): string {
  if (value === null || value === undefined) return '';
  if (value === 0) return '';
  if (metric === 'OCC') return `${(value * 100).toFixed(1)}%`;
  if (metric === 'ADR' || metric === 'RevPAR') {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  if (metric === 'REV') {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  // RN, BKGS
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// Total/Average per-row based on metric semantics:
// RN, REV, BKGS -> SUM
// ADR, RevPAR -> AVG (of non-null months)
// OCC -> AVG (of non-null months)
function rowAggregate(series: (number | null)[], metric: Metric): number | null {
  const nonNull = series.filter((v): v is number => v !== null && v !== undefined);
  if (nonNull.length === 0) return null;
  if (metric === 'RN' || metric === 'REV' || metric === 'BKGS') {
    return nonNull.reduce((a, b) => a + b, 0);
  }
  return nonNull.reduce((a, b) => a + b, 0) / nonNull.length;
}

function aggregateLabel(metric: Metric): string {
  if (metric === 'RN' || metric === 'REV' || metric === 'BKGS') return 'Total';
  return 'Avg';
}

function statusLabel(status: Status): string {
  return status.toUpperCase();
}

// "Snap-May-18" → "May 18". Year is dropped to keep selectors and headers compact.
// Takes the property's snapshot→date map (snapshot sets differ per property).
function snapLabel(dates: Record<string, string>, s: Snapshot): string {
  const d = dates[s];
  if (!d) return s;
  const [, mm, dd] = d.split('-');
  return `${MONTHS[Number(mm) - 1]} ${Number(dd)}`;
}

// Calendar month index (0–11) of the selected Week — the YTD / ROY boundary:
// YTD = months 0..idx (inclusive, "Year To Date"), ROY = months idx+1..11
// ("Rest Of Year"). Same index used for the Prospect growth elapsed/future split.
function weekMonthIndex(dates: Record<string, string>, s: Snapshot): number {
  const d = dates[s];
  return d ? Number(d.split('-')[1]) - 1 : 0;
}

export default function GroupPipelinePage() {
  const [propertyCode, setPropertyCode] = useState<string>(PROPERTIES[0].code);
  const [year, setYear] = useState<number>(getYears(PROPERTIES[0].code)[0]);
  const [visual, setVisual] = useState<Visual>('V1');
  const [view, setView] = useState<'Summary' | 'Expanded'>('Summary');
  // Snapshot defaults seeded from the initial property: latest week / first week.
  const [snapshot, setSnapshot] = useState<Snapshot>(() => {
    const s = getSnapshots(PROPERTIES[0].code);
    return s[s.length - 1];
  });
  const [fromSnap, setFromSnap] = useState<Snapshot>(() => getSnapshots(PROPERTIES[0].code)[0]);
  const [metric, setMetric] = useState<Metric>('RN');
  const [baseline, setBaseline] = useState<Baseline>('Budget');
  // Growth Analysis section (inside the matrix). Compact keeps it light (three
  // actionable deltas per status); Expanded adds vs Avg / vs Start + base rows.
  const [growthExpanded, setGrowthExpanded] = useState(false);
  const [weighted, setWeighted] = useState(true);
  // Conversion "To" is always the Matrix snapshot — same point-in-time as what
  // the rest of the page is showing — so it doesn't need its own control.
  const toSnap = snapshot;
  const [isFavorite, setIsFavorite] = useState(false);

  // Property-scoped lookups derived from the selected property/year.
  const prop = useMemo(() => getProperty(propertyCode), [propertyCode]);
  const snapshots = useMemo(() => getSnapshots(propertyCode), [propertyCode]);
  const snapDates = useMemo(() => getSnapshotDates(propertyCode), [propertyCode]);
  const inventory = useMemo(() => getInventory(propertyCode), [propertyCode]);
  const years = useMemo(() => getYears(propertyCode), [propertyCode]);
  const baselines = useMemo(() => getBaselines(propertyCode, year), [propertyCode, year]);
  const series = useCallback(
    (v: Visual, snap: Snapshot, status: Status, level: Level, m: Metric) =>
      getSeries(propertyCode, year, v, snap, status, level, m),
    [propertyCode, year]
  );

  // When the property changes, reset week/from-week to its snapshots and the year
  // to its first available year (snapshot sets and years differ per property).
  useEffect(() => {
    const s = getSnapshots(propertyCode);
    setSnapshot(s[s.length - 1]);
    setFromSnap(s[0]);
    setYear(getYears(propertyCode)[0]);
  }, [propertyCode]);

  // Available metrics depend on which sources are mixed in current visual.
  // To keep things consistent, always show all 6 metrics; cells without data show "—".
  const visibleMetrics = METRICS;

  // Build all 9 cells once per render (3 statuses × 3 levels), with 12-month series each.
  // Weighted mode rescales CS/Market RN to MyHotel inventory:
  //   weighted CS/Market RN[m] = inventory[m] × OCC_level_status[m]
  // Only applies to RN metric and Tentative/Definite (Prospect doesn't have D360 OCC).
  // Memoized so it stays referentially stable as a useMemo dep below.
  const visibleLevels = useMemo<Level[]>(() => (view === 'Summary' ? ['My Hotel'] : LEVELS), [view]);

  // Prospect reference series for the matrix backfill, metric-aware:
  //   prospectBaseMetric — per-month average of the selected metric across the
  //   period's base weeks (From→Week, excluding the Week, weeks that reported a
  //   prospect i.e. RN > 0). Used to backfill the elapsed/closed months of the
  //   "Prospect All" matrix row.
  const prospectExtras = useMemo(() => {
    const fromIdx = snapshots.indexOf(fromSnap);
    const toIdx = snapshots.indexOf(toSnap);
    const period = snapshots.slice(Math.min(fromIdx, toIdx), Math.max(fromIdx, toIdx) + 1);
    const baseWeeks = period.filter((s) => s !== toSnap);
    const weeksForBase = baseWeeks.length > 0 ? baseWeeks : period;

    const prospectBaseMetric = MONTHS.map((_, i) => {
      const reported = weeksForBase
        .map((s) => ({
          rn: series(visual, s, 'Prospect', 'My Hotel', 'RN')[i] ?? 0,
          m: series(visual, s, 'Prospect', 'My Hotel', metric)[i],
        }))
        .filter((x) => x.rn > 0 && x.m !== null && x.m !== undefined)
        .map((x) => x.m as number);
      return reported.length > 0 ? reported.reduce((a, b) => a + b, 0) / reported.length : null;
    });

    return { prospectBaseMetric };
  }, [visual, metric, fromSnap, toSnap, snapshots, series]);

  const rows = useMemo(() => {
    return STATUSES.flatMap((status) =>
      visibleLevels.map((level) => {
        let cells = series(visual, snapshot, status, level, metric);
        if (
          weighted &&
          metric === 'RN' &&
          (level === 'Comp Set' || level === 'Market') &&
          status !== 'Prospect'
        ) {
          const occ = series(visual, snapshot, status, level, 'OCC');
          cells = inventory.map((inv, i) => {
            const o = occ[i];
            return o === null || o === undefined ? null : inv * o;
          }) as typeof cells;
        }
        // Prospect All: closed/elapsed months (where My Hotel reports no Prospect at
        // the Week — RN === 0 because the month already passed) carry no live data at
        // the Week. We backfill them with the period average (Prospect base) for the
        // month. The peak ("max") figure is no longer shown here — it lives in the
        // dedicated "Prospect max" row of the growth section. Open months keep the
        // Week's live data.
        if (status === 'Prospect' && level === 'My Hotel') {
          const weekRN = series(visual, snapshot, 'Prospect', 'My Hotel', 'RN');
          cells = cells.map((v, i) =>
            (weekRN[i] ?? 0) === 0 ? prospectExtras.prospectBaseMetric[i] : v
          ) as typeof cells;
        }
        return { status, level, series: cells };
      })
    );
  }, [visual, snapshot, metric, weighted, visibleLevels, series, inventory, snapshots, prospectExtras]);

  // Combined row: Tentative + Definite per level (per month).
  // Null cells are treated as 0 when at least one of the two has a value;
  // both-null stays null so the cell renders "—".
  const combinedRows = useMemo(() => {
    return visibleLevels.map((level) => {
      const tent = rows.find((r) => r.status === 'Tentative' && r.level === level)?.series ?? [];
      const def = rows.find((r) => r.status === 'Definite' && r.level === level)?.series ?? [];
      const series = MONTHS.map((_, i) => {
        const t = tent[i];
        const d = def[i];
        if ((t === null || t === undefined) && (d === null || d === undefined)) return null;
        return (t ?? 0) + (d ?? 0);
      });
      return { status: 'Booked' as const, level, series };
    });
  }, [rows, visibleLevels]);

  // Conversion section (rendered as another group inside the matrix table):
  // how much of MyHotel's Prospects materialized as Tentative + Definite between
  // fromSnap and toSnap, month by month. CS/Market only appear when Weighted ON is
  // active — without scaling to MyHotel inventory their RN aren't comparable to the
  // Prospect base.
  //   Shared denominator: AVG of Prospect MyHotel RN across the weekly snapshots
  //                       in the period, EXCLUDING the final Week (toSnap) and
  //                       counting only weeks that reported prospects for that month
  //                       (RN > 0). Prospects are forward-looking demand, so the base
  //                       is the pool over the weeks leading up to — but not including
  //                       — the Week at which we measure the converted Tent+Def; and
  //                       closed months (0 in later weeks) must not dilute the mean.
  //                       Falls back to the lone week if the period is a single snapshot.
  //   MyHotel numerator:   max(0, Δ(Tent + Def) MyHotel RN)
  //   CS/Market numerator: INV × max(0, Δ(OCC_Tent + OCC_Def)_level)  (Weighted ON)
  const conversion = useMemo(() => {
    // Weeks that fall inside the selected period, regardless of selector order.
    const fromIdx = snapshots.indexOf(fromSnap);
    const toIdx = snapshots.indexOf(toSnap);
    const periodSnaps = snapshots.slice(Math.min(fromIdx, toIdx), Math.max(fromIdx, toIdx) + 1);
    // Drop the Week itself; keep the weeks before it as the convertible base.
    const baseWeeks = periodSnaps.filter((s) => s !== toSnap);
    const weeksForBase = baseWeeks.length > 0 ? baseWeeks : periodSnaps;
    // Per-month average of the Prospect base, counting ONLY the weeks that actually
    // reported prospects for that month (RN > 0). Months that already closed report
    // 0 in later weeks; including those zeros would dilute the average (e.g. Feb
    // would divide across 5 weeks instead of the 2 that really had Feb prospects).
    const prospectBase = MONTHS.map((_, i) => {
      const reported = weeksForBase
        .map((s) => series(visual, s, 'Prospect', 'My Hotel', 'RN')[i] ?? 0)
        .filter((v) => v > 0);
      return reported.length > 0 ? reported.reduce((a, b) => a + b, 0) / reported.length : 0;
    });

    const out: { level: Level; ratios: (number | null)[]; deltaRN: number[] }[] = [];

    // MyHotel — Δ(Tent + Def) in actual RN.
    const myTentFrom = series(visual, fromSnap, 'Tentative', 'My Hotel', 'RN').map((v) => v ?? 0);
    const myDefFrom = series(visual, fromSnap, 'Definite', 'My Hotel', 'RN').map((v) => v ?? 0);
    const myTentTo = series(visual, toSnap, 'Tentative', 'My Hotel', 'RN').map((v) => v ?? 0);
    const myDefTo = series(visual, toSnap, 'Definite', 'My Hotel', 'RN').map((v) => v ?? 0);
    const myDelta = myTentFrom.map((_, i) =>
      Math.max(0, myTentTo[i] + myDefTo[i] - (myTentFrom[i] + myDefFrom[i]))
    );
    out.push({
      level: 'My Hotel',
      ratios: prospectBase.map((p, i) => (p > 0 ? myDelta[i] / p : null)),
      deltaRN: myDelta,
    });

    // CS / Market — only under Weighted ON and the Expanded view.
    if (weighted && view === 'Expanded') {
      for (const lv of ['Comp Set', 'Market'] as Level[]) {
        const occT_from = series(visual, fromSnap, 'Tentative', lv, 'OCC').map((v) => v ?? 0);
        const occD_from = series(visual, fromSnap, 'Definite', lv, 'OCC').map((v) => v ?? 0);
        const occT_to = series(visual, toSnap, 'Tentative', lv, 'OCC').map((v) => v ?? 0);
        const occD_to = series(visual, toSnap, 'Definite', lv, 'OCC').map((v) => v ?? 0);
        const deltaRN = inventory.map((inv, i) =>
          inv * Math.max(0, occT_to[i] + occD_to[i] - (occT_from[i] + occD_from[i]))
        );
        const ratios = prospectBase.map((p, i) => (p > 0 ? deltaRN[i] / p : null));
        out.push({ level: lv, ratios, deltaRN });
      }
    }
    return { rows: out, prospectBase };
  }, [visual, fromSnap, toSnap, weighted, view, series, inventory, snapshots]);

  // Pick-up between fromSnap and toSnap — raw Δ (can be negative if a bucket shrunk).
  // Prospect is shown as Δ MyHotel Prospect RN; MyHotel/CS/Market are Δ(Tent+Def) RN.
  // CS/Market only render under Weighted ON (otherwise their raw RN aren't comparable
  // to MyHotel-scale figures, same rule as the Conversion ratios).
  const pickUp = useMemo(() => {
    const seriesFor = (s: Snapshot, st: Status, lv: Level, m: Metric) =>
      series(visual, s, st, lv, m).map((v) => v ?? 0);

    const pFrom = seriesFor(fromSnap, 'Prospect', 'My Hotel', 'RN');
    const pTo = seriesFor(toSnap, 'Prospect', 'My Hotel', 'RN');
    // A month is "closed" when My Hotel reports no Prospect at the Week (pTo === 0,
    // because the month already passed). Those would otherwise show an artificial
    // negative pick-up (0 − pFrom) that inflates the variation, so we blank them
    // out (0 → empty). Only open/future months, where a prospect pool still exists
    // at the Week, show the real Δ pick-up.
    const prospect = pTo.map((v, i) => (v === 0 ? 0 : v - pFrom[i]));

    const tdDelta = (lv: Level) => {
      const tFrom = seriesFor(fromSnap, 'Tentative', lv, 'RN');
      const dFrom = seriesFor(fromSnap, 'Definite', lv, 'RN');
      const tTo = seriesFor(toSnap, 'Tentative', lv, 'RN');
      const dTo = seriesFor(toSnap, 'Definite', lv, 'RN');
      return tTo.map((_, i) => tTo[i] + dTo[i] - tFrom[i] - dFrom[i]);
    };
    const tdDeltaWeighted = (lv: Level) => {
      const oTFrom = seriesFor(fromSnap, 'Tentative', lv, 'OCC');
      const oDFrom = seriesFor(fromSnap, 'Definite', lv, 'OCC');
      const oTTo = seriesFor(toSnap, 'Tentative', lv, 'OCC');
      const oDTo = seriesFor(toSnap, 'Definite', lv, 'OCC');
      return inventory.map((inv, i) => inv * (oTTo[i] + oDTo[i] - oTFrom[i] - oDFrom[i]));
    };

    const rows: { label: string; series: number[] }[] = [
      { label: 'Prospect', series: prospect },
      { label: 'My Hotel', series: tdDelta('My Hotel') },
    ];
    if (weighted && view === 'Expanded') {
      rows.push({ label: 'Comp Set', series: tdDeltaWeighted('Comp Set') });
      rows.push({ label: 'Market', series: tdDeltaWeighted('Market') });
    }
    return rows;
  }, [visual, fromSnap, toSnap, weighted, view, series, inventory]);

  // My Hotel actual (on-the-books = Tentative + Definite) vs the selected baseline
  // (Budget / LY / Forecast). Always reads the Hotel source (V1 My Hotel) so REV is
  // available regardless of the selected visual; uses the Matrix snapshot for the
  // on-the-books actuals. ADR isn't additive, so it's recomputed as REV ÷ RN
  // (blended for the Total). Baselines left blank (all null) render empty rows and
  // blank variance — nothing is invented from a missing baseline.
  const budgetComparison = useMemo(() => {
    const base = baselines[baseline];
    const tentRN = series('V1', snapshot, 'Tentative', 'My Hotel', 'RN');
    const defRN = series('V1', snapshot, 'Definite', 'My Hotel', 'RN');
    const tentREV = series('V1', snapshot, 'Tentative', 'My Hotel', 'REV');
    const defREV = series('V1', snapshot, 'Definite', 'My Hotel', 'REV');

    const bookedRN = MONTHS.map((_, i) => (tentRN[i] ?? 0) + (defRN[i] ?? 0));
    const bookedREV = MONTHS.map((_, i) => (tentREV[i] ?? 0) + (defREV[i] ?? 0));
    const bookedADR = MONTHS.map((_, i) => (bookedRN[i] > 0 ? bookedREV[i] / bookedRN[i] : null));

    const sum = (arr: (number | null)[]) => arr.reduce<number>((s, v) => s + (v ?? 0), 0);
    // Null when the baseline has no values at all (blank LY / Forecast) so the Total
    // column stays empty instead of collapsing to 0.
    const sumOrNull = (arr: (number | null)[]) => {
      const vals = arr.filter((v): v is number => v !== null && v !== undefined);
      return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
    };
    // YTD / ROY boundary at the selected Week's month.
    const splitIdx = weekMonthIndex(snapDates, snapshot);

    // Aggregate actual / baseline / variance over a month range [lo, hi). ADR isn't
    // additive, so it's blended as REV ÷ RN over the range; RN/REV simply sum.
    const rangeAgg = (
      metric: 'RN' | 'ADR' | 'REV',
      actual: (number | null)[],
      budget: (number | null)[],
      lo: number,
      hi: number
    ) => {
      let a: number | null;
      let b: number | null;
      if (metric === 'ADR') {
        const rnA = sum(bookedRN.slice(lo, hi));
        const revA = sum(bookedREV.slice(lo, hi));
        a = rnA > 0 ? revA / rnA : null;
        const rnB = sumOrNull(base.RN.slice(lo, hi));
        const revB = sumOrNull(base.REV.slice(lo, hi));
        b = rnB && rnB > 0 && revB !== null ? revB / rnB : null;
      } else {
        a = sum(actual.slice(lo, hi));
        b = sumOrNull(budget.slice(lo, hi));
      }
      const v = a === null || b === null ? null : a - b;
      return { a, b, v };
    };

    const build = (metric: 'RN' | 'ADR' | 'REV', actual: (number | null)[]) => {
      const budget = base[metric];
      const variance = MONTHS.map((_, i) => {
        const a = actual[i];
        const b = budget[i];
        // No baseline value (blank) → no variance.
        if (b === null || b === undefined) return null;
        // ADR variance only where both sides carry a rate.
        if (metric === 'ADR') return a === null || a === undefined || !b ? null : a - b;
        return (a ?? 0) - b;
      });
      const tot = rangeAgg(metric, actual, budget, 0, MONTHS.length);
      const ytd = rangeAgg(metric, actual, budget, 0, splitIdx + 1);
      const roy = rangeAgg(metric, actual, budget, splitIdx + 1, MONTHS.length);
      return {
        metric,
        actual,
        budget,
        variance,
        actualTotal: tot.a, budgetTotal: tot.b, varianceTotal: tot.v,
        actualYtd: ytd.a, budgetYtd: ytd.b, varianceYtd: ytd.v,
        actualRoy: roy.a, budgetRoy: roy.b, varianceRoy: roy.v,
      };
    };

    return [build('RN', bookedRN), build('ADR', bookedADR), build('REV', bookedREV)];
  }, [snapshot, baseline, series, baselines, snapDates]);

  // Growth Analysis — five growth angles (vs 1W / 4W / Avg / Max / Start) for
  // Prospect and Definite, anchored at the selected Week. Hotel source, My Hotel.
  // Follows the page Metric selector when it's one of RN/ADR/REV/OCC; RevPAR and
  // BKGS aren't trackable across snapshots here, so they fall back to RN.
  const growthMetric: Metric = GROWTH_METRICS.includes(metric) ? metric : 'RN';
  const growthAnalysis = useMemo(
    () => getGrowthAnalysis(propertyCode, year, snapshot, growthMetric),
    [propertyCode, year, snapshot, growthMetric]
  );

  // ─── Export (both tables → PNG / PDF) ───────────────────────────────
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<null | 'png' | 'pdf'>(null);

  const visualLabel = visual === 'V1' ? 'Visual 1 · Operational reality' : 'Visual 2 · All under D360';
  const exportFileBase = () =>
    `group-pipeline-${visual}-${snapshot}-${metric}${weighted && metric === 'RN' ? '-weighted' : ''}-${new Date()
      .toISOString()
      .slice(0, 10)}`;

  // Render both tables to a PNG data URL. Horizontal scrollers are temporarily
  // expanded so the full width (12 months + totals) is captured, not just the
  // visible viewport — same approach as OpsRadar / ActionPlanTracker exports.
  const captureTables = async () => {
    const node = exportRef.current;
    if (!node) throw new Error('export node not mounted');
    const { toPng } = await import('html-to-image');
    const scrollers = Array.from(
      node.querySelectorAll<HTMLElement>('[class*="overflow-auto"],[class*="overflow-x-auto"]')
    );
    const prevOverflow = scrollers.map((el) => el.style.overflow);
    scrollers.forEach((el) => { el.style.overflow = 'visible'; });
    const width = Math.max(node.scrollWidth, node.clientWidth);
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        width,
        style: { width: `${width}px` },
      });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => { img.onload = () => resolve(null); img.onerror = reject; });
      return { dataUrl, width: img.width, height: img.height };
    } finally {
      scrollers.forEach((el, i) => { el.style.overflow = prevOverflow[i]; });
    }
  };

  const handleExportPng = async () => {
    if (exporting) return;
    setExporting('png');
    try {
      const { dataUrl } = await captureTables();
      const link = document.createElement('a');
      link.download = `${exportFileBase()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    if (exporting) return;
    setExporting('pdf');
    try {
      const { dataUrl, width, height } = await captureTables();
      const { default: JsPDF } = await import('jspdf');
      // Image px (already at pixelRatio 2) → pt. Page is sized to the image so
      // the tables stay readable instead of being shrunk onto a fixed A4.
      const pxToPt = 72 / 96 / 2;
      const margin = 24;
      const imgW = width * pxToPt;
      const imgH = height * pxToPt;
      const pageW = imgW + margin * 2;
      const pageH = imgH + margin * 2;
      const pdf = new JsPDF({
        orientation: pageW >= pageH ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [pageW, pageH],
      });
      pdf.addImage(dataUrl, 'PNG', margin, margin, imgW, imgH);
      pdf.save(`${exportFileBase()}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Top Line</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--primary)' }}>Group Pipeline</span>
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--primary)' }}>Group Pipeline</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {prop.name}{prop.amadeusId ? <span className="opacity-60"> · Amadeus {prop.amadeusId}</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPng}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-60 disabled:cursor-wait"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            title="Download both tables as a PNG image"
          >
            <Download size={13} /> {exporting === 'png' ? 'Generating…' : 'PNG'}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-60 disabled:cursor-wait"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            title="Download both tables as a PDF"
          >
            <Download size={13} /> {exporting === 'pdf' ? 'Generating…' : 'PDF'}
          </button>
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Favorite"
          >
            <Star size={18} fill={isFavorite ? 'var(--accent)' : 'none'} color={isFavorite ? 'var(--accent)' : 'var(--text-secondary)'} />
          </button>
          <button className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors" aria-label="Refresh">
            <RefreshCw size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors" aria-label="Fullscreen">
            <Maximize2 size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* Visual tabs */}
      <div className="flex items-center gap-2 mb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <TabButton active={visual === 'V1'} onClick={() => setVisual('V1')} title="Operational reality: Hotel for My Hotel (Tent/Def), D360 for CS/Market">
          Visual 1 · Operational reality
        </TabButton>
        <TabButton active={visual === 'V2'} onClick={() => setVisual('V2')} title="All under D360: My Hotel/CS/Market aligned to the D360 lens (except Prospect, which only exists in Hotel)">
          Visual 2 · All under D360
        </TabButton>
      </div>

      <div
        className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-white px-3 py-2.5 text-sm"
        style={{ borderColor: 'var(--border)' }}
      >
        <ControlSelect label="Property" value={propertyCode} onChange={(v) => setPropertyCode(v)}>
          {PROPERTIES.map((p) => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
        </ControlSelect>
        <SegToggle
          label=""
          value={view}
          onChange={(v) => setView(v as 'Summary' | 'Expanded')}
          options={['Summary', 'Expanded']}
        />
        <ControlSelect label="Week" value={snapshot} onChange={(v) => setSnapshot(v as Snapshot)}>
          {snapshots.map((s) => (
            <option key={s} value={s}>{snapLabel(snapDates, s)}</option>
          ))}
        </ControlSelect>
        <ControlSelect label="From Week" value={fromSnap} onChange={(v) => setFromSnap(v as Snapshot)}>
          {snapshots.map((s) => <option key={s} value={s}>{snapLabel(snapDates, s)}</option>)}
        </ControlSelect>
        <ControlSelect label="Metric" value={metric} onChange={(v) => setMetric(v as Metric)}>
          {visibleMetrics.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </ControlSelect>
        <ControlSelect label="Year" value={String(year)} onChange={(v) => setYear(Number(v))}>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </ControlSelect>
        <button
          onClick={() => setWeighted(!weighted)}
          disabled={metric !== 'RN'}
          title={
            metric === 'RN'
              ? 'Rescales CS/Market to your MyHotel inventory (equivalent RN)'
              : 'Only applies to the RN metric'
          }
          className="px-3 py-1.5 rounded-md border text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            borderColor: weighted && metric === 'RN' ? 'var(--accent)' : 'var(--border)',
            backgroundColor: weighted && metric === 'RN' ? 'var(--primary)' : 'white',
            color: weighted && metric === 'RN' ? 'white' : 'var(--text-secondary)',
          }}
        >
          Weighted {weighted && metric === 'RN' ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Both tables wrapped together so PNG / PDF export captures them as one visual */}
      <div ref={exportRef} className="bg-white">
        {/* Export caption — gives the downloaded image/PDF standalone context */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 pb-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--primary)' }}>Group Pipeline</span>
          <span className="opacity-50">·</span><span>{prop.name}</span>
          <span className="opacity-50">·</span><span>{visualLabel}</span>
          <span className="opacity-50">·</span><span>Week {snapLabel(snapDates, snapshot)}</span>
          <span className="opacity-50">·</span><span>Metric {metric}{weighted && metric === 'RN' ? ' · Weighted (INV×OCC)' : ''}</span>
        </div>

      {/* Matrix table */}
      <div
        className="bg-white rounded-xl border overflow-auto"
        style={{ borderColor: 'var(--border)' }}
      >
        <table className="w-full text-sm table-fixed">
          <GridColGroup />
          <thead>
            <tr style={{ backgroundColor: 'var(--muted)' }}>
              <th className="sticky left-0 z-10 text-left font-medium px-3 py-2" style={{ backgroundColor: 'var(--muted)', color: 'var(--text-secondary)' }}>
                Level
              </th>
              {MONTHS.map((m) => (
                <th key={m} className="text-right font-medium px-2 py-2 min-w-[68px]" style={{ color: 'var(--text-secondary)' }}>
                  {m}
                </th>
              ))}
              <th className="text-right font-semibold px-2 py-2" style={{ color: 'var(--text-secondary)' }} title="Year To Date (through the selected Week's month)">
                YTD
              </th>
              <th className="text-right font-semibold px-2 py-2" style={{ color: 'var(--text-secondary)' }} title="Rest Of Year (months after the selected Week's month)">
                ROY
              </th>
              <th className="text-right font-semibold px-3 py-2 min-w-[80px]" style={{ color: 'var(--primary)' }}>
                {aggregateLabel(metric)}
              </th>
            </tr>
          </thead>
          <tbody>
            {STATUSES.map((status) => (
              <StatusGroup
                key={status}
                status={status}
                rows={
                  status === 'Prospect'
                    ? rows.filter((r) => r.status === 'Prospect' && r.level === 'My Hotel')
                    : rows.filter((r) => r.status === status)
                }
                metric={metric}
                splitIdx={weekMonthIndex(snapDates, snapshot)}
                isLast={false}
              />
            ))}
            <CombinedGroup rows={combinedRows} metric={metric} splitIdx={weekMonthIndex(snapDates, snapshot)} />
            <GrowthAnalysisGroup
              data={growthAnalysis}
              metric={growthMetric}
              splitIdx={weekMonthIndex(snapDates, snapshot)}
              snapDates={snapDates}
              expanded={growthExpanded}
              onToggle={() => setGrowthExpanded((e) => !e)}
            />
            <PickUpGroup rows={pickUp} fromSnap={fromSnap} toSnap={toSnap} splitIdx={weekMonthIndex(snapDates, snapshot)} snapDates={snapDates} />
            <ConversionLevelsGroup
              rows={conversion.rows}
              prospectBase={conversion.prospectBase}
              splitIdx={weekMonthIndex(snapDates, snapshot)}
              fromSnap={fromSnap}
              toSnap={toSnap}
              snapDates={snapDates}
            />
          </tbody>
        </table>
      </div>

      {/* My Hotel vs baseline (Budget / LY / Forecast) — separate table below the matrix */}
      <div className="mt-3">
        <BudgetComparison
          snapshot={snapshot}
          metrics={budgetComparison}
          baseline={baseline}
          onBaselineChange={setBaseline}
          snapDates={snapDates}
        />
      </div>

      </div>

      {/* Footnotes */}
      <div className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <p>
          <sup>¹</sup> <b>Prospect</b>: only in the Hotel&apos;s internal report (Demand360 doesn&apos;t track it).
          Represents <i>in-market demand</i> that may materialize at any property — shown as a single row
          since the source doesn&apos;t split it across Comp Set / Market.
        </p>
        <p className="mt-1">
          <sup>²</sup> For D360, <b>ADR/REV/RevPAR</b> in Comp Set and Market may show as 0 or empty for future months
          (Amadeus releases the figure once the month closes). <b>BKGS</b> is only available in Snap-Feb and Snap-Mar (the hotel&apos;s extended format).
        </p>
        <p className="mt-1">
          <sup>³</sup> <b>Growth Analysis</b>: Δ = (Week − base) ÷ base per month. Bases: previous snapshot (<b>1W</b>),
          snapshot closest to 28 days back (<b>4W</b>), average / peak across all snapshots up to the Week (<b>Avg</b> / <b>Max</b>),
          and the first snapshot of the year (<b>Start</b>). <i>new</i> = appeared from zero; “—” = closed month (−100%) or no base to compare.
        </p>
        {!HOTEL_METRICS.includes(metric) && !D360_METRICS.includes(metric) && (
          <p className="mt-1 text-orange-600">Metric not available in any source.</p>
        )}
        {metric === 'REV' && (
          <p className="mt-1">Note: <b>REV</b> is only available in the Hotel source. CS/Market in Tentative/Definite will be empty under Visual 1, and everything under Visual 2 except the Prospect row.</p>
        )}
        {metric === 'OCC' && (
          <p className="mt-1">Note: <b>OCC</b>. In <b>Visual 1</b>, <i>My Hotel</i> OCC is computed as <code>RN ÷ inventory</code> ({prop.rooms} rooms × days in month), because the hotel report doesn&apos;t report OCC; <i>Comp Set</i> and <i>Market</i> come from D360. In <b>Visual 2</b>, My Hotel uses the OCC reported by D360. In <b>Prospect</b>, only My Hotel shows OCC (derived); Comp Set/Market stay empty.</p>
        )}
        {metric === 'RevPAR' && (
          <p className="mt-1">Note: <b>RevPAR</b> is only available in the D360 source. The Prospect row will be empty.</p>
        )}
        {metric === 'BKGS' && (
          <p className="mt-1">Note: <b>BKGS</b> is only available in the Hotel source and only in Snap-Feb and Snap-Mar.</p>
        )}
        {weighted && metric === 'RN' && (
          <p className="mt-1">Note: <b>Weighted</b>: CS/Market RN rescaled to MyHotel inventory ({prop.rooms} rooms) as <code>OCC × INV</code>.</p>
        )}
      </div>

    </div>
  );
}

// ─── Growth Analysis group ───────────────────────────────────────────
// Rendered inside the matrix table (replaces the old "Growth vs max value"
// section): five growth angles for Prospect / Definite, anchored at the
// selected Week (Hotel source, My Hotel level). Compact keeps the visual light
// — only the weekly pulse (vs 1W), monthly trend (vs 4W) and distance to peak
// (vs Max) — while Expanded adds vs Avg / vs Start plus the muted base rows.
const GROWTH_DELTA_DEFS: {
  key: keyof GrowthRow['deltas'];
  base: keyof GrowthRow['bases'];
  label: string;
  title: string;
  compact: boolean;
}[] = [
  { key: 'vs1w', base: 'weekAgo', label: 'vs 1W', title: 'Weekly pulse — vs the previous snapshot', compact: true },
  { key: 'vs4w', base: 'fourWAgo', label: 'vs 4W', title: 'Monthly trend — vs the snapshot closest to 28 days back', compact: true },
  { key: 'vsAvg', base: 'avg', label: 'vs Avg', title: 'Vs the average across all snapshots up to the Week (inclusive)', compact: false },
  { key: 'vsMax', base: 'max', label: 'vs Max', title: 'Distance to the historical peak across all snapshots up to the Week', compact: true },
  { key: 'vsStart', base: 'start', label: 'vs Start', title: 'Vs the first snapshot of the year', compact: false },
];

const GROWTH_BASE_DEFS: { key: 'avg' | 'max' | 'start'; label: string }[] = [
  { key: 'avg', label: 'Avg base · all weeks' },
  { key: 'max', label: 'Max base · all weeks' },
  { key: 'start', label: 'Start base' },
];

function GrowthAnalysisGroup({
  data,
  metric,
  splitIdx,
  snapDates,
  expanded,
  onToggle,
}: {
  data: GrowthAnalysis;
  metric: Metric;
  splitIdx: number;
  snapDates: Record<string, string>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const refLabel = (s: Snapshot | null) => (s ? snapLabel(snapDates, s) : '—');
  const refFor = (key: keyof GrowthRow['deltas']): Snapshot | null =>
    key === 'vs1w' ? data.refSnaps.weekAgo
    : key === 'vs4w' ? data.refSnaps.fourWAgo
    : key === 'vsStart' ? data.refSnaps.start
    : null;
  const defs = GROWTH_DELTA_DEFS.filter((d) => expanded || d.compact);

  // Range aggregate (YTD / ROY / Total): blended (ΣActual − ΣBase) / ΣBase over
  // the slice, with the same zero rules as the per-month deltas.
  const rangeDelta = (rows: GrowthRow[], base: keyof GrowthRow['bases'], lo: number, hi: number): GrowthDelta => {
    const slice = rows.slice(lo, hi);
    if (slice.length === 0 || slice.every((r) => r.bases[base] === null)) return null;
    const sActual = slice.reduce((s, r) => s + r.actual, 0);
    const sBase = slice.reduce((s, r) => s + (r.bases[base] ?? 0), 0);
    if (sBase === 0) return sActual > 0 ? 'new' : null;
    return Math.round(((sActual - sBase) / sBase) * 1000) / 10;
  };

  return (
    <>
      <tr>
        <td
          colSpan={MONTHS.length + 4}
          className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold border-t"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--primary)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <span>
              GROWTH ANALYSIS
              <span className="ml-2 font-normal normal-case opacity-70">
                {metric} · 1W {refLabel(data.refSnaps.weekAgo)} · 4W {refLabel(data.refSnaps.fourWAgo)} · Start {refLabel(data.refSnaps.start)}
              </span>
            </span>
            <button
              onClick={onToggle}
              className="px-2 py-0.5 rounded border text-[10px] font-medium normal-case tracking-normal transition-colors hover:bg-white"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: expanded ? 'white' : 'transparent' }}
              title={expanded ? 'Back to the three key deltas' : 'Show all five deltas plus the Avg / Max / Start base values'}
            >
              {expanded ? '− Compact' : '+ Expanded'}
            </button>
          </div>
        </td>
      </tr>
      {GROWTH_STATUSES.map((status) => {
        const rows = data.rows.filter((r) => r.status === status);
        return (
          <Fragment key={status}>
            <tr className="border-t" style={{ borderColor: 'var(--border)' }}>
              <td
                colSpan={MONTHS.length + 4}
                className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold bg-white"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span className="pl-2">{statusLabel(status)}</span>
              </td>
            </tr>
            {defs.map((d) => {
              const ref = refFor(d.key);
              return (
                <tr key={d.key} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td
                    className="sticky left-0 z-10 px-3 py-2 bg-white cursor-help"
                    style={{ color: 'var(--primary)' }}
                    title={`${d.title}${ref ? ` (${refLabel(ref)})` : ''}. Δ = (Week − base) ÷ base.`}
                  >
                    <span className="pl-2">
                      Δ {d.label}
                      {ref && <span className="text-[11px] opacity-60"> · {refLabel(ref)}</span>}
                    </span>
                  </td>
                  {rows.map((r, i) => (
                    <td key={i} className="text-right px-2 py-2 tabular-nums">
                      <GrowthDeltaCell value={r.deltas[d.key]} />
                    </td>
                  ))}
                  <td className="text-right px-2 py-2 tabular-nums">
                    <GrowthDeltaCell value={rangeDelta(rows, d.base, 0, splitIdx + 1)} />
                  </td>
                  <td className="text-right px-2 py-2 tabular-nums">
                    <GrowthDeltaCell value={rangeDelta(rows, d.base, splitIdx + 1, MONTHS.length)} />
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums">
                    <GrowthDeltaCell value={rangeDelta(rows, d.base, 0, MONTHS.length)} />
                  </td>
                </tr>
              );
            })}
            {expanded &&
              GROWTH_BASE_DEFS.map((b) => {
                if (rows.every((r) => r.bases[b.key] === null)) return null;
                const values = rows.map((r) => r.bases[b.key]);
                const label = b.key === 'start' ? `Start base · ${refLabel(data.refSnaps.start)}` : b.label;
                return (
                  <tr key={b.key} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="sticky left-0 z-10 px-3 py-2 bg-white" style={{ color: 'var(--text-secondary)' }}>
                      <span className="pl-2 italic">{label}</span>
                    </td>
                    {values.map((v, i) => (
                      <td key={i} className="text-right px-2 py-2 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {fmt(v, metric)}
                      </td>
                    ))}
                    <td className="text-right px-2 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {fmt(rowAggregate(values.slice(0, splitIdx + 1), metric), metric)}
                    </td>
                    <td className="text-right px-2 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {fmt(rowAggregate(values.slice(splitIdx + 1), metric), metric)}
                    </td>
                    <td className="text-right px-3 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {fmt(rowAggregate(values, metric), metric)}
                    </td>
                  </tr>
                );
              })}
          </Fragment>
        );
      })}
    </>
  );
}

// Delta cell — plain colored text keeps the section light; only the extremes
// (> +10% strong green, < −50% red) get a background pill. 'new' = appeared
// from zero (accent badge); −100% = the month closed and the pool emptied.
function GrowthDeltaCell({ value }: { value: GrowthDelta }) {
  if (value === null) {
    return <span style={{ color: 'var(--text-secondary)' }} />;
  }
  if (value === 'new') {
    return (
      <span
        className="inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider"
        style={{ color: 'var(--accent)', background: 'rgba(0, 175, 173, 0.12)' }}
        title="New — appeared at the Week with no base to compare against"
      >
        new
      </span>
    );
  }
  if (value === -100) {
    return (
      <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }} title="Month closed — the pool emptied; not applicable">
        —
      </span>
    );
  }
  if (value > 10) {
    return (
      <span
        className="inline-block px-2 py-0.5 rounded-sm font-bold tabular-nums -mr-2"
        style={{ color: 'var(--success)', background: 'rgba(16, 185, 129, 0.18)' }}
      >
        +{value.toFixed(1)}%
      </span>
    );
  }
  if (value < -50) {
    return (
      <span
        className="inline-block px-2 py-0.5 rounded-sm font-bold tabular-nums -mr-2"
        style={{ color: 'var(--danger)', background: VAR_BG_BAD }}
      >
        {value.toFixed(1)}%
      </span>
    );
  }
  // Mild moves stay as plain text: green 0..+10, amber −50..−10, faded amber −10..0.
  const color = value >= 0 ? 'var(--success)' : 'var(--warning)';
  const faded = value < 0 && value >= -10;
  return (
    <span className="font-medium tabular-nums" style={{ color, opacity: faded ? 0.75 : 1 }}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

// Prospect → (Tent+Def) conversion, relocated below the Pick-up section. Renders all
// levels (My Hotel, and Comp Set / Market under Expanded + Weighted). Same ratio data
// as computed in the Conversion memo; standalone with its own header so the figures
// keep their context.
function ConversionLevelsGroup({
  rows,
  prospectBase,
  splitIdx,
  fromSnap,
  toSnap,
  snapDates,
}: {
  rows: { level: Level; ratios: (number | null)[]; deltaRN: number[] }[];
  prospectBase: number[];
  splitIdx: number;
  fromSnap: Snapshot;
  toSnap: Snapshot;
  snapDates: Record<string, string>;
}) {
  if (rows.length === 0) return null;
  // Ratio over a month range: Σ Δ(Tent+Def) ÷ Σ Prospect base, both summed on the slice.
  const ratioRange = (deltaRN: number[], lo: number, hi: number) => {
    const sumDelta = deltaRN.slice(lo, hi).reduce((a, b) => a + b, 0);
    const sumB = prospectBase.slice(lo, hi).reduce((a, b) => a + b, 0);
    return sumB > 0 ? sumDelta / sumB : null;
  };
  const overallRatio = (deltaRN: number[]) => ratioRange(deltaRN, 0, MONTHS.length);
  return (
    <>
      <tr>
        <td
          colSpan={MONTHS.length + 4}
          className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold border-t"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--primary)', borderColor: 'var(--border)' }}
        >
          PROSPECT → (TENT + DEF) CONVERSION
          <span className="ml-2 font-normal normal-case opacity-70">
            {snapLabel(snapDates, fromSnap)} → {snapLabel(snapDates, toSnap)}
          </span>
        </td>
      </tr>
      {rows.map((row) => (
        <tr key={row.level} className="border-t" style={{ borderColor: 'var(--border)' }}>
          <td className="sticky left-0 z-10 px-3 py-2 bg-white" style={{ color: 'var(--primary)' }}>
            <span className="pl-2">{row.level}</span>
          </td>
          {row.ratios.map((v, i) => (
            <td
              key={i}
              className="text-right px-2 py-2 tabular-nums"
              style={{ color: v === null ? 'var(--text-secondary)' : 'var(--primary)' }}
            >
              {fmtPct(v)}
            </td>
          ))}
          <td className="text-right px-2 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {fmtPct(ratioRange(row.deltaRN, 0, splitIdx + 1))}
          </td>
          <td className="text-right px-2 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {fmtPct(ratioRange(row.deltaRN, splitIdx + 1, MONTHS.length))}
          </td>
          <td className="text-right px-3 py-2 font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>
            {fmtPct(overallRatio(row.deltaRN))}
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Pick-up group ──────────────────────────────────────────────────
// Raw Δ in RN between fromSnap and toSnap, per source.
// Prospect = Δ MyHotel Prospect RN; My Hotel/CS/Market = Δ(Tent+Def) RN.
// Negative cells (a bucket shrunk) render in red so the read stays honest.
function PickUpGroup({
  rows,
  fromSnap,
  toSnap,
  splitIdx,
  snapDates,
}: {
  rows: { label: string; series: number[] }[];
  fromSnap: Snapshot;
  toSnap: Snapshot;
  splitIdx: number;
  snapDates: Record<string, string>;
}) {
  const sumRange = (arr: number[], lo: number, hi: number) => arr.slice(lo, hi).reduce((a, b) => a + b, 0);
  return (
    <>
      <tr>
        <td
          colSpan={MONTHS.length + 4}
          className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold border-t"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--primary)', borderColor: 'var(--border)' }}
        >
          PICK-UP (RN)
          <span className="ml-2 font-normal normal-case opacity-70">
            {snapLabel(snapDates, fromSnap)} → {snapLabel(snapDates, toSnap)}
          </span>
        </td>
      </tr>
      {rows.map((row) => {
        const ytd = sumRange(row.series, 0, splitIdx + 1);
        const roy = sumRange(row.series, splitIdx + 1, MONTHS.length);
        const total = row.series.reduce((a, b) => a + b, 0);
        return (
          <tr key={row.label} className="border-t" style={{ borderColor: 'var(--border)' }}>
            <td className="sticky left-0 z-10 px-3 py-2 bg-white" style={{ color: 'var(--primary)' }}>
              <span className="pl-2">{row.label}</span>
            </td>
            {row.series.map((v, i) => (
              <td key={i} className="text-right px-2 py-2 tabular-nums">
                <PickUpPill value={Math.round(v)} />
              </td>
            ))}
            <td className="text-right px-2 py-2 tabular-nums">
              <PickUpPill value={Math.round(ytd)} />
            </td>
            <td className="text-right px-2 py-2 tabular-nums">
              <PickUpPill value={Math.round(roy)} />
            </td>
            <td className="text-right px-3 py-2 tabular-nums">
              <PickUpPill value={Math.round(total)} />
            </td>
          </tr>
        );
      })}
    </>
  );
}

// Same look-and-feel as the Budget variance pill, but tuned for raw RN counts
// (no metric-specific formatting; 0 collapses to a dash).
function PickUpPill({ value }: { value: number }) {
  if (value === 0 || !Number.isFinite(value)) {
    return <span style={{ color: 'var(--text-secondary)' }} />;
  }
  const good = value > 0;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-sm font-semibold tabular-nums -mr-2"
      style={{ color: good ? 'var(--success)' : 'var(--danger)', background: good ? VAR_BG_GOOD : VAR_BG_BAD }}
    >
      {good ? '+' : '-'}{fmtNum(Math.abs(value))}
    </span>
  );
}

function fmtNum(v: number): string {
  if (v === 0) return '';
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtPct(value: number | null): string {
  if (value === null || value === undefined || !isFinite(value)) return '';
  if (value === 0) return '';
  return `${(value * 100).toFixed(1)}%`;
}

// Shared column grid so the matrix and the Budget table line up month-for-month.
// Both tables use `table-fixed` + this <colgroup>, so column widths are identical
// regardless of content width (variance pills, large REV figures, etc.).
const COL_LABEL_W = 210;
const COL_MONTH_W = 80;
const COL_TOTAL_W = 92;

function GridColGroup() {
  return (
    <colgroup>
      <col style={{ width: COL_LABEL_W }} />
      {MONTHS.map((m) => (
        <col key={m} style={{ width: COL_MONTH_W }} />
      ))}
      <col style={{ width: COL_TOTAL_W }} />
      <col style={{ width: COL_TOTAL_W }} />
      <col style={{ width: COL_TOTAL_W }} />
    </colgroup>
  );
}

// ─── My Hotel vs Budget 2026 ──────────────────────────────────────────
// Variance chips mirror the P&L / Expenses style: green = favorable (actual
// above budget — higher RN/ADR/REV is better), red = unfavorable.
const VAR_BG_GOOD = 'rgba(16, 185, 129, 0.10)'; // success @ 10%
const VAR_BG_BAD = 'rgba(239, 68, 68, 0.10)';   // danger @ 10%

// REV is shown in thousands (000s) to keep the columns compact and aligned with
// the matrix; RN/ADR use the standard formatter.
function fmtBudget(v: number | null, metric: 'RN' | 'ADR' | 'REV'): string {
  if (v === null || v === undefined) return '';
  if (v === 0) return '';
  if (metric === 'REV') return Math.round(v / 1000).toLocaleString('en-US');
  return fmt(v, metric);
}

function VarPill({ value, metric }: { value: number | null; metric: 'RN' | 'ADR' | 'REV' }) {
  if (value === null || value === 0 || !Number.isFinite(value)) {
    return <span style={{ color: 'var(--text-secondary)' }} />;
  }
  const good = value > 0; // higher is better for RN / ADR / REV
  // Negative margin cancels the pill's inner px-2 so its digits land at the
  // same right edge as the plain-number rows above (Actual / Budget).
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-sm font-semibold tabular-nums -mr-2"
      style={{ color: good ? 'var(--success)' : 'var(--danger)', background: good ? VAR_BG_GOOD : VAR_BG_BAD }}
    >
      {good ? '+' : '-'}{fmtBudget(Math.abs(value), metric)}
    </span>
  );
}

type BudgetMetricRow = {
  metric: 'RN' | 'ADR' | 'REV';
  actual: (number | null)[];
  budget: (number | null)[];
  variance: (number | null)[];
  actualTotal: number | null;
  budgetTotal: number | null;
  varianceTotal: number | null;
  actualYtd: number | null;
  budgetYtd: number | null;
  varianceYtd: number | null;
  actualRoy: number | null;
  budgetRoy: number | null;
  varianceRoy: number | null;
};

const BASELINE_OPTIONS: Baseline[] = ['Budget', 'LY', 'Forecast'];

function BudgetComparison({
  snapshot,
  metrics,
  baseline,
  onBaselineChange,
  snapDates,
}: {
  snapshot: Snapshot;
  metrics: BudgetMetricRow[];
  baseline: Baseline;
  onBaselineChange: (b: Baseline) => void;
  snapDates: Record<string, string>;
}) {
  const baselineLabel = BASELINE_LABELS[baseline];
  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <div className="px-4 py-3 border-b flex items-start justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>My Hotel vs {baselineLabel}</h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            On-the-books (Tentative + Definite) at {snapLabel(snapDates, snapshot)} vs {baselineLabel} · RN · ADR · REV (000s) — higher is better
          </p>
        </div>
        {/* Baseline selector — switches what the variance is measured against. */}
        <div className="inline-flex rounded-md border overflow-hidden shrink-0" style={{ borderColor: 'var(--border)' }}>
          {BASELINE_OPTIONS.map((opt, idx) => {
            const active = opt === baseline;
            return (
              <button
                key={opt}
                onClick={() => onBaselineChange(opt)}
                title={`Compare against ${BASELINE_LABELS[opt]}`}
                className={`px-3 py-1 text-xs transition-colors ${idx > 0 ? 'border-l' : ''}`}
                style={{
                  backgroundColor: active ? 'var(--primary)' : 'white',
                  color: active ? 'white' : 'var(--text-secondary)',
                  borderColor: 'var(--border)',
                }}
              >
                {opt === 'Budget' ? 'vs Budget' : opt === 'LY' ? 'vs Last Year' : 'vs Forecast'}
              </button>
            );
          })}
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm table-fixed">
          <GridColGroup />
          <thead>
            <tr style={{ backgroundColor: 'var(--muted)' }}>
              <th className="sticky left-0 z-10 text-left font-medium px-3 py-2" style={{ backgroundColor: 'var(--muted)', color: 'var(--text-secondary)' }}>Metric</th>
              {MONTHS.map((m) => (
                <th key={m} className="text-right font-medium px-2 py-2" style={{ color: 'var(--text-secondary)' }}>{m}</th>
              ))}
              <th className="text-right font-semibold px-2 py-2" style={{ color: 'var(--text-secondary)' }} title="Year To Date">YTD</th>
              <th className="text-right font-semibold px-2 py-2" style={{ color: 'var(--text-secondary)' }} title="Rest Of Year">ROY</th>
              <th className="text-right font-semibold px-3 py-2" style={{ color: 'var(--primary)' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row) => (
              <BudgetMetricGroup key={row.metric} row={row} baselineLabel={baselineLabel} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetMetricGroup({ row, baselineLabel }: { row: BudgetMetricRow; baselineLabel: string }) {
  const {
    metric, actual, budget, variance,
    actualTotal, budgetTotal, varianceTotal,
    actualYtd, budgetYtd, varianceYtd,
    actualRoy, budgetRoy, varianceRoy,
  } = row;
  return (
    <>
      <tr>
        <td
          colSpan={MONTHS.length + 4}
          className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold border-t"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--primary)', borderColor: 'var(--border)' }}
        >
          {metric === 'REV' ? 'REV · 000s' : metric}
        </td>
      </tr>
      <tr className="border-t" style={{ borderColor: 'var(--border)' }}>
        <td className="sticky left-0 z-10 px-3 py-2 bg-white" style={{ color: 'var(--primary)' }}><span className="pl-2">Actual (booked)</span></td>
        {actual.map((v, i) => (
          <td key={i} className="text-right px-2 py-2 tabular-nums" style={{ color: v === null ? 'var(--text-secondary)' : 'var(--primary)' }}>{fmtBudget(v, metric)}</td>
        ))}
        <td className="text-right px-2 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtBudget(actualYtd, metric)}</td>
        <td className="text-right px-2 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtBudget(actualRoy, metric)}</td>
        <td className="text-right px-3 py-2 font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>{fmtBudget(actualTotal, metric)}</td>
      </tr>
      <tr className="border-t" style={{ borderColor: 'var(--border)' }}>
        <td className="sticky left-0 z-10 px-3 py-2 bg-white" style={{ color: 'var(--text-secondary)' }}><span className="pl-2">{baselineLabel}</span></td>
        {budget.map((v, i) => (
          <td key={i} className="text-right px-2 py-2 tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtBudget(v, metric)}</td>
        ))}
        <td className="text-right px-2 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtBudget(budgetYtd, metric)}</td>
        <td className="text-right px-2 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtBudget(budgetRoy, metric)}</td>
        <td className="text-right px-3 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtBudget(budgetTotal, metric)}</td>
      </tr>
      <tr className="border-t" style={{ borderColor: 'var(--border)' }}>
        <td className="sticky left-0 z-10 px-3 py-2 bg-white" style={{ color: 'var(--primary)' }}><span className="pl-2">Variance</span></td>
        {variance.map((v, i) => (
          <td key={i} className="text-right px-2 py-2 tabular-nums"><VarPill value={v} metric={metric} /></td>
        ))}
        <td className="text-right px-2 py-2 tabular-nums"><VarPill value={varianceYtd} metric={metric} /></td>
        <td className="text-right px-2 py-2 tabular-nums"><VarPill value={varianceRoy} metric={metric} /></td>
        <td className="text-right px-3 py-2 tabular-nums"><VarPill value={varianceTotal} metric={metric} /></td>
      </tr>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function TabButton({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
        active ? 'font-semibold' : 'hover:opacity-80'
      }`}
      style={{
        color: active ? 'var(--primary)' : 'var(--text-secondary)',
        borderBottomColor: active ? 'var(--accent)' : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

function SegToggle({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="flex items-center gap-2">
      {label && (
        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      )}
      <div className="inline-flex rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {options.map((opt, idx) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`px-3 py-1.5 text-xs transition-colors ${idx > 0 ? 'border-l' : ''}`}
              style={{
                backgroundColor: active ? 'var(--primary)' : 'white',
                color: active ? 'white' : 'var(--text-secondary)',
                borderColor: 'var(--border)',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </label>
  );
}

function ControlSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none pl-3 pr-8 py-1.5 rounded-md border bg-white text-sm cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
        >
          {children}
        </select>
        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
      </div>
    </label>
  );
}

function StatusGroup({
  status,
  rows,
  metric,
  splitIdx,
  isLast,
}: {
  status: Status;
  rows: { status: Status; level: Level; series: (number | null)[] }[];
  metric: Metric;
  splitIdx: number;
  isLast: boolean;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={MONTHS.length + 4}
          className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold border-t"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--primary)', borderColor: 'var(--border)' }}
        >
          {statusLabel(status)}
          {status === 'Prospect' && <sup className="ml-1 font-normal opacity-70">1</sup>}
        </td>
      </tr>
      {rows.map((row) => {
        const ytd = rowAggregate(row.series.slice(0, splitIdx + 1), metric);
        const roy = rowAggregate(row.series.slice(splitIdx + 1), metric);
        const agg = rowAggregate(row.series, metric);
        return (
          <tr
            key={row.level}
            className="border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <td className="sticky left-0 z-10 px-3 py-2 bg-white" style={{ color: 'var(--primary)' }}>
              <span className="pl-2">{status === 'Prospect' ? 'Prospect All' : row.level}</span>
            </td>
            {row.series.map((v, i) => (
              <td
                key={i}
                className="text-right px-2 py-2 tabular-nums"
                style={{ color: v === null ? 'var(--text-secondary)' : 'var(--primary)' }}
              >
                {fmt(v, metric)}
              </td>
            ))}
            <td className="text-right px-2 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {fmt(ytd, metric)}
            </td>
            <td className="text-right px-2 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {fmt(roy, metric)}
            </td>
            <td className="text-right px-3 py-2 font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>
              {fmt(agg, metric)}
            </td>
          </tr>
        );
      })}
      {isLast && <tr><td colSpan={MONTHS.length + 2} className="border-t" style={{ borderColor: 'var(--border)' }} /></tr>}
    </>
  );
}

function CombinedGroup({
  rows,
  metric,
  splitIdx,
}: {
  rows: { level: Level; series: (number | null)[] }[];
  metric: Metric;
  splitIdx: number;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={MONTHS.length + 4}
          className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold border-t"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--primary)', borderColor: 'var(--border)' }}
        >
          TENTATIVE + DEFINITE
        </td>
      </tr>
      {rows.map((row) => {
        const ytd = rowAggregate(row.series.slice(0, splitIdx + 1), metric);
        const roy = rowAggregate(row.series.slice(splitIdx + 1), metric);
        const agg = rowAggregate(row.series, metric);
        return (
          <tr key={row.level} className="border-t" style={{ borderColor: 'var(--border)' }}>
            <td className="sticky left-0 z-10 px-3 py-2 bg-white font-semibold" style={{ color: 'var(--primary)' }}>
              <span className="pl-2">{row.level}</span>
            </td>
            {row.series.map((v, i) => (
              <td
                key={i}
                className="text-right px-2 py-2 tabular-nums font-semibold"
                style={{ color: v === null ? 'var(--text-secondary)' : 'var(--primary)' }}
              >
                {fmt(v, metric)}
              </td>
            ))}
            <td className="text-right px-2 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {fmt(ytd, metric)}
            </td>
            <td className="text-right px-2 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {fmt(roy, metric)}
            </td>
            <td className="text-right px-3 py-2 font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
              {fmt(agg, metric)}
            </td>
          </tr>
        );
      })}
    </>
  );
}
