'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HOTELS,
  HOTEL_CODES,
  PORTFOLIO_HOTELS,
  YEARS,
  MONTHS,
  METRICS_BY_KEY,
  COMPARISON_SCENARIOS,
  CURRENCIES,
  WEEKLY_OUTLOOK_DRIFTS,
  filterByPeriod,
  type Currency,
  type ForecastRow,
  type Month,
  type MetricKey,
  type Scenario,
  type Scope,
} from './data';

export type ViewMode = 'summary' | 'single' | 'monthly' | 'yearly' | 'portfolio';

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
    lyNoXR: ForecastRow[];
  };
}

export interface WeeklyOutlookPoint {
  week: string;
  outlook: number;
  budget: number;
}

export type ComparisonScenario = (typeof COMPARISON_SCENARIOS)[number];

export interface MonthlyPoint {
  month: Month;
  comparison: number | null;
  budget: number | null;
  ly: number | null;
}

function aggregateMonth(
  rows: ForecastRow[],
  scenario: Scenario,
  month: Month,
  calc: (r: ForecastRow) => number,
): number | null {
  const matches = rows.filter((r) => r.scenario === scenario && r.month === month);
  if (matches.length === 0) return null;
  return matches.reduce((sum, r) => sum + calc(r), 0);
}

export function useStatement() {
  const [year, setYear] = useState<number>(YEARS[0]);
  const [hotel, setHotel] = useState<string>(''); // '' = all hotels
  const [metric, setMetric] = useState<MetricKey>('totalRevenue');
  const [scenario, setScenario] = useState<ComparisonScenario>('Outlook');
  const [scope, setScope] = useState<Scope>('ytd');
  const [periodMonth, setPeriodMonth] = useState<Month>('Mar');
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [currency, setCurrency] = useState<Currency>('USD');
  // Hotels selected for the portfolio table. Default = all available hotels,
  // displayed in the canonical PORTFOLIO_HOTELS order.
  const [portfolioHotels, setPortfolioHotels] = useState<string[]>(() => [...PORTFOLIO_HOTELS]);
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

  // The server already returns rows in the requested currency, so no
  // client-side conversion is needed.
  const convertedRows = useMemo(() => forecastRows, [forecastRows]);

  const currentYearRows = useMemo(
    () =>
      convertedRows.filter(
        (r) => r.year === year && (hotel === '' || r.hotel === hotel),
      ),
    [convertedRows, year, hotel],
  );

  const lyYearRows = useMemo(
    () =>
      convertedRows.filter(
        (r) => r.year === year - 1 && (hotel === '' || r.hotel === hotel),
      ),
    [convertedRows, year, hotel],
  );

  const metricDef = METRICS_BY_KEY[metric];

  const monthlySeries = useMemo<MonthlyPoint[]>(
    () =>
      MONTHS.map((m) => ({
        month: m,
        comparison: aggregateMonth(currentYearRows, scenario, m, metricDef.calc),
        budget: aggregateMonth(currentYearRows, 'Budget', m, metricDef.calc),
        ly: aggregateMonth(lyYearRows, 'Actual', m, metricDef.calc),
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
  }, [budgetFxByKey]);

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
  }, [allYearsBudgetFxByKey]);

  const allYearsHotelRows = useMemo(
    () => allYearsRows.filter((r) => hotel === '' || r.hotel === hotel),
    [allYearsRows, hotel],
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

  // Portfolio rows are independent of the single-hotel filter. The selection
  // is driven by `portfolioHotels`, ordered by PORTFOLIO_HOTELS so the column
  // order stays stable regardless of click sequence.
  const portfolio = useMemo<PortfolioData>(() => {
    const orderedSelection = PORTFOLIO_HOTELS.filter((h) => portfolioHotels.includes(h));
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
      lyNoXR: totalLy.map(restateAtBudgetFx),
    };

    return { groups, total };
  }, [convertedRows, year, scenario, scope, periodMonth, portfolioHotels, restateAtBudgetFx]);

  // WoW progression of the Outlook for the selected period (month + scope) and
  // selected metric, aggregated across the chosen portfolio total. Each point
  // is an Outlook snapshot taken at a different week; Budget is shown as a
  // constant horizontal reference.
  const weeklyOutlookSeries = useMemo<WeeklyOutlookPoint[]>(() => {
    if (portfolio.groups.length === 0) return [];
    const sumMetric = (rs: ForecastRow[]) => rs.reduce((s, r) => s + metricDef.calc(r), 0);
    const baseOutlook = sumMetric(portfolio.total.current);
    const baseBudget = sumMetric(portfolio.total.budget);
    return WEEKLY_OUTLOOK_DRIFTS.map(({ weekLabel, multiplier }) => ({
      week: weekLabel,
      outlook: baseOutlook * multiplier,
      budget: baseBudget,
    }));
  }, [portfolio, metricDef]);

  return {
    year, setYear,
    hotel, setHotel,
    metric, setMetric,
    scenario, setScenario,
    scope, setScope,
    periodMonth, setPeriodMonth,
    viewMode, setViewMode,
    currency, setCurrency,
    portfolioHotels, setPortfolioHotels,
    metricDef,
    monthlySeries,
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
    hotelOptions: dynamicHotels.length > 0 ? dynamicHotels : HOTELS,
    portfolioHotelOptions: dynamicHotels.length > 0 ? dynamicHotels : PORTFOLIO_HOTELS,
    yearOptions: dynamicYears.length > 0 ? dynamicYears : YEARS,
    scenarioOptions: COMPARISON_SCENARIOS,
    monthOptions: MONTHS,
    currencyOptions: CURRENCIES,
  };
}
