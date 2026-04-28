'use client';

import {
  currencyLabel,
  scopeLabel,
  type Currency,
  type ForecastRow,
  type Month,
  type Scenario,
  type Scope,
} from './data';
import {
  SUMMARY_ROWS,
  fmtValue,
  fmtVar,
  flowThruPct,
  type TableRow,
} from './tableConfig';

interface Props {
  hotel: string;
  scope: Scope;
  periodMonth: Month;
  year: number;
  scenario: Scenario;
  currency: Currency;
  current: ForecastRow[];
  budget: ForecastRow[];
  ly: ForecastRow[];
  /** FX-stripped variants — current and LY restated at Budget FX. */
  currentNoXR: ForecastRow[];
  budgetNoXR: ForecastRow[];
  lyNoXR: ForecastRow[];
  compact?: boolean;
}

const BG_GOOD = 'rgba(16, 185, 129, 0.10)';
const BG_BAD = 'rgba(239, 68, 68, 0.10)';

export default function StatementSummaryTable({
  hotel, scope, periodMonth, year, scenario, currency,
  current, budget, ly,
  currentNoXR, budgetNoXR, lyNoXR,
  compact,
}: Props) {
  void scenario; // header reflects period only — scenario is implied by current

  const periodTitle = scopeLabel(scope, periodMonth, year);
  const heading = hotel || 'All hotels';

  const padCell = compact ? 'px-1.5 py-1' : 'px-3 py-1.5';
  const padLabel = compact ? 'px-2 py-1' : 'px-3 py-1.5';
  const fontMain = compact ? 'text-[0.6875rem]' : 'text-[0.8125rem]';
  const fontHeader = compact ? 'text-[0.625rem]' : 'text-[0.6875rem]';

  return (
    <div
      className="bg-white border rounded-lg shadow-sm overflow-hidden"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Title strip */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
      >
        <div>
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {heading}
          </div>
          <div className="text-base font-bold" style={{ color: 'var(--primary)' }}>
            {periodTitle}
          </div>
        </div>
        <div className="text-[0.6875rem] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {currencyLabel(currency)} · values in thousands where marked
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className={`w-full border-collapse ${fontMain}`} style={{ color: 'var(--text-primary)' }}>
          <thead>
            <tr style={{ background: '#FAFAFA', borderBottom: '1px solid var(--border)' }}>
              <th className={`${padLabel} text-left ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }} />
              <th className={`${padCell} text-right ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }}>
                This Year
              </th>
              <th className={`${padCell} text-right ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }}>
                vs Bud
              </th>
              <th className={`${padCell} text-right ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }}>
                vs LY
              </th>
              <th className={`${padCell} text-right ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }}>
                vs Bud%
              </th>
              <th className={`${padCell} text-right ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }}>
                vs LY%
              </th>
            </tr>
          </thead>
          <tbody>
            {SUMMARY_ROWS.map((row, i) => (
              <Row
                key={i}
                row={row}
                current={current}
                budget={budget}
                ly={ly}
                currentNoXR={currentNoXR}
                budgetNoXR={budgetNoXR}
                lyNoXR={lyNoXR}
                padCell={padCell}
                padLabel={padLabel}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  row, current, budget, ly, currentNoXR, budgetNoXR, lyNoXR, padCell, padLabel,
}: {
  row: TableRow;
  current: ForecastRow[];
  budget: ForecastRow[];
  ly: ForecastRow[];
  currentNoXR: ForecastRow[];
  budgetNoXR: ForecastRow[];
  lyNoXR: ForecastRow[];
  padCell: string;
  padLabel: string;
}) {
  if (row.kind === 'spacer') {
    return (
      <tr aria-hidden="true">
        <td colSpan={6} className="h-2" />
      </tr>
    );
  }

  if (row.kind === 'section_header') {
    return (
      <tr style={{ background: '#FAFAFA' }}>
        <td
          colSpan={6}
          className={`${padLabel} text-[0.6875rem] font-semibold uppercase tracking-wider border-t border-b`}
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
        >
          {row.label}
        </td>
      </tr>
    );
  }

  // Rows flagged with useNoXR read the FX-stripped row sets.
  const curRows = row.useNoXR ? currentNoXR : current;
  const budRows = row.useNoXR ? budgetNoXR : budget;
  const lyRows = row.useNoXR ? lyNoXR : ly;

  if (row.kind === 'flow_thru') {
    const vsBud = flowThruPct(curRows, budRows);
    const vsLy = flowThruPct(curRows, lyRows);
    return (
      <tr className="border-t" style={{ borderColor: 'var(--border-light)' }}>
        <td className={`${padLabel} font-normal`} style={{ color: 'var(--text-secondary)' }}>
          {row.label}
        </td>
        <td className={`${padCell} text-right`} style={{ color: 'var(--text-muted)' }}>—</td>
        <td className={`${padCell} text-right`} style={{ color: 'var(--text-muted)' }}>—</td>
        <td className={`${padCell} text-right`} style={{ color: 'var(--text-muted)' }}>—</td>
        <td className={`${padCell} text-right tabular-nums font-medium`} style={vsBud === null ? undefined : varianceStyle(vsBud, row.higherIsBetter)}>
          {vsBud === null ? '—' : `${vsBud >= 0 ? '' : '-'}${Math.abs(vsBud).toFixed(1)}%`}
        </td>
        <td className={`${padCell} text-right tabular-nums font-medium`} style={vsLy === null ? undefined : varianceStyle(vsLy, row.higherIsBetter)}>
          {vsLy === null ? '—' : `${vsLy >= 0 ? '' : '-'}${Math.abs(vsLy).toFixed(1)}%`}
        </td>
      </tr>
    );
  }

  // data row
  const format = row.format ?? 'integer';
  const calc = row.calc ?? (() => 0);
  const cur = calc(curRows);
  const bud = calc(budRows);
  const lyVal = calc(lyRows);
  const isPercentRow = format === 'pct';
  const labelClass = row.bold ? 'font-bold' : 'font-normal';
  const valueClass = row.bold ? 'font-bold' : 'font-normal';
  const labelColor = row.bold ? 'var(--primary)' : 'var(--text-primary)';

  // For % rows the absolute Var $ columns stay blank; only Var% (pp delta)
  // is meaningful. Otherwise show the delta in the row's own format.
  const varBudCell = isPercentRow ? null : cur - bud;
  const varLyCell = isPercentRow ? null : cur - lyVal;
  const varBudPct = isPercentRow ? cur - bud : undefined;
  const varLyPct = isPercentRow ? cur - lyVal : undefined;

  return (
    <tr className="border-t hover:bg-[var(--bg-hover)]" style={{ borderColor: 'var(--border-light)' }}>
      <td className={`${padLabel} ${labelClass}`} style={{ color: labelColor }}>
        {row.label}
      </td>
      <td className={`${padCell} text-right tabular-nums ${valueClass}`} style={{ color: 'var(--primary)' }}>
        {fmtValue(cur, format)}
      </td>
      <td
        className={`${padCell} text-right tabular-nums`}
        style={varBudCell === null ? { color: 'var(--text-muted)' } : varianceStyle(varBudCell, row.higherIsBetter)}
      >
        {varBudCell === null ? '' : fmtVar(varBudCell, format)}
      </td>
      <td
        className={`${padCell} text-right tabular-nums`}
        style={varLyCell === null ? { color: 'var(--text-muted)' } : varianceStyle(varLyCell, row.higherIsBetter)}
      >
        {varLyCell === null ? '' : fmtVar(varLyCell, format)}
      </td>
      <td
        className={`${padCell} text-right tabular-nums`}
        style={isPercentRow
          ? varianceStyle(varBudPct ?? 0, row.higherIsBetter)
          : varianceStyle(cur - bud, row.higherIsBetter)}
      >
        {isPercentRow ? fmtPctDelta(varBudPct) : fmtVarPctRel(cur, bud)}
      </td>
      <td
        className={`${padCell} text-right tabular-nums`}
        style={isPercentRow
          ? varianceStyle(varLyPct ?? 0, row.higherIsBetter)
          : varianceStyle(cur - lyVal, row.higherIsBetter)}
      >
        {isPercentRow ? fmtPctDelta(varLyPct) : fmtVarPctRel(cur, lyVal)}
      </td>
    </tr>
  );
}

function fmtPctDelta(deltaPp: number | undefined): string {
  if (deltaPp === undefined || !Number.isFinite(deltaPp)) return '—';
  if (deltaPp === 0) return '-';
  return `${deltaPp >= 0 ? '' : '-'}${Math.abs(deltaPp).toFixed(1)}%`;
}

function fmtVarPctRel(current: number, ref: number): string {
  if (!Number.isFinite(current) || !Number.isFinite(ref) || ref === 0) return '—';
  const pct = ((current - ref) / Math.abs(ref)) * 100;
  return `${pct >= 0 ? '' : '-'}${Math.abs(pct).toFixed(1)}%`;
}

function varianceStyle(varValue: number | null, higherIsBetter?: boolean): React.CSSProperties {
  if (higherIsBetter === undefined) return { color: 'var(--text-primary)' };
  if (varValue === null || !Number.isFinite(varValue) || varValue === 0) {
    return { color: 'var(--text-secondary)' };
  }
  const isGood = higherIsBetter ? varValue > 0 : varValue < 0;
  return isGood
    ? { color: 'var(--success)', background: BG_GOOD }
    : { color: 'var(--danger)', background: BG_BAD };
}
