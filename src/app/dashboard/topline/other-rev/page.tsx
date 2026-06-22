'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import KpiCard from '@/components/ui/KpiCard';
import { selectStyle } from '@/lib/selectStyle';
import StatsExpanded from './StatsExpanded';
import MonthlyView from './MonthlyView';
import { getGuestSummary } from './stats';
import {
  PROPERTIES, DEFAULT_PROPERTY, CHANNELS, MONTHS,
  PERIOD_OPTIONS, DEFAULT_PERIOD, periodLabel,
  getRevenueTree, getTotals, type PeriodKey, type RevenueRow,
} from './data';

// Figures are thousands of MXN. Compact for big totals, 1 decimal for small lines.
const fmtK = (v: number) =>
  `$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 1 })}k`;
const fmtSignedK = (v: number) => `${v >= 0 ? '+' : '-'}${fmtK(v)}`;
const fmtPct0 = (v: number) => `${Math.round(v)}%`;
const fmtN = (v: number) => Math.round(v).toLocaleString('en-US');
const fmtSignedN = (v: number) => `${v >= 0 ? '+' : '-'}${fmtN(Math.abs(v))}`;
const fmtVarPct = (cur: number, ref: number) =>
  !ref ? '—' : `${cur >= ref ? '+' : ''}${(((cur - ref) / ref) * 100).toFixed(1)}%`;
const varColor = (cur: number, ref: number) =>
  !ref ? 'var(--text-secondary)' : cur >= ref ? 'var(--success)' : 'var(--danger)';
// Real vs Budget: green when over budget, red when under (revenue → higher is better).
const signColor = (v: number) => (v >= 0 ? 'var(--success)' : 'var(--danger)');

export default function OtherRevPage() {
  const [propertyCode, setPropertyCode] = useState<string>(DEFAULT_PROPERTY);
  const [period, setPeriod] = useState<PeriodKey>(DEFAULT_PERIOD);
  const [view, setView] = useState<'summary' | 'expanded' | 'monthly'>('summary');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['AYB']));
  const property = PROPERTIES.find((p) => p.code === propertyCode) ?? PROPERTIES[0];

  // Single hotel today; accessors are hotel-agnostic until the SQL feed adds `code`.
  const tree = useMemo(() => getRevenueTree(period), [period]);
  const totals = useMemo(() => getTotals(period), [period]);
  const guests = useMemo(() => getGuestSummary(period), [period]);
  const maxMix = useMemo(
    () => Math.max(...tree.flatMap((b) => [b.mixPct, ...b.children.map((c) => c.mixPct)]), 1),
    [tree],
  );

  // Channel mix (% NPR) for the donut — Hotel / Club / Otros.
  const mixData = useMemo(() => [
    { name: 'Hotel', value: totals.hotel, pct: totals.mix.hotel, color: '#172951' },
    { name: 'Club', value: totals.club, pct: totals.mix.club, color: '#00AFAD' },
    { name: 'Other', value: totals.otros, pct: totals.mix.otros, color: '#9CA3AF' },
  ], [totals]);

  // Monthly % NPR mix by channel across the year — for the fluctuation line chart.
  const mixTrend = useMemo(() => MONTHS.map((m) => {
    const t = getTotals(m.key);
    return { month: m.label.slice(0, 3), hotel: t.mix.hotel, club: t.mix.club, otros: t.mix.otros };
  }), []);

  const toggle = (name: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  // Money cell with optional left border (to mark the Real | Budget group split).
  const moneyTd = (v: number | null, opts: { bold?: boolean; emphasize?: boolean; leftBorder?: boolean } = {}) => (
    <td className="px-3 py-1.5 text-right tabular-nums" style={{
      color: v == null ? 'var(--text-muted)' : opts.emphasize ? 'var(--primary)' : opts.bold ? 'var(--text-primary)' : 'var(--text-secondary)',
      fontWeight: opts.bold ? 700 : opts.emphasize ? 600 : 400,
      borderLeft: opts.leftBorder ? '1px solid var(--border)' : undefined,
    }}>{v == null ? '—' : fmtK(v)}</td>
  );

  // Value columns: Real (Hotel/Club/Otros/Total) | Budget (Hotel/Club/Otros/Total) | Var | Mix.
  // Revenue Budget is total-only in the source, so its per-channel cells are blank.
  const valueCells = (r: RevenueRow, bold: boolean) => (
    <>
      {moneyTd(r.hotel || null)}
      {moneyTd(r.club || null)}
      {moneyTd(r.otros || null)}
      {moneyTd(r.total, { bold, emphasize: bold })}
      {moneyTd(null, { leftBorder: true })}
      {moneyTd(null)}
      {moneyTd(null)}
      {moneyTd(r.budget)}
      <td className="px-3 py-1.5 text-right tabular-nums" style={{ color: signColor(r.varBudget), fontWeight: bold ? 600 : 400 }}>{fmtSignedK(r.varBudget)}</td>
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2 justify-end">
          <div className="h-2 rounded-full overflow-hidden" style={{ width: 90, background: 'var(--muted)' }}>
            <div className="h-full rounded-full" style={{ width: `${(r.mixPct / maxMix) * 100}%`, background: 'var(--accent)' }} />
          </div>
          <span className="tabular-nums text-[0.75rem] w-9 text-right" style={{ color: 'var(--text-secondary)' }}>{r.mixPct.toFixed(1)}%</span>
        </div>
      </td>
    </>
  );

  // Integer cell for guest rows.
  const countTd = (v: number | null, opts: { bold?: boolean; emphasize?: boolean; leftBorder?: boolean } = {}) => (
    <td className="px-3 py-1.5 text-right tabular-nums" style={{
      color: v == null ? 'var(--text-muted)' : opts.emphasize ? 'var(--text-primary)' : 'var(--text-secondary)',
      fontWeight: opts.bold ? 700 : opts.emphasize ? 600 : 400,
      borderLeft: opts.leftBorder ? '1px solid var(--border)' : undefined,
    }}>{v == null ? '—' : fmtN(v)}</td>
  );

  // Guest-count rows shown atop the table — Real and Budget both split by channel.
  const guestRow = (
    label: string,
    rH: number | null, rC: number | null, rO: number | null, real: number,
    bH: number | null, bC: number | null, bO: number | null, budget: number,
    bold = false,
  ) => (
    <tr style={{ borderTop: '1px solid var(--border)' }}>
      <td className="px-3 py-1.5 text-left" style={{ color: 'var(--primary)', fontWeight: bold ? 700 : 500 }}>{label}</td>
      {countTd(rH)}
      {countTd(rC)}
      {countTd(rO)}
      {countTd(real, { bold, emphasize: true })}
      {countTd(bH, { leftBorder: true })}
      {countTd(bC)}
      {countTd(bO)}
      {countTd(budget)}
      <td className="px-3 py-1.5 text-right tabular-nums" style={{ color: signColor(real - budget) }}>{fmtSignedN(real - budget)}</td>
      <td className="px-3 py-1.5 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>—</td>
    </tr>
  );

  return (
    <div className="flex flex-col gap-5 font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif]" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Top Line</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--primary)' }}>Other Rev$ (Non Pack)</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
          Other Rev$ (Non Pack) — {property.name}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {periodLabel(period)} · NPR by channel (Hotel / Club / Other) · Real vs Budget · figures in MXN thousands ·{' '}
          <span style={{ color: 'var(--text-muted)' }}>Jan–May real, Jun–Dec forecast · SQL pending</span>
        </p>
      </div>

      {/* View toggle — Resumen (KPIs + ingresos + mix) ↔ Expanded (adds the statistics table) */}
      <div className="flex rounded-lg p-[3px] gap-0.5 self-start" style={{ background: 'var(--muted)' }}>
        {([['summary', 'Summary'], ['expanded', 'Expanded'], ['monthly', 'Monthly']] as const).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`px-3.5 py-1.5 rounded-md text-[0.8125rem] font-medium border-none cursor-pointer transition-all ${view === v ? 'bg-white shadow-sm' : 'bg-transparent'}`}
            style={{ color: view === v ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Controls — Property + period. Single hotel today; seam for SQL / multi-property */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Property
          </label>
          <select
            value={propertyCode}
            onChange={(e) => setPropertyCode(e.target.value)}
            style={selectStyle}
            className="h-9 w-52 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          >
            {PROPERTIES.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Period
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            style={selectStyle}
            className="h-9 w-44 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          >
            {PERIOD_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {view === 'monthly' ? (
        <MonthlyView />
      ) : (
        <>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 max-[860px]:grid-cols-2 max-[480px]:grid-cols-1">
        <KpiCard
          label="Other Rev (Real)"
          value={fmtK(totals.total)}
          sub={`${fmtVarPct(totals.total, totals.budget)} vs budget`}
          subColor={varColor(totals.total, totals.budget)}
          color="var(--primary)"
        />
        <KpiCard
          label="Budget"
          value={fmtK(totals.budget)}
          sub="non-package plan"
          accent="var(--accent)"
        />
        <KpiCard
          label="Variance vs Budget"
          value={fmtSignedK(totals.varBudget)}
          sub={`${fmtVarPct(totals.total, totals.budget)} vs budget`}
          subColor={signColor(totals.varBudget)}
        />
        <KpiCard
          label="Mix NPR (Real)"
          value={`Club ${fmtPct0(totals.mix.club)}`}
          sub={`Hotel ${fmtPct0(totals.mix.hotel)} · Other ${fmtPct0(totals.mix.otros)}`}
          color="var(--accent)"
        />
      </div>

      {/* Revenue breakdown — expandable buckets by channel */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
        <div className="px-3 py-1.5 border-b" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            NPR Revenue by channel — {periodLabel(period)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.8125rem] whitespace-nowrap">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th rowSpan={2} className="px-3 py-2 text-left align-bottom text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Concept</th>
                <th colSpan={CHANNELS.length + 1} className="px-3 py-1 text-center text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)', borderLeft: '1px solid var(--border)' }}>Real</th>
                <th colSpan={CHANNELS.length + 1} className="px-3 py-1 text-center text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', borderLeft: '1px solid var(--border)' }}>Budget</th>
                <th rowSpan={2} className="px-3 py-2 text-right align-bottom text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', borderLeft: '1px solid var(--border)' }}>Var</th>
                <th rowSpan={2} className="px-3 py-2 text-right align-bottom text-[0.625rem] font-semibold uppercase tracking-wider min-w-[150px]" style={{ color: 'var(--text-secondary)' }}>Mix</th>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {CHANNELS.map((c) => (
                  <th key={`r-${c.key}`} className="px-3 py-1 text-right text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', borderLeft: c.key === 'hotel' ? '1px solid var(--border)' : undefined }}>{c.label}</th>
                ))}
                <th className="px-3 py-1 text-right text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Total</th>
                {CHANNELS.map((c) => (
                  <th key={`b-${c.key}`} className="px-3 py-1 text-right text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', borderLeft: c.key === 'hotel' ? '1px solid var(--border)' : undefined }}>{c.label}</th>
                ))}
                <th className="px-3 py-1 text-right text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {/* Guests — context above the revenue */}
              <tr style={{ background: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
                <td colSpan={CHANNELS.length * 2 + 5} className="px-3 py-1 text-left text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Guests</td>
              </tr>
              {guestRow('Guests AI', guests.aiHotel, guests.aiClub, null, guests.aiTotal, guests.aiBudgetHotel, guests.aiBudgetClub, null, guests.aiBudget)}
              {guestRow('Guests EP', null, guests.ep, null, guests.ep, null, guests.epBudget, null, guests.epBudget)}
              {guestRow('Total Guests', guests.aiHotel, guests.aiClub + guests.ep, null, guests.total, guests.aiBudgetHotel, guests.aiBudgetClub + guests.epBudget, null, guests.totalBudget, true)}
              <tr style={{ background: 'var(--muted)', borderTop: '2px solid var(--border)' }}>
                <td colSpan={CHANNELS.length * 2 + 5} className="px-3 py-1 text-left text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>NPR Revenue</td>
              </tr>
              {tree.map((b) => {
                const expandable = b.children.length > 0 || b.detailPending;
                const isOpen = expandable && expanded.has(b.concept);
                return (
                  <Fragment key={b.concept}>
                    <tr className={expandable ? 'cursor-pointer' : ''} onClick={expandable ? () => toggle(b.concept) : undefined} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="px-3 py-1.5 text-left">
                        <span className="inline-flex items-center gap-1" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                          {expandable
                            ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)
                            : <span style={{ width: 14, display: 'inline-block' }} />}
                          {b.concept}
                        </span>
                      </td>
                      {valueCells(b, true)}
                    </tr>
                    {isOpen && (b.detailPending ? (
                      <tr style={{ borderTop: '1px solid var(--border)' }}>
                        <td colSpan={CHANNELS.length * 2 + 5} className="py-1.5 text-left text-[0.75rem] italic" style={{ paddingLeft: 32, color: 'var(--text-muted)' }}>
                          Detail pending — to be shared
                        </td>
                      </tr>
                    ) : b.children.map((c) => (
                      <tr key={c.concept} style={{ borderTop: '1px solid var(--border)' }}>
                        <td className="py-1.5 text-left" style={{ paddingLeft: 32, color: 'var(--text-primary)' }}>{c.concept}</td>
                        {valueCells(c, false)}
                      </tr>
                    )))}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--muted)' }}>
                <td className="px-3 py-2 text-left font-bold" style={{ color: 'var(--primary)' }}>Total</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: 'var(--text-primary)', borderLeft: '1px solid var(--border)' }}>{fmtK(totals.hotel)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtK(totals.club)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtK(totals.otros)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-bold" style={{ color: 'var(--primary)' }}>{fmtK(totals.total)}</td>
                <td className="px-3 py-2 text-right tabular-nums" style={{ color: 'var(--text-muted)', borderLeft: '1px solid var(--border)' }}>—</td>
                <td className="px-3 py-2 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>—</td>
                <td className="px-3 py-2 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>—</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: 'var(--text-secondary)' }}>{fmtK(totals.budget)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-bold" style={{ color: signColor(totals.varBudget), borderLeft: '1px solid var(--border)' }}>{fmtSignedK(totals.varBudget)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: 'var(--text-secondary)' }}>100%</td>
              </tr>
              <tr style={{ background: 'var(--muted)' }}>
                <td className="px-3 pb-2 text-left text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>% NPR</td>
                <td className="px-3 pb-2 text-right tabular-nums text-[0.75rem]" style={{ color: 'var(--text-muted)', borderLeft: '1px solid var(--border)' }}>{fmtPct0(totals.mix.hotel)}</td>
                <td className="px-3 pb-2 text-right tabular-nums text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>{fmtPct0(totals.mix.club)}</td>
                <td className="px-3 pb-2 text-right tabular-nums text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>{fmtPct0(totals.mix.otros)}</td>
                <td colSpan={CHANNELS.length * 2 + 1} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Mix — channel donut (selected period) + monthly % NPR fluctuation */}
      <div className="grid grid-cols-2 gap-3 max-[1100px]:grid-cols-1">
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
        <div className="px-3 py-1.5 border-b" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Channel mix (% NPR) — {periodLabel(period)}
          </span>
        </div>
        <div className="p-4 flex items-center gap-8 flex-wrap">
          <div className="h-[240px] flex-1 min-w-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mixData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={64}
                  outerRadius={100}
                  paddingAngle={2}
                  stroke="none"
                >
                  {mixData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip
                  formatter={(v, _n, item) => {
                    const pct = (item?.payload as { pct?: number } | undefined)?.pct ?? 0;
                    return [`${fmtK(Number(v))} · ${pct.toFixed(1)}%`, 'NPR'];
                  }}
                  contentStyle={{ borderColor: 'var(--border)', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Side legend — channel, % and amount (no clipped labels) */}
          <div className="flex flex-col gap-3 min-w-[200px]">
            {mixData.map((d) => (
              <div key={d.name} className="flex items-center justify-between gap-6">
                <span className="flex items-center gap-2 text-[0.8125rem]" style={{ color: 'var(--text-secondary)' }}>
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="tabular-nums text-[0.8125rem]" style={{ color: 'var(--text-primary)' }}>
                  <span className="font-bold" style={{ color: 'var(--primary)' }}>{Math.round(d.pct)}%</span>
                  <span style={{ color: 'var(--text-muted)' }}> · {fmtK(d.value)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly % NPR fluctuation by channel (full year) */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
        <div className="px-3 py-1.5 border-b" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            % NPR fluctuation by channel — Jan–Dec 2026
          </span>
        </div>
        <div className="h-[300px] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mixTrend} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#E5E5E5' }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#E5E5E5' }} tickFormatter={(v) => `${v}%`} width={38} domain={[0, 80]} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} contentStyle={{ borderColor: 'var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="plainline" />
              <Line type="monotone" dataKey="club" name="Club" stroke="#00AFAD" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="hotel" name="Hotel" stroke="#172951" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="otros" name="Other" stroke="#9CA3AF" strokeWidth={1.75} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>

      {/* Expanded view — full statistics table */}
      {view === 'expanded' && <StatsExpanded period={period} />}
        </>
      )}
    </div>
  );
}
