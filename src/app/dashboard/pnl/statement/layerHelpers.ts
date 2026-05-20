// Shared layer-toggle types and cell computation/formatting helpers used by
// both StatementMonthlyTable and StatementYearlyTable.

import type React from 'react';
import { fmtValue, fmtVar, varianceStyle, type RowFormat } from './tableConfig';

// ─── Layer types ─────────────────────────────────────────────────

export type Layer = 'out' | 'varBud' | 'varBudPct' | 'varLy' | 'varLyPct';

export const LAYER_LABELS: Record<Layer, string> = {
  out: 'Outlook',
  varBud: 'vs Bud',
  varBudPct: 'vs Bud%',
  varLy: 'vs LY',
  varLyPct: 'vs LY%',
};

export const LAYER_ORDER: Layer[] = ['out', 'varBud', 'varBudPct', 'varLy', 'varLyPct'];

// ─── Cell computation ────────────────────────────────────────────

export interface CellNum {
  value: number | null;
  varianceMagnitude?: number | null;
}

export function computeCell(layer: Layer, isPercentRow: boolean, cur: number, bud: number, lyV: number): CellNum {
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

// ─── Cell styling / formatting ───────────────────────────────────

export function cellStyle(layer: Layer, cell: CellNum, higherIsBetter: boolean | undefined): React.CSSProperties {
  if (layer === 'out') return { color: 'var(--primary)' };
  const mag = cell.varianceMagnitude ?? cell.value;
  return varianceStyle(mag ?? null, higherIsBetter);
}

export function fmtCell(layer: Layer, cell: CellNum, format: RowFormat, isPercentRow: boolean): string {
  if (cell.value === null || !Number.isFinite(cell.value)) return '—';
  if (layer === 'out') return fmtValue(cell.value, format);
  if (layer === 'varBud' || layer === 'varLy') return fmtVar(cell.value, format);
  // pct layers — for pct rows it's already a pp delta; for $ rows it's a relative %.
  return fmtPercentDelta(cell.value);
}

export function fmtPercentDelta(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value >= 0 ? '' : '-'}${Math.abs(value).toFixed(1)}%`;
}

export function fmtFlow(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return `${v >= 0 ? '' : '-'}${Math.abs(v).toFixed(1)}%`;
}

export function relPct(cur: number, ref: number): number | null {
  if (!Number.isFinite(cur) || !Number.isFinite(ref) || ref === 0) return null;
  return ((cur - ref) / Math.abs(ref)) * 100;
}
