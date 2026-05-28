'use client';
import { useState, useMemo, useRef } from 'react';
import { Star, RefreshCw, Maximize2, ChevronRight, ChevronDown, Download } from 'lucide-react';
import {
  SNAPSHOTS,
  SNAPSHOT_DATES,
  METRICS,
  STATUSES,
  LEVELS,
  MONTHS,
  PROPERTY,
  INVENTORY_2026,
  BUDGET_2026,
  HOTEL_METRICS,
  D360_METRICS,
  getSeries,
  type Snapshot,
  type Metric,
  type Status,
  type Level,
  type Visual,
} from './data';


type Sums = { sum: number; count: number };

function fmt(value: number | null, metric: Metric): string {
  if (value === null || value === undefined) return '—';
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

export default function GroupPipelinePage() {
  const [visual, setVisual] = useState<Visual>('V1');
  const [snapshot, setSnapshot] = useState<Snapshot>('Snap-May-18');
  const [metric, setMetric] = useState<Metric>('RN');
  const [weighted, setWeighted] = useState(false);
  const [fromSnap, setFromSnap] = useState<Snapshot>(SNAPSHOTS[0]);
  const [toSnap, setToSnap] = useState<Snapshot>(SNAPSHOTS[SNAPSHOTS.length - 1]);
  const [isFavorite, setIsFavorite] = useState(false);

  // Available metrics depend on which sources are mixed in current visual.
  // To keep things consistent, always show all 6 metrics; cells without data show "—".
  const visibleMetrics = METRICS;

  // Build all 9 cells once per render (3 statuses × 3 levels), with 12-month series each.
  // Weighted mode rescales CS/Market RN to MyHotel inventory:
  //   weighted CS/Market RN[m] = INVENTORY_2026[m] × OCC_level_status[m]
  // Only applies to RN metric and Tentative/Definite (Prospect doesn't have D360 OCC).
  const rows = useMemo(() => {
    return STATUSES.flatMap((status) =>
      LEVELS.map((level) => {
        let series = getSeries(visual, snapshot, status, level, metric);
        if (
          weighted &&
          metric === 'RN' &&
          (level === 'Comp Set' || level === 'Market') &&
          status !== 'Prospect'
        ) {
          const occ = getSeries(visual, snapshot, status, level, 'OCC');
          series = INVENTORY_2026.map((inv, i) => {
            const o = occ[i];
            return o === null || o === undefined ? null : inv * o;
          }) as typeof series;
        }
        return { status, level, series };
      })
    );
  }, [visual, snapshot, metric, weighted]);

  // Combined row: Tentative + Definite per level (per month).
  // Null cells are treated as 0 when at least one of the two has a value;
  // both-null stays null so the cell renders "—".
  const combinedRows = useMemo(() => {
    return LEVELS.map((level) => {
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
  }, [rows]);

  // Conversion section (rendered as another group inside the matrix table):
  // how much of MyHotel's Prospects at fromSnap materialized as Tentative + Definite
  // by toSnap, month by month. CS/Market only appear when Weighted ON is active —
  // without scaling to MyHotel inventory their RN aren't comparable to the Prospect base.
  //   Shared denominator: Prospect MyHotel RN at fromSnap
  //   MyHotel numerator:   max(0, Δ(Tent + Def) MyHotel RN)
  //   CS/Market numerator: INV × max(0, Δ(OCC_Tent + OCC_Def)_level)  (Weighted ON)
  const conversion = useMemo(() => {
    const prospectBase = getSeries(visual, fromSnap, 'Prospect', 'My Hotel', 'RN').map((v) => v ?? 0);

    const out: { level: Level; ratios: (number | null)[]; deltaRN: number[] }[] = [];

    // MyHotel — Δ(Tent + Def) in actual RN.
    const myTentFrom = getSeries(visual, fromSnap, 'Tentative', 'My Hotel', 'RN').map((v) => v ?? 0);
    const myDefFrom = getSeries(visual, fromSnap, 'Definite', 'My Hotel', 'RN').map((v) => v ?? 0);
    const myTentTo = getSeries(visual, toSnap, 'Tentative', 'My Hotel', 'RN').map((v) => v ?? 0);
    const myDefTo = getSeries(visual, toSnap, 'Definite', 'My Hotel', 'RN').map((v) => v ?? 0);
    const myDelta = myTentFrom.map((_, i) =>
      Math.max(0, myTentTo[i] + myDefTo[i] - (myTentFrom[i] + myDefFrom[i]))
    );
    out.push({
      level: 'My Hotel',
      ratios: prospectBase.map((p, i) => (p > 0 ? myDelta[i] / p : null)),
      deltaRN: myDelta,
    });

    // CS / Market — only when Weighted ON is active.
    if (weighted) {
      for (const lv of ['Comp Set', 'Market'] as Level[]) {
        const occT_from = getSeries(visual, fromSnap, 'Tentative', lv, 'OCC').map((v) => v ?? 0);
        const occD_from = getSeries(visual, fromSnap, 'Definite', lv, 'OCC').map((v) => v ?? 0);
        const occT_to = getSeries(visual, toSnap, 'Tentative', lv, 'OCC').map((v) => v ?? 0);
        const occD_to = getSeries(visual, toSnap, 'Definite', lv, 'OCC').map((v) => v ?? 0);
        const deltaRN = INVENTORY_2026.map((inv, i) =>
          inv * Math.max(0, occT_to[i] + occD_to[i] - (occT_from[i] + occD_from[i]))
        );
        const ratios = prospectBase.map((p, i) => (p > 0 ? deltaRN[i] / p : null));
        out.push({ level: lv, ratios, deltaRN });
      }
    }
    return { rows: out, prospectBase };
  }, [visual, fromSnap, toSnap, weighted]);

  // My Hotel actual (on-the-books = Tentative + Definite) vs Budget 2026.
  // Always reads the Hotel source (V1 My Hotel) so REV is available regardless of
  // the selected visual; uses the Matrix snapshot for the on-the-books actuals.
  // ADR isn't additive, so it's recomputed as REV ÷ RN (blended for the Total).
  const budgetComparison = useMemo(() => {
    const tentRN = getSeries('V1', snapshot, 'Tentative', 'My Hotel', 'RN');
    const defRN = getSeries('V1', snapshot, 'Definite', 'My Hotel', 'RN');
    const tentREV = getSeries('V1', snapshot, 'Tentative', 'My Hotel', 'REV');
    const defREV = getSeries('V1', snapshot, 'Definite', 'My Hotel', 'REV');

    const bookedRN = MONTHS.map((_, i) => (tentRN[i] ?? 0) + (defRN[i] ?? 0));
    const bookedREV = MONTHS.map((_, i) => (tentREV[i] ?? 0) + (defREV[i] ?? 0));
    const bookedADR = MONTHS.map((_, i) => (bookedRN[i] > 0 ? bookedREV[i] / bookedRN[i] : null));

    const sum = (arr: (number | null)[]) => arr.reduce<number>((s, v) => s + (v ?? 0), 0);
    const budgetRNTotal = sum(BUDGET_2026.RN);
    const budgetREVTotal = sum(BUDGET_2026.REV);
    const bookedRNTotal = sum(bookedRN);
    const bookedREVTotal = sum(bookedREV);

    const build = (metric: 'RN' | 'ADR' | 'REV', actual: (number | null)[]) => {
      const budget = BUDGET_2026[metric];
      const variance = MONTHS.map((_, i) => {
        const a = actual[i];
        const b = budget[i];
        // ADR variance only where both sides carry a rate.
        if (metric === 'ADR') return a === null || a === undefined || !b ? null : a - b;
        return (a ?? 0) - (b ?? 0);
      });
      const actualTotal =
        metric === 'ADR' ? (bookedRNTotal > 0 ? bookedREVTotal / bookedRNTotal : null) : sum(actual);
      const budgetTotal =
        metric === 'ADR' ? (budgetRNTotal > 0 ? budgetREVTotal / budgetRNTotal : null) : sum(budget);
      const varianceTotal =
        actualTotal === null || budgetTotal === null ? null : actualTotal - budgetTotal;
      return { metric, actual, budget, variance, actualTotal, budgetTotal, varianceTotal };
    };

    return [build('RN', bookedRN), build('ADR', bookedADR), build('REV', bookedREV)];
  }, [snapshot]);

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
            {PROPERTY.name} <span className="opacity-60">· Amadeus {PROPERTY.id}</span>
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

      {/* Controls — all filters consolidated at the top so both tables can be viewed together below */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm rounded-lg border px-3 py-3"
        style={{ borderColor: 'var(--border)', backgroundColor: 'white' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider font-semibold pr-1" style={{ color: 'var(--text-secondary)' }}>Matrix</span>
          <ControlSelect label="Snapshot" value={snapshot} onChange={(v) => setSnapshot(v as Snapshot)}>
            {SNAPSHOTS.map((s) => (
              <option key={s} value={s}>{s} ({SNAPSHOT_DATES[s]})</option>
            ))}
          </ControlSelect>
          <ControlSelect label="Metric" value={metric} onChange={(v) => setMetric(v as Metric)}>
            {visibleMetrics.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </ControlSelect>
          <ControlSelect label="Year" value="2026" onChange={() => {}}>
            <option value="2026">2026</option>
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
            Weighted (INV × OCC) {weighted && metric === 'RN' ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="h-6 border-l" style={{ borderColor: 'var(--border)' }} />
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider font-semibold pr-1" style={{ color: 'var(--text-secondary)' }}>Conversion</span>
          <ControlSelect label="From snap" value={fromSnap} onChange={(v) => setFromSnap(v as Snapshot)}>
            {SNAPSHOTS.map((s) => <option key={s} value={s}>{s} ({SNAPSHOT_DATES[s]})</option>)}
          </ControlSelect>
          <ControlSelect label="To snap" value={toSnap} onChange={(v) => setToSnap(v as Snapshot)}>
            {SNAPSHOTS.map((s) => <option key={s} value={s}>{s} ({SNAPSHOT_DATES[s]})</option>)}
          </ControlSelect>
        </div>
      </div>

      {weighted && metric === 'RN' && (
        <div
          className="rounded-md border px-3 py-2 mb-3 text-xs leading-relaxed"
          style={{ borderColor: 'var(--accent)', backgroundColor: '#F0FFFE', color: 'var(--primary)' }}
        >
          <b>Weighted ON:</b> Comp Set and Market in Tentative/Definite show <b>equivalent RN</b> against your
          inventory ({PROPERTY.rooms} rooms) — computed as <code>reported OCC × MyHotel INV</code>.
          MyHotel and Prospect stay unchanged.
        </div>
      )}

      {/* Both tables wrapped together so PNG / PDF export captures them as one visual */}
      <div ref={exportRef} className="bg-white">
        {/* Export caption — gives the downloaded image/PDF standalone context */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 pb-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--primary)' }}>Group Pipeline</span>
          <span className="opacity-50">·</span><span>{PROPERTY.name}</span>
          <span className="opacity-50">·</span><span>{visualLabel}</span>
          <span className="opacity-50">·</span><span>Snapshot {snapshot} ({SNAPSHOT_DATES[snapshot]})</span>
          <span className="opacity-50">·</span><span>Metric {metric}{weighted && metric === 'RN' ? ' · Weighted (INV×OCC)' : ''}</span>
        </div>

      {/* Matrix table */}
      <div
        className="bg-white rounded-xl border overflow-auto"
        style={{ borderColor: 'var(--border)' }}
      >
        <table className="w-full text-xs table-fixed">
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
                rows={rows.filter((r) => r.status === status)}
                metric={metric}
                isLast={false}
              />
            ))}
            <CombinedGroup rows={combinedRows} metric={metric} />
            <ConversionGroup
              rows={conversion.rows}
              prospectBase={conversion.prospectBase}
              fromSnap={fromSnap}
              toSnap={toSnap}
            />
          </tbody>
        </table>
      </div>

      {/* My Hotel vs Budget 2026 — separate table below the matrix */}
      <div className="mt-3">
        <BudgetComparison snapshot={snapshot} metrics={budgetComparison} />
      </div>
      </div>

      {/* Footnotes */}
      <div className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <p>
          <sup>¹</sup> <b>Prospect</b>: only in the Hotel&apos;s internal report (Demand360 doesn&apos;t track it).
          The <i>Comp Set</i> and <i>Market</i> rows under Prospect repeat the Hotel data —
          they represent <i>in-market demand</i> that may materialize at any property.
        </p>
        <p className="mt-1">
          <sup>²</sup> For D360, <b>ADR/REV/RevPAR</b> in Comp Set and Market may show as 0 or empty for future months
          (Amadeus releases the figure once the month closes). <b>BKGS</b> is only available in Snap-Feb and Snap-Mar (the hotel&apos;s extended format).
        </p>
        {!HOTEL_METRICS.includes(metric) && !D360_METRICS.includes(metric) && (
          <p className="mt-1 text-orange-600">Metric not available in any source.</p>
        )}
        {metric === 'REV' && (
          <p className="mt-1">Note: <b>REV</b> is only available in the Hotel source. CS/Market in Tentative/Definite will be empty under Visual 1, and everything under Visual 2 except the Prospect row.</p>
        )}
        {metric === 'OCC' && (
          <p className="mt-1">Note: <b>OCC</b>. In <b>Visual 1</b>, <i>My Hotel</i> OCC is computed as <code>RN ÷ inventory</code> ({PROPERTY.rooms} rooms × days in month), because the hotel report doesn&apos;t report OCC; <i>Comp Set</i> and <i>Market</i> come from D360. In <b>Visual 2</b>, My Hotel uses the OCC reported by D360. In <b>Prospect</b>, only My Hotel shows OCC (derived); Comp Set/Market stay empty.</p>
        )}
        {metric === 'RevPAR' && (
          <p className="mt-1">Note: <b>RevPAR</b> is only available in the D360 source. The Prospect row will be empty.</p>
        )}
        {metric === 'BKGS' && (
          <p className="mt-1">Note: <b>BKGS</b> is only available in the Hotel source and only in Snap-Feb and Snap-Mar.</p>
        )}
      </div>

    </div>
  );
}

// ─── Conversion group ────────────────────────────────────────────────
// Rendered as another section inside the matrix table: per-month conversion %
// per level, an overall % in the aggregate column, then the supporting RN rows
// (Prospect base = denominator, Δ(Tent+Def) = numerator).
function ConversionGroup({
  rows,
  prospectBase,
  fromSnap,
  toSnap,
}: {
  rows: { level: Level; ratios: (number | null)[]; deltaRN: number[] }[];
  prospectBase: number[];
  fromSnap: Snapshot;
  toSnap: Snapshot;
}) {
  const sumBase = prospectBase.reduce((a, b) => a + b, 0);
  const overallRatio = (deltaRN: number[]) => {
    const sumDelta = deltaRN.reduce((a, b) => a + b, 0);
    return sumBase > 0 ? sumDelta / sumBase : null;
  };
  return (
    <>
      <tr>
        <td
          colSpan={MONTHS.length + 2}
          className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold border-t"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--primary)', borderColor: 'var(--border)' }}
        >
          PROSPECT → (TENT + DEF) CONVERSION
          <span className="ml-2 font-normal normal-case opacity-70">
            {fromSnap.replace('Snap-', '')} → {toSnap.replace('Snap-', '')}
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
          <td className="text-right px-3 py-2 font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>
            {fmtPct(overallRatio(row.deltaRN))}
          </td>
        </tr>
      ))}
      {/* Supporting RN rows — the numerator/denominator behind each ratio. */}
      <tr className="border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}>
        <td className="sticky left-0 z-10 px-3 py-2 text-[11px] uppercase tracking-wider" style={{ backgroundColor: 'var(--muted)', color: 'var(--text-secondary)' }}>
          Prospect MyHotel base (RN)
        </td>
        {prospectBase.map((v, i) => (
          <td key={i} className="text-right px-2 py-2 tabular-nums text-[11px]" style={{ color: 'var(--text-secondary)' }}>{fmtNum(v)}</td>
        ))}
        <td className="text-right px-3 py-2 tabular-nums text-[11px]" style={{ color: 'var(--text-secondary)' }}>{fmtNum(sumBase)}</td>
      </tr>
      {rows.map((row) => (
        <tr key={`delta-${row.level}`} className="border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}>
          <td className="sticky left-0 z-10 px-3 py-2 text-[11px] uppercase tracking-wider" style={{ backgroundColor: 'var(--muted)', color: 'var(--text-secondary)' }}>
            Δ(Tent+Def) · {row.level} (RN)
          </td>
          {row.deltaRN.map((v, i) => (
            <td key={i} className="text-right px-2 py-2 tabular-nums text-[11px]" style={{ color: 'var(--text-secondary)' }}>{fmtNum(v)}</td>
          ))}
          <td className="text-right px-3 py-2 tabular-nums text-[11px]" style={{ color: 'var(--text-secondary)' }}>{fmtNum(row.deltaRN.reduce((a, b) => a + b, 0))}</td>
        </tr>
      ))}
    </>
  );
}

function fmtNum(v: number): string {
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtPct(value: number | null): string {
  if (value === null || value === undefined || !isFinite(value)) return '—';
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
  if (v === null || v === undefined) return '—';
  if (metric === 'REV') return Math.round(v / 1000).toLocaleString('en-US');
  return fmt(v, metric);
}

function VarPill({ value, metric }: { value: number | null; metric: 'RN' | 'ADR' | 'REV' }) {
  if (value === null || value === 0 || !Number.isFinite(value)) {
    return <span style={{ color: 'var(--text-secondary)' }}>{value === 0 ? fmtBudget(0, metric) : '—'}</span>;
  }
  const good = value > 0; // higher is better for RN / ADR / REV
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-sm font-semibold"
      style={{ color: good ? 'var(--success)' : 'var(--danger)', background: good ? VAR_BG_GOOD : VAR_BG_BAD }}
    >
      {good ? '+' : '-'}{fmtBudget(Math.abs(value), metric)}
    </span>
  );
}

type BudgetMetricRow = {
  metric: 'RN' | 'ADR' | 'REV';
  actual: (number | null)[];
  budget: number[];
  variance: (number | null)[];
  actualTotal: number | null;
  budgetTotal: number | null;
  varianceTotal: number | null;
};

function BudgetComparison({ snapshot, metrics }: { snapshot: Snapshot; metrics: BudgetMetricRow[] }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>My Hotel vs Budget 2026</h3>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          On-the-books (Tentative + Definite) at {snapshot} vs annual Budget · RN · ADR · REV (000s) — higher is better
        </p>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-xs table-fixed">
          <GridColGroup />
          <thead>
            <tr style={{ backgroundColor: 'var(--muted)' }}>
              <th className="sticky left-0 z-10 text-left font-medium px-3 py-2" style={{ backgroundColor: 'var(--muted)', color: 'var(--text-secondary)' }}>Metric</th>
              {MONTHS.map((m) => (
                <th key={m} className="text-right font-medium px-2 py-2" style={{ color: 'var(--text-secondary)' }}>{m}</th>
              ))}
              <th className="text-right font-semibold px-3 py-2" style={{ color: 'var(--primary)' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row) => (
              <BudgetMetricGroup key={row.metric} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetMetricGroup({ row }: { row: BudgetMetricRow }) {
  const { metric, actual, budget, variance, actualTotal, budgetTotal, varianceTotal } = row;
  return (
    <>
      <tr>
        <td
          colSpan={MONTHS.length + 2}
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
        <td className="text-right px-3 py-2 font-semibold tabular-nums" style={{ color: 'var(--primary)' }}>{fmtBudget(actualTotal, metric)}</td>
      </tr>
      <tr className="border-t" style={{ borderColor: 'var(--border)' }}>
        <td className="sticky left-0 z-10 px-3 py-2 bg-white" style={{ color: 'var(--text-secondary)' }}><span className="pl-2">Budget 2026</span></td>
        {budget.map((v, i) => (
          <td key={i} className="text-right px-2 py-2 tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtBudget(v, metric)}</td>
        ))}
        <td className="text-right px-3 py-2 font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtBudget(budgetTotal, metric)}</td>
      </tr>
      <tr className="border-t" style={{ borderColor: 'var(--border)' }}>
        <td className="sticky left-0 z-10 px-3 py-2 bg-white" style={{ color: 'var(--primary)' }}><span className="pl-2">Variance</span></td>
        {variance.map((v, i) => (
          <td key={i} className="text-right px-2 py-2 tabular-nums"><VarPill value={v} metric={metric} /></td>
        ))}
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
  isLast,
}: {
  status: Status;
  rows: { status: Status; level: Level; series: (number | null)[] }[];
  metric: Metric;
  isLast: boolean;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={MONTHS.length + 2}
          className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold border-t"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--primary)', borderColor: 'var(--border)' }}
        >
          {statusLabel(status)}
          {status === 'Prospect' && <sup className="ml-1 font-normal opacity-70">1</sup>}
        </td>
      </tr>
      {rows.map((row, idx) => {
        const agg = rowAggregate(row.series, metric);
        return (
          <tr
            key={row.level}
            className="border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <td className="sticky left-0 z-10 px-3 py-2 bg-white" style={{ color: 'var(--primary)' }}>
              <span className="pl-2">{row.level}</span>
              {status === 'Prospect' && row.level !== 'My Hotel' && (
                <sup className="ml-1 text-[10px] opacity-60">2</sup>
              )}
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
}: {
  rows: { level: Level; series: (number | null)[] }[];
  metric: Metric;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={MONTHS.length + 2}
          className="px-3 py-2 text-[11px] uppercase tracking-wider font-semibold border-t"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--primary)', borderColor: 'var(--border)' }}
        >
          TENTATIVE + DEFINITE
        </td>
      </tr>
      {rows.map((row) => {
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
            <td className="text-right px-3 py-2 font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
              {fmt(agg, metric)}
            </td>
          </tr>
        );
      })}
    </>
  );
}
