'use client';

import { useMemo } from 'react';
import { CHANNELS, periodLabel, type PeriodKey } from './data';
import { getStats, type StatUnit } from './stats';

const fmtVal = (unit: StatUnit, v: number | null): string => {
  if (v == null) return '—';
  if (unit === 'count') return Math.round(v).toLocaleString('en-US');
  if (unit === 'pct') return `${Math.round(v)}%`;
  if (unit === 'ratio') return v.toFixed(1);
  return `$${Math.round(v)}`; // money (MXN units)
};

const fmtVar = (unit: StatUnit, a: number | null, b: number | null): string => {
  if (a == null || b == null) return '—';
  const d = a - b;
  const sign = d >= 0 ? '+' : '-';
  const abs = Math.abs(d);
  if (unit === 'count') return `${sign}${Math.round(abs).toLocaleString('en-US')}`;
  if (unit === 'pct') return `${sign}${Math.round(abs)}pp`;
  if (unit === 'ratio') return `${sign}${abs.toFixed(1)}`;
  return `${sign}$${Math.round(abs)}`;
};

const varColor = (a: number | null, b: number | null) =>
  a == null || b == null ? 'var(--text-muted)' : a >= b ? 'var(--success)' : 'var(--danger)';

export default function StatsExpanded({ period }: { period: PeriodKey }) {
  const rows = useMemo(() => getStats(period), [period]);

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <div className="px-3 py-1.5 border-b" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Statistics — {periodLabel(period)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.8125rem] whitespace-nowrap">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="px-3 py-2 text-left text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Indicator</th>
              {CHANNELS.map((c) => (
                <th key={c.key} className="px-3 py-2 text-right text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{c.label}</th>
              ))}
              <th className="px-3 py-2 text-right text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Real</th>
              <th className="px-3 py-2 text-right text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Budget</th>
              <th className="px-3 py-2 text-right text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Var</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-3 py-1.5 text-left font-medium" style={{ color: 'var(--primary)' }}>{r.label}</td>
                <td className="px-3 py-1.5 text-right tabular-nums" style={{ color: r.real.hotel == null ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{fmtVal(r.unit, r.real.hotel)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums" style={{ color: r.real.club == null ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{fmtVal(r.unit, r.real.club)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums" style={{ color: r.real.otros == null ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{fmtVal(r.unit, r.real.otros)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtVal(r.unit, r.real.total)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtVal(r.unit, r.budget)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums" style={{ color: varColor(r.real.total, r.budget) }}>{fmtVar(r.unit, r.real.total, r.budget)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
