'use client';
import { Fragment, useRef, useState } from 'react';
import { ChevronRight, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { SingleSelect } from '@/components/ui/SingleSelect';
import { exportNodeToPdf } from '@/lib/pdfExport';
import { usePermissions } from '@/components/permissions-provider';
import ProgressionCharts from './ProgressionCharts';
import {
  PERIODS,
  KPM_METRICS,
  METRIC_KIND,
  REPORT_TITLE,
  DETAIL_GROUPS,
  HOTELS,
  MONTH_OPTIONS,
  COMP_SETS,
  getRow,
  penetrationIndex,
  changePct,
  fmtLevel,
  fmtIndex,
  fmtSignedPct,
  type Metric,
  type PeriodKey,
  type DetailGroup,
  type RowKind,
} from './data';

const COLOR_GOOD = 'var(--success)';
const COLOR_BAD = 'var(--danger)';
const BG_GOOD = 'rgba(16, 185, 129, 0.12)';
const BG_BAD = 'rgba(239, 68, 68, 0.12)';

const INDEX_NAME: Record<Metric, string> = {
  OCC: 'MPI', ADR: 'ARI', RevPAR: 'RGI', RoomNights: '', Revenue: '',
};
const METRIC_LABEL: Record<Metric, string> = {
  OCC: 'OCC', ADR: 'ADR', RevPAR: 'RevPAR', RoomNights: 'Room Nights', Revenue: 'Revenue',
};

export default function MarketSharePage() {
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [hotel, setHotel] = useState<string>(HOTELS[0]);
  const [month, setMonth] = useState<string>('May');
  const [compSet, setCompSet] = useState<string>(COMP_SETS[0]);

  // ─── PDF export (cards + report table + charts) ───────────────────
  // Admins (full access) export the clean internal copy; everyone else gets the
  // confidentiality watermark on externally-shareable copies.
  const { hasFullAccess } = usePermissions();
  const exportRef = useRef<HTMLDivElement>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const handleExportPdf = async () => {
    if (exportingPdf || !exportRef.current) return;
    setExportingPdf(true);
    try {
      const fileBase = `market-share-${month}-${new Date().toISOString().slice(0, 10)}`;
      await exportNodeToPdf(exportRef.current, fileBase, { watermark: !hasFullAccess });
    } finally {
      setExportingPdf(false);
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
        <span style={{ color: 'var(--primary)' }}>Market Share</span>
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--primary)' }}>Market Share</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {hotel} <span className="opacity-60">· {compSet} · 7 properties</span>
          </p>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-60 disabled:cursor-wait shrink-0"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          title="Descargar las visuales como PDF"
        >
          <Download size={13} /> {exportingPdf ? 'Generando…' : 'PDF'}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <Filter label="Hotel">
          <SingleSelect options={HOTELS} value={hotel} onChange={setHotel} width="20rem" />
        </Filter>
        <Filter label="Mes">
          <SingleSelect options={MONTH_OPTIONS} value={month} onChange={setMonth} width="9rem" />
        </Filter>
        <Filter label="Comp Set">
          <SingleSelect options={COMP_SETS} value={compSet} onChange={setCompSet} width="11rem" />
        </Filter>
      </div>

      {/* Period toggle */}
      <div className="mb-5 flex items-center gap-3">
        <div className="inline-flex rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {PERIODS.map((p, i) => {
            const active = p.key === period;
            const label = p.key === 'ytd' ? `${month} YTD` : month;
            return (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-4 py-1.5 text-sm transition-colors ${i > 0 ? 'border-l' : ''}`}
                style={{
                  backgroundColor: active ? 'var(--primary)' : 'white',
                  color: active ? 'white' : 'var(--text-secondary)',
                  borderColor: 'var(--border)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>vs año anterior (LY)</span>
      </div>

      {/* Exportable visuals — cards + report table + charts, wrapped so the PDF captures them as one. */}
      <div ref={exportRef} className="bg-[var(--background)]">
        {/* ── Headline: penetration index cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {KPM_METRICS.map((metric) => (
            <IndexCard key={metric} metric={metric} period={period} />
          ))}
        </div>

        {/* ── Full report table (recreated from the source image) ── */}
        <DetailTable month={month} />

        {/* ── Monthly progression charts ── */}
        <ProgressionCharts month={month} />
      </div>

      {/* Footnotes */}
      <div className="mt-6 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <p><b>MPI / ARI / RGI</b> = índice de penetración Hotel ÷ Comp Set × 100. <b>100 = fair share</b>.</p>
        <p className="mt-1">KPM&apos;s usa <b>KPI&apos;s</b> (índice de penetración) y <b>Δ%</b>; Sales usa <b>vs CS</b> (Hotel − Comp Set) y <b>Δ absoluto</b>. <b>Sales x Day</b> = total ÷ días del periodo.</p>
        <p className="mt-1 opacity-70">Mock data — to be sourced from SQL.</p>
      </div>
    </div>
  );
}

function IndexCard({ metric, period }: { metric: Metric; period: PeriodKey }) {
  const r = getRow(metric, period);
  const kind = METRIC_KIND[metric];
  const idxCY = penetrationIndex(r.hotelCY, r.compCY);
  const idxLY = penetrationIndex(r.hotelLY, r.compLY);
  const yoy = changePct(idxCY, idxLY);

  const aboveFair = idxCY >= 100;
  const up = yoy >= 0;

  return (
    <div className="bg-white rounded-lg border px-4 py-3 shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
          {INDEX_NAME[metric]} <span className="font-normal opacity-60">· {METRIC_LABEL[metric]}</span>
        </span>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ color: aboveFair ? COLOR_GOOD : COLOR_BAD, background: aboveFair ? BG_GOOD : BG_BAD }}
        >
          {aboveFair ? 'Sobre fair share' : 'Bajo fair share'}
        </span>
      </div>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums leading-none" style={{ color: 'var(--primary)' }}>
          {fmtIndex(idxCY)}
        </span>
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums" style={{ color: up ? COLOR_GOOD : COLOR_BAD }}>
          {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {fmtSignedPct(yoy)}
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px]" style={{ color: 'var(--text-secondary)' }}>
        <span>
          Hotel <b style={{ color: 'var(--text-primary)' }}>{fmtLevel(r.hotelCY, kind)}</b>
          <span className="opacity-50"> · </span>
          Comp <b style={{ color: 'var(--text-primary)' }}>{fmtLevel(r.compCY, kind)}</b>
        </span>
        <span className="font-medium">Rank {r.rankCY}</span>
      </div>
    </div>
  );
}

// ── Filter field wrapper ─────────────────────────────────────────────
function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Full report table ────────────────────────────────────────────────
type Tone = 'good' | 'bad' | null;

// Colouring rules, mirroring the source image:
//   • Hotel & Comp Set cells: coloured only on the Change row.
//   • Third column (KPI's / vs CS): KPM colours it only on Change; Sales always.
//   • Rank# is never coloured.
// Tone follows the value's sign (a leading "-" reads as negative → bad).
function cellTone(group: DetailGroup, kind: RowKind, colInPeriod: number, text: string): Tone {
  if (colInPeriod === 3) return null; // Rank#
  const isThird = colInPeriod === 2;
  const toned = isThird ? group.alwaysToneThird || kind === 'change' : kind === 'change';
  if (!toned) return null;
  return text.trim().startsWith('-') ? 'bad' : 'good';
}

const COL_HEADERS = ['Hotel', 'Comp Set', '', 'Rank#']; // index 2 filled per group

function DataCell({ tone, text }: { tone: Tone; text: string }) {
  const color = tone === 'good' ? COLOR_GOOD : tone === 'bad' ? COLOR_BAD : 'var(--text-primary)';
  return (
    <td
      className={`px-3 py-1 text-center tabular-nums whitespace-nowrap ${tone ? 'font-semibold' : ''}`}
      style={{ color }}
    >
      {text}
    </td>
  );
}

function DetailTable({ month }: { month: string }) {
  const headerCell = 'px-3 py-1.5 text-center text-sm font-semibold whitespace-nowrap';
  const spacer = <td className="w-4" />;

  return (
    <div className="bg-white rounded-xl border p-5 shadow-sm overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
      <h2 className="text-center text-lg font-bold tracking-wide mb-4" style={{ color: 'var(--primary)' }}>
        {REPORT_TITLE}
      </h2>

      <table className="w-full border-collapse text-sm">
        {/* Period band: May | May YTD */}
        <thead>
          <tr>
            <th className="w-40" />
            <th colSpan={4} className="pb-1 text-center text-base font-semibold" style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border)' }}>
              {month}
            </th>
            {spacer}
            <th colSpan={4} className="pb-1 text-center text-base font-semibold" style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border)' }}>
              {month} YTD
            </th>
          </tr>
        </thead>

        <tbody>
          {DETAIL_GROUPS.map((group, gi) => {
            const headers = [...COL_HEADERS];
            headers[2] = group.thirdCol;
            return (
              <Fragment key={group.name}>
                {/* Spacer between groups */}
                {gi > 0 && (
                  <tr>
                    <td className="h-6" colSpan={10} />
                  </tr>
                )}

                {/* Group header: section name + column titles */}
                <tr>
                  <td className={`${headerCell} text-left`} style={{ color: 'var(--primary)', borderBottom: '1px solid var(--border)' }}>
                    {group.name}
                  </td>
                  {headers.map((h, i) => (
                    <td key={`a-${i}`} className={headerCell} style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{h}</td>
                  ))}
                  <td style={{ borderBottom: '1px solid var(--border)' }} />
                  {headers.map((h, i) => (
                    <td key={`b-${i}`} className={headerCell} style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{h}</td>
                  ))}
                </tr>

                {/* Data rows, in metric blocks of 3 (CY / LY / Change) */}
                {group.rows.map((row, ri) => {
                  const blockStart = ri % 3 === 0 && ri > 0;
                  const rowStyle = blockStart ? { borderTop: '1px solid var(--border)' } : undefined;
                  return (
                    <tr key={`${group.name}-${ri}`} style={rowStyle}>
                      <td className="px-3 py-1 text-left font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                        {row.label}
                      </td>
                      {row.cells.slice(0, 4).map((c, i) => (
                        <DataCell key={`m-${i}`} tone={cellTone(group, row.kind, i, c)} text={c} />
                      ))}
                      {spacer}
                      {row.cells.slice(4, 8).map((c, i) => (
                        <DataCell key={`y-${i}`} tone={cellTone(group, row.kind, i, c)} text={c} />
                      ))}
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
