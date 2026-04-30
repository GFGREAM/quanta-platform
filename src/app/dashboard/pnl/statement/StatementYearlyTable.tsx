'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  currencyLabel,
  type Currency,
  type ForecastRow,
  type Scenario,
} from './data';
import {
  FLOW_THRU_FORMULA,
  SUMMARY_ROWS,
  TABLE_ROWS,
  fmtValue,
  fmtVar,
  flattenRows,
  flowThruPct,
  varianceStyle,
  type RowFormat,
  type TableRow,
} from './tableConfig';
import { FormulaInfo } from './ui';

type Layer = 'out' | 'varBud' | 'varBudPct' | 'varLy' | 'varLyPct';

const LAYER_LABELS: Record<Layer, string> = {
  out: 'Outlook',
  varBud: 'vs Bud',
  varBudPct: 'vs Bud%',
  varLy: 'vs LY',
  varLyPct: 'vs LY%',
};

const LAYER_ORDER: Layer[] = ['out', 'varBud', 'varBudPct', 'varLy', 'varLyPct'];

interface Props {
  hotel: string;
  scenario: Scenario;
  currency: Currency;
  /** All-year row sets (already filtered by hotel). */
  allRows: ForecastRow[];
  allRowsNoXR: ForecastRow[];
  /** Years present in the dataset, sorted ascending. */
  years: number[];
}

export default function StatementYearlyTable({
  hotel, scenario, currency, allRows, allRowsNoXR, years,
}: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const [layer, setLayer] = useState<Layer>('out');
  const rows = flattenRows(showDetail ? TABLE_ROWS : SUMMARY_ROWS);
  const ToggleIcon = showDetail ? ChevronDown : ChevronRight;

  const heading = hotel || 'All hotels';
  const padCell = 'px-2 py-1.5';
  const padLabel = 'px-3 py-1.5';

  if (years.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-10 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
        Loading yearly data…
      </div>
    );
  }

  return (
    <div
      className="bg-white border rounded-lg shadow-sm overflow-hidden"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Title strip */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b gap-3 flex-wrap"
        style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
      >
        <div>
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {heading} · Yearly
          </div>
          <div className="text-base font-bold" style={{ color: 'var(--primary)' }}>
            {scenario} vs Budget vs LY — full-year per year
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Layer toggle */}
          <div className="flex rounded-lg p-[3px] gap-0.5" style={{ background: 'white', border: '1px solid var(--border)' }}>
            {LAYER_ORDER.map((k) => (
              <button
                key={k}
                onClick={() => setLayer(k)}
                className={`px-2.5 py-1 rounded-md text-[0.75rem] font-medium border-none cursor-pointer transition-all ${layer === k ? 'shadow-sm' : ''}`}
                style={{
                  color: layer === k ? 'var(--primary)' : 'var(--text-secondary)',
                  background: layer === k ? 'var(--muted)' : 'transparent',
                }}
              >
                {LAYER_LABELS[k]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-[0.6875rem] font-semibold uppercase tracking-wider transition-colors hover:bg-white"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}
          >
            <ToggleIcon size={12} />
            {showDetail ? 'Collapse to summary' : 'Expand to detail'}
          </button>
          <div className="text-[0.6875rem] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {currencyLabel(currency)} · values in thousands where marked
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.75rem]" style={{ color: 'var(--text-primary)' }}>
          <thead>
            <tr style={{ background: '#FAFAFA', borderBottom: '1px solid var(--border)' }}>
              <th className={`${padLabel} text-left text-[0.6875rem] font-semibold uppercase tracking-wider sticky left-0 bg-[#FAFAFA] z-10`} style={{ color: 'var(--text-secondary)' }} />
              {years.map((y) => (
                <th key={y} className={`${padCell} text-right text-[0.6875rem] font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }}>
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <YearRow
                key={`${i}-${row.label ?? 'spacer'}`}
                row={row}
                layer={layer}
                allRows={allRows}
                allRowsNoXR={allRowsNoXR}
                years={years}
                scenario={scenario}
                padCell={padCell}
                padLabel={padLabel}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function YearRow({
  row, layer, allRows, allRowsNoXR, years, scenario, padCell, padLabel,
}: {
  row: TableRow;
  layer: Layer;
  allRows: ForecastRow[];
  allRowsNoXR: ForecastRow[];
  years: number[];
  scenario: Scenario;
  padCell: string;
  padLabel: string;
}) {
  const totalCols = 1 + years.length;

  if (row.kind === 'spacer') {
    return (
      <tr aria-hidden="true">
        <td colSpan={totalCols} className="h-2" />
      </tr>
    );
  }

  if (row.kind === 'section_header') {
    return (
      <tr style={{ background: '#FAFAFA' }}>
        <td
          colSpan={totalCols}
          className={`${padLabel} text-[0.6875rem] font-semibold uppercase tracking-wider border-t border-b`}
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
        >
          {row.label}
        </td>
      </tr>
    );
  }

  const baseRows = row.useNoXR ? allRowsNoXR : allRows;

  // For each year Y, derive the three scenario slices.
  const slicesByYear = years.map((y) => ({
    cur: baseRows.filter((r) => r.year === y && r.scenario === scenario),
    bud: baseRows.filter((r) => r.year === y && r.scenario === 'Budget'),
    ly:  baseRows.filter((r) => r.year === y - 1 && r.scenario === 'Actual'),
  }));

  const labelClass = row.bold ? 'font-bold' : 'font-normal';
  const labelColor = row.bold ? 'var(--primary)' : 'var(--text-primary)';
  const valueClass = row.bold ? 'font-bold' : 'font-normal';

  if (row.kind === 'flow_thru') {
    let cells: (number | null)[];
    if (layer === 'varBud' || layer === 'varBudPct') {
      cells = slicesByYear.map(({ cur, bud }) => flowThruPct(cur, bud));
    } else if (layer === 'varLy' || layer === 'varLyPct') {
      cells = slicesByYear.map(({ cur, ly }) => flowThruPct(cur, ly));
    } else {
      cells = years.map(() => null);
    }
    return (
      <tr className="border-t" style={{ borderColor: 'var(--border-light)' }}>
        <td className={`${padLabel} font-normal sticky left-0 bg-white z-10`} style={{ color: 'var(--text-secondary)' }}>
          <span className="inline-flex items-center gap-1.5">
            {row.label}
            <FormulaInfo text={FLOW_THRU_FORMULA} />
          </span>
        </td>
        {cells.map((v, i) => (
          <td
            key={`y-${i}`}
            className={`${padCell} text-right tabular-nums`}
            style={v === null ? { color: 'var(--text-muted)' } : varianceStyle(v, row.higherIsBetter)}
          >
            {fmtFlow(v)}
          </td>
        ))}
      </tr>
    );
  }

  // data row
  const format = row.format ?? 'integer';
  const calc = row.calc ?? (() => 0);
  const isPercentRow = format === 'pct';
  const cells = slicesByYear.map(({ cur, bud, ly }) =>
    computeCell(layer, isPercentRow, calc(cur), calc(bud), calc(ly)),
  );

  return (
    <tr className="border-t hover:bg-[var(--bg-hover)]" style={{ borderColor: 'var(--border-light)' }}>
      <td className={`${padLabel} ${labelClass} sticky left-0 bg-white z-10`} style={{ color: labelColor }}>
        {row.label}
      </td>
      {cells.map((cell, i) => (
        <td
          key={`y-${i}`}
          className={`${padCell} text-right tabular-nums ${valueClass}`}
          style={cellStyle(layer, cell, row.higherIsBetter)}
        >
          {fmtCell(layer, cell, format, isPercentRow)}
        </td>
      ))}
    </tr>
  );
}

interface CellNum { value: number | null; varianceMagnitude?: number | null }

function computeCell(layer: Layer, isPercentRow: boolean, cur: number, bud: number, lyV: number): CellNum {
  if (layer === 'out') return { value: cur };
  if (layer === 'varBud') return { value: cur - bud, varianceMagnitude: cur - bud };
  if (layer === 'varBudPct') {
    if (isPercentRow) return { value: cur - bud, varianceMagnitude: cur - bud };
    return { value: relPct(cur, bud), varianceMagnitude: cur - bud };
  }
  if (layer === 'varLy') return { value: cur - lyV, varianceMagnitude: cur - lyV };
  // varLyPct
  if (isPercentRow) return { value: cur - lyV, varianceMagnitude: cur - lyV };
  return { value: relPct(cur, lyV), varianceMagnitude: cur - lyV };
}

function cellStyle(layer: Layer, cell: CellNum, higherIsBetter: boolean | undefined): React.CSSProperties {
  if (layer === 'out') return { color: 'var(--primary)' };
  const mag = cell.varianceMagnitude ?? cell.value;
  return varianceStyle(mag ?? null, higherIsBetter);
}

function fmtCell(layer: Layer, cell: CellNum, format: RowFormat, isPercentRow: boolean): string {
  if (cell.value === null || !Number.isFinite(cell.value)) return '—';
  if (layer === 'out') return fmtValue(cell.value, format);
  if (layer === 'varBud' || layer === 'varLy') return fmtVar(cell.value, format);
  return fmtPercentDelta(cell.value, isPercentRow);
}

function fmtPercentDelta(value: number, _isPercentRow: boolean): string {
  if (!Number.isFinite(value)) return '—';
  return `${value >= 0 ? '' : '-'}${Math.abs(value).toFixed(1)}%`;
}

function fmtFlow(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return `${v >= 0 ? '' : '-'}${Math.abs(v).toFixed(1)}%`;
}

function relPct(cur: number, ref: number): number | null {
  if (!Number.isFinite(cur) || !Number.isFinite(ref) || ref === 0) return null;
  return ((cur - ref) / Math.abs(ref)) * 100;
}
