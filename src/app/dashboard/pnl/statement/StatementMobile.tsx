'use client';

import { useRef, useState } from 'react';
import { ChevronRight, Download } from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { exportNodeToPdf } from '@/lib/pdfExport';
import { usePermissions } from '@/components/permissions-provider';
import { selectStyle } from '@/lib/selectStyle';
import { fmtMetric, METRIC_DEFS, SCOPES, scopeLabel, scenarioLabel, type MetricKey, type Month } from './data';
import { useStatement, type ViewMode, type UseStatementOptions } from './useStatement';
import StatementTable from './StatementTable';
import StatementPortfolioTable from './StatementPortfolioTable';
import StatementSummaryTable from './StatementSummaryTable';
import StatementMonthlyTable from './StatementMonthlyTable';
import StatementQuarterlyTable from './StatementQuarterlyTable';
import StatementYearlyTable from './StatementYearlyTable';
import {
  MultiSelect, SingleSelect,
  COLOR_COMPARISON, COLOR_BUDGET, COLOR_LY, HOTEL_PALETTE,
  VIEW_ORDER, VIEW_LABELS, SCOPE_LABELS, CURRENCY_LABELS, BASIS_LABELS,
  LegendDot, formatAxis,
} from './ui';

export default function StatementMobile({ permissionOpts }: { permissionOpts?: UseStatementOptions }) {
  const {
    year, setYear,
    week, setWeek, weekOptions, latestWeek,
    metric, setMetric,
    scenario,
    scope, setScope,
    periodMonth, setPeriodMonth,
    viewMode, setViewMode,
    currency, setCurrency,
    basis, setBasis,
    portfolioHotels, setPortfolioHotels,
    hotelSelectionLabel,
    metricDef,
    chartSeries,
    weeklyOutlookSeries,
    periodCurrent, periodBudget, periodLy,
    periodCurrentNoXR, periodBudgetNoXR, periodLyNoXR,
    currentScenarioRows, currentBudgetRows, lyActualRows,
    currentScenarioRowsNoXR, currentBudgetRowsNoXR, lyActualRowsNoXR,
    allYearsHotelRows, allYearsHotelRowsNoXR, availableYears,
    portfolio,
    yearOptions, monthOptions,
    portfolioHotelOptions, currencyOptions, basisOptions,
    allowedViewModes,
  } = useStatement(permissionOpts);

  // Every view filters by the same multi-hotel selection. Summary and Portfolio
  // show the WoW chart; the other views show a monthly/quarterly/yearly trend.
  const isMultiHotel = viewMode === 'portfolio' || viewMode === 'summary';
  const noHotelsSelected = isMultiHotel && portfolio.groups.length === 0;

  // ─── PDF export (visuals: comparison table + chart) ──────────────
  // Admins (full access) export the clean internal copy; everyone else gets the
  // confidentiality watermark on externally-shareable copies.
  const { hasFullAccess } = usePermissions();
  const exportRef = useRef<HTMLDivElement>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const handleExportPdf = async () => {
    if (exportingPdf || !exportRef.current) return;
    setExportingPdf(true);
    try {
      const fileBase = `pnl-statement-${viewMode}-${year}-${new Date().toISOString().slice(0, 10)}`;
      await exportNodeToPdf(exportRef.current, fileBase, { watermark: !hasFullAccess });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="flex flex-col gap-4" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb + PDF export */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>Profit &amp; Loss</span>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--primary)' }}>P&amp;L Statement</span>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-60 disabled:cursor-wait shrink-0"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          title="Download the visuals as a PDF"
        >
          <Download size={13} /> {exportingPdf ? '…' : 'PDF'}
        </button>
      </div>

      {/* Title + view toggle */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
            P&amp;L Statement
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {scenarioLabel(scenario)} vs Budget vs LY
          </p>
        </div>
        <ViewToggleMobile viewMode={viewMode} setViewMode={setViewMode} allowedViewModes={allowedViewModes} />
      </div>

      {/* Filters — stacked native selects */}
      <div className="grid grid-cols-2 gap-2">
        <MultiSelect
          options={portfolioHotelOptions}
          selected={portfolioHotels}
          onChange={setPortfolioHotels}
          width="100%"
          placeholder="Select hotels…"
          noun="hotels"
          compact
        />
        {/* WoW snapshot — view the Outlook as of a prior weekly snapshot (latest = current).
            Custom dropdown so every week shows at once (no native-select scroll cap). */}
        <SingleSelect
          options={weekOptions}
          value={week}
          onChange={setWeek}
          width="100%"
          compact
          title="Week-over-week — view the Outlook as of a weekly snapshot"
          renderOption={(w) => (w === latestWeek ? `${w} (current)` : w)}
        />
        <select
          className="h-10 px-3 pr-8 rounded-md border text-sm bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={selectStyle}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Month select + scope toggle + currency toggle (table-only) */}
      <div className="flex items-center gap-2 flex-wrap">
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
        <div className="flex rounded-lg p-[3px] gap-0.5" style={{ background: 'var(--muted)' }}>
          {basisOptions.map((b) => (
            <button
              key={b}
              onClick={() => setBasis(b)}
              className={`px-2.5 py-1 rounded-md text-[0.75rem] font-medium border-none cursor-pointer ${basis === b ? 'bg-white shadow-sm' : 'bg-transparent'}`}
              style={{ color: basis === b ? 'var(--primary)' : 'var(--text-secondary)' }}
            >
              {BASIS_LABELS[b]}
            </button>
          ))}
        </div>
      </div>

      {/* Exportable visuals — comparison table + chart, wrapped so the PDF captures them as one. */}
      <div ref={exportRef} className="flex flex-col gap-4 bg-[var(--background)]">
      {/* Comparison table — summary, overview (single), or portfolio */}
      {viewMode === 'summary' ? (
        noHotelsSelected ? (
          <div className="bg-white border rounded-lg p-6 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            Select at least one hotel to build the summary.
          </div>
        ) : (
          <StatementSummaryTable
            hotel={hotelSelectionLabel}
            scope={scope}
            periodMonth={periodMonth}
            year={year}
            scenario={scenario}
            currency={currency}
            basis={basis}
            current={portfolio.total.current}
            budget={portfolio.total.budget}
            ly={portfolio.total.ly}
            currentNoXR={portfolio.total.currentNoXR}
            budgetNoXR={portfolio.total.budgetNoXR}
            lyNoXR={portfolio.total.lyNoXR}
            compact
          />
        )
      ) : viewMode === 'single' ? (
        <StatementTable
          hotel={hotelSelectionLabel}
          scope={scope}
          periodMonth={periodMonth}
          year={year}
          scenario={scenario}
          currency={currency}
          basis={basis}
          current={periodCurrent}
          budget={periodBudget}
          ly={periodLy}
          currentNoXR={periodCurrentNoXR}
          budgetNoXR={periodBudgetNoXR}
          lyNoXR={periodLyNoXR}
          compact
        />
      ) : viewMode === 'monthly' ? (
        <StatementMonthlyTable
          hotel={hotelSelectionLabel}
          year={year}
          scenario={scenario}
          currency={currency}
          basis={basis}
          current={currentScenarioRows}
          budget={currentBudgetRows}
          ly={lyActualRows}
          currentNoXR={currentScenarioRowsNoXR}
          budgetNoXR={currentBudgetRowsNoXR}
          lyNoXR={lyActualRowsNoXR}
        />
      ) : viewMode === 'quarter' ? (
        <StatementQuarterlyTable
          hotel={hotelSelectionLabel}
          year={year}
          scenario={scenario}
          currency={currency}
          basis={basis}
          current={currentScenarioRows}
          budget={currentBudgetRows}
          ly={lyActualRows}
          currentNoXR={currentScenarioRowsNoXR}
          budgetNoXR={currentBudgetRowsNoXR}
          lyNoXR={lyActualRowsNoXR}
        />
      ) : viewMode === 'yearly' ? (
        <StatementYearlyTable
          hotel={hotelSelectionLabel}
          scenario={scenario}
          currency={currency}
          basis={basis}
          year={year}
          allRows={allYearsHotelRows}
          allRowsNoXR={allYearsHotelRowsNoXR}
          years={availableYears}
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
          basis={basis}
          portfolio={portfolio}
          compact
        />
      )}

      {/* Chart — WoW change (summary/portfolio) or monthly/quarterly/yearly trend. */}
      <div className="bg-white border rounded-lg p-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="min-w-0">
            <div className="text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {isMultiHotel
                ? 'Outlook · Weekly'
                : viewMode === 'quarter' ? 'Quarterly trend'
                : viewMode === 'yearly' ? 'Yearly trend'
                : 'Monthly trend'}
            </div>
            <div className="text-[0.8125rem] font-semibold truncate" style={{ color: 'var(--primary)' }}>
              {isMultiHotel ? `${metricDef.label} · ${scopeLabel(scope, periodMonth, year)}` : metricDef.label}
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
          {isMultiHotel ? (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {weeklyOutlookSeries.hotels.map((h, i) => (
                <LegendDot key={h} color={HOTEL_PALETTE[i % HOTEL_PALETTE.length]} label={h} size="sm" />
              ))}
            </div>
          ) : (
            <>
              <LegendDot color={COLOR_COMPARISON} label={scenarioLabel(scenario)} size="sm" />
              <LegendDot color={COLOR_BUDGET} label="Budget" size="sm" />
              <LegendDot color={COLOR_LY} label="LY" size="sm" />
            </>
          )}
        </div>
        <div className="h-[280px]">
          {!isMultiHotel ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
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
                  name={scenarioLabel(scenario)}
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
              <LineChart data={weeklyOutlookSeries.points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E5E5E5" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="week"
                  tickFormatter={(w: string) => w.slice(5).replace('-', '/')}
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
                {weeklyOutlookSeries.hotels.flatMap((h, i) => {
                  const c = HOTEL_PALETTE[i % HOTEL_PALETTE.length];
                  return [
                    <Line
                      key={h}
                      type="monotone"
                      dataKey={h}
                      name={h}
                      stroke={c}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />,
                    <Line
                      key={`${h}__budget`}
                      type="monotone"
                      dataKey={`${h}__budget`}
                      name={`${h} Budget`}
                      stroke={c}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      dot={false}
                      activeDot={false}
                      legendType="none"
                    />,
                  ];
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function ViewToggleMobile({ viewMode, setViewMode, allowedViewModes }: { viewMode: ViewMode; setViewMode: (v: ViewMode) => void; allowedViewModes?: ViewMode[] }) {
  const modes = allowedViewModes ?? VIEW_ORDER;
  return (
    <div className="flex rounded-lg p-[3px] gap-0.5" style={{ background: 'var(--muted)' }}>
      {modes.map((v) => (
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

