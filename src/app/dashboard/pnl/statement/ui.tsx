'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { fmtMoney, type Currency, type MetricFormat, type Scope } from './data';
import { varianceStyle } from './tableConfig';
import type { ViewMode } from './useStatement';

// Re-export MultiSelect from its promoted location so existing imports still work.
export { MultiSelect } from '@/components/ui/MultiSelect';

// ─── Chart color constants ──────────────────────────────────────
// Recharts strokes need literal hex (no CSS-var resolution inside SVG attributes).
export const COLOR_COMPARISON = '#00AFAD'; // var(--accent) — Actual/Outlook/Forecast line
export const COLOR_BUDGET = '#172951';     // var(--primary) — Budget reference line
export const COLOR_LY = '#9CA3AF';         // var(--text-muted) — Last Year reference line

// ─── Label maps ─────────────────────────────────────────────────

export const VIEW_ORDER: ViewMode[] = ['summary', 'single', 'monthly', 'yearly', 'portfolio'];
export const VIEW_LABELS: Record<ViewMode, string> = { summary: 'Summary', single: 'Detailed', monthly: 'Monthly', yearly: 'Yearly', portfolio: 'Portfolio' };
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

/** Info icon with a hover tooltip. Renders into document.body via a portal so
 *  it escapes ancestor `overflow-hidden` containers (the P&L cards have one
 *  for rounded corners, which would otherwise clip the bubble). */
export function FormulaInfo({ text }: { text: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const handleEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
  };

  return (
    <>
      <span
        className="inline-flex items-center"
        style={{ cursor: 'help' }}
        onMouseEnter={handleEnter}
        onMouseMove={handleEnter}
        onMouseLeave={() => setPos(null)}
      >
        <Info size={12} aria-label="Formula" style={{ color: 'var(--text-muted)' }} />
      </span>
      {pos && typeof document !== 'undefined' && createPortal(
        <div
          role="tooltip"
          className="pointer-events-none fixed -translate-x-1/2 -translate-y-full whitespace-pre-line rounded px-2.5 py-1.5 text-[0.6875rem] leading-snug shadow-lg z-50 w-max max-w-[18rem] text-left"
          style={{ left: pos.x, top: pos.y - 6, background: 'var(--primary)', color: '#fff' }}
        >
          {text}
        </div>,
        document.body,
      )}
    </>
  );
}

// ─── Variance pill ──────────────────────────────────────────────
// Wraps variance values in a colored chip (mirrors the Expenses page style).
// When the variance is null/zero/non-finite or `higherIsBetter` is undefined,
// the pill chrome (background + padding) is suppressed and the content renders
// inline so empty/neutral cells don't get a visible chip.
//
// `onDark` swaps the chip for plain bold text in lighter red/green tones —
// used inside highlight (navy-background) rows where the standard pill would
// have insufficient contrast.
export function VariancePill({
  children,
  varValue,
  higherIsBetter,
  onDark,
}: {
  children: React.ReactNode;
  varValue: number | null;
  higherIsBetter?: boolean;
  onDark?: boolean;
}) {
  if (onDark) {
    if (
      higherIsBetter === undefined
      || varValue === null
      || varValue === 0
      || !Number.isFinite(varValue)
    ) {
      return <span style={{ color: 'rgba(255,255,255,0.85)' }}>{children}</span>;
    }
    const isGood = higherIsBetter ? varValue > 0 : varValue < 0;
    return (
      <span style={{ color: isGood ? '#6EE7B7' : '#FCA5A5', fontWeight: 600 }}>
        {children}
      </span>
    );
  }
  const style = varianceStyle(varValue, higherIsBetter);
  if (!style.background) {
    return <span style={style}>{children}</span>;
  }
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-sm font-semibold"
      style={style}
    >
      {children}
    </span>
  );
}

// ─── Chart axis formatter ───────────────────────────────────────

export function formatAxis(value: number, format: MetricFormat): string {
  if (format === 'percent') return `${value.toFixed(0)}%`;
  if (format === 'integer') return Math.round(value).toLocaleString('en-US');
  return fmtMoney(value);
}
