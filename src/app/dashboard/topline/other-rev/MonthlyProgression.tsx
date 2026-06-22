'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MONTHS, type MonthlyCell } from './data';

type Unit = 'money' | 'count';
const fmtK = (v: number) =>
  `$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 1 })}k`;
const fmtN = (v: number) => Math.round(v).toLocaleString('en-US');
const fmtBy = (unit: Unit, v: number) => (unit === 'money' ? fmtK(v) : fmtN(v));

export default function MonthlyProgression({ series, unit, label }: { series: MonthlyCell[]; unit: Unit; label: string }) {
  const data = MONTHS.map((m, i) => ({ month: m.label.slice(0, 3), real: series[i].real, budget: series[i].budget }));

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <div className="px-3 py-1.5 border-b" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Progression — {label} · Real vs Budget
        </span>
      </div>
      <div className="h-[340px] p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#E5E5E5' }} />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#E5E5E5' }}
              tickFormatter={(v) => fmtBy(unit, Number(v))}
              width={unit === 'money' ? 56 : 52}
            />
            <Tooltip formatter={(v) => fmtBy(unit, Number(v))} contentStyle={{ borderColor: 'var(--border)', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="plainline" />
            <Line type="monotone" dataKey="budget" name="Budget" stroke="#00AFAD" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="real" name="Real" stroke="#172951" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
