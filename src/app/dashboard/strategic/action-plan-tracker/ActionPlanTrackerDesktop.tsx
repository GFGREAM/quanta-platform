'use client';

import { useMemo, useRef, useState } from 'react';
import { Eye, ListFilter, Layers, GitBranch, ChevronRight, Table as TableIcon, Download } from 'lucide-react';
import KpiCard from '@/components/ui/KpiCard';
import { selectStyle } from '@/lib/selectStyle';
import {
  Action,
  AREA_COLORS, STATUS_COLORS, PRIORITY_COLORS,
  MONTHS, STATUS_LIST, PRIORITIES,
  fmtMoney, getRoi, fmtDate,
  TODAY, CURRENT_MONTH,
  occurrenceDates,
} from './data';
import { Badge, DotBadge, ActionDetailPanel, dayPct } from './ui';
import { useActionPlan } from './useActionPlan';

type View = 'gantt' | 'table';

type GanttFilters = {
  hotel: string;
  project: string;
  area: string;
  status: string;
  priority: string;
  owner: string;
};

export default function ActionPlanTrackerDesktop() {
  const {
    actions,
    mode, setMode,
    filterHotel, setFilterHotel,
    filterProject, setFilterProject,
    filterArea, setFilterArea,
    filterStatus, setFilterStatus,
    filterPriority, setFilterPriority,
    filterOwner, setFilterOwner,
    setDetailId,
    displayed, stats, detailAction, optionsFor,
  } = useActionPlan();
  const [view, setView] = useState<View>('gantt');

  const hotelOptions = useMemo(
    () => Array.from(new Set(optionsFor('hotel').map((a) => a.hotelProperty))).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions, filterProject, filterArea, filterStatus, filterPriority, filterOwner],
  );
  const projectOptions = useMemo(
    () => Array.from(new Set(optionsFor('project').map((a) => a.project))).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions, filterHotel, filterArea, filterStatus, filterPriority, filterOwner],
  );
  const areaOptions = useMemo(
    () => Array.from(new Set(optionsFor('area').map((a) => a.area))).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions, filterHotel, filterProject, filterStatus, filterPriority, filterOwner],
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(optionsFor('status').map((a) => a.status))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions, filterHotel, filterProject, filterArea, filterPriority, filterOwner],
  );
  const priorityOptions = useMemo(
    () => Array.from(new Set(optionsFor('priority').map((a) => a.priority))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions, filterHotel, filterProject, filterArea, filterStatus, filterOwner],
  );
  const ownerOptions = useMemo(
    () => Array.from(new Set(optionsFor('owner').map((a) => a.owner))).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions, filterHotel, filterProject, filterArea, filterStatus, filterPriority],
  );

  return (
    <div className="flex flex-col gap-5 font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif]" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Strategy & Planning</span>
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
          <select className="h-9 w-44 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]" style={selectStyle} value={filterHotel} onChange={(e) => setFilterHotel(e.target.value)}>
            <option value="">All hotels</option>
            {hotelOptions.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <select className="h-9 w-44 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]" style={selectStyle} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="">All projects</option>
            {projectOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="h-9 w-44 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]" style={selectStyle} value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
            <option value="">All areas</option>
            {areaOptions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="h-9 w-44 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]" style={selectStyle} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_LIST.filter((s) => statusOptions.includes(s)).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="h-9 w-44 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]" style={selectStyle} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All priorities</option>
            {PRIORITIES.filter((p) => priorityOptions.includes(p)).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="h-9 w-44 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]" style={selectStyle} value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
            <option value="">All owners</option>
            {ownerOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <span className="text-[0.8125rem] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {displayed.length} action{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {view === 'gantt' && (
        <GanttView
          filtered={displayed}
          onShowDetail={setDetailId}
          filters={{
            hotel: filterHotel, project: filterProject, area: filterArea,
            status: filterStatus, priority: filterPriority, owner: filterOwner,
          }}
        />
      )}
      {view === 'table' && <TableView filtered={displayed} onShowDetail={setDetailId} />}

      <ActionDetailPanel action={detailAction} onClose={() => setDetailId(null)} />
    </div>
  );
}

function GanttView({ filtered, onShowDetail, filters }: { filtered: Action[]; onShowDetail: (id: number) => void; filters: GanttFilters }) {
  const todayDim = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate();
  const todayPct = ((CURRENT_MONTH + (TODAY.getDate() - 1) / todayDim) / 12) * 100;
  const captureRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!captureRef.current || downloading) return;
    setDownloading(true);
    try {
      const [{ toPng }, jsPdfModule] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ]);
      const JsPDF = jsPdfModule.default;
      const dataUrl = await toPng(captureRef.current, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => { img.onload = () => resolve(null); img.onerror = reject; });

      const pdf = new JsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 24;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text('Action Plan Tracker — Gantt', margin, margin + 12);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(110);
      const generated = new Date().toLocaleString();
      pdf.text(`Generated ${generated}  ·  ${filtered.length} action${filtered.length !== 1 ? 's' : ''}`, margin, margin + 26);

      const filterParts: string[] = [];
      if (filters.hotel) filterParts.push(`Hotel: ${filters.hotel}`);
      if (filters.project) filterParts.push(`Project: ${filters.project}`);
      if (filters.area) filterParts.push(`Area: ${filters.area}`);
      if (filters.status) filterParts.push(`Status: ${filters.status}`);
      if (filters.priority) filterParts.push(`Priority: ${filters.priority}`);
      if (filters.owner) filterParts.push(`Owner: ${filters.owner}`);
      const filterText = filterParts.length ? filterParts.join('  ·  ') : 'No filters applied';
      const filterLines = pdf.splitTextToSize(`Filters: ${filterText}`, pageW - margin * 2);
      pdf.text(filterLines, margin, margin + 38);

      const headerH = 38 + filterLines.length * 10;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2 - headerH;
      const ratio = Math.min(availW / img.width, availH / img.height);
      const renderW = img.width * ratio;
      const renderH = img.height * ratio;
      pdf.addImage(dataUrl, 'PNG', margin, margin + headerH, renderW, renderH);

      const today = new Date().toISOString().slice(0, 10);
      pdf.save(`action-plan-tracker-${today}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          Gantt
        </span>
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border bg-white text-[0.75rem] font-medium cursor-pointer transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-60 disabled:cursor-wait"
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
          title="Download Gantt as PDF with current filters"
        >
          <Download size={12} />
          {downloading ? 'Generating…' : 'Download PDF'}
        </button>
      </div>
      <div ref={captureRef}>
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

      {!filtered.length && (
        <div className="p-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          No actions match the current filters
        </div>
      )}
      {filtered.map((a) => {
        const color = AREA_COLORS[a.area] || '#9CA3AF';
        const eColor = STATUS_COLORS[a.status];
        const r = getRoi(a);
        const left = dayPct(a.startDate);
        const endBase = a.endDate || a.startDate;
        const right = Math.max(dayPct(endBase), left);
        const width = Math.max(right - left, 0.8);
        const isChild = (a.subProjectId ?? 1) > 1;
        return (
          <div
            key={a.id}
            className="flex border-b last:border-b-0 cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
            style={{ borderColor: 'var(--border)' }}
          >
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
              <div
                className="absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none"
                style={{ left: `${todayPct.toFixed(2)}%`, background: 'var(--danger)' }}
              >
                <span className="absolute top-0.5 left-1 text-[0.5625rem] font-bold tracking-wider" style={{ color: 'var(--danger)' }}>
                  TODAY
                </span>
              </div>
              {a.recurrence ? (
                <>
                  <div
                    className="absolute top-1/2 h-px z-[1] pointer-events-none"
                    style={{
                      left: `calc(${left.toFixed(2)}% + 4px)`,
                      width: `calc(${width.toFixed(2)}% - 8px)`,
                      background: color,
                      opacity: 0.25,
                      transform: 'translateY(-50%)',
                    }}
                  />
                  {occurrenceDates(a).map((date) => {
                    const dotLeft = dayPct(date);
                    const isPast = new Date(date + 'T00:00:00') < TODAY;
                    return (
                      <div
                        key={date}
                        className="absolute top-1/2 w-2.5 h-2.5 rounded-full z-[2] cursor-pointer transition-transform hover:scale-150"
                        style={{
                          left: `${dotLeft.toFixed(2)}%`,
                          transform: 'translate(-50%, -50%)',
                          background: color,
                          opacity: isPast ? 0.5 : 1,
                          border: '1.5px solid white',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                        }}
                        onClick={() => onShowDetail(a.id)}
                        title={`${a.actionTitle} — ${fmtDate(date)}`}
                      />
                    );
                  })}
                </>
              ) : (
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
              )}
            </div>
          </div>
        );
      })}
      </div>
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
            const roiColor = r > 0 ? 'var(--success)' : r < 0 ? 'var(--danger)' : 'var(--text-secondary)';
            const isChild = (a.subProjectId ?? 1) > 1;
            return (
              <tr
                key={a.id}
                className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
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
                <td className="px-3.5 py-3 text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--danger)' }}>
                  {fmtMoney(a.investmentUsd)}
                </td>
                <td className="px-3.5 py-3 font-bold" style={{ color: roiColor }}>
                  {r > 0 ? '+' : ''}{r}%
                </td>
                <td className="px-3.5 py-3"><DotBadge label={a.status} color={eColor} /></td>
                <td className="px-3.5 py-3"><Badge label={a.priority} color={pColor} /></td>
                <td className="px-3.5 py-3">
                  <button
                    className="w-7 h-7 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center transition-colors hover:bg-[var(--bg-hover)]"
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
