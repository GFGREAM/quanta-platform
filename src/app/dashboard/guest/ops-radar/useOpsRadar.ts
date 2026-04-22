import { useMemo, useState } from 'react';
import { DIMS, PROPS } from './data';

// Radar state + derived aggregates shared by Desktop and Mobile.
// KPI labels/wording and SVG canvas size differ between layouts, so those
// stay in each view — the rest is identical.
export function useOpsRadar() {
  const [active, setActive] = useState<Set<number>>(
    new Set(PROPS.map((_, i) => i)),
  );
  const [crit, setCrit] = useState<number | null>(null);

  const avgs = useMemo(
    () => PROPS.map((p) => p.scores.reduce((s, v) => s + v, 0) / p.scores.length),
    [],
  );
  const myProp = PROPS.find((p) => p.mine)!;
  const ourAvg = myProp.scores.reduce((s, v) => s + v, 0) / myProp.scores.length;
  const topAvg = Math.max(...avgs);
  const best = PROPS[avgs.indexOf(topAvg)];

  const toggleProp = (i: number) => {
    setActive((prev) => {
      const n = new Set(prev);
      if (n.has(i)) {
        if (n.size > 1) n.delete(i);
      } else {
        n.add(i);
      }
      return n;
    });
  };

  // Put our property last so its polygon draws on top (desktop uses `.entries()`
  // so callers get [originalIndex, prop] pairs — mobile reads those too).
  const sortedForRadar = [...PROPS.entries()].sort(
    ([, a], [, b]) => (a.mine ? 1 : 0) - (b.mine ? 1 : 0),
  );
  const cols = crit !== null ? [crit] : DIMS.map((_, i) => i);
  const sortedForHeatmap = PROPS.map((p, i) => ({ ...p, idx: i })).sort(
    (a, b) =>
      b.scores.reduce((s, v) => s + v, 0) - a.scores.reduce((s, v) => s + v, 0),
  );

  return {
    active, setActive, toggleProp,
    crit, setCrit,
    avgs, myProp, ourAvg, topAvg, best,
    sortedForRadar, cols, sortedForHeatmap,
  };
}
