'use client';

import { useMemo, useState } from 'react';
import { selectStyle } from '@/lib/selectStyle';
import { MONTHS, getMonthlyMatrix, type MonthlyCell, type MonthlyRow } from './data';
import { getGuestSummary } from './stats';
import MonthlyMatrix from './MonthlyMatrix';
import MonthlyProgression from './MonthlyProgression';

type Unit = 'money' | 'count';

// One shared filter for the whole Monthly section — it drives BOTH the table (which rows to show)
// and the progression chart (which series to plot).
export default function MonthlyView() {
  const matrix = useMemo(() => getMonthlyMatrix(), []);
  const guestMonthly = useMemo(() => MONTHS.map((m) => getGuestSummary(m.key)), []);
  const guestRows = useMemo<MonthlyRow[]>(() => {
    const fy = getGuestSummary('fy');
    return [
      { concept: 'Guests AI', cells: guestMonthly.map((g) => ({ real: g.aiTotal, budget: g.aiBudget })), fy: { real: fy.aiTotal, budget: fy.aiBudget } },
      { concept: 'Guests EP', cells: guestMonthly.map((g) => ({ real: g.ep, budget: g.epBudget })), fy: { real: fy.ep, budget: fy.epBudget } },
      { concept: 'Total Guests', cells: guestMonthly.map((g) => ({ real: g.total, budget: g.totalBudget })), fy: { real: fy.total, budget: fy.totalBudget } },
    ];
  }, [guestMonthly]);

  const nprOptions = useMemo(() => [
    { key: 'total', label: 'Total NPR' },
    ...matrix.rows.flatMap((r) => [
      { key: r.concept, label: r.concept },
      ...(r.children ?? []).map((c) => ({ key: c.concept, label: `— ${c.concept}` })),
    ]),
  ], [matrix]);
  const guestOptions = [
    { key: 'g_total', label: 'Total Guests' },
    { key: 'g_ai', label: 'Guests AI' },
    { key: 'g_ep', label: 'Guests EP' },
  ];

  const [metric, setMetric] = useState<string>('total');
  const isGuest = metric.startsWith('g_');

  // Table rows for the selected metric.
  const table = useMemo<{ rows: MonthlyRow[]; total: MonthlyRow | null; unit: Unit }>(() => {
    if (isGuest) return { rows: [guestRows[0], guestRows[1]], total: guestRows[2], unit: 'count' };
    if (metric === 'total') return { rows: matrix.rows, total: matrix.total, unit: 'money' };
    const bucket = matrix.rows.find((r) => r.concept === metric);
    if (bucket) return { rows: [bucket], total: null, unit: 'money' };
    const child = matrix.rows.flatMap((r) => r.children ?? []).find((c) => c.concept === metric);
    return { rows: child ? [{ ...child, children: undefined }] : matrix.rows, total: child ? null : matrix.total, unit: 'money' };
  }, [metric, isGuest, matrix, guestRows]);

  // Chart series for the selected metric.
  const chart = useMemo<{ cells: MonthlyCell[]; unit: Unit; label: string }>(() => {
    if (metric === 'g_total') return { cells: guestRows[2].cells, unit: 'count', label: 'Total Guests' };
    if (metric === 'g_ai') return { cells: guestRows[0].cells, unit: 'count', label: 'Guests AI' };
    if (metric === 'g_ep') return { cells: guestRows[1].cells, unit: 'count', label: 'Guests EP' };
    if (metric === 'total') return { cells: matrix.total.cells, unit: 'money', label: 'Total NPR' };
    const bucket = matrix.rows.find((r) => r.concept === metric);
    if (bucket) return { cells: bucket.cells, unit: 'money', label: bucket.concept };
    const child = matrix.rows.flatMap((r) => r.children ?? []).find((c) => c.concept === metric);
    return child ? { cells: child.cells, unit: 'money', label: child.concept } : { cells: matrix.total.cells, unit: 'money', label: 'Total NPR' };
  }, [metric, matrix, guestRows]);

  const control = (
    <select
      value={metric}
      onChange={(e) => setMetric(e.target.value)}
      style={selectStyle}
      className="h-8 w-48 px-2.5 pr-7 rounded-md border text-[0.75rem] bg-white appearance-none cursor-pointer outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
    >
      <optgroup label="NPR">
        {nprOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </optgroup>
      <optgroup label="Guests">
        {guestOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </optgroup>
    </select>
  );

  return (
    <>
      <MonthlyMatrix rows={table.rows} total={table.total} unit={table.unit} control={control} />
      <MonthlyProgression series={chart.cells} unit={chart.unit} label={chart.label} />
    </>
  );
}
