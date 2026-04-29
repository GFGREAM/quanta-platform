'use client';

import { fmtMoney, type Currency, type MetricFormat, type Scope } from './data';
import type { ViewMode } from './useStatement';

// Re-export MultiSelect from its promoted location so existing imports still work.
export { MultiSelect } from '@/components/ui/MultiSelect';

// ─── Chart color constants ──────────────────────────────────────
// Recharts strokes need literal hex (no CSS-var resolution inside SVG attributes).
export const COLOR_COMPARISON = '#00AFAD'; // var(--accent) — Actual/Outlook/Forecast line
export const COLOR_BUDGET = '#172951';     // var(--primary) — Budget reference line
export const COLOR_LY = '#9CA3AF';         // var(--text-muted) — Last Year reference line

// ─── Label maps ─────────────────────────────────────────────────

export const VIEW_ORDER: ViewMode[] = ['summary', 'single', 'portfolio'];
export const VIEW_LABELS: Record<ViewMode, string> = { summary: 'Summary', single: 'Overview', portfolio: 'Portfolio' };
export const SCOPE_LABELS: Record<Scope, string> = { mtd: 'MTD', ytd: 'YTD', fy: 'FY' };
export const CURRENCY_LABELS: Record<Currency, string> = { USD: 'USD', Local: 'Local' };

// ─── Shared small components ────────────────────────────────────

export function LegendDot({ color, label, size = 'md' }: { color: string; label: string; size?: 'sm' | 'md' }) {
  const dotClass = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const gapClass = size === 'sm' ? 'gap-1' : 'gap-1.5';
  return (
    <span className={`inline-flex items-center ${gapClass}`}>
      <span className={`${dotClass} rounded-full inline-block`} style={{ background: color }} />
      {label}
    </span>
  );
}

export function VarianceBadge({
  label, variance, higherIsBetter, size = 'md',
}: {
  label: string;
  variance: { pct: number; label: string } | null;
  higherIsBetter: boolean;
  size?: 'sm' | 'md';
}) {
  const textClass = size === 'sm' ? 'text-[0.625rem]' : 'text-[0.75rem]';
  if (!variance) {
    return (
      <span className={textClass} style={{ color: 'var(--text-muted)' }}>
        N/A {size === 'md' && <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>{label}</span>}
        {size === 'sm' && label}
      </span>
    );
  }
  const isGood = higherIsBetter ? variance.pct >= 0 : variance.pct < 0;
  const color = isGood ? 'var(--success)' : 'var(--danger)';
  return (
    <span className={`${textClass} font-medium`} style={{ color }}>
      {variance.label} <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </span>
  );
}

// ─── Chart axis formatter ───────────────────────────────────────

export function formatAxis(value: number, format: MetricFormat): string {
  if (format === 'percent') return `${value.toFixed(0)}%`;
  if (format === 'integer') return Math.round(value).toLocaleString('en-US');
  return fmtMoney(value);
}
