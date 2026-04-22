import { useCallback, useMemo, useState } from 'react';
import { Action, SEED_ACTIONS } from './data';

type Mode = 'macro' | 'detail';
export type FilterKey = 'hotel' | 'project' | 'area' | 'status' | 'priority' | 'owner';

// Shared state machine for Action Plan Tracker. Desktop and Mobile both
// filter/sort/aggregate the same way — layouts diverge, data does not.
// The hook returns the cross-filtered `optionsFor` helper so callers can
// decide whether to cascade the dropdowns or just show every distinct value.
export function useActionPlan() {
  const [actions] = useState<Action[]>(SEED_ACTIONS);
  const [mode, setMode] = useState<Mode>('macro');
  const [filterHotel, setFilterHotel] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);

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

  // Shared filter predicate — used by both the mode-scoped list and the
  // KPI aggregation (which always spans all actions).
  const matchesFilters = useCallback((a: Action) => {
    if (filterHotel && a.hotelProperty !== filterHotel) return false;
    if (filterProject && a.project !== filterProject) return false;
    if (filterArea && a.area !== filterArea) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterPriority && a.priority !== filterPriority) return false;
    if (filterOwner && a.owner !== filterOwner) return false;
    return true;
  }, [filterHotel, filterProject, filterArea, filterStatus, filterPriority, filterOwner]);

  const filtered = useMemo(() => baseList.filter(matchesFilters),
    [baseList, matchesFilters]);

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

  // KPIs aggregate across ALL actions that pass the filter bar, regardless of
  // Macro/Detail mode. Reason: sub-actions often carry the actual investment
  // and return amounts — limiting the sum to macro rows (subProjectId === 1)
  // would undercount. This mirrors the filter bar but bypasses the mode scope.
  const filteredAll = useMemo(() => actions.filter(matchesFilters),
    [actions, matchesFilters]);

  const stats = useMemo(() => {
    const totalInv = filteredAll.reduce((sum, a) => sum + a.investmentUsd, 0);
    const totalRet = filteredAll.reduce((sum, a) => sum + a.expectedReturnUsd, 0);
    const roiGlobal = totalInv > 0 ? Math.round(((totalRet - totalInv) / totalInv) * 100) : 0;
    const inProgress = filteredAll.filter((a) => a.status === 'In progress').length;
    const completed = filteredAll.filter((a) => a.status === 'Completed').length;
    const pctComp = filteredAll.length ? Math.round((completed / filteredAll.length) * 100) : 0;
    return { count: filteredAll.length, totalInv, totalRet, roiGlobal, inProgress, completed, pctComp };
  }, [filteredAll]);

  const detailAction = detailId !== null ? actions.find((a) => a.id === detailId) ?? null : null;

  const optionsFor = (exclude: FilterKey) =>
    actions.filter((a) => {
      if (exclude !== 'hotel' && filterHotel && a.hotelProperty !== filterHotel) return false;
      if (exclude !== 'project' && filterProject && a.project !== filterProject) return false;
      if (exclude !== 'area' && filterArea && a.area !== filterArea) return false;
      if (exclude !== 'status' && filterStatus && a.status !== filterStatus) return false;
      if (exclude !== 'priority' && filterPriority && a.priority !== filterPriority) return false;
      if (exclude !== 'owner' && filterOwner && a.owner !== filterOwner) return false;
      return true;
    });

  const clearAll = () => {
    setFilterHotel(''); setFilterProject(''); setFilterArea('');
    setFilterStatus(''); setFilterPriority(''); setFilterOwner('');
  };

  return {
    actions,
    mode, setMode,
    filterHotel, setFilterHotel,
    filterProject, setFilterProject,
    filterArea, setFilterArea,
    filterStatus, setFilterStatus,
    filterPriority, setFilterPriority,
    filterOwner, setFilterOwner,
    detailId, setDetailId,
    activeFilterCount,
    baseList,
    filtered,
    displayed,
    stats,
    detailAction,
    optionsFor,
    clearAll,
  };
}
