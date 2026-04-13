'use client';

import { useMemo, useState } from 'react';
import { Eye, X, ListFilter, Layers, GitBranch, ChevronRight } from 'lucide-react';
import { Table as TableIcon } from 'lucide-react';
import {
  Action,
  AREA_COLORS, STATUS_COLORS, PRIORITY_COLORS,
  MONTHS, AREAS, STATUS_LIST, PRIORITIES,
  SEED_ACTIONS, fmtMoney, getRoi, monthIdx, fmtDate,
} from './data';

type View = 'gantt' | 'table';
type Mode = 'macro' | 'detail';

const TODAY = new Date();
const CURRENT_MONTH = TODAY.getMonth();

const selectStyle = {
  borderColor: 'var(--border)',
  color: 'var(--primary)',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23172951' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
} as const;

// ── Small presentational helpers ─────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-[10px] text-[0.6875rem] font-semibold whitespace-nowrap"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {label}
    </span>
  );
}

function DotBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-[5px] text-xs font-medium">
      <span className="w-[7px] h-[7px] rounded-full shrink-0 inline-block" style={{ background: color }} />
      {label}
    </span>
  );
}

export default function ActionPlanTrackerPage() {
  const [actions] = useState<Action[]>(SEED_ACTIONS);
  const [view, setView] = useState<View>('gantt');
  const [mode, setMode] = useState<Mode>('macro');
  const [filterHotel, setFilterHotel] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);

  // Macro = only subProjectId === 1, Detail = all
  const baseList = useMemo(
    () => (mode === 'macro' ? actions.filter((a) => a.subProjectId === 1) : actions),
    [actions, mode],
  );

  // Filtering
  const filtered = useMemo(() => {
    return baseList.filter((a) => {
      if (filterHotel && a.hotelProperty !== filterHotel) return false;
      if (filterProject && a.project !== filterProject) return false;
      if (filterArea && a.area !== filterArea) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      if (filterPriority && a.priority !== filterPriority) return false;
      if (filterOwner && a.owner !== filterOwner) return false;
      return true;
    });
  }, [baseList, filterHotel, filterProject, filterArea, filterStatus, filterPriority, filterOwner]);

  // Gantt staircase sort by start date; in Detail mode children grouped under parent
  const displayed = useMemo(() => {
    if (mode === 'macro') {
      return [...filtered].sort((a, b) => a.startDate.localeCompare(b.startDate));
    }
    const projectStart = new Map<number, string>();
    filtered.forEach((a) => {
      if (a.subProjectId === 1 && a.projectId != null) {
        projectStart.set(a.projectId, a.startDate);
      }
    });
    return [...filtered].sort((a, b) => {
      const ap = a.projectId ?? 0;
      const bp = b.projectId ?? 0;
      if (ap !== bp) {
        const aStart = projectStart.get(ap) ?? a.startDate;
        const bStart = projectStart.get(bp) ?? b.startDate;
        const cmp = aStart.localeCompare(bStart);
        if (cmp !== 0) return cmp;
        return ap - bp;
      }
      return (a.subProjectId ?? 0) - (b.subProjectId ?? 0);
    });
  }, [filtered, mode]);

  // KPI Strip stats — main projects only (subProjectId === 1)
  const stats = useMemo(() => {
    const macro = actions.filter((a) => a.subProjectId === 1);
    const totalInv = macro.reduce((sum, a) => sum + a.investmentUsd, 0);
    const totalRet = macro.reduce((sum, a) => sum + a.expectedReturnUsd, 0);
    const roiGlobal = totalInv > 0 ? Math.round(((totalRet - totalInv) / totalInv) * 100) : 0;
    const inProgress = macro.filter((a) => a.status === 'In progress').length;
    const completed = macro.filter((a) => a.status === 'Completed').length;
    const pctComp = macro.length ? Math.round((completed / macro.length) * 100) : 0;
    return { count: macro.length, totalInv, totalRet, roiGlobal, inProgress, completed, pctComp };
  }, [actions]);

  // Unique options for selects
  const hotelOptions = useMemo(
    () => Array.from(new Set(actions.map((a) => a.hotelProperty))).sort(),
    [actions],
  );
  const projectOptions = useMemo(
    () => Array.from(new Set(actions.map((a) => a.project))).sort(),
    [actions],
  );
  const ownerOptions = useMemo(
    () => Array.from(new Set(actions.map((a) => a.owner))).sort(),
    [actions],
  );

  const detailAction = detailId !== null ? actions.find((a) => a.id === detailId) : null;

  return (
    <div className="flex flex-col gap-5 font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif]" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Strategic & Planning</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--primary)' }}>Action Plan Tracker</span>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
            Action Plan Tracker
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Action tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg p-[3px] gap-0.5" style={{ background: 'var(--muted)' }}>
            <button
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[0.8125rem] font-medium border-none cursor-pointer transition-all whitespace-nowrap ${mode === 'macro' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
              style={{ color: mode === 'macro' ? 'var(--primary)' : 'var(--text-secondary)' }}
              onClick={() => setMode('macro')}
              title="Main project actions only"
            >
              <Layers size={14} /> Macro
            </button>
            <button
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[0.8125rem] font-medium border-none cursor-pointer transition-all whitespace-nowrap ${mode === 'detail' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
              style={{ color: mode === 'detail' ? 'var(--primary)' : 'var(--text-secondary)' }}
              onClick={() => setMode('detail')}
              title="Main actions and sub-actions"
            >
              <GitBranch size={14} /> Detail
            </button>
          </div>
          <div className="flex rounded-lg p-[3px] gap-0.5" style={{ background: 'var(--muted)' }}>
            <button
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[0.8125rem] font-medium border-none cursor-pointer transition-all whitespace-nowrap ${view === 'gantt' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
              style={{ color: view === 'gantt' ? 'var(--primary)' : 'var(--text-secondary)' }}
              onClick={() => setView('gantt')}
            >
              <ListFilter size={14} /> Gantt
            </button>
            <button
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[0.8125rem] font-medium border-none cursor-pointer transition-all whitespace-nowrap ${view === 'table' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
              style={{ color: view === 'table' ? 'var(--primary)' : 'var(--text-secondary)' }}
              onClick={() => setView('table')}
            >
              <TableIcon size={14} /> Table
            </button>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3 max-[1100px]:grid-cols-3 max-[720px]:grid-cols-2">
        <KpiCard label="Total actions" value={String(stats.count)} sub={`${stats.inProgress} in progress`} color="var(--primary)" />
        <KpiCard label="Total investment" value={fmtMoney(stats.totalInv)} sub="Committed budget" color="var(--primary)" />
        <KpiCard label="Expected return" value={fmtMoney(stats.totalRet)} sub="Projected benefit" color="var(--accent)" />
        <KpiCard label="Average ROI" value={`${stats.roiGlobal}%`} sub="(Return - Investment) / Investment" color="var(--accent)" />
        <KpiCard label="Completed" value={`${stats.pctComp}%`} sub={`${stats.completed} of ${stats.count} actions`} color="var(--accent-light)" />
      </div>

      {/* Filters bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <select className="h-9 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]" style={selectStyle} value={filterHotel} onChange={(e) => setFilterHotel(e.target.value)}>
            <option value="">All hotels</option>
            {hotelOptions.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <select className="h-9 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]" style={selectStyle} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="">All projects</option>
            {projectOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="h-9 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]" style={selectStyle} value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
            <option value="">All areas</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="h-9 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]" style={selectStyle} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="h-9 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]" style={selectStyle} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="h-9 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]" style={selectStyle} value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
            <option value="">All owners</option>
            {ownerOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <span className="text-[0.8125rem] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {displayed.length} action{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Views */}
      {view === 'gantt' && <GanttView filtered={displayed} onShowDetail={setDetailId} />}
      {view === 'table' && <TableView filtered={displayed} onShowDetail={setDetailId} />}

      {/* Detail panel */}
      <div
        className="fixed inset-0 z-[90] flex justify-end transition-all"
        style={{ pointerEvents: detailAction ? 'all' : 'none' }}
      >
        {detailAction && (
          <div className="fixed inset-0 bg-black/20" onClick={() => setDetailId(null)} />
        )}
        <div
          className="w-[420px] max-w-full h-screen bg-white border-l flex flex-col shadow-[-4px_0_20px_rgba(0,0,0,0.08)] transition-transform duration-300 relative z-10"
          style={{
            borderColor: 'var(--border)',
            transform: detailAction ? 'translateX(0)' : 'translateX(100%)',
          }}
        >
          {detailAction && (
            <>
              <div className="flex items-start justify-between p-5 border-b shrink-0 gap-3" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-base font-bold leading-tight m-0" style={{ color: 'var(--primary)' }}>
                  {detailAction.actionTitle}
                </h3>
                <button
                  className="w-8 h-8 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center shrink-0 transition-colors hover:bg-[#F3F4F6]"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => setDetailId(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge label={detailAction.area} color={AREA_COLORS[detailAction.area] || '#9CA3AF'} />
                  <Badge label={detailAction.status} color={STATUS_COLORS[detailAction.status]} />
                  <Badge label={detailAction.priority} color={PRIORITY_COLORS[detailAction.priority]} />
                </div>

                <DetailSection title="Description">
                  <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>
                    {detailAction.contextDescription || 'No description.'}
                  </p>
                </DetailSection>

                <DetailSection title="Details">
                  <DetailRow label="Hotel" value={detailAction.hotelProperty} />
                  <DetailRow label="Project" value={detailAction.project || '—'} />
                  <DetailRow label="Owner" value={detailAction.owner} />
                  <DetailRow label="Start date" value={fmtDate(detailAction.startDate)} />
                  <DetailRow label="End date" value={fmtDate(detailAction.endDate)} />
                  {detailAction.durationDays != null && (
                    <DetailRow label="Duration" value={`${detailAction.durationDays} days`} />
                  )}
                  <DetailRow label="KPI / Metric" value={detailAction.kpiMetric || '—'} />
                </DetailSection>

                <DetailSection title="Financial">
                  <DetailRow label="Investment" value={fmtMoney(detailAction.investmentUsd)} valueColor="#EF4444" />
                  <DetailRow label="Expected return" value={fmtMoney(detailAction.expectedReturnUsd)} valueColor="#10B981" />
                  {(() => {
                    const r = getRoi(detailAction);
                    const c = r > 0 ? '#10B981' : '#EF4444';
                    return (
                      <>
                        <DetailRow
                          label="Net benefit"
                          value={fmtMoney(detailAction.expectedReturnUsd - detailAction.investmentUsd)}
                          valueColor={c}
                        />
                        <div className="flex justify-between items-start gap-3 py-2">
                          <span className="text-[0.8125rem] shrink-0" style={{ color: 'var(--text-secondary)' }}>ROI</span>
                          <span
                            className="inline-flex items-center gap-[5px] px-2.5 py-1 rounded-xl text-[0.8125rem] font-bold ml-auto"
                            style={{ background: `${c}22`, color: c }}
                          >
                            {r > 0 ? '+' : ''}{r}%
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </DetailSection>

                {detailAction.notes && (
                  <DetailSection title="Notes">
                    <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>
                      {detailAction.notes}
                    </p>
                  </DetailSection>
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
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div
      className="bg-white rounded-lg border p-4 flex flex-col gap-1.5 transition-shadow hover:shadow-md"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      <div className="text-xl font-bold leading-tight" style={{ color }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sub}</div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-start gap-3 py-2 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-[0.8125rem] shrink-0" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-[0.8125rem] font-semibold text-right" style={{ color: valueColor || 'var(--primary)' }}>{value}</span>
    </div>
  );
}

function GanttView({ filtered, onShowDetail }: { filtered: Action[]; onShowDetail: (id: number) => void }) {
  const todayPct = (CURRENT_MONTH / 12) * 100 + (TODAY.getDate() / 31) * (100 / 12);
  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="flex border-b" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
        <div
          className="w-[280px] shrink-0 px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider border-r"
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
        >
          Action / Area
        </div>
        <div className="flex-1 grid grid-cols-12">
          {MONTHS.map((m, i) => (
            <div
              key={m}
              className="py-2.5 px-1.5 text-center text-[0.6875rem] font-semibold uppercase tracking-wider border-r"
              style={{
                color: i === CURRENT_MONTH ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: i === CURRENT_MONTH ? 700 : 600,
                borderColor: 'var(--border)',
              }}
            >
              {m}
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      {!filtered.length && (
        <div className="p-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          No actions match the current filters
        </div>
      )}
      {filtered.map((a) => {
        const color = AREA_COLORS[a.area] || '#9CA3AF';
        const eColor = STATUS_COLORS[a.status];
        const r = getRoi(a);
        const startM = a.startMonth != null ? a.startMonth - 1 : monthIdx(a.startDate);
        const endM = a.endMonth != null ? a.endMonth - 1 : (a.endDate ? monthIdx(a.endDate) : startM);
        const left = (startM / 12) * 100;
        const width = Math.max(((endM - startM + 1) / 12) * 100, 100 / 12);
        const isChild = (a.subProjectId ?? 1) > 1;
        return (
          <div
            key={a.id}
            className="flex border-b last:border-b-0 cursor-pointer transition-colors hover:bg-[#F3F4F6]"
            style={{ borderColor: 'var(--border)' }}
          >
            {/* Label column */}
            <div
              className="w-[280px] shrink-0 px-4 py-3.5 border-r flex flex-col gap-1.5"
              style={{
                borderColor: 'var(--border)',
                ...(isChild ? { paddingLeft: 32, borderLeft: '3px solid var(--border)' } : {}),
              }}
            >
              <div className="text-sm font-semibold leading-tight" style={{ color: 'var(--primary)' }}>
                {isChild && <span className="mr-1.5" style={{ color: 'var(--text-secondary)' }}>└</span>}
                {a.actionTitle}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge label={a.area} color={color} />
                <DotBadge label={a.status} color={eColor} />
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {a.owner} · {a.hotelProperty}
              </div>
            </div>

            {/* Timeline column */}
            <div className="flex-1 relative grid grid-cols-12 items-center py-2.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-full border-r"
                  style={{
                    borderColor: 'var(--border)',
                    background: i === CURRENT_MONTH ? 'rgba(0, 175, 173, 0.04)' : undefined,
                  }}
                />
              ))}
              {/* Today line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none"
                style={{ left: `${todayPct.toFixed(2)}%`, background: '#EF4444' }}
              >
                <span className="absolute top-0.5 left-1 text-[0.5625rem] font-bold tracking-wider" style={{ color: '#EF4444' }}>
                  TODAY
                </span>
              </div>
              {/* Bar */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-7 rounded-full flex items-center overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.12)] z-[2] cursor-pointer transition-all hover:-translate-y-[calc(50%+1px)] hover:shadow-[0_3px_8px_rgba(0,0,0,0.18)]"
                style={{
                  left: `calc(${left.toFixed(2)}% + 4px)`,
                  width: `calc(${width.toFixed(2)}% - 8px)`,
                  background: color,
                }}
                onClick={() => onShowDetail(a.id)}
              >
                <div
                  className="h-full flex items-center px-2.5 gap-1.5 whitespace-nowrap overflow-hidden"
                  style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
                >
                  <span className="text-[0.6875rem] font-semibold text-white overflow-hidden text-ellipsis">
                    {a.actionTitle}
                  </span>
                  {a.investmentUsd ? (
                    <span className="text-[0.6875rem] text-white/85 shrink-0">{fmtMoney(a.investmentUsd)}</span>
                  ) : null}
                  {r ? (
                    <span className="text-[0.6875rem] font-bold text-white bg-white/25 px-[5px] py-px rounded-lg shrink-0">
                      {r > 0 ? '+' : ''}{r}% ROI
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TableView({ filtered, onShowDetail }: { filtered: Action[]; onShowDetail: (id: number) => void }) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
            {['Action', 'Hotel', 'Project', 'Area', 'Owner', 'Dates', 'Investment', 'ROI', 'Status', 'Priority', ''].map((h) => (
              <th
                key={h}
                className="px-3.5 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-wider whitespace-nowrap"
                style={{ color: 'var(--text-secondary)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!filtered.length && (
            <tr>
              <td colSpan={11} className="text-center p-10" style={{ color: 'var(--text-secondary)' }}>
                No actions match the current filters
              </td>
            </tr>
          )}
          {filtered.map((a) => {
            const color = AREA_COLORS[a.area] || '#9CA3AF';
            const eColor = STATUS_COLORS[a.status];
            const pColor = PRIORITY_COLORS[a.priority];
            const r = getRoi(a);
            const roiColor = r > 0 ? '#10B981' : r < 0 ? '#EF4444' : 'var(--text-secondary)';
            const isChild = (a.subProjectId ?? 1) > 1;
            return (
              <tr
                key={a.id}
                className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-[#F3F4F6]"
                style={{ borderColor: 'var(--border)' }}
                onClick={() => onShowDetail(a.id)}
              >
                <td
                  className="px-3.5 py-3 text-sm font-semibold max-w-[200px]"
                  style={isChild ? { paddingLeft: 32, borderLeft: '3px solid var(--border)' } : undefined}
                >
                  <div className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                    {isChild && <span className="mr-1.5" style={{ color: 'var(--text-secondary)' }}>└</span>}
                    {a.actionTitle}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {a.contextDescription.slice(0, 60)}{a.contextDescription.length > 60 ? '…' : ''}
                  </div>
                </td>
                <td className="px-3.5 py-3 text-[0.8125rem]" style={{ color: 'var(--text-secondary)' }}>{a.hotelProperty}</td>
                <td className="px-3.5 py-3 text-[0.8125rem]" style={{ color: 'var(--text-secondary)' }}>{a.project}</td>
                <td className="px-3.5 py-3"><Badge label={a.area} color={color} /></td>
                <td className="px-3.5 py-3 text-[0.8125rem]" style={{ color: 'var(--text-secondary)' }}>{a.owner}</td>
                <td className="px-3.5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  {fmtDate(a.startDate)}<br />
                  <span style={{ color: 'var(--text-secondary)' }}>→ {fmtDate(a.endDate)}</span>
                </td>
                <td className="px-3.5 py-3 text-sm font-semibold whitespace-nowrap" style={{ color: '#EF4444' }}>
                  {fmtMoney(a.investmentUsd)}
                </td>
                <td className="px-3.5 py-3 font-bold" style={{ color: roiColor }}>
                  {r > 0 ? '+' : ''}{r}%
                </td>
                <td className="px-3.5 py-3"><DotBadge label={a.status} color={eColor} /></td>
                <td className="px-3.5 py-3"><Badge label={a.priority} color={pColor} /></td>
                <td className="px-3.5 py-3">
                  <button
                    className="w-7 h-7 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center transition-colors hover:bg-[#F3F4F6]"
                    style={{ color: 'var(--text-secondary)' }}
                    title="View details"
                    onClick={(e) => { e.stopPropagation(); onShowDetail(a.id); }}
                  >
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
