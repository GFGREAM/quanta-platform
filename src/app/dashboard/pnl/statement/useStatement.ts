'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HOTELS,
  HOTEL_CODES,
  PORTFOLIO_HOTELS,
  YEARS,
  MONTHS,
  METRICS_BY_KEY,
  KPI_METRICS,
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

export type ViewMode = 'summary' | 'single' | 'portfolio';

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

export interface KpiSummary {
  key: MetricKey;
  label: string;
  comparison: number;
  budget: number;
  ly: number;
  varianceVsBudget: { pct: number; label: string } | null;
  varianceVsLy: { pct: number; label: string } | null;
  higherIsBetter: boolean;
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

function variance(actual: number, compare: number): { pct: number; label: string } | null {
  if (!compare) return null;
  const pct = ((actual - compare) / Math.abs(compare)) * 100;
  return { pct, label: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` };
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

  // Period-scoped row sets for the single-hotel comparison table.
  const periodCurrent = useMemo(
    () => filterByPeriod(currentYearRows.filter((r) => r.scenario === scenario), scope, periodMonth),
    [currentYearRows, scenario, scope, periodMonth],
  );
  const periodBudget = useMemo(
    () => filterByPeriod(currentYearRows.filter((r) => r.scenario === 'Budget'), scope, periodMonth),
    [currentYearRows, scope, periodMonth],
  );
  const periodLy = useMemo(
    () => filterByPeriod(lyYearRows.filter((r) => r.scenario === 'Actual'), scope, periodMonth),
    [lyYearRows, scope, periodMonth],
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

  // KPIs share the table's period scope so the cards stay in sync with the
  // MTD/YTD/FY toggle and the reference month — `periodCurrent` is already
  // filtered by `scenario`, `periodBudget` by Budget, `periodLy` by Actual.
  const kpis = useMemo<KpiSummary[]>(() => {
    const sumOver = (rows: ForecastRow[], calc: (r: ForecastRow) => number) =>
      rows.reduce((s, r) => s + calc(r), 0);
    return KPI_METRICS.map((key) => {
      const def = METRICS_BY_KEY[key];
      const comparison = sumOver(periodCurrent, def.calc);
      const budget = sumOver(periodBudget, def.calc);
      const ly = sumOver(periodLy, def.calc);
      return {
        key,
        label: def.label,
        comparison,
        budget,
        ly,
        varianceVsBudget: variance(comparison, budget),
        varianceVsLy: variance(comparison, ly),
        higherIsBetter: def.higherIsBetter,
      };
    });
  }, [periodCurrent, periodBudget, periodLy]);

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
    kpis,
    periodCurrent,
    periodBudget,
    periodLy,
    periodCurrentNoXR,
    periodBudgetNoXR,
    periodLyNoXR,
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
