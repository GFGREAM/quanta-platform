'use client';

import { ChevronRight } from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
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

export default function StatementMobile() {
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
    <div className="flex flex-col gap-4" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>Profit &amp; Loss</span>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--primary)' }}>P&amp;L Statement</span>
      </div>

      {/* Title + view toggle */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
            P&amp;L Statement
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {scenario} vs Budget vs LY
          </p>
        </div>
        <ViewToggleMobile viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {/* Filters — stacked native selects */}
      <div className="grid grid-cols-2 gap-2">
        {viewMode === 'portfolio' ? (
          <MultiSelect
            options={portfolioHotelOptions}
            selected={portfolioHotels}
            onChange={setPortfolioHotels}
            width="100%"
            placeholder="Select hotels…"
            noun="hotels"
            compact
          />
        ) : (
          <select
            className="h-10 px-3 pr-8 rounded-md border text-sm bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
            style={selectStyle}
            value={hotel}
            onChange={(e) => setHotel(e.target.value)}
          >
            <option value="">All hotels</option>
            {hotelOptions.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        )}
        <select
          className="h-10 px-3 pr-8 rounded-md border text-sm bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={selectStyle}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          className="h-10 px-3 pr-8 rounded-md border text-sm bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={selectStyle}
          value={scenario}
          onChange={(e) => setScenario(e.target.value as ComparisonScenario)}
        >
          {scenarioOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Scope toggle + month select + currency toggle (table-only) */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg p-[3px] gap-0.5" style={{ background: 'var(--muted)' }}>
          {SCOPES.map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-2.5 py-1 rounded-md text-[0.75rem] font-medium border-none cursor-pointer ${scope === s ? 'bg-white shadow-sm' : 'bg-transparent'}`}
              style={{ color: scope === s ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              {SCOPE_LABELS[s]}
            </button>
          ))}
        </div>
        <select
          className="h-9 flex-1 min-w-[6rem] px-3 pr-8 rounded-md border text-sm bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] disabled:opacity-50"
          style={selectStyle}
          value={periodMonth}
          onChange={(e) => setPeriodMonth(e.target.value as Month)}
          disabled={scope === 'fy'}
        >
          {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex rounded-lg p-[3px] gap-0.5" style={{ background: 'var(--muted)' }}>
          {currencyOptions.map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-2.5 py-1 rounded-md text-[0.75rem] font-medium border-none cursor-pointer ${currency === c ? 'bg-white shadow-sm' : 'bg-transparent'}`}
              style={{ color: currency === c ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              {CURRENCY_LABELS[c]}
            </button>
          ))}
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
          compact
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
          compact
        />
      ) : portfolio.groups.length === 0 ? (
        <div className="bg-white border rounded-lg p-6 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
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
          compact
        />
      )}

      {/* KPI carousel */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-2.5 min-w-min">
          {kpis.map((k) => (
            <div key={k.key} className="min-w-[200px]">
              <StatementKpiCardMobile kpi={k} scenario={scenario} />
            </div>
          ))}
        </div>
      </div>

      {/* Chart — monthly trend (summary/overview) or WoW Outlook (portfolio) */}
      <div className="bg-white border rounded-lg p-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="min-w-0">
            <div className="text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {viewMode === 'portfolio' ? 'Outlook · WoW' : 'Monthly trend'}
            </div>
            <div className="text-[0.8125rem] font-semibold truncate" style={{ color: 'var(--primary)' }}>
              {viewMode === 'portfolio' ? `${metricDef.label} · ${scopeLabel(scope, periodMonth, year)}` : metricDef.label}
            </div>
          </div>
          <select
            className="h-8 max-w-[140px] px-2 pr-7 rounded-md border text-[0.75rem] bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] shrink-0"
            style={selectStyle}
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricKey)}
          >
            {METRIC_DEFS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 text-[0.6875rem] mb-2 justify-end" style={{ color: 'var(--text-secondary)' }}>
          {viewMode === 'portfolio' ? (
            <>
              <LegendDot color={COLOR_COMPARISON} label="Outlook" size="sm" />
              <LegendDot color={COLOR_BUDGET} label="Budget" size="sm" />
            </>
          ) : (
            <>
              <LegendDot color={COLOR_COMPARISON} label={scenario} size="sm" />
              <LegendDot color={COLOR_BUDGET} label="Budget" size="sm" />
              <LegendDot color={COLOR_LY} label="LY" size="sm" />
            </>
          )}
        </div>
        <div className="h-[280px]">
          {viewMode !== 'portfolio' ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E5E5' }}
                  interval={0}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E5E5' }}
                  tickFormatter={(v) => formatAxis(v, metricDef.format)}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E5E5E5',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v) => fmtMetric(typeof v === 'number' ? v : Number(v), metricDef.format)}
                  labelStyle={{ color: '#172951', fontWeight: 600 }}
                />
                <Line
                  type="monotone"
                  dataKey="ly"
                  name="LY"
                  stroke={COLOR_LY}
                  strokeWidth={1.5}
                  strokeDasharray="2 4"
                  dot={false}
                  activeDot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  name="Budget"
                  stroke={COLOR_BUDGET}
                  strokeWidth={1.75}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="comparison"
                  name={scenario}
                  stroke={COLOR_COMPARISON}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : portfolio.groups.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-secondary)' }}>
              Select at least one hotel to plot the WoW progression.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyOutlookSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E5E5' }}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E5E5' }}
                  tickFormatter={(v) => formatAxis(v, metricDef.format)}
                  width={56}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E5E5E5',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v) => fmtMetric(typeof v === 'number' ? v : Number(v), metricDef.format)}
                  labelStyle={{ color: '#172951', fontWeight: 600 }}
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  name="Budget"
                  stroke={COLOR_BUDGET}
                  strokeWidth={1.75}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="outlook"
                  name="Outlook"
                  stroke={COLOR_COMPARISON}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLOR_COMPARISON }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function ViewToggleMobile({ viewMode, setViewMode }: { viewMode: ViewMode; setViewMode: (v: ViewMode) => void }) {
  return (
    <div className="flex rounded-lg p-[3px] gap-0.5" style={{ background: 'var(--muted)' }}>
      {VIEW_ORDER.map((v) => (
        <button
          key={v}
          onClick={() => setViewMode(v)}
          className={`px-2.5 py-1 rounded-md text-[0.75rem] font-medium border-none cursor-pointer ${viewMode === v ? 'bg-white shadow-sm' : 'bg-transparent'}`}
          style={{ color: viewMode === v ? 'var(--primary)' : 'var(--text-secondary)' }}
        >
          {VIEW_LABELS[v]}
        </button>
      ))}
    </div>
  );
}

function StatementKpiCardMobile({ kpi, scenario }: { kpi: KpiSummary; scenario: ComparisonScenario }) {
  const def = METRIC_DEFS.find((m) => m.key === kpi.key)!;
  const value = fmtMetric(kpi.comparison, def.format);
  return (
    <div
      className="bg-white rounded-lg border px-3 py-2.5 flex flex-col gap-1.5"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {kpi.label} <span style={{ color: 'var(--text-secondary)' }}>({scenario})</span>
      </div>
      <div className="text-[0.9375rem] font-bold leading-tight tracking-tight" style={{ color: 'var(--primary)' }}>
        {value}
      </div>
      <div className="flex items-center justify-between gap-2 pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
        <VarianceBadge label="vs Budget" variance={kpi.varianceVsBudget} higherIsBetter={kpi.higherIsBetter} size="sm" />
        <VarianceBadge label="vs LY" variance={kpi.varianceVsLy} higherIsBetter={kpi.higherIsBetter} size="sm" />
      </div>
    </div>
  );
}
