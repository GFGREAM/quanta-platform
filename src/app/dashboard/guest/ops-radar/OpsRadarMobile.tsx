'use client';

import {
  DIMS, PROPS,
  DEEP, GREEN_OCEAN, BORDER_LIGHT, BORDER, TEXT_MUTED, TEXT_PRIMARY,
  ACTIVE_BG, SUCCESS, SUCCESS_BG, INFO, INFO_BG, WARNING, WARNING_BG, DANGER,
  heatColor, heatLabel, SCALE_STEPS,
  ANG_FOR, pointAt, polyAt,
} from './data';
import { useOpsRadar } from './useOpsRadar';

// Smaller canvas for mobile — still square-ish so the radar stays legible.
const CX = 170, CY = 155, RAD = 118;
const ANG = ANG_FOR(DIMS.length);
const pt = (a: number, r: number) => pointAt(CX, CY, a, r);
const poly = (r: number) => polyAt(CX, CY, ANG, r);

export default function OpsRadarMobile() {
  const {
    active, toggleProp,
    crit, setCrit,
    ourAvg, topAvg, best,
    sortedForRadar, cols, sortedForHeatmap,
  } = useOpsRadar();

  const kpis = [
    { accent: 'var(--primary)', lbl: 'Properties', val: String(PROPS.length), sub: 'Peninsula Papagayo' },
    { accent: 'var(--accent)', lbl: 'Waldorf Score', val: ourAvg.toFixed(1) + ' / 5', sub: 'operational avg' },
    { accent: SUCCESS, lbl: 'Top rated', val: best.name, sub: topAvg.toFixed(1) + ' / 5' },
    { accent: DANGER, lbl: 'Gap vs leader', val: (topAvg - ourAvg).toFixed(1) + ' pts', sub: 'Waldorf vs top' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4" style={{ background: 'var(--background)' }}>
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight m-0" style={{ color: DEEP }}>
          Competitive Set Radar
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Guanacaste, CR · Field visit · Scale 1–5
        </p>
      </div>

      {/* KPIs 2x2 */}
      <div className="grid grid-cols-2 gap-2.5">
        {kpis.map((k, i) => (
          <MobileKpi key={i} label={k.lbl} value={String(k.val)} sub={k.sub} accent={k.accent} />
        ))}
      </div>

      {/* Radar */}
      <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ background: 'var(--card)', borderColor: BORDER_LIGHT }}>
        <div>
          <div className="text-[0.9375rem] font-semibold" style={{ color: 'var(--text-primary)' }}>Operational Radar</div>
          <div className="text-[0.6875rem]" style={{ color: 'var(--text-secondary)' }}>Tap a property below to toggle it</div>
        </div>
        <svg viewBox="0 0 340 320" className="w-full h-auto block">
          {[1, 2, 3, 4, 5].map(ring => {
            const r = (ring / 5) * RAD;
            return (
              <g key={ring}>
                <polygon points={poly(r)} fill={ring === 5 ? 'rgba(0,175,173,0.03)' : 'none'} style={{ stroke: 'var(--border)' }} strokeWidth="1" />
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
            const lp = pt(a, RAD + 22);
            const cos = Math.cos(a);
            const anchor = cos > 0.15 ? 'start' : cos < -0.15 ? 'end' : 'middle';
            return (
              <text key={i} x={lp.x.toFixed(1)} y={lp.y.toFixed(1)} textAnchor={anchor} dominantBaseline="middle"
                fontFamily="Inter, sans-serif" fontSize="9" fontWeight="600" style={{ fill: 'var(--text-secondary)' }}>
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
            return (
              <g key={pi}>
                {isMine && (
                  <polygon points={pStr} fill={prop.color} fillOpacity="0.18" stroke={prop.color}
                    strokeWidth="3" strokeLinejoin="round" opacity="0.25" style={{ filter: 'blur(2px)' }} />
                )}
                <polygon points={pStr} fill={prop.color}
                  fillOpacity={isMine ? 0.04 : 0.05} stroke={prop.color}
                  strokeWidth={isMine ? 2 : 1.25} strokeDasharray={isMine ? undefined : '5 3'}
                  strokeLinejoin="round" opacity={isMine ? 0.75 : 0.7} />
                {verts.map((v, di) => (
                  <circle key={di} cx={v.x.toFixed(1)} cy={v.y.toFixed(1)} r={isMine ? 4 : 2.5}
                    fill={prop.color} fillOpacity={isMine ? 0.04 : 0.05}
                    stroke={prop.color} strokeWidth={isMine ? 2 : 1.5}
                    opacity={isMine ? 0.95 : 1} />
                ))}
              </g>
            );
          })}
          <circle cx={CX} cy={CY} r="2.5" fill="rgba(23,41,81,0.15)" />
        </svg>
      </div>

      {/* Property toggles */}
      <div className="rounded-xl border p-3 flex flex-col" style={{ background: 'var(--card)', borderColor: BORDER_LIGHT }}>
        <div className="text-[0.6875rem] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: TEXT_MUTED }}>Properties</div>
        {PROPS.map((p, i) => ({ p, i, avg: p.scores.reduce((s, v) => s + v, 0) / p.scores.length }))
          .sort((a, b) => (b.p.mine ? 1 : 0) - (a.p.mine ? 1 : 0) || b.avg - a.avg)
          .map(({ p, i, avg }) => {
          const isActive = active.has(i);
          const isMine = p.mine;
          const bg = avg >= 4.5 ? SUCCESS_BG : avg >= 3.5 ? INFO_BG : WARNING_BG;
          const tc = avg >= 4.5 ? SUCCESS : avg >= 3.5 ? INFO : WARNING;
          return (
            <button
              key={i}
              onClick={() => toggleProp(i)}
              className="flex items-center gap-2.5 px-2 py-2 cursor-pointer transition-colors rounded-md text-left border-none"
              style={{
                borderBottom: '1px solid var(--border)',
                background: isMine ? ACTIVE_BG : 'transparent',
              }}
            >
              <div className="shrink-0 rounded-full" style={{ width: 22, height: isMine ? 10 : 8, background: p.color, opacity: isActive ? 1 : 0.3 }} />
              <div className="flex-1 min-w-0">
                <div className="text-[0.8125rem] truncate" style={{
                  opacity: isActive ? 1 : 0.4,
                  fontWeight: isMine ? 700 : 500,
                  color: isMine ? 'var(--primary)' : 'var(--text-primary)',
                }}>
                  {p.name}
                  {isMine && <span className="ml-1" style={{ color: GREEN_OCEAN, fontSize: '0.625rem' }}>★</span>}
                </div>
                <div className="text-[0.625rem] mt-[1px]" style={{ color: 'var(--text-secondary)' }}>{avg.toFixed(1)} avg</div>
              </div>
              <div className="shrink-0 px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: isMine ? 'var(--primary)' : bg,
                  color: isMine ? '#fff' : tc,
                  fontSize: isMine ? '0.75rem' : '0.6875rem',
                }}>
                {avg.toFixed(1)}
              </div>
            </button>
          );
        })}
        <div className="mt-3 pt-3 px-1" style={{ borderTop: `1px solid ${BORDER_LIGHT}` }}>
          <div className="text-[0.625rem] font-semibold uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>Visit Date</div>
          <div className="text-[0.8125rem] font-semibold" style={{ color: TEXT_PRIMARY }}>April 2026</div>
          <div className="text-[0.6875rem] mt-[2px]" style={{ color: TEXT_MUTED }}>Visited by: Ray Velasquez</div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ background: 'var(--card)', borderColor: BORDER_LIGHT }}>
        <div>
          <div className="text-[0.9375rem] font-semibold" style={{ color: 'var(--text-primary)' }}>Dimension Heatmap</div>
          <div className="text-[0.6875rem]" style={{ color: 'var(--text-secondary)' }}>Tap a dimension to focus · swipe table to scroll</div>
        </div>

        {/* Dimension filter chips — horizontally scrollable */}
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-1.5 min-w-min">
            {[null, 0, 1, 2, 3, 4].map((idx, i) => {
              const label = idx === null ? 'All' : DIMS[idx];
              const isActive = crit === idx;
              return (
                <button
                  key={i}
                  onClick={() => setCrit(idx)}
                  className="px-3 py-1 rounded-full text-[0.75rem] whitespace-nowrap transition-all cursor-pointer shrink-0"
                  style={{
                    border: `1px solid ${isActive ? GREEN_OCEAN : BORDER}`,
                    background: isActive ? ACTIVE_BG : 'var(--card)',
                    color: isActive ? GREEN_OCEAN : TEXT_MUTED,
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Heatmap table — horizontal scroll for wider views */}
        <div className="overflow-x-auto -mx-1">
          <table className="w-full border-collapse text-[0.75rem]">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-[0.625rem] font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: 'var(--text-secondary)', borderBottom: '2px solid var(--border)', background: 'var(--muted)', minWidth: 140, position: 'sticky', left: 0, zIndex: 1 }}>
                  Property
                </th>
                {cols.map(ci => (
                  <th key={ci} className="px-2 py-2 text-center text-[0.625rem] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--text-secondary)', borderBottom: '2px solid var(--border)', background: 'var(--muted)', minWidth: 72 }}>
                    {DIMS[ci]}
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-[0.625rem] font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: 'var(--text-secondary)', borderBottom: '2px solid var(--border)', background: 'var(--muted)' }}>
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedForHeatmap.map(prop => {
                const avg = prop.scores.reduce((s, v) => s + v, 0) / prop.scores.length;
                const avgC = heatColor(avg);
                const isOurs = prop.mine;
                return (
                  <tr key={prop.idx} style={{ background: isOurs ? ACTIVE_BG : undefined }}>
                    <td className="px-2 py-2 font-semibold whitespace-nowrap text-[0.75rem]"
                      style={{
                        borderBottom: '1px solid var(--border)',
                        color: isOurs ? 'var(--accent)' : 'var(--text-primary)',
                        fontWeight: isOurs ? 700 : 600,
                        position: 'sticky', left: 0,
                        background: isOurs ? ACTIVE_BG : 'var(--card)',
                      }}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: prop.color }} />
                        <span className="truncate max-w-[120px]">{prop.name}{isOurs ? ' ★' : ''}</span>
                      </div>
                    </td>
                    {cols.map(ci => {
                      const s = prop.scores[ci];
                      const c = heatColor(s);
                      return (
                        <td key={ci} className="p-0" style={{ borderBottom: '1px solid var(--border)' }}>
                          <div className="w-full flex flex-col items-center justify-center gap-0.5"
                            style={{ height: 42, background: c.bg }}>
                            <span className="text-[0.8125rem] font-extrabold tracking-tight" style={{ color: c.text }}>{s.toFixed(1)}</span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center px-2" style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="inline-flex items-center justify-center font-extrabold rounded-md"
                        style={{ minWidth: 36, height: 24, padding: '0 6px', fontSize: '0.75rem', background: avgC.bg, color: avgC.text }}>
                        {avg.toFixed(1)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Scale legend */}
        <div className="flex items-center gap-1.5 text-[0.6875rem] flex-wrap" style={{ color: TEXT_MUTED }}>
          <span>Scale:</span>
          <div className="flex gap-px">
            {SCALE_STEPS.map((bg, i) => (
              <div key={i} className="rounded-sm" style={{ width: 16, height: 8, background: bg, border: '0.5px solid rgba(0,0,0,0.06)' }} />
            ))}
          </div>
          <span className="text-[0.625rem]">1 below · 3 standard · 5 benchmark</span>
        </div>
      </div>
    </div>
  );
}

function MobileKpi({
  label, value, sub, accent,
}: {
  label: string; value: string; sub: string; accent: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border bg-white p-3 flex flex-col gap-1"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-[0.9375rem] font-bold leading-tight tracking-tight" style={{ color: 'var(--primary)' }}>
        {value}
      </div>
      <div className="text-[0.625rem]" style={{ color: 'var(--text-secondary)' }}>{sub}</div>
      <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: accent }} />
    </div>
  );
}
