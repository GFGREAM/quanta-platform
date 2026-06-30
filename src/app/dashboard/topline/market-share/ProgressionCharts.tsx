'use client';

import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { MONTHLY_PROGRESSION } from './data';

// Shared per-metric colours so OCC/ADR/RevPAR read the same across both charts.
const COLORS = { occ: '#172951', adr: '#00AFAD', rev: '#E0A200' };

const CARD = 'bg-white border rounded-lg overflow-hidden shadow-sm';
const HEAD = 'px-3 py-1.5 border-b';
const HEAD_TXT = 'text-[0.6875rem] font-semibold uppercase tracking-wider';

const tooltipStyle = { borderColor: 'var(--border)', borderRadius: 8, fontSize: 12 } as const;
const axisTick = { fill: '#6B7280', fontSize: 12 } as const;

export default function ProgressionCharts({ month }: { month: string }) {
  const data = MONTHLY_PROGRESSION;
  const marker = month.slice(0, 3); // selected month → vertical guide line
  const hasMarker = data.some((d) => d.month === marker);

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* KPI's · penetration index */}
      <div className={CARD} style={{ borderColor: 'var(--border)' }}>
        <div className={HEAD} style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
          <span className={HEAD_TXT} style={{ color: 'var(--text-secondary)' }}>
            KPI&apos;s · Índice de penetración (MPI / ARI / RGI) — mes a mes
          </span>
        </div>
        <div className="h-[320px] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={{ stroke: '#E5E5E5' }} />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: '#E5E5E5' }}
                domain={['dataMin - 4', 'dataMax + 4']}
                tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                width={48}
              />
              <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="plainline" />
              <ReferenceLine y={100} stroke="#9CA3AF" strokeDasharray="4 4" label={{ value: 'fair = 100', position: 'right', fontSize: 10, fill: '#9CA3AF' }} />
              {hasMarker && <ReferenceLine x={marker} stroke="var(--accent)" strokeDasharray="2 2" />}
              <Line type="monotone" dataKey="mpi" name="MPI · OCC" stroke={COLORS.occ} strokeWidth={2.5} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="ari" name="ARI · ADR" stroke={COLORS.adr} strokeWidth={2.5} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="rgi" name="RGI · RevPAR" stroke={COLORS.rev} strokeWidth={2.5} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rank vs comp set (1 = best) */}
      <div className={CARD} style={{ borderColor: 'var(--border)' }}>
        <div className={HEAD} style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
          <span className={HEAD_TXT} style={{ color: 'var(--text-secondary)' }}>
            Rank vs comp set (1 = mejor) — mes a mes
          </span>
        </div>
        <div className="h-[320px] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={{ stroke: '#E5E5E5' }} />
              <YAxis
                reversed
                domain={[1, 7]}
                ticks={[1, 2, 3, 4, 5, 6, 7]}
                allowDecimals={false}
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: '#E5E5E5' }}
                tickFormatter={(v) => `#${v}`}
                width={40}
              />
              <Tooltip formatter={(v) => `${v} of 7`} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="plainline" />
              {hasMarker && <ReferenceLine x={marker} stroke="var(--accent)" strokeDasharray="2 2" />}
              <Line type="monotone" dataKey="rankOcc" name="OCC" stroke={COLORS.occ} strokeWidth={2.5} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="rankAdr" name="ADR" stroke={COLORS.adr} strokeWidth={2.5} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="rankRev" name="RevPAR" stroke={COLORS.rev} strokeWidth={2.5} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
