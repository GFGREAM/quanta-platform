'use client';

import { useMemo, useState, MouseEvent } from 'react';
import KpiCard from '@/components/ui/KpiCard';

type Prop = {
  name: string;
  full: string;
  color: string;
  scores: number[];
  mine: boolean;
};

const DIMS = ['Location', 'Cleanliness', 'Service', 'Value', 'Sense of Arrival'];

const PROPS: Prop[] = [
  { name: 'Waldorf Astoria', full: 'Waldorf Astoria Costa Rica', color: '#172951', scores: [4.7, 4.7, 4.7, 3.8, 3.6], mine: true },
  { name: 'Nekajui RC Reserve', full: 'Nekajui, a Ritz-Carlton Reserve', color: '#00AFAD', scores: [5.0, 5.0, 4.9, 4.7, 4.9], mine: false },
  { name: 'Four Seasons', full: 'Four Seasons Peninsula Papagayo', color: '#1E4080', scores: [4.7, 4.9, 4.8, 4.2, 4.8], mine: false },
  { name: 'Andaz Papagayo', full: 'Andaz Peninsula Papagayo', color: '#69D9D0', scores: [4.7, 4.9, 4.7, 4.4, 4.4], mine: false },
  { name: 'JW Marriott Guanacaste', full: 'JW Marriott Hotel Guanacaste Resort & Spa', color: '#7C3AED', scores: [3.9, 4.7, 4.3, 3.8, 4.0], mine: false },
  { name: 'El Mangroove', full: 'El Mangroove, Autograph Collection', color: '#D97706', scores: [4.5, 4.7, 4.5, 4.1, 4.3], mine: false },
  { name: 'Waldorf Site Inspection', full: 'Waldorf Astoria Costa Rica — Site Inspection', color: '#BE123C', scores: [4.8, 4.7, 4.3, 3.8, 3.6], mine: false },
];

const DEEP = 'var(--primary)';
const GREEN_OCEAN = 'var(--accent)';
const LIGHT_GREEN = 'var(--accent-light)';
const BORDER_LIGHT = 'var(--border-light)';
const BORDER = 'var(--border)';
const MUTED = 'var(--muted)';
const TEXT_MUTED = 'var(--text-muted)';
const TEXT_SECONDARY = 'var(--text-secondary)';
const TEXT_PRIMARY = 'var(--primary)';
const ACTIVE_BG = 'rgba(0,175,173,0.08)';
const SUCCESS = 'var(--success)';
const SUCCESS_BG = 'rgba(16,185,129,0.12)';
const INFO = 'var(--info)';
const INFO_BG = 'rgba(14,165,233,0.12)';
const WARNING = 'var(--warning)';
const WARNING_BG = 'rgba(245,158,11,0.12)';
const DANGER = 'var(--danger)';

function heatColor(score: number) {
  if (score >= 4.5) return { bg: '#172951', text: '#FFFFFF' };
  if (score >= 4.0) return { bg: '#BFEFFF', text: '#0C3D5A' };
  if (score >= 3.5) return { bg: '#E0F7FF', text: '#0E4D6B' };
  if (score >= 3.0) return { bg: '#F0FFFE', text: '#0E7490' };
  if (score >= 2.5) return { bg: '#FFFBEB', text: '#92400E' };
  if (score >= 2.0) return { bg: '#FEF2F2', text: '#EF4444' };
  return { bg: '#FEE2E2', text: '#991B1B' };
}
function heatLabel(score: number) {
  if (score >= 4.5) return 'Benchmark';
  if (score >= 4.0) return 'Excellent';
  if (score >= 3.5) return 'Above standard';
  if (score >= 3.0) return 'Standard';
  if (score >= 2.5) return 'Below';
  return 'Poor';
}

const CX = 250, CY = 215, RAD = 155;
const ANG = DIMS.map((_, i) => (i / DIMS.length) * 2 * Math.PI - Math.PI / 2);
const pt = (a: number, r: number) => ({ x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) });
const poly = (r: number) => ANG.map(a => pt(a, r)).map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');

type TT = { x: number; y: number; prop: Prop; di: number } | null;

export default function OpsRadarPage() {
  const [active, setActive] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6]));
  const [crit, setCrit] = useState<number | null>(null);
  const [tt, setTT] = useState<TT>(null);

  const avgs = useMemo(() => PROPS.map(p => p.scores.reduce((s, v) => s + v, 0) / p.scores.length), []);
  const myProp = PROPS.find(p => p.mine)!;
  const ourAvg = myProp.scores.reduce((s, v) => s + v, 0) / myProp.scores.length;
  const topAvg = Math.max(...avgs);
  const best = PROPS[avgs.indexOf(topAvg)];

  const kpis = [
    { accent: DEEP, lbl: 'Properties assessed', val: PROPS.length, sub: 'Peninsula Papagayo' },
    { accent: GREEN_OCEAN, lbl: 'Waldorf Astoria Score', val: ourAvg.toFixed(1) + ' / 5', sub: 'operational average' },
    { accent: SUCCESS, lbl: 'Top rated', val: best.name, sub: topAvg.toFixed(1) + ' / 5 average' },
    { accent: DANGER, lbl: 'Gap vs leader', val: (topAvg - ourAvg).toFixed(1) + ' pts', sub: 'Waldorf vs top comp' },
  ];

  const toggleProp = (i: number) => {
    setActive(prev => {
      const n = new Set(prev);
      if (n.has(i)) { if (n.size > 1) n.delete(i); }
      else n.add(i);
      return n;
    });
  };

  const sortedForRadar = [...PROPS.entries()].sort(([, a], [, b]) => (a.mine ? 1 : 0) - (b.mine ? 1 : 0));
  const cols = crit !== null ? [crit] : DIMS.map((_, i) => i);
  const sortedForHeatmap = PROPS.map((p, i) => ({ ...p, idx: i }))
    .sort((a, b) => b.scores.reduce((s, v) => s + v, 0) - a.scores.reduce((s, v) => s + v, 0));

  const showTT = (e: MouseEvent, prop: Prop, di: number) =>
    setTT({ x: e.clientX, y: e.clientY, prop, di });
  const moveTT = (e: MouseEvent) => setTT(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : prev);
  const hideTT = () => setTT(null);

  const scaleSteps = ['#FEE2E2', '#FEF2F2', '#FFFBEB', '#F0FFFE', '#E0F7FF', '#BFEFFF', '#172951'];

  return (
    <div className="p-7" style={{ background: 'var(--background)' }}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[1.625rem] font-bold tracking-tight mb-1" style={{ color: DEEP }}>
            Ops Radar — Peninsula Papagayo
          </h1>
          <p className="text-[0.9375rem]" style={{ color: TEXT_SECONDARY }}>
            Multidimensional operational assessment · Field visit · Scale 1–5
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {kpis.map((k, i) => (
          <KpiCard key={i} label={k.lbl} value={String(k.val)} sub={k.sub} accent={k.accent} />
        ))}
      </div>

      {/* Radar + Legend */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '1fr 280px' }}>
        <div className="rounded-xl border p-6" style={{ background: 'var(--card)', borderColor: BORDER_LIGHT, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-base font-semibold" style={{ color: TEXT_PRIMARY }}>Operational Radar</div>
              <div className="text-[0.8125rem]" style={{ color: TEXT_MUTED }}>Comparison by dimension · Select properties in the legend</div>
            </div>
          </div>

          <svg viewBox="0 0 500 420" className="w-full h-auto block">
            {[1, 2, 3, 4, 5].map(ring => {
              const r = (ring / 5) * RAD;
              return (
                <g key={ring}>
                  <polygon points={poly(r)} fill={ring === 5 ? 'rgba(0,175,173,0.03)' : 'none'} stroke={BORDER_LIGHT} strokeWidth="1" />
                  {(ring === 1 || ring === 3 || ring === 5) && (
                    <text x={CX + 3} y={CY - r + 10} fontFamily="Inter, sans-serif" fontSize="8" fill="#C5C5C5" textAnchor="start">{ring}</text>
                  )}
                </g>
              );
            })}
            {ANG.map((a, i) => {
              const e = pt(a, RAD);
              return <line key={i} x1={CX} y1={CY} x2={e.x.toFixed(1)} y2={e.y.toFixed(1)} stroke="#DEDEDE" strokeWidth="1" />;
            })}
            {DIMS.map((label, i) => {
              const a = ANG[i];
              const lp = pt(a, RAD + 28);
              const cos = Math.cos(a);
              const anchor = cos > 0.15 ? 'start' : cos < -0.15 ? 'end' : 'middle';
              return (
                <text key={i} x={lp.x.toFixed(1)} y={lp.y.toFixed(1)} textAnchor={anchor} dominantBaseline="middle"
                  fontFamily="Inter, sans-serif" fontSize="10.5" fontWeight="600" style={{ fill: 'var(--text-secondary)' }}>
                  {label}
                </text>
              );
            })}
            {sortedForRadar.map(([pi, prop]) => {
              if (!active.has(pi)) return null;
              const isMine = prop.mine;
              const verts = prop.scores.map((score, i) => {
                const norm = (score - 1) / 4;
                return pt(ANG[i], norm * RAD);
              });
              const pStr = verts.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
              const top = verts.reduce((a, b) => (a.y < b.y ? a : b));
              return (
                <g key={pi}>
                  {isMine && (
                    <polygon points={pStr} fill={prop.color} fillOpacity="0.18" stroke={prop.color}
                      strokeWidth="4" strokeLinejoin="round" opacity="0.25" style={{ filter: 'blur(3px)' }} />
                  )}
                  <polygon points={pStr} fill={prop.color}
                    fillOpacity={isMine ? 0.15 : 0.05} stroke={prop.color}
                    strokeWidth={isMine ? 3 : 1.5} strokeDasharray={isMine ? undefined : '6 3'}
                    strokeLinejoin="round" opacity={isMine ? 1 : 0.7} />
                  {verts.map((v, di) => (
                    <circle key={di} cx={v.x.toFixed(1)} cy={v.y.toFixed(1)} r={isMine ? 6 : 4}
                      fill={isMine ? prop.color : '#fff'} stroke={prop.color} strokeWidth={isMine ? 2 : 1.5}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={e => showTT(e, prop, di)}
                      onMouseMove={moveTT}
                      onMouseLeave={hideTT} />
                  ))}
                  {isMine && (
                    <g>
                      <rect x={(top.x - 30).toFixed(1)} y={(top.y - 22).toFixed(1)} width="60" height="16" rx="5" fill={prop.color} />
                      <text x={top.x.toFixed(1)} y={(top.y - 14).toFixed(1)} textAnchor="middle" dominantBaseline="middle"
                        fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#fff">Waldorf ★</text>
                    </g>
                  )}
                </g>
              );
            })}
            <circle cx={CX} cy={CY} r="3" fill="rgba(23,41,81,0.15)" />
          </svg>
        </div>

        {/* Legend */}
        <div className="rounded-xl border p-6 flex flex-col" style={{ background: 'var(--card)', borderColor: BORDER_LIGHT, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wider mb-3" style={{ color: TEXT_MUTED }}>Properties</div>
          <div>
            {PROPS.map((p, i) => ({ p, i, avg: p.scores.reduce((s, v) => s + v, 0) / p.scores.length }))
              .sort((a, b) => (b.p.mine ? 1 : 0) - (a.p.mine ? 1 : 0) || b.avg - a.avg)
              .map(({ p, i, avg }) => {
              const isActive = active.has(i);
              const isMine = p.mine;
              const bg = avg >= 4.5 ? SUCCESS_BG : avg >= 3.5 ? INFO_BG : WARNING_BG;
              const tc = avg >= 4.5 ? SUCCESS : avg >= 3.5 ? INFO : WARNING;
              return (
                <div key={i} onClick={() => toggleProp(i)}
                  className="flex items-center gap-[10px] px-[6px] py-[7px] cursor-pointer transition-colors rounded-md"
                  style={{
                    borderBottom: `1px solid ${BORDER_LIGHT}`,
                    background: isMine ? ACTIVE_BG : undefined,
                  }}>
                  <div className="shrink-0 rounded-full" style={{ width: 28, height: isMine ? 10 : 8, background: p.color, opacity: isActive ? 1 : 0.3 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.8125rem] truncate" style={{
                      opacity: isActive ? 1 : 0.4,
                      fontWeight: isMine ? 700 : 500,
                      color: isMine ? DEEP : TEXT_PRIMARY,
                    }}>
                      {p.name}
                      {isMine && <span className="ml-1" style={{ color: GREEN_OCEAN, fontSize: '0.6875rem' }}>★ My property</span>}
                    </div>
                    <div className="text-[0.6875rem] mt-[1px]" style={{ color: TEXT_MUTED }}>{avg.toFixed(1)} avg · TripAdvisor</div>
                  </div>
                  <div className="shrink-0 px-[7px] py-[2px] rounded-full font-bold"
                    style={{
                      background: isMine ? DEEP : bg,
                      color: isMine ? '#fff' : tc,
                      fontSize: isMine ? '0.8125rem' : '0.6875rem',
                    }}>
                    {avg.toFixed(1)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-[14px]" style={{ borderTop: `1px solid ${BORDER_LIGHT}` }}>
            <div className="text-[0.6875rem] font-semibold uppercase tracking-wider mb-3" style={{ color: TEXT_MUTED }}>Visit Date</div>
            <div className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>March 2026</div>
            <div className="text-xs mt-[2px]" style={{ color: TEXT_MUTED }}>Visited by: Ray Velasquez</div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border p-6" style={{ background: 'var(--card)', borderColor: BORDER_LIGHT, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <div className="text-base font-semibold" style={{ color: TEXT_PRIMARY }}>Operational Dimension Heatmap</div>
            <div className="text-[0.8125rem]" style={{ color: TEXT_MUTED }}>Score 1–5 · dark blue = benchmark · red = below standard</div>
          </div>
          <div className="flex gap-[6px] flex-wrap">
            {[null, 0, 1, 2, 3, 4].map((idx, i) => {
              const label = idx === null ? 'All' : DIMS[idx];
              const isActive = crit === idx;
              return (
                <button key={i} onClick={() => setCrit(idx)}
                  className="px-3 py-[5px] rounded-full text-[0.8125rem] whitespace-nowrap transition-all cursor-pointer"
                  style={{
                    border: `1px solid ${isActive ? GREEN_OCEAN : BORDER}`,
                    background: isActive ? ACTIVE_BG : 'var(--card)',
                    color: isActive ? GREEN_OCEAN : TEXT_MUTED,
                    fontWeight: isActive ? 600 : 500,
                  }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.8125rem]">
            <thead>
              <tr>
                <th className="px-[14px] py-[10px] text-left text-[0.6875rem] font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: TEXT_MUTED, borderBottom: `2px solid ${BORDER_LIGHT}`, background: MUTED, minWidth: 180 }}>Property</th>
                {cols.map(ci => (
                  <th key={ci} className="px-[14px] py-[10px] text-center text-[0.6875rem] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: TEXT_MUTED, borderBottom: `2px solid ${BORDER_LIGHT}`, background: MUTED }}>{DIMS[ci]}</th>
                ))}
                <th className="px-[14px] py-[10px] text-center text-[0.6875rem] font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: TEXT_MUTED, borderBottom: `2px solid ${BORDER_LIGHT}`, background: MUTED }}>Average</th>
              </tr>
            </thead>
            <tbody>
              {sortedForHeatmap.map(prop => {
                const avg = prop.scores.reduce((s, v) => s + v, 0) / prop.scores.length;
                const avgC = heatColor(avg);
                const isOurs = prop.mine;
                return (
                  <tr key={prop.idx} style={{ background: isOurs ? ACTIVE_BG : undefined }}>
                    <td className="px-[14px] py-[10px] font-semibold whitespace-nowrap text-sm"
                      style={{
                        borderBottom: `1px solid ${BORDER_LIGHT}`,
                        color: isOurs ? GREEN_OCEAN : TEXT_PRIMARY,
                        fontWeight: isOurs ? 700 : 600,
                      }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: prop.color }} />
                        {prop.full}{isOurs ? ' ★' : ''}
                      </div>
                    </td>
                    {cols.map(ci => {
                      const s = prop.scores[ci];
                      const c = heatColor(s);
                      return (
                        <td key={ci} className="p-0" style={{ borderBottom: `1px solid ${BORDER_LIGHT}` }}>
                          <div className="w-full flex flex-col items-center justify-center gap-[2px]"
                            style={{ height: 52, background: c.bg }}>
                            <span className="text-[0.9375rem] font-extrabold tracking-tight" style={{ color: c.text }}>{s.toFixed(1)}</span>
                            <span className="text-[0.625rem] font-medium uppercase tracking-wide" style={{ color: c.text, opacity: 0.7 }}>
                              {heatLabel(s).split(' ')[0]}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center px-3" style={{ borderBottom: `1px solid ${BORDER_LIGHT}` }}>
                      <div className="inline-flex items-center justify-center font-extrabold rounded-md"
                        style={{ minWidth: 44, height: 28, padding: '0 8px', fontSize: '0.875rem', background: avgC.bg, color: avgC.text }}>
                        {avg.toFixed(1)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 mt-[14px] text-xs flex-wrap" style={{ color: TEXT_MUTED }}>
          <span>Scale:</span>
          <div className="flex gap-[2px]">
            {scaleSteps.map((bg, i) => (
              <div key={i} className="rounded-sm" style={{ width: 22, height: 10, background: bg, border: '0.5px solid rgba(0,0,0,0.06)' }} />
            ))}
          </div>
          <span className="ml-1">1 far below standard · 3 meets standard · 5 industry benchmark</span>
        </div>
      </div>

      {/* Tooltip */}
      {tt && (
        <div className="fixed pointer-events-none z-[300] rounded-md px-4 py-3 shadow-lg min-w-[200px] transition-opacity"
          style={{
            background: DEEP, color: '#fff', fontSize: '0.8125rem',
            left: Math.min(tt.x + 16, typeof window !== 'undefined' ? window.innerWidth - 230 : tt.x + 16),
            top: Math.max(tt.y - 10, 8),
          }}>
          <div className="font-bold text-sm mb-2" style={{ color: LIGHT_GREEN }}>{tt.prop.name}</div>
          <div className="flex justify-between gap-[14px] text-xs mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
            <span>{DIMS[tt.di]}</span>
            <strong style={{ color: '#fff' }}>{tt.prop.scores[tt.di].toFixed(1)} / 5</strong>
          </div>
          <div className="flex justify-between gap-[14px] text-xs mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
            <span>{heatLabel(tt.prop.scores[tt.di])}</span>
          </div>
          <div className="flex justify-between gap-[14px] text-xs mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
            <span>Overall average</span>
            <strong style={{ color: '#fff' }}>
              {(tt.prop.scores.reduce((a, v) => a + v, 0) / tt.prop.scores.length).toFixed(1)} / 5
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}
