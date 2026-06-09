'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { ACTUAL_MONTHS, MONTHS, type MonthlyCell, type MonthlyRow } from './data';

type Unit = 'money' | 'count';
const fmtK = (v: number) =>
  `$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 1 })}k`;
const fmtN = (v: number) => Math.round(v).toLocaleString('en-US');
const fmtV = (unit: Unit, v: number) => (unit === 'money' ? fmtK(v) : fmtN(v));
const fmtSignedV = (unit: Unit, v: number) => `${v >= 0 ? '+' : '-'}${fmtV(unit, Math.abs(v))}`;
const signColor = (v: number) => (Math.abs(v) < 0.5 ? 'var(--text-muted)' : v >= 0 ? 'var(--success)' : 'var(--danger)');

// Forecast months (Jun–Dec) render with a muted header.
const isForecast = MONTHS.map((m) => !ACTUAL_MONTHS.includes(m.key));

export default function MonthlyMatrix({ rows, total, unit, control }: {
  rows: MonthlyRow[];
  total?: MonthlyRow | null;
  unit: Unit;
  control?: ReactNode;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['F&B']));
  const monthLabels = MONTHS.map((m) => m.label.slice(0, 3));
  const toggle = (name: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  const cell = (c: MonthlyCell, bold: boolean, sticky: boolean, key: string | number) => {
    const v = c.real - c.budget;
    return (
      <td key={key} className={`px-2 py-1.5 text-right tabular-nums ${sticky ? 'sticky right-0 z-10 border-l' : ''}`}
        style={{ borderColor: 'var(--border)', background: sticky ? 'var(--muted)' : undefined, minWidth: 64 }}>
        <div style={{ color: bold ? 'var(--primary)' : 'var(--text-primary)', fontWeight: bold ? 700 : 600 }}>{fmtV(unit, c.real)}</div>
        <div className="text-[0.6875rem]" style={{ color: signColor(v) }}>{fmtSignedV(unit, v)}</div>
      </td>
    );
  };

  const conceptTd = (label: ReactNode, opts: { bold?: boolean; indent?: number } = {}) => (
    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-left" style={{ minWidth: 160 }}>
      <span className="inline-flex items-center gap-1" style={{ paddingLeft: opts.indent ?? 0, color: 'var(--primary)', fontWeight: opts.bold ? 700 : 400 }}>{label}</span>
    </td>
  );

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <div className="px-3 py-1.5 border-b flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Month by month — Real and variance vs Budget · 2026
        </span>
        {control}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.8125rem] whitespace-nowrap">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', minWidth: 160 }}>Concept</th>
              {monthLabels.map((m, i) => (
                <th key={m} className="px-2 py-2 text-right text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: isForecast[i] ? 'var(--text-muted)' : 'var(--text-secondary)', minWidth: 64 }}>{m}</th>
              ))}
              <th className="sticky right-0 z-10 px-2 py-2 text-right text-[0.625rem] font-semibold uppercase tracking-wider border-l" style={{ color: 'var(--primary)', background: 'var(--muted)', borderColor: 'var(--border)', minWidth: 64 }}>FY</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const expandable = (r.children?.length ?? 0) > 0 || !!r.detailPending;
              const isOpen = expandable && expanded.has(r.concept);
              return (
                <Fragment key={r.concept}>
                  <tr className={expandable ? 'cursor-pointer' : ''} onClick={expandable ? () => toggle(r.concept) : undefined} style={{ borderTop: '1px solid var(--border)' }}>
                    {conceptTd(
                      <>
                        {expandable
                          ? (isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />)
                          : <span style={{ width: 13, display: 'inline-block' }} />}
                        {r.concept}
                      </>,
                      { bold: true },
                    )}
                    {r.cells.map((c, i) => cell(c, true, false, i))}
                    {cell(r.fy, true, true, 'fy')}
                  </tr>
                  {isOpen && (r.detailPending ? (
                    <tr style={{ borderTop: '1px solid var(--border)' }}>
                      <td colSpan={MONTHS.length + 2} className="py-1.5 text-left text-[0.75rem] italic" style={{ paddingLeft: 34, color: 'var(--text-muted)' }}>
                        Detail pending — to be shared
                      </td>
                    </tr>
                  ) : (r.children ?? []).map((c) => (
                    <tr key={c.concept} style={{ borderTop: '1px solid var(--border)' }}>
                      {conceptTd(c.concept, { indent: 22 })}
                      {c.cells.map((cc, i) => cell(cc, false, false, i))}
                      {cell(c.fy, false, true, 'fy')}
                    </tr>
                  )))}
                </Fragment>
              );
            })}
            {total && (
              <tr style={{ borderTop: '2px solid var(--border)' }}>
                {conceptTd(total.concept, { bold: true })}
                {total.cells.map((c, i) => cell(c, true, false, i))}
                {cell(total.fy, true, true, 'fy')}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
