'use client';

import { ChevronRight } from 'lucide-react';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { selectStyle } from '@/lib/selectStyle';
import { fmtMetric, METRIC_DEFS, SCOPES, scopeLabel, type MetricKey, type Month } from './data';
import { useStatement, type ComparisonScenario, type KpiSummary, type ViewMode } from './useStatement';
import StatementTable from './StatementTable';
import StatementPortfolioTable from './StatementPortfolioTable';
import StatementSummaryTable from './StatementSummaryTable';
import {
  MultiSelect,
  COLOR_COMPARISON, COLOR_BUDGET, COLOR_LY,
  VIEW_ORDER, VIEW_LABELS, SCOPE_LABELS, CURRENCY_LABELS,
  LegendDot, VarianceBadge, formatAxis,
} from './ui';

export default function StatementDesktop() {
  const {
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
    weeklyOutlookSeries,
    kpis,
    periodCurrent, periodBudget, periodLy,
    periodCurrentNoXR, periodBudgetNoXR, periodLyNoXR,
    portfolio,
    hotelOptions, yearOptions, scenarioOptions, monthOptions,
    portfolioHotelOptions, currencyOptions,
  } = useStatement();

  return (
    <div className="flex flex-col gap-5 font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif]" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Profit & Loss</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--primary)' }}>P&L Statement</span>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
            P&amp;L Statement
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {scenario} vs Budget vs LY — full-year view
          </p>
        </div>
        {/* Summary ↔ Overview ↔ Portfolio toggle */}
        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2">
        {kpis.map((k) => (
          <StatementKpiCard key={k.key} kpi={k} scenario={scenario} />
        ))}
      </div>

      {/* Filters bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === 'portfolio' ? (
            <MultiSelect
              options={portfolioHotelOptions}
              selected={portfolioHotels}
              onChange={setPortfolioHotels}
              width="14rem"
              placeholder="Select hotels…"
              noun="hotels"
            />
          ) : (
            <select
              className="h-9 w-44 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
              style={selectStyle}
              value={hotel}
              onChange={(e) => setHotel(e.target.value)}
            >
              <option value="">All hotels</option>
              {hotelOptions.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          )}
          <select
            className="h-9 w-28 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
            style={selectStyle}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            className="h-9 w-36 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
            style={selectStyle}
            value={scenario}
            onChange={(e) => setScenario(e.target.value as ComparisonScenario)}
            title="Actual: closed months only · Outlook: weekly refresh · Forecast: monthly refresh"
          >
            {scenarioOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {/* Scope toggle (table-only) */}
          <div className="flex rounded-lg p-[3px] gap-0.5" style={{ background: 'var(--muted)' }}>
            {SCOPES.map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`px-3 py-1.5 rounded-md text-[0.75rem] font-medium border-none cursor-pointer transition-all ${scope === s ? 'bg-white shadow-sm' : 'bg-transparent'}`}
                style={{ color: scope === s ? 'var(--primary)' : 'var(--text-secondary)' }}
                title={s === 'mtd' ? 'Month to date — selected month only' : s === 'ytd' ? 'Year to date — Jan through selected month' : 'Full year'}
              >
                {SCOPE_LABELS[s]}
              </button>
            ))}
          </div>
          <select
            className="h-9 w-24 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
            style={selectStyle}
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value as Month)}
            disabled={scope === 'fy'}
            title="Reference month for MTD / YTD"
          >
            {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {/* Currency toggle — restate USD ↔ each hotel's local currency */}
          <div className="flex rounded-lg p-[3px] gap-0.5" style={{ background: 'var(--muted)' }}>
            {currencyOptions.map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 rounded-md text-[0.75rem] font-medium border-none cursor-pointer transition-all ${currency === c ? 'bg-white shadow-sm' : 'bg-transparent'}`}
                style={{ color: currency === c ? 'var(--primary)' : 'var(--text-secondary)' }}
                title={c === 'USD' ? 'US Dollars — restate every hotel via its FX rate' : "Local currency — show each hotel in its native reporting currency"}
              >
                {CURRENCY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[0.75rem]" style={{ color: 'var(--text-secondary)' }}>
          <LegendDot color={COLOR_COMPARISON} label={scenario} />
          <LegendDot color={COLOR_BUDGET} label="Budget" />
          <LegendDot color={COLOR_LY} label="LY" />
        </div>
      </div>

      {/* Comparison table — summary, overview (single), or portfolio */}
      {viewMode === 'summary' ? (
        <StatementSummaryTable
          hotel={hotel}
          scope={scope}
          periodMonth={periodMonth}
          year={year}
          scenario={scenario}
          currency={currency}
          current={periodCurrent}
          budget={periodBudget}
          ly={periodLy}
          currentNoXR={periodCurrentNoXR}
          budgetNoXR={periodBudgetNoXR}
          lyNoXR={periodLyNoXR}
        />
      ) : viewMode === 'single' ? (
        <StatementTable
          hotel={hotel}
          scope={scope}
          periodMonth={periodMonth}
          year={year}
          scenario={scenario}
          currency={currency}
          current={periodCurrent}
          budget={periodBudget}
          ly={periodLy}
          currentNoXR={periodCurrentNoXR}
          budgetNoXR={periodBudgetNoXR}
          lyNoXR={periodLyNoXR}
        />
      ) : portfolio.groups.length === 0 ? (
        <div className="bg-white border rounded-lg p-10 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          Select at least one hotel to build the portfolio view.
        </div>
      ) : (
        <StatementPortfolioTable
          scope={scope}
          periodMonth={periodMonth}
          year={year}
          scenario={scenario}
          currency={currency}
          portfolio={portfolio}
        />
      )}

      {/* Chart panel — monthly trend (summary/overview) or WoW Outlook (portfolio) */}
      <div className="bg-white border rounded-lg shadow-sm p-5" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <div className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {viewMode === 'portfolio' ? 'Outlook · Week over Week' : 'Monthly trend'}
            </div>
            <div className="text-base font-semibold" style={{ color: 'var(--primary)' }}>
              {viewMode === 'portfolio'
                ? `${metricDef.label} — Outlook progression (${scopeLabel(scope, periodMonth, year)})`
                : `${metricDef.label} — ${scenario} vs Budget vs LY`}
            </div>
          </div>
          <select
            className="h-9 w-52 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] shrink-0"
            style={selectStyle}
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricKey)}
            title="Metric to plot on the chart"
          >
            {METRIC_DEFS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div className="h-[420px]">
          {viewMode !== 'portfolio' ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySeries} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E5E5' }}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E5E5' }}
                  tickFormatter={(v) => formatAxis(v, metricDef.format)}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E5E5E5',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => fmtMetric(typeof v === 'number' ? v : Number(v), metricDef.format)}
                  labelStyle={{ color: '#172951', fontWeight: 600 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="ly"
                  name="LY"
                  stroke={COLOR_LY}
                  strokeWidth={1.75}
                  strokeDasharray="2 4"
                  dot={{ r: 2, fill: COLOR_LY }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  name="Budget"
                  stroke={COLOR_BUDGET}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 3, fill: COLOR_BUDGET }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="comparison"
                  name={scenario}
                  stroke={COLOR_COMPARISON}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLOR_COMPARISON }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : portfolio.groups.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              Select at least one hotel to plot the WoW progression.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyOutlookSeries} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E5E5' }}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E5E5' }}
                  tickFormatter={(v) => formatAxis(v, metricDef.format)}
                  width={70}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E5E5E5',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => fmtMetric(typeof v === 'number' ? v : Number(v), metricDef.format)}
                  labelStyle={{ color: '#172951', fontWeight: 600 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  name="Budget"
                  stroke={COLOR_BUDGET}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="outlook"
                  name="Outlook"
                  stroke={COLOR_COMPARISON}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: COLOR_COMPARISON }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function ViewToggle({ viewMode, setViewMode }: { viewMode: ViewMode; setViewMode: (v: ViewMode) => void }) {
  return (
    <div className="flex rounded-lg p-[3px] gap-0.5" style={{ background: 'var(--muted)' }}>
      {VIEW_ORDER.map((v) => (
        <button
          key={v}
          onClick={() => setViewMode(v)}
          className={`px-3.5 py-1.5 rounded-md text-[0.8125rem] font-medium border-none cursor-pointer transition-all whitespace-nowrap ${viewMode === v ? 'bg-white shadow-sm' : 'bg-transparent'}`}
          style={{ color: viewMode === v ? 'var(--primary)' : 'var(--text-secondary)' }}
        >
          {VIEW_LABELS[v]}
        </button>
      ))}
    </div>
  );
}

function StatementKpiCard({ kpi, scenario }: { kpi: KpiSummary; scenario: ComparisonScenario }) {
  const def = METRIC_DEFS.find((m) => m.key === kpi.key)!;
  const value = fmtMetric(kpi.comparison, def.format);
  return (
    <div
      className="bg-white rounded-lg border px-4 py-3.5 transition-shadow hover:shadow-md flex flex-col gap-2"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {kpi.label} <span style={{ color: 'var(--text-secondary)' }}>({scenario})</span>
      </div>
      <div className="text-xl font-bold leading-tight tracking-tight" style={{ color: 'var(--primary)' }}>
        {value}
      </div>
      <div className="flex items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <VarianceBadge label="vs Budget" variance={kpi.varianceVsBudget} higherIsBetter={kpi.higherIsBetter} />
        <VarianceBadge label="vs LY" variance={kpi.varianceVsLy} higherIsBetter={kpi.higherIsBetter} />
      </div>
    </div>
  );
}
