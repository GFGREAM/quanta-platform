import { useMemo } from 'react';
import {
  DEPT_COSTS,
  NON_DISTRIBUTED,
  MONTHS,
  viewItem,
  sumScalar,
  type Timeframe,
} from './data';

// Desktop and Mobile render the exact same numbers off `month` + `timeframe` —
// the only difference is layout. This hook owns every scalar derivation so
// both views stay in lock-step.
export function useExpensesData(month: string, timeframe: Timeframe) {
  const monthIdx = MONTHS.indexOf(month as typeof MONTHS[number]);

  const viewedDept = useMemo(
    () => DEPT_COSTS.map((it) => viewItem(it, monthIdx, timeframe)),
    [monthIdx, timeframe],
  );
  const viewedNonDist = useMemo(
    () => NON_DISTRIBUTED.map((it) => viewItem(it, monthIdx, timeframe)),
    [monthIdx, timeframe],
  );
  const allItems = useMemo(
    () => [...viewedDept, ...viewedNonDist],
    [viewedDept, viewedNonDist],
  );

  const totals = useMemo(() => {
    const deptAct = sumScalar(viewedDept, 'act');
    const deptBud = sumScalar(viewedDept, 'bud');
    const deptLy = sumScalar(viewedDept, 'actLy');
    const ndAct = sumScalar(viewedNonDist, 'act');
    const ndBud = sumScalar(viewedNonDist, 'bud');
    const ndLy = sumScalar(viewedNonDist, 'actLy');
    return {
      deptAct, deptBud, deptLy,
      ndAct, ndBud, ndLy,
      gtAct: deptAct + ndAct,
      gtBud: deptBud + ndBud,
      gtLy: deptLy + ndLy,
    };
  }, [viewedDept, viewedNonDist]);

  const drivers = useMemo(() => {
    const withVar = allItems.map((it) => ({
      name: it.name.replace(/^Total /, ''),
      diff: it.act - it.bud,
      pct: it.bud !== 0 ? ((it.act - it.bud) / it.bud) * 100 : 0,
    }));
    const overruns = withVar.filter((d) => d.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 5);
    const savings = withVar.filter((d) => d.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 5);
    return { overruns, savings };
  }, [allItems]);

  const netVar = totals.gtAct - totals.gtBud;

  return { monthIdx, viewedDept, viewedNonDist, allItems, totals, drivers, netVar };
}
