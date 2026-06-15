'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HOTELS,
  HOTEL_CODES,
  PORTFOLIO_HOTELS,
  YEARS,
  MONTHS,
  QUARTERS,
  METRICS_BY_KEY,
  COMPARISON_SCENARIOS,
  CURRENCIES,
  BASES,
  WEEKLY_OUTLOOK_DRIFTS,
  filterByPeriod,
  type Basis,
  type Currency,
  type ForecastRow,
  type Month,
  type MetricDef,
  type MetricKey,
  type Scope,
} from './data';

export type ViewMode = 'summary' | 'single' | 'monthly' | 'quarter' | 'yearly' | 'portfolio';

export interface PortfolioHotelGroup {
  hotel: string;
  code: string;
  current: ForecastRow[];
  budget: ForecastRow[];
  ly: ForecastRow[];
  /** FX-stripped variants — current and LY restated at Budget FX. */
  currentNoXR: ForecastRow[];
  lyNoXR: ForecastRow[];
}

export interface PortfolioData {
  groups: PortfolioHotelGroup[];
  total: {
    current: ForecastRow[];
    budget: ForecastRow[];
    ly: ForecastRow[];
    currentNoXR: ForecastRow[];
    budgetNoXR: ForecastRow[];
    lyNoXR: ForecastRow[];
  };
}

export interface WeeklyOutlookPoint {
  week: string;
  outlook: number;
  budget: number;
  // Week-over-week change in the Outlook vs the prior snapshot (metric units; null for the first week).
  wow: number | null;
}

export type ComparisonScenario = (typeof COMPARISON_SCENARIOS)[number];

export interface ChartPoint {
  label: string;
  comparison: number | null;
  budget: number | null;
  ly: number | null;
}

// Aggregate a metric over a set of rows. Money/integer metrics sum; ratio
// metrics (occupancy, ADR) are recomputed from their components so quarter and
// year rollups stay correct instead of summing rates.
function aggregateRowsMetric(rows: ForecastRow[], def: MetricDef): number | null {
  if (rows.length === 0) return null;
  if (def.key === 'occupancy') {
    const avail = rows.reduce((s, r) => s + r.availability, 0);
    const sold = rows.reduce((s, r) => s + r.roomsSold, 0);
    return avail ? (sold / avail) * 100 : 0;
  }
  if (def.key === 'adr') {
    const sold = rows.reduce((s, r) => s + r.roomsSold, 0);
    const rev = rows.reduce((s, r) => s + r.roomsRevenue, 0);
    return sold ? rev / sold : 0;
  }
  return rows.reduce((s, r) => s + def.calc(r), 0);
}

// Apply a week's WoW drift multiplier to a comparison (Outlook) row: scale the demand-side
// and financial lines, leaving physical capacity (rooms/availability) and the FX rate fixed —
// those don't drift week to week. Placeholder until real snapshot-keyed weekly rows land.
function scaleOutlook(r: ForecastRow, m: number): ForecastRow {
  if (m === 1) return r;
  return {
    ...r,
    roomsSold: r.roomsSold * m,
    roomsComp: r.roomsComp * m,
    roomsRevenue: r.roomsRevenue * m,
    clubMaintFee: r.clubMaintFee * m,
    timeshareMaintFee: r.timeshareMaintFee * m,
    otherRevenue: r.otherRevenue * m,
    departmentalExpenses: r.departmentalExpenses * m,
    undistributedExpenses: r.undistributedExpenses * m,
    otherExpenses: r.otherExpenses * m,
    nonOperating: r.nonOperating * m,
    guests: r.guests * m,
    payingGuests: r.payingGuests * m,
  };
}

export interface UseStatementOptions {
  /** If provided, only these view modes are available. Omit for full access. */
  allowedViewModes?: ViewMode[];
  /** If provided, only these properties appear in the hotel dropdown. Omit for all. */
  allowedProperties?: string[];
}

export function useStatement(opts?: UseStatementOptions) {
  const allowedModes = opts?.allowedViewModes;
  const allowedProps = opts?.allowedProperties;

  const defaultView = allowedModes && allowedModes.length > 0 ? allowedModes[0] : 'summary';
  const [year, setYear] = useState<number>(YEARS[0]);
  // Weekly snapshot (ISO date) to view the Outlook as of. Defaults to the latest snapshot (no
  // drift). Earlier dates re-scale the Outlook by that week's drift so the whole statement shows
  // how it stood then. Real snapshot dates arrive with the SQL feed; this keys off them already.
  const [week, setWeek] = useState<string>(() => WEEKLY_OUTLOOK_DRIFTS[WEEKLY_OUTLOOK_DRIFTS.length - 1].snapshotDate);
  const [metric, setMetric] = useState<MetricKey>('totalRevenue');
  const [scenario, setScenario] = useState<ComparisonScenario>('Outlook');
  const [scope, setScope] = useState<Scope>('ytd');
  const [periodMonth, setPeriodMonth] = useState<Month>('Mar');
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [basis, setBasis] = useState<Basis>('total');
  // Hotels selected for the portfolio table. Default = all available hotels,
  // displayed in the canonical PORTFOLIO_HOTELS order.
  const [portfolioHotels, setPortfolioHotels] = useState<string[]>(() => [...PORTFOLIO_HOTELS]);

  // Guard: ignore attempts to set a view mode that's not allowed
  const safeSetViewMode = useCallback((v: ViewMode) => {
    if (allowedModes && !allowedModes.includes(v)) return;
    setViewMode(v);
  }, [allowedModes]);
  const [forecastRows, setForecastRows] = useState<ForecastRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dynamicHotels, setDynamicHotels] = useState<string[]>([]);
  const [dynamicYears, setDynamicYears] = useState<number[]>([]);
  // All-years dataset, fetched lazily when viewMode === 'yearly'. Cached by
  // currency so flipping USD/Local refetches; flipping `year` does not.
  const [allYearsRows, setAllYearsRows] = useState<ForecastRow[]>([]);
  const [allYearsLoaded, setAllYearsLoaded] = useState<Currency | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/aag/dimensions", { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (controller.signal.aborted) return;
        setDynamicHotels(data.hotels ?? []);
        setDynamicYears(data.years ?? []);
      } catch {
        // dejamos vacios; el hook seguira con los defaults estaticos como fallback
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({
          year: String(year),
          currency,
        });
        const res = await fetch(`/api/aag/forecast-rows?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          if (!controller.signal.aborted) {
            setForecastRows([]);
            setLoading(false);
          }
          return;
        }
        const data: ForecastRow[] = await res.json();
        if (!controller.signal.aborted) {
          setForecastRows(data);
          setLoading(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setForecastRows([]);
          setLoading(false);
        }
      }
    })();
    return () => controller.abort();
  }, [year, currency]);

  // Lazy fetch of the all-years dataset for the Yearly view. Triggers when
  // viewMode flips to 'yearly' and the cached currency doesn't match.
  useEffect(() => {
    if (viewMode !== 'yearly') return;
    if (allYearsLoaded === currency) return;
    const controller = new AbortController();
    (async () => {
      try {
        const params = new URLSearchParams({ year: 'all', currency });
        const res = await fetch(`/api/aag/forecast-rows?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data: ForecastRow[] = await res.json();
        if (controller.signal.aborted) return;
        setAllYearsRows(data);
        setAllYearsLoaded(currency);
      } catch {
        // swallow; Yearly view will show empty
      }
    })();
    return () => controller.abort();
  }, [viewMode, currency, allYearsLoaded]);

  const weekMultiplier = useMemo(
    () => WEEKLY_OUTLOOK_DRIFTS.find((d) => d.snapshotDate === week)?.multiplier ?? 1,
    [week],
  );

  // The server already returns rows in the requested currency, so no client-side conversion is
  // needed. We do re-scale the active year's comparison (Outlook) rows by the selected week's WoW
  // drift so every table/chart reflects how the Outlook stood that week; Budget and prior-year LY
  // are left untouched. 'Current' (multiplier 1) is a no-op. The dedicated WoW progression chart
  // (weeklyOutlookSeries) anchors on the raw rows so it stays independent of this selection.
  const convertedRows = useMemo(() => {
    if (weekMultiplier === 1) return forecastRows;
    return forecastRows.map((r) =>
      r.year === year && r.scenario === scenario ? scaleOutlook(r, weekMultiplier) : r,
    );
  }, [forecastRows, weekMultiplier, year, scenario]);

  // ─── Hotel selection (unified across every view) ───────────────────
  // All views filter by the same multi-hotel selection. Options come from the
  // live dimensions feed when present, else the static portfolio list.
  const baseHotels = dynamicHotels.length > 0 ? dynamicHotels : HOTELS;
  const basePortfolioHotels = dynamicHotels.length > 0 ? dynamicHotels : PORTFOLIO_HOTELS;
  const filteredHotels = allowedProps
    ? baseHotels.filter((h) => allowedProps.includes(h))
    : baseHotels;
  const filteredPortfolioHotels = allowedProps
    ? basePortfolioHotels.filter((h) => allowedProps.includes(h))
    : basePortfolioHotels;

  // Reconcile the selection when the available option set changes (live data
  // loads / permissions narrow it): drop stale picks; if none remain, select all.
  const optionsKey = filteredPortfolioHotels.join('|');
  useEffect(() => {
    setPortfolioHotels((prev) => {
      const valid = prev.filter((h) => filteredPortfolioHotels.includes(h));
      if (valid.length === 0) return [...filteredPortfolioHotels];
      return valid.length === prev.length ? prev : valid;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey]);

  const selectedHotelSet = useMemo(() => new Set(portfolioHotels), [portfolioHotels]);
  const allHotelsSelected = filteredPortfolioHotels.length > 0
    && filteredPortfolioHotels.every((h) => selectedHotelSet.has(h));
  // A row passes when the full set is selected (≡ "all hotels") or its hotel is picked.
  const hotelInSelection = useCallback(
    (h: string) => allHotelsSelected || selectedHotelSet.has(h),
    [allHotelsSelected, selectedHotelSet],
  );

  const currentYearRows = useMemo(
    () =>
      convertedRows.filter(
        (r) => r.year === year && hotelInSelection(r.hotel),
      ),
    [convertedRows, year, hotelInSelection],
  );

  const lyYearRows = useMemo(
    () =>
      convertedRows.filter(
        (r) => r.year === year - 1 && hotelInSelection(r.hotel),
      ),
    [convertedRows, year, hotelInSelection],
  );

  const metricDef = METRICS_BY_KEY[metric];

  const monthlySeries = useMemo<ChartPoint[]>(
    () =>
      MONTHS.map((m) => ({
        label: m,
        comparison: aggregateRowsMetric(currentYearRows.filter((r) => r.scenario === scenario && r.month === m), metricDef),
        budget: aggregateRowsMetric(currentYearRows.filter((r) => r.scenario === 'Budget' && r.month === m), metricDef),
        ly: aggregateRowsMetric(lyYearRows.filter((r) => r.scenario === 'Actual' && r.month === m), metricDef),
      })),
    [currentYearRows, lyYearRows, metricDef, scenario],
  );

  // Quarterly rollup (Q1–Q4) of the current year vs Budget vs prior-year Actual.
  const quarterlySeries = useMemo<ChartPoint[]>(
    () =>
      QUARTERS.map((q) => ({
        label: q.label,
        comparison: aggregateRowsMetric(currentYearRows.filter((r) => r.scenario === scenario && q.months.includes(r.month)), metricDef),
        budget: aggregateRowsMetric(currentYearRows.filter((r) => r.scenario === 'Budget' && q.months.includes(r.month)), metricDef),
        ly: aggregateRowsMetric(lyYearRows.filter((r) => r.scenario === 'Actual' && q.months.includes(r.month)), metricDef),
      })),
    [currentYearRows, lyYearRows, metricDef, scenario],
  );

  // Year-wide row sets per scenario (no period filter). Used by Monthly view
  // which slices by month at render time rather than by MTD/YTD/FY.
  const currentScenarioRows = useMemo(
    () => currentYearRows.filter((r) => r.scenario === scenario),
    [currentYearRows, scenario],
  );
  const currentBudgetRows = useMemo(
    () => currentYearRows.filter((r) => r.scenario === 'Budget'),
    [currentYearRows],
  );
  const lyActualRows = useMemo(
    () => lyYearRows.filter((r) => r.scenario === 'Actual'),
    [lyYearRows],
  );

  // Period-scoped row sets for the single-hotel comparison table.
  const periodCurrent = useMemo(
    () => filterByPeriod(currentScenarioRows, scope, periodMonth),
    [currentScenarioRows, scope, periodMonth],
  );
  const periodBudget = useMemo(
    () => filterByPeriod(currentBudgetRows, scope, periodMonth),
    [currentBudgetRows, scope, periodMonth],
  );
  const periodLy = useMemo(
    () => filterByPeriod(lyActualRows, scope, periodMonth),
    [lyActualRows, scope, periodMonth],
  );

  // ─── FX-stripped row sets ──────────────────────────────────────────
  // Hotels operate in MXN but report in USD via the period's FX rate, so a
  // peso/dollar swing distorts USD expense numbers vs Budget. To isolate
  // operational performance we restate each row's expenses at the matching
  // month's *Budget* FX rate. Revenue is left alone (reservations land in USD,
  // so they don't carry FX exposure). LY rows have no Budget reference for
  // year-1 in the data, so they pass through unchanged.
  const budgetFxByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of convertedRows) {
      if (r.scenario === 'Budget') {
        map.set(`${r.hotel}|${r.year}|${r.month}`, r.fxRate);
      }
    }
    return map;
  }, [convertedRows]);

  const restateAtBudgetFx = useCallback((r: ForecastRow): ForecastRow => {
    // In Local (peso) view, expenses are already in their native currency, so a
    // peso/dollar swing doesn't change them — there's no FX impact to strip and
    // the "w/o XR" figures must equal the reported ones. The restatement only
    // applies when values are expressed in USD.
    if (currency === 'Local') return r;
    const refFx = budgetFxByKey.get(`${r.hotel}|${r.year}|${r.month}`);
    if (!refFx || refFx === 0) return r;
    const factor = r.fxRate / refFx;
    return {
      ...r,
      departmentalExpenses: r.departmentalExpenses * factor,
      undistributedExpenses: r.undistributedExpenses * factor,
      otherExpenses: r.otherExpenses * factor,
      nonOperating: r.nonOperating * factor,
    };
  }, [budgetFxByKey, currency]);

  const periodCurrentNoXR = useMemo(
    () => periodCurrent.map(restateAtBudgetFx),
    [periodCurrent, restateAtBudgetFx],
  );
  // Budget at Budget FX = Budget unchanged (factor = 1 by construction).
  const periodBudgetNoXR = periodBudget;
  const periodLyNoXR = useMemo(
    () => periodLy.map(restateAtBudgetFx),
    [periodLy, restateAtBudgetFx],
  );

  // Year-wide FX-stripped variants for Monthly view.
  const currentScenarioRowsNoXR = useMemo(
    () => currentScenarioRows.map(restateAtBudgetFx),
    [currentScenarioRows, restateAtBudgetFx],
  );
  const currentBudgetRowsNoXR = currentBudgetRows;
  const lyActualRowsNoXR = useMemo(
    () => lyActualRows.map(restateAtBudgetFx),
    [lyActualRows, restateAtBudgetFx],
  );

  // ─── Yearly view data ──────────────────────────────────────────────
  // Builds a per-year breakdown from the all-years dataset. Uses an FX map
  // keyed off the all-years Budget rows (same convention as the period view).
  const allYearsBudgetFxByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of allYearsRows) {
      if (r.scenario === 'Budget') {
        map.set(`${r.hotel}|${r.year}|${r.month}`, r.fxRate);
      }
    }
    return map;
  }, [allYearsRows]);

  const restateAllAtBudgetFx = useCallback((r: ForecastRow): ForecastRow => {
    // Local (peso) view carries no FX impact — see restateAtBudgetFx above.
    if (currency === 'Local') return r;
    const refFx = allYearsBudgetFxByKey.get(`${r.hotel}|${r.year}|${r.month}`);
    if (!refFx || refFx === 0) return r;
    const factor = r.fxRate / refFx;
    return {
      ...r,
      departmentalExpenses: r.departmentalExpenses * factor,
      undistributedExpenses: r.undistributedExpenses * factor,
      otherExpenses: r.otherExpenses * factor,
      nonOperating: r.nonOperating * factor,
    };
  }, [allYearsBudgetFxByKey, currency]);

  const allYearsHotelRows = useMemo(
    () => allYearsRows.filter((r) => hotelInSelection(r.hotel)),
    [allYearsRows, hotelInSelection],
  );

  const allYearsHotelRowsNoXR = useMemo(
    () => allYearsHotelRows.map(restateAllAtBudgetFx),
    [allYearsHotelRows, restateAllAtBudgetFx],
  );

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    for (const r of allYearsHotelRows) set.add(r.year);
    return [...set].sort((a, b) => a - b);
  }, [allYearsHotelRows]);

  // Per-year rollup for the Yearly chart: each year's scenario vs its Budget vs
  // the prior year's Actual (same convention as the Yearly table).
  const yearlySeries = useMemo<ChartPoint[]>(
    () =>
      availableYears.map((y) => ({
        label: String(y),
        comparison: aggregateRowsMetric(allYearsHotelRows.filter((r) => r.year === y && r.scenario === scenario), metricDef),
        budget: aggregateRowsMetric(allYearsHotelRows.filter((r) => r.year === y && r.scenario === 'Budget'), metricDef),
        ly: aggregateRowsMetric(allYearsHotelRows.filter((r) => r.year === y - 1 && r.scenario === 'Actual'), metricDef),
      })),
    [allYearsHotelRows, availableYears, metricDef, scenario],
  );

  // Chart series mirrors the active table's time granularity (month/quarter/year).
  const chartSeries = useMemo<ChartPoint[]>(
    () => (viewMode === 'quarter' ? quarterlySeries : viewMode === 'yearly' ? yearlySeries : monthlySeries),
    [viewMode, quarterlySeries, yearlySeries, monthlySeries],
  );

  // Portfolio rows are independent of the single-hotel filter. The selection
  // is driven by `portfolioHotels`, ordered by PORTFOLIO_HOTELS so the column
  // order stays stable regardless of click sequence.
  const portfolio = useMemo<PortfolioData>(() => {
    const orderedSelection = filteredPortfolioHotels.filter((h) => portfolioHotels.includes(h));
    const allCurrentYear = convertedRows.filter((r) => r.year === year);
    const allLyYear = convertedRows.filter((r) => r.year === year - 1);

    const groups: PortfolioHotelGroup[] = orderedSelection.map((h) => {
      const current = filterByPeriod(allCurrentYear.filter((r) => r.scenario === scenario && r.hotel === h), scope, periodMonth);
      const budget = filterByPeriod(allCurrentYear.filter((r) => r.scenario === 'Budget' && r.hotel === h), scope, periodMonth);
      const ly = filterByPeriod(allLyYear.filter((r) => r.scenario === 'Actual' && r.hotel === h), scope, periodMonth);
      return {
        hotel: h,
        code: HOTEL_CODES[h] ?? h,
        current,
        budget,
        ly,
        currentNoXR: current.map(restateAtBudgetFx),
        lyNoXR: ly.map(restateAtBudgetFx),
      };
    });

    const totalCurrent = filterByPeriod(allCurrentYear.filter((r) => r.scenario === scenario && orderedSelection.includes(r.hotel)), scope, periodMonth);
    const totalBudget = filterByPeriod(allCurrentYear.filter((r) => r.scenario === 'Budget' && orderedSelection.includes(r.hotel)), scope, periodMonth);
    const totalLy = filterByPeriod(allLyYear.filter((r) => r.scenario === 'Actual' && orderedSelection.includes(r.hotel)), scope, periodMonth);
    const total = {
      current: totalCurrent,
      budget: totalBudget,
      ly: totalLy,
      currentNoXR: totalCurrent.map(restateAtBudgetFx),
      // Budget at Budget FX = Budget unchanged (restatement factor = 1 by construction).
      // Intentional alias — all consumers are read-only so a copy is unnecessary.
      budgetNoXR: totalBudget,
      lyNoXR: totalLy.map(restateAtBudgetFx),
    };

    return { groups, total };
  }, [convertedRows, year, scenario, scope, periodMonth, portfolioHotels, filteredPortfolioHotels, restateAtBudgetFx]);

  // WoW progression of the Outlook for the selected period (month + scope) and
  // selected metric, aggregated across the chosen portfolio total. Each point
  // is an Outlook snapshot taken at a different week; Budget is shown as a
  // constant horizontal reference.
  const weeklyOutlookSeries = useMemo<WeeklyOutlookPoint[]>(() => {
    const orderedSelection = filteredPortfolioHotels.filter((h) => portfolioHotels.includes(h));
    if (orderedSelection.length === 0) return [];
    // Anchor on the RAW (unscaled) rows so the progression is independent of the Week selector —
    // it always plots the true latest Outlook, then applies each week's drift to walk it back.
    const sumMetric = (rs: ForecastRow[]) => rs.reduce((s, r) => s + metricDef.calc(r), 0);
    const allCurrentYear = forecastRows.filter((r) => r.year === year && orderedSelection.includes(r.hotel));
    const baseOutlook = sumMetric(filterByPeriod(allCurrentYear.filter((r) => r.scenario === scenario), scope, periodMonth));
    const baseBudget = sumMetric(filterByPeriod(allCurrentYear.filter((r) => r.scenario === 'Budget'), scope, periodMonth));
    let prev: number | null = null;
    return WEEKLY_OUTLOOK_DRIFTS.map(({ snapshotDate, multiplier }) => {
      const outlook = baseOutlook * multiplier;
      const wow = prev === null ? null : outlook - prev;
      prev = outlook;
      return { week: snapshotDate, outlook, budget: baseBudget, wow };
    });
  }, [forecastRows, portfolioHotels, filteredPortfolioHotels, year, scenario, scope, periodMonth, metricDef]);

  const hotelSelectionLabel = allHotelsSelected
    ? 'All hotels'
    : `${portfolioHotels.length} hotel${portfolioHotels.length === 1 ? '' : 's'}`;

  return {
    year, setYear,
    week, setWeek,
    metric, setMetric,
    scenario, setScenario,
    scope, setScope,
    periodMonth, setPeriodMonth,
    viewMode, setViewMode: safeSetViewMode,
    currency, setCurrency,
    basis, setBasis,
    portfolioHotels, setPortfolioHotels,
    hotelSelectionLabel,
    metricDef,
    chartSeries,
    periodCurrent,
    periodBudget,
    periodLy,
    periodCurrentNoXR,
    periodBudgetNoXR,
    periodLyNoXR,
    currentScenarioRows,
    currentBudgetRows,
    lyActualRows,
    currentScenarioRowsNoXR,
    currentBudgetRowsNoXR,
    lyActualRowsNoXR,
    allYearsHotelRows,
    allYearsHotelRowsNoXR,
    availableYears,
    portfolio,
    weeklyOutlookSeries,
    loading,
    // Newest snapshot first for the dropdown; latestWeek lets the UI mark the current one.
    weekOptions: [...WEEKLY_OUTLOOK_DRIFTS].reverse().map((d) => d.snapshotDate),
    latestWeek: WEEKLY_OUTLOOK_DRIFTS[WEEKLY_OUTLOOK_DRIFTS.length - 1].snapshotDate,
    hotelOptions: filteredHotels,
    portfolioHotelOptions: filteredPortfolioHotels,
    yearOptions: dynamicYears.length > 0 ? dynamicYears : YEARS,
    scenarioOptions: COMPARISON_SCENARIOS,
    monthOptions: MONTHS,
    currencyOptions: CURRENCIES,
    basisOptions: BASES,
    allowedViewModes: allowedModes,
    singlePropertyLock: allowedProps && allowedProps.length === 1,
  };
}
