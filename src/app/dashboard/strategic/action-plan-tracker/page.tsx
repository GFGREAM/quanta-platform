'use client';

import { useMemo, useState } from 'react';
import { Eye, X, Table as TableIcon, ListFilter, Layers, GitBranch } from 'lucide-react';
import s from './action-plan-tracker.module.css';
import {
  Accion,
  AREA_COLORS, ESTATUS_COLORS, PRIORIDAD_COLORS,
  MESES, AREAS, ESTATUS_LIST, PRIORIDADES,
  SEED_ACCIONES, fmtMoney, getRoi, mesIdx, fmtDate,
} from './data';

type View = 'gantt' | 'tabla';
type Mode = 'macro' | 'detalle';

const TODAY = new Date();
const CURRENT_MONTH = TODAY.getMonth();

// ── Small presentational helpers ─────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={s.badge}
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {label}
    </span>
  );
}
function DotBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={s.dotBadge}>
      <span className={s.dot} style={{ background: color }} />
      {label}
    </span>
  );
}

export default function ActionPlanTrackerPage() {
  const [acciones] = useState<Accion[]>(SEED_ACCIONES);
  const [view, setView] = useState<View>('gantt');
  const [mode, setMode] = useState<Mode>('macro');
  const [fHotel, setFHotel] = useState('');
  const [fProyecto, setFProyecto] = useState('');
  const [fArea, setFArea] = useState('');
  const [fEstatus, setFEstatus] = useState('');
  const [fPrioridad, setFPrioridad] = useState('');
  const [fResponsable, setFResponsable] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);

  // ── Macro = solo subIdProyecto === 1, Detalle = todas ──────
  const baseList = useMemo(
    () => (mode === 'macro' ? acciones.filter((a) => a.subIdProyecto === 1) : acciones),
    [acciones, mode],
  );

  // ── Filtering ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    return baseList.filter((a) => {
      if (fHotel && a.hotelPropiedad !== fHotel) return false;
      if (fProyecto && a.proyecto !== fProyecto) return false;
      if (fArea && a.area !== fArea) return false;
      if (fEstatus && a.estatus !== fEstatus) return false;
      if (fPrioridad && a.prioridad !== fPrioridad) return false;
      if (fResponsable && a.responsable !== fResponsable) return false;
      return true;
    });
  }, [baseList, fHotel, fProyecto, fArea, fEstatus, fPrioridad, fResponsable]);

  // Orden tipo Gantt — escalera por fecha de inicio.
  // En modo Detalle: los hijos quedan agrupados debajo de su padre,
  // y los proyectos se ordenan por la fecha de inicio del padre.
  const displayed = useMemo(() => {
    if (mode === 'macro') {
      return [...filtered].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
    }
    // Detalle: precalcular fecha de inicio del padre por proyecto
    const projectStart = new Map<number, string>();
    filtered.forEach((a) => {
      if (a.subIdProyecto === 1 && a.idProyecto != null) {
        projectStart.set(a.idProyecto, a.fechaInicio);
      }
    });
    return [...filtered].sort((a, b) => {
      const ap = a.idProyecto ?? 0;
      const bp = b.idProyecto ?? 0;
      if (ap !== bp) {
        const aStart = projectStart.get(ap) ?? a.fechaInicio;
        const bStart = projectStart.get(bp) ?? b.fechaInicio;
        const cmp = aStart.localeCompare(bStart);
        if (cmp !== 0) return cmp;
        return ap - bp;
      }
      return (a.subIdProyecto ?? 0) - (b.subIdProyecto ?? 0);
    });
  }, [filtered, mode]);

  // ── KPI Strip stats — always MACRO only ────────────────────
  const stats = useMemo(() => {
    const macro = acciones.filter((a) => a.subIdProyecto === 1);
    const totalInv = macro.reduce((sum, a) => sum + a.inversionUsd, 0);
    const totalRet = macro.reduce((sum, a) => sum + a.retornoEsperadoUsd, 0);
    const roiGlobal = totalInv > 0 ? Math.round(((totalRet - totalInv) / totalInv) * 100) : 0;
    const enProgreso = macro.filter((a) => a.estatus === 'In progress').length;
    const completadas = macro.filter((a) => a.estatus === 'Completed').length;
    const pctComp = macro.length ? Math.round((completadas / macro.length) * 100) : 0;
    return { count: macro.length, totalInv, totalRet, roiGlobal, enProgreso, completadas, pctComp };
  }, [acciones]);

  // Opciones únicas para los selects (a partir del dataset actual)
  const hotelOptions = useMemo(
    () => Array.from(new Set(acciones.map((a) => a.hotelPropiedad))).sort(),
    [acciones],
  );
  const proyectoOptions = useMemo(
    () => Array.from(new Set(acciones.map((a) => a.proyecto))).sort(),
    [acciones],
  );
  const responsableOptions = useMemo(
    () => Array.from(new Set(acciones.map((a) => a.responsable))).sort(),
    [acciones],
  );

  const detailAccion = detailId !== null ? acciones.find((a) => a.id === detailId) : null;

  return (
    <div className={s.root}>
      {/* ── Title row ─────────────────────────────────────── */}
      <div className={s.titleRow}>
        <div>
          <h1 className={s.title}>Action Plan Tracker</h1>
          <p className={s.subtitle}>Action tracking</p>
        </div>
        <div className={s.titleRight}>
          <div className={s.viewTabs}>
            <button
              className={`${s.viewTab} ${mode === 'macro' ? s.viewTabActive : ''}`}
              onClick={() => setMode('macro')}
              title="Main project actions only"
            >
              <Layers size={14} /> Macro
            </button>
            <button
              className={`${s.viewTab} ${mode === 'detalle' ? s.viewTabActive : ''}`}
              onClick={() => setMode('detalle')}
              title="Main actions and sub-actions"
            >
              <GitBranch size={14} /> Detail
            </button>
          </div>
          <div className={s.viewTabs}>
            <button
              className={`${s.viewTab} ${view === 'gantt' ? s.viewTabActive : ''}`}
              onClick={() => setView('gantt')}
            >
              <ListFilter size={14} /> Gantt
            </button>
            <button
              className={`${s.viewTab} ${view === 'tabla' ? s.viewTabActive : ''}`}
              onClick={() => setView('tabla')}
            >
              <TableIcon size={14} /> Table
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Strip (always macro) ──────────────────────── */}
      <div className={s.kpiStrip}>
        <KpiCard label="Total actions" value={String(stats.count)} sub={`${stats.enProgreso} in progress`} color="#172951" />
        <KpiCard label="Total investment" value={fmtMoney(stats.totalInv)} sub="Committed budget" color="#172951" />
        <KpiCard label="Expected return" value={fmtMoney(stats.totalRet)} sub="Projected benefit" color="#00AFAD" />
        <KpiCard
          label="Average ROI"
          value={`${stats.roiGlobal}%`}
          sub="(Return - Investment) / Investment"
          color="#00AFAD"
        />
        <KpiCard label="Completed" value={`${stats.pctComp}%`} sub={`${stats.completadas} of ${stats.count} actions`} color="#69D9D0" />
      </div>

      {/* ── Filters bar ───────────────────────────────────── */}
      <div className={s.filtersBar}>
        <div className={s.filtersLeft}>
          <select className={s.filterSelect} value={fHotel} onChange={(e) => setFHotel(e.target.value)}>
            <option value="">All hotels</option>
            {hotelOptions.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <select className={s.filterSelect} value={fProyecto} onChange={(e) => setFProyecto(e.target.value)}>
            <option value="">All projects</option>
            {proyectoOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className={s.filterSelect} value={fArea} onChange={(e) => setFArea(e.target.value)}>
            <option value="">All areas</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className={s.filterSelect} value={fEstatus} onChange={(e) => setFEstatus(e.target.value)}>
            <option value="">All statuses</option>
            {ESTATUS_LIST.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select className={s.filterSelect} value={fPrioridad} onChange={(e) => setFPrioridad(e.target.value)}>
            <option value="">All priorities</option>
            {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className={s.filterSelect} value={fResponsable} onChange={(e) => setFResponsable(e.target.value)}>
            <option value="">All owners</option>
            {responsableOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <span className={s.resultsCount}>
            {displayed.length} action{displayed.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Views ─────────────────────────────────────────── */}
      {view === 'gantt' && <GanttView filtered={displayed} onShowDetail={setDetailId} />}
      {view === 'tabla' && <TableView filtered={displayed} onShowDetail={setDetailId} />}

      {/* ── Detail panel ──────────────────────────────────── */}
      <div className={`${s.detailOverlay} ${detailAccion ? s.detailOverlayOpen : ''}`}>
        <div className={s.detailBox}>
          {detailAccion && (
            <>
              <div className={s.detailHeader}>
                <h3 className={s.detailTitle}>{detailAccion.tituloAccion}</h3>
                <div className={s.detailActions}>
                  <button className={s.modalClose} onClick={() => setDetailId(null)}>
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className={s.detailBody}>
                <div className={s.badgeRow}>
                  <Badge label={detailAccion.area} color={AREA_COLORS[detailAccion.area] || '#9CA3AF'} />
                  <Badge label={detailAccion.estatus} color={ESTATUS_COLORS[detailAccion.estatus]} />
                  <Badge label={detailAccion.prioridad} color={PRIORIDAD_COLORS[detailAccion.prioridad]} />
                </div>

                <div className={s.detailSection}>
                  <div className={s.detailSectionTitle}>Description</div>
                  <p className={s.detailDesc}>{detailAccion.descripcionContexto || 'No description.'}</p>
                </div>

                <div className={s.detailSection}>
                  <div className={s.detailSectionTitle}>Details</div>
                  <DetailRow label="Hotel" value={detailAccion.hotelPropiedad} />
                  <DetailRow label="Project" value={detailAccion.proyecto || '—'} />
                  <DetailRow label="Owner" value={detailAccion.responsable} />
                  <DetailRow label="Start date" value={fmtDate(detailAccion.fechaInicio)} />
                  <DetailRow label="End date" value={fmtDate(detailAccion.fechaFin)} />
                  {detailAccion.duracionDias != null && (
                    <DetailRow label="Duration" value={`${detailAccion.duracionDias} days`} />
                  )}
                  <DetailRow label="KPI / Metric" value={detailAccion.kpiMetrica || '—'} />
                </div>

                <div className={s.detailSection}>
                  <div className={s.detailSectionTitle}>Financial</div>
                  <DetailRow label="Investment" value={fmtMoney(detailAccion.inversionUsd)} valueColor="#EF4444" />
                  <DetailRow label="Expected return" value={fmtMoney(detailAccion.retornoEsperadoUsd)} valueColor="#10B981" />
                  {(() => {
                    const r = getRoi(detailAccion);
                    const c = r > 0 ? '#10B981' : '#EF4444';
                    return (
                      <>
                        <DetailRow
                          label="Net benefit"
                          value={fmtMoney(detailAccion.retornoEsperadoUsd - detailAccion.inversionUsd)}
                          valueColor={c}
                        />
                        <div className={s.detailRow}>
                          <span className={s.detailKey}>ROI</span>
                          <span className={s.roiPill} style={{ background: `${c}22`, color: c }}>
                            {r > 0 ? '+' : ''}{r}%
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {detailAccion.notasComentarios && (
                  <div className={s.detailSection}>
                    <div className={s.detailSectionTitle}>Notes</div>
                    <p className={s.detailDesc}>{detailAccion.notasComentarios}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────
function KpiCard({
  label, value, sub, color, trend,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  trend?: 'positive' | 'negative';
}) {
  return (
    <div className={s.kpiCard}>
      <div className={s.kpiLabel}>{label}</div>
      <div className={s.kpiValue} style={{ color }}>{value}</div>
      <div className={s.kpiSub}>{sub}</div>
      {trend && (
        <div className={`${s.kpiTrend} ${trend === 'positive' ? s.kpiTrendPositive : s.kpiTrendNegative}`}>
          {trend === 'positive' ? '▲' : '▼'}
        </div>
      )}
    </div>
  );
}

function GanttView({
  filtered, onShowDetail,
}: {
  filtered: Accion[];
  onShowDetail: (id: number) => void;
}) {
  const todayPct = (CURRENT_MONTH / 12) * 100 + (TODAY.getDate() / 31) * (100 / 12);
  return (
    <div className={s.ganttCard}>
      <div className={s.ganttHeaderRow}>
        <div className={s.ganttLabelCol}>Action / Area</div>
        <div className={s.ganttMonths}>
          {MESES.map((m, i) => (
            <div key={m} className={`${s.ganttMonth} ${i === CURRENT_MONTH ? s.ganttMonthCurrent : ''}`}>
              {m}
            </div>
          ))}
        </div>
      </div>
      <div>
        {!filtered.length && (
          <div className={s.empty}>No actions match the current filters</div>
        )}
        {filtered.map((a) => {
          const color = AREA_COLORS[a.area] || '#9CA3AF';
          const eColor = ESTATUS_COLORS[a.estatus];
          const r = getRoi(a);
          const startM = a.mesInicio != null ? a.mesInicio - 1 : mesIdx(a.fechaInicio);
          const endM = a.mesFin != null ? a.mesFin - 1 : (a.fechaFin ? mesIdx(a.fechaFin) : startM);
          const left = (startM / 12) * 100;
          const width = Math.max(((endM - startM + 1) / 12) * 100, 100 / 12);
          const isChild = (a.subIdProyecto ?? 1) > 1;
          return (
            <div key={a.id} className={s.ganttRow}>
              <div
                className={s.ganttRowLabel}
                style={isChild ? { paddingLeft: 32, borderLeft: '3px solid #E5E5E5' } : undefined}
              >
                <div className={s.ganttRowTitle}>
                  {isChild && <span style={{ color: '#9CA3AF', marginRight: 6 }}>└</span>}
                  {a.tituloAccion}
                </div>
                <div className={s.ganttRowMeta}>
                  <Badge label={a.area} color={color} />
                  <DotBadge label={a.estatus} color={eColor} />
                </div>
                <div className={s.ganttRowSub}>{a.responsable} · {a.hotelPropiedad}</div>
              </div>
              <div className={s.ganttRowTimeline}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={`${s.ganttColBg} ${i === CURRENT_MONTH ? s.ganttColBgCurrent : ''}`} />
                ))}
                <div className={s.ganttTodayLine} style={{ left: `${todayPct.toFixed(2)}%` }} />
                <div
                  className={s.ganttBarWrapper}
                  style={{
                    left: `calc(${left.toFixed(2)}% + 4px)`,
                    width: `calc(${width.toFixed(2)}% - 8px)`,
                    background: color,
                  }}
                  onClick={() => onShowDetail(a.id)}
                >
                  <div className={s.ganttBarInner} style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}>
                    <span className={s.ganttBarText}>{a.tituloAccion}</span>
                    {a.inversionUsd ? <span className={s.ganttInvest}>{fmtMoney(a.inversionUsd)}</span> : null}
                    {r ? <span className={s.ganttBarRoi}>{r > 0 ? '+' : ''}{r}% ROI</span> : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableView({
  filtered, onShowDetail,
}: {
  filtered: Accion[];
  onShowDetail: (id: number) => void;
}) {
  return (
    <div className={s.tableCard}>
      <table className={s.dataTable}>
        <thead>
          <tr>
            <th>Action</th><th>Hotel</th><th>Project</th><th>Area</th><th>Owner</th>
            <th>Dates</th><th>Investment</th><th>ROI</th><th>Status</th>
            <th>Priority</th><th></th>
          </tr>
        </thead>
        <tbody>
          {!filtered.length && (
            <tr>
              <td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                No actions match the current filters
              </td>
            </tr>
          )}
          {filtered.map((a) => {
            const color = AREA_COLORS[a.area] || '#9CA3AF';
            const eColor = ESTATUS_COLORS[a.estatus];
            const pColor = PRIORIDAD_COLORS[a.prioridad];
            const r = getRoi(a);
            const roiCls = r > 0 ? s.tdRoiPositive : r < 0 ? s.tdRoiNegative : s.tdRoiNeutral;
            const isChild = (a.subIdProyecto ?? 1) > 1;
            return (
              <tr key={a.id} onClick={() => onShowDetail(a.id)}>
                <td className={s.tdTitle} style={isChild ? { paddingLeft: 32, borderLeft: '3px solid #E5E5E5' } : undefined}>
                  <div className={s.tdTitleMain}>
                    {isChild && <span style={{ color: '#9CA3AF', marginRight: 6 }}>└</span>}
                    {a.tituloAccion}
                  </div>
                  <div className={s.tdTitleSub}>
                    {a.descripcionContexto.slice(0, 60)}{a.descripcionContexto.length > 60 ? '…' : ''}
                  </div>
                </td>
                <td className={s.tdSecondary}>{a.hotelPropiedad}</td>
                <td className={s.tdSecondary}>{a.proyecto}</td>
                <td><Badge label={a.area} color={color} /></td>
                <td className={s.tdSecondary}>{a.responsable}</td>
                <td className={s.tdDates}>
                  {fmtDate(a.fechaInicio)}<br />
                  <span style={{ color: '#9CA3AF' }}>→ {fmtDate(a.fechaFin)}</span>
                </td>
                <td className={s.tdMoney} style={{ color: '#EF4444' }}>{fmtMoney(a.inversionUsd)}</td>
                <td className={`${s.tdRoi} ${roiCls}`}>{r > 0 ? '+' : ''}{r}%</td>
                <td><DotBadge label={a.estatus} color={eColor} /></td>
                <td><Badge label={a.prioridad} color={pColor} /></td>
                <td>
                  <div className={s.tdActions}>
                    <button
                      className={s.actionBtn}
                      title="View details"
                      onClick={(e) => { e.stopPropagation(); onShowDetail(a.id); }}
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className={s.detailRow}>
      <span className={s.detailKey}>{label}</span>
      <span className={s.detailVal} style={valueColor ? { color: valueColor } : undefined}>{value}</span>
    </div>
  );
}
