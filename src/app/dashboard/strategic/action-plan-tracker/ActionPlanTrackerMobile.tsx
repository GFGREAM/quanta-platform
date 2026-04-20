'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, SlidersHorizontal, X, Layers, GitBranch } from 'lucide-react';
import {
  Action,
  AREA_COLORS, STATUS_COLORS, PRIORITY_COLORS,
  STATUS_LIST, PRIORITIES,
  SEED_ACTIONS, fmtMoney, getRoi, fmtDate,
} from './data';
import { Badge, DotBadge, ActionDetailPanel, dayPct } from './ui';

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

export default function ActionPlanTrackerMobile() {
  const [actions] = useState<Action[]>(SEED_ACTIONS);
  const [mode, setMode] = useState<Mode>('macro');
  const [filterHotel, setFilterHotel] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount =
    (filterHotel ? 1 : 0) +
    (filterProject ? 1 : 0) +
    (filterArea ? 1 : 0) +
    (filterStatus ? 1 : 0) +
    (filterPriority ? 1 : 0) +
    (filterOwner ? 1 : 0);

  const baseList = useMemo(
    () => (mode === 'macro' ? actions.filter((a) => a.subProjectId === 1) : actions),
    [actions, mode],
  );

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

  const stats = useMemo(() => {
    const projectKeys = new Set<string>();
    filtered.forEach((a) => {
      if (a.projectId != null) projectKeys.add(`${a.hotelId ?? 'x'}::${a.projectId}`);
    });
    const macro = actions.filter(
      (a) =>
        a.subProjectId === 1 &&
        a.projectId != null &&
        projectKeys.has(`${a.hotelId ?? 'x'}::${a.projectId}`),
    );
    const totalInv = macro.reduce((sum, a) => sum + a.investmentUsd, 0);
    const totalRet = macro.reduce((sum, a) => sum + a.expectedReturnUsd, 0);
    const roiGlobal = totalInv > 0 ? Math.round(((totalRet - totalInv) / totalInv) * 100) : 0;
    const inProgress = macro.filter((a) => a.status === 'In progress').length;
    const completed = macro.filter((a) => a.status === 'Completed').length;
    const pctComp = macro.length ? Math.round((completed / macro.length) * 100) : 0;
    return { count: macro.length, totalInv, totalRet, roiGlobal, inProgress, completed, pctComp };
  }, [actions, filtered]);

  const hotelOptions = useMemo(() => Array.from(new Set(actions.map((a) => a.hotelProperty))).sort(), [actions]);
  const projectOptions = useMemo(() => Array.from(new Set(actions.map((a) => a.project))).sort(), [actions]);
  const areaOptions = useMemo(() => Array.from(new Set(actions.map((a) => a.area))).sort(), [actions]);
  const statusOptionsSet = useMemo(() => new Set(actions.map((a) => a.status)), [actions]);
  const priorityOptionsSet = useMemo(() => new Set(actions.map((a) => a.priority)), [actions]);
  const ownerOptions = useMemo(() => Array.from(new Set(actions.map((a) => a.owner))).sort(), [actions]);

  const detailAction = detailId !== null ? actions.find((a) => a.id === detailId) ?? null : null;

  const clearAll = () => {
    setFilterHotel(''); setFilterProject(''); setFilterArea('');
    setFilterStatus(''); setFilterPriority(''); setFilterOwner('');
  };

  return (
    <div className="flex flex-col gap-4" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>Strategic</span>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--primary)' }}>Action Plan Tracker</span>
      </div>

      {/* Title + Mode toggle */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
            Action Plan Tracker
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Action tracking</p>
        </div>
        <div className="flex rounded-lg p-[3px] gap-0.5" style={{ background: 'var(--muted)' }}>
          <button
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.75rem] font-medium border-none cursor-pointer transition-all ${mode === 'macro' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
            style={{ color: mode === 'macro' ? 'var(--primary)' : 'var(--text-secondary)' }}
            onClick={() => setMode('macro')}
          >
            <Layers size={12} /> Macro
          </button>
          <button
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.75rem] font-medium border-none cursor-pointer transition-all ${mode === 'detail' ? 'bg-white shadow-sm' : 'bg-transparent'}`}
            style={{ color: mode === 'detail' ? 'var(--primary)' : 'var(--text-secondary)' }}
            onClick={() => setMode('detail')}
          >
            <GitBranch size={12} /> Detail
          </button>
        </div>
      </div>

      {/* Filters button */}
      <button
        onClick={() => setFiltersOpen(true)}
        className="flex items-center justify-between gap-3 bg-white border rounded-lg px-3 py-2.5 cursor-pointer text-left"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SlidersHorizontal size={16} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-[0.8125rem]" style={{ color: 'var(--primary)' }}>
            {activeFilterCount === 0 ? 'All filters' : `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
          </span>
        </div>
        <span className="text-[0.8125rem] font-medium shrink-0" style={{ color: 'var(--text-secondary)' }}>
          {displayed.length} action{displayed.length !== 1 ? 's' : ''}
        </span>
      </button>

      {/* KPI carousel */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-2.5 min-w-min">
          <MobileKpi label="Total actions" value={String(stats.count)} sub={`${stats.inProgress} in progress`} color="var(--primary)" />
          <MobileKpi label="Total investment" value={fmtMoney(stats.totalInv)} sub="Committed" color="var(--primary)" />
          <MobileKpi label="Expected return" value={fmtMoney(stats.totalRet)} sub="Projected" color="var(--accent)" />
          <MobileKpi label="Average ROI" value={`${stats.roiGlobal}%`} sub="(Ret - Inv) / Inv" color="var(--accent)" />
          <MobileKpi label="Completed" value={`${stats.pctComp}%`} sub={`${stats.completed} of ${stats.count}`} color="var(--accent-light)" />
        </div>
      </div>

      {/* Action cards list */}
      {!displayed.length ? (
        <div className="bg-white border rounded-lg p-8 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          No actions match the current filters
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {displayed.map((a) => (
            <MobileActionCard key={a.id} action={a} onTap={() => setDetailId(a.id)} />
          ))}
        </div>
      )}

      <ActionDetailPanel action={detailAction} onClose={() => setDetailId(null)} />

      {filtersOpen && (
        <FilterSheet
          filterHotel={filterHotel} setFilterHotel={setFilterHotel}
          filterProject={filterProject} setFilterProject={setFilterProject}
          filterArea={filterArea} setFilterArea={setFilterArea}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          filterPriority={filterPriority} setFilterPriority={setFilterPriority}
          filterOwner={filterOwner} setFilterOwner={setFilterOwner}
          hotelOptions={hotelOptions}
          projectOptions={projectOptions}
          areaOptions={areaOptions}
          statusOptions={STATUS_LIST.filter((s) => statusOptionsSet.has(s))}
          priorityOptions={PRIORITIES.filter((p) => priorityOptionsSet.has(p))}
          ownerOptions={ownerOptions}
          onClose={() => setFiltersOpen(false)}
          onClear={clearAll}
          activeCount={activeFilterCount}
        />
      )}
    </div>
  );
}

// ─── KPI (mobile carousel card) ──────────────────────────────
function MobileKpi({
  label, value, sub, color,
}: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div
      className="shrink-0 w-[180px] rounded-lg border bg-white p-3 flex flex-col gap-1.5"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-lg font-bold leading-tight tracking-tight" style={{ color }}>
        {value}
      </div>
      <div className="text-[0.6875rem]" style={{ color: 'var(--text-secondary)' }}>{sub}</div>
    </div>
  );
}

// ─── Action card (replaces Gantt row / table row) ────────────
function MobileActionCard({ action, onTap }: { action: Action; onTap: () => void }) {
  const color = AREA_COLORS[action.area] || '#9CA3AF';
  const sColor = STATUS_COLORS[action.status];
  const pColor = PRIORITY_COLORS[action.priority];
  const r = getRoi(action);
  const roiColor = r > 0 ? '#10B981' : r < 0 ? '#EF4444' : 'var(--text-secondary)';
  const isChild = (action.subProjectId ?? 1) > 1;

  const left = dayPct(action.startDate);
  const endBase = action.endDate || action.startDate;
  const right = Math.max(dayPct(endBase), left);
  const width = Math.max(right - left, 0.8);
  const todayDim = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate();
  const todayPct = ((CURRENT_MONTH + (TODAY.getDate() - 1) / todayDim) / 12) * 100;

  return (
    <button
      onClick={onTap}
      className="bg-white border rounded-lg p-3.5 flex flex-col gap-2.5 text-left cursor-pointer"
      style={{
        borderColor: 'var(--border)',
        ...(isChild ? { borderLeft: '3px solid var(--border)' } : {}),
      }}
    >
      {/* Title */}
      <div className="text-[0.9375rem] font-semibold leading-tight" style={{ color: 'var(--primary)' }}>
        {isChild && <span className="mr-1.5" style={{ color: 'var(--text-secondary)' }}>└</span>}
        {action.actionTitle}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge label={action.area} color={color} />
        <DotBadge label={action.status} color={sColor} />
        <Badge label={action.priority} color={pColor} />
      </div>

      {/* Owner · Hotel */}
      <div className="text-[0.75rem]" style={{ color: 'var(--text-secondary)' }}>
        {action.owner} · {action.hotelProperty}
      </div>

      {/* Mini timeline */}
      <div className="flex flex-col gap-1">
        <div className="relative h-2 rounded-sm" style={{ background: 'var(--muted)' }}>
          <div
            className="absolute top-0 h-full rounded-sm"
            style={{
              left: `${left.toFixed(2)}%`,
              width: `${width.toFixed(2)}%`,
              background: color,
            }}
          />
          <div
            className="absolute top-0 h-full w-0.5 pointer-events-none"
            style={{ left: `${todayPct.toFixed(2)}%`, background: '#EF4444' }}
          />
        </div>
        <div className="flex items-center justify-between text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>
          <span>{fmtDate(action.startDate)}</span>
          <span>→ {fmtDate(action.endDate)}</span>
        </div>
      </div>

      {/* Investment + ROI */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-col">
          <span className="text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Investment
          </span>
          <span className="text-[0.8125rem] font-semibold" style={{ color: '#EF4444' }}>
            {fmtMoney(action.investmentUsd)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            ROI
          </span>
          <span
            className="text-[0.8125rem] font-bold px-2 py-0.5 rounded-md"
            style={{ background: `${roiColor}22`, color: roiColor }}
          >
            {r > 0 ? '+' : ''}{r}%
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Filter sheet ────────────────────────────────────────────
function FilterSheet({
  filterHotel, setFilterHotel,
  filterProject, setFilterProject,
  filterArea, setFilterArea,
  filterStatus, setFilterStatus,
  filterPriority, setFilterPriority,
  filterOwner, setFilterOwner,
  hotelOptions, projectOptions, areaOptions,
  statusOptions, priorityOptions, ownerOptions,
  onClose, onClear, activeCount,
}: {
  filterHotel: string; setFilterHotel: (v: string) => void;
  filterProject: string; setFilterProject: (v: string) => void;
  filterArea: string; setFilterArea: (v: string) => void;
  filterStatus: string; setFilterStatus: (v: string) => void;
  filterPriority: string; setFilterPriority: (v: string) => void;
  filterOwner: string; setFilterOwner: (v: string) => void;
  hotelOptions: string[]; projectOptions: string[]; areaOptions: string[];
  statusOptions: string[]; priorityOptions: string[]; ownerOptions: string[];
  onClose: () => void; onClear: () => void; activeCount: number;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end"
      style={{ background: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-h-[85vh] overflow-y-auto bg-white rounded-t-2xl p-5 flex flex-col gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between sticky top-0 bg-white -mx-5 px-5 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-base font-bold m-0" style={{ color: 'var(--primary)' }}>Filters</h3>
          <div className="flex items-center gap-1">
            {activeCount > 0 && (
              <button
                onClick={onClear}
                className="px-2 py-1 text-[0.75rem] font-medium cursor-pointer bg-transparent border-none"
                style={{ color: 'var(--accent)' }}
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <FilterRow label="Hotel">
          <MobileSelect value={filterHotel} onChange={setFilterHotel} placeholder="All hotels" options={hotelOptions} />
        </FilterRow>
        <FilterRow label="Project">
          <MobileSelect value={filterProject} onChange={setFilterProject} placeholder="All projects" options={projectOptions} />
        </FilterRow>
        <FilterRow label="Area">
          <MobileSelect value={filterArea} onChange={setFilterArea} placeholder="All areas" options={areaOptions} />
        </FilterRow>
        <FilterRow label="Status">
          <MobileSelect value={filterStatus} onChange={setFilterStatus} placeholder="All statuses" options={statusOptions} />
        </FilterRow>
        <FilterRow label="Priority">
          <MobileSelect value={filterPriority} onChange={setFilterPriority} placeholder="All priorities" options={priorityOptions} />
        </FilterRow>
        <FilterRow label="Owner">
          <MobileSelect value={filterOwner} onChange={setFilterOwner} placeholder="All owners" options={ownerOptions} />
        </FilterRow>

        <button
          onClick={onClose}
          className="h-11 rounded-md text-sm font-semibold cursor-pointer mt-2"
          style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function MobileSelect({
  value, onChange, placeholder, options,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; options: string[];
}) {
  return (
    <select
      className="w-full h-10 px-3 pr-8 rounded-md border text-sm bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
      style={selectStyle}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
