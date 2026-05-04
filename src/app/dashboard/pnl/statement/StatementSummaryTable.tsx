'use client';

import {
  currencyLabel,
  scenarioAbbrev,
  scopeLabel,
  type Currency,
  type ForecastRow,
  type Month,
  type Scenario,
  type Scope,
} from './data';
import {
  FLOW_THRU_FORMULA,
  SUMMARY_ROWS,
  fmtValue,
  fmtVar,
  fmtVarPct,
  flowThruPct,
  type TableRow,
} from './tableConfig';
import { FormulaInfo, VariancePill } from './ui';

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

export default function StatementSummaryTable({
  hotel, scope, periodMonth, year, scenario, currency,
  current, budget, ly,
  currentNoXR, budgetNoXR, lyNoXR,
  compact,
}: Props) {
  const periodTitle = scopeLabel(scope, periodMonth, year);
  const heading = hotel || 'All hotels';

  const padCell = compact ? 'px-1.5 py-1' : 'px-3 py-1.5';
  const padLabel = compact ? 'px-2 py-1' : 'px-3 py-1.5';
  const fontMain = compact ? 'text-[0.6875rem]' : 'text-[0.8125rem]';
  const fontHeader = compact ? 'text-[0.625rem]' : 'text-[0.6875rem]';

  const curAbbr = scenarioAbbrev(scenario);
  const refAbbr = scenarioAbbrev('Budget');
  const lyAbbr = scenarioAbbrev('Actual'); // LY is always closed Actual
  const colSpanAll = compact ? 6 : 8;

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
              {compact ? (
                <>
                  <Th padCell={padCell} fontHeader={fontHeader}>This Year</Th>
                  <Th padCell={padCell} fontHeader={fontHeader}>vs Bud</Th>
                  <Th padCell={padCell} fontHeader={fontHeader}>vs Bud%</Th>
                  <Th padCell={padCell} fontHeader={fontHeader}>vs LY</Th>
                  <Th padCell={padCell} fontHeader={fontHeader}>vs LY%</Th>
                </>
              ) : (
                <>
                  <Th padCell={padCell} fontHeader={fontHeader}>{curAbbr} {year}</Th>
                  <Th padCell={padCell} fontHeader={fontHeader}>{refAbbr} {year}</Th>
                  <Th padCell={padCell} fontHeader={fontHeader}>Var</Th>
                  <Th padCell={padCell} fontHeader={fontHeader}>Var%</Th>
                  <Th padCell={padCell} fontHeader={fontHeader} borderLeft>{lyAbbr} {year - 1}</Th>
                  <Th padCell={padCell} fontHeader={fontHeader}>Var</Th>
                  <Th padCell={padCell} fontHeader={fontHeader}>Var%</Th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {SUMMARY_ROWS.map((row, i) => (
              <Row
                key={`${i}-${row.label ?? 'spacer'}`}
                row={row}
                current={current}
                budget={budget}
                ly={ly}
                currentNoXR={currentNoXR}
                budgetNoXR={budgetNoXR}
                lyNoXR={lyNoXR}
                padCell={padCell}
                padLabel={padLabel}
                colSpanAll={colSpanAll}
                compact={!!compact}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children, padCell, fontHeader, borderLeft,
}: {
  children: React.ReactNode;
  padCell: string;
  fontHeader: string;
  borderLeft?: boolean;
}) {
  return (
    <th
      className={`${padCell} text-right ${fontHeader} font-semibold uppercase tracking-wider${borderLeft ? ' border-l' : ''}`}
      style={{ color: 'var(--text-secondary)', ...(borderLeft ? { borderColor: 'var(--border)' } : {}) }}
    >
      {children}
    </th>
  );
}

function Row({
  row, current, budget, ly, currentNoXR, budgetNoXR, lyNoXR,
  padCell, padLabel, colSpanAll, compact,
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
  colSpanAll: number;
  compact: boolean;
}) {
  if (row.kind === 'spacer') {
    return (
      <tr aria-hidden="true">
        <td colSpan={colSpanAll} className="h-2" />
      </tr>
    );
  }

  if (row.kind === 'section_header') {
    return (
      <tr style={{ background: '#FAFAFA' }}>
        <td
          colSpan={colSpanAll}
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
    if (compact) {
      return (
        <tr className="border-t" style={{ borderColor: 'var(--border-light)' }}>
          <td className={`${padLabel} font-normal`} style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-1.5">
              {row.label}
              <FormulaInfo text={FLOW_THRU_FORMULA} />
            </span>
          </td>
          <td className={`${padCell} text-right`} style={{ color: 'var(--text-muted)' }}>—</td>
          <td className={`${padCell} text-right`} style={{ color: 'var(--text-muted)' }}>—</td>
          <td className={`${padCell} text-right tabular-nums`}>
            {vsBud === null ? (
              <span style={{ color: 'var(--text-muted)' }}>—</span>
            ) : (
              <VariancePill varValue={vsBud} higherIsBetter={row.higherIsBetter}>
                {`${vsBud >= 0 ? '' : '-'}${Math.abs(vsBud).toFixed(1)}%`}
              </VariancePill>
            )}
          </td>
          <td className={`${padCell} text-right`} style={{ color: 'var(--text-muted)' }}>—</td>
          <td className={`${padCell} text-right tabular-nums`}>
            {vsLy === null ? (
              <span style={{ color: 'var(--text-muted)' }}>—</span>
            ) : (
              <VariancePill varValue={vsLy} higherIsBetter={row.higherIsBetter}>
                {`${vsLy >= 0 ? '' : '-'}${Math.abs(vsLy).toFixed(1)}%`}
              </VariancePill>
            )}
          </td>
        </tr>
      );
    }
    return (
      <tr className="border-t" style={{ borderColor: 'var(--border-light)' }}>
        <td className={`${padLabel} font-normal`} style={{ color: 'var(--text-secondary)' }}>
          <span className="inline-flex items-center gap-1.5">
            {row.label}
            <FormulaInfo text={FLOW_THRU_FORMULA} />
          </span>
        </td>
        <td className={`${padCell} text-right`} style={{ color: 'var(--text-muted)' }}>—</td>
        <td className={`${padCell} text-right`} style={{ color: 'var(--text-muted)' }}>—</td>
        <td className={`${padCell} text-right`} style={{ color: 'var(--text-muted)' }}>—</td>
        <td className={`${padCell} text-right`}>
          {vsBud === null ? (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          ) : (
            <VariancePill varValue={vsBud} higherIsBetter={row.higherIsBetter}>
              {`${vsBud >= 0 ? '' : '-'}${Math.abs(vsBud).toFixed(1)}%`}
            </VariancePill>
          )}
        </td>
        <td className={`${padCell} text-right border-l`} style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>—</td>
        <td className={`${padCell} text-right`} style={{ color: 'var(--text-muted)' }}>—</td>
        <td className={`${padCell} text-right`}>
          {vsLy === null ? (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          ) : (
            <VariancePill varValue={vsLy} higherIsBetter={row.higherIsBetter}>
              {`${vsLy >= 0 ? '' : '-'}${Math.abs(vsLy).toFixed(1)}%`}
            </VariancePill>
          )}
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
  const isHi = !!row.highlight;
  const labelClass = row.bold || isHi ? 'font-bold' : 'font-normal';
  const valueClass = row.bold || isHi ? 'font-bold' : 'font-normal';
  const labelColor = isHi ? '#fff' : (row.bold ? 'var(--primary)' : 'var(--text-primary)');
  const valuePrimary = isHi ? '#fff' : 'var(--primary)';
  const valueMuted = isHi ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)';
  const trBg = isHi ? 'var(--primary)' : (row.bold ? 'var(--muted)' : undefined);

  if (compact) {
    const isPercentRow = format === 'pct';
    const varBudCell = isPercentRow ? null : cur - bud;
    const varLyCell = isPercentRow ? null : cur - lyVal;
    const varBudPct = isPercentRow ? cur - bud : undefined;
    const varLyPct = isPercentRow ? cur - lyVal : undefined;
    return (
      <tr className={`border-t ${isHi ? '' : 'hover:bg-[var(--bg-hover)]'}`} style={{ borderColor: 'var(--border-light)', background: trBg }}>
        <td className={`${padLabel} ${labelClass}`} style={{ color: labelColor }}>{row.label}</td>
        <td className={`${padCell} text-right tabular-nums ${valueClass}`} style={{ color: valuePrimary }}>
          {fmtValue(cur, format)}
        </td>
        <td className={`${padCell} text-right tabular-nums ${valueClass}`}>
          {varBudCell === null ? (
            <span style={{ color: isHi ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}></span>
          ) : (
            <VariancePill varValue={varBudCell} higherIsBetter={row.higherIsBetter} onDark={isHi}>
              {fmtVar(varBudCell, format)}
            </VariancePill>
          )}
        </td>
        <td className={`${padCell} text-right tabular-nums ${valueClass}`}>
          <VariancePill
            varValue={isPercentRow ? (varBudPct ?? 0) : (cur - bud)}
            higherIsBetter={row.higherIsBetter}
            onDark={isHi}
          >
            {isPercentRow ? fmtPctDelta(varBudPct) : fmtVarPct(cur, bud)}
          </VariancePill>
        </td>
        <td className={`${padCell} text-right tabular-nums ${valueClass}`}>
          {varLyCell === null ? (
            <span style={{ color: isHi ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}></span>
          ) : (
            <VariancePill varValue={varLyCell} higherIsBetter={row.higherIsBetter} onDark={isHi}>
              {fmtVar(varLyCell, format)}
            </VariancePill>
          )}
        </td>
        <td className={`${padCell} text-right tabular-nums ${valueClass}`}>
          <VariancePill
            varValue={isPercentRow ? (varLyPct ?? 0) : (cur - lyVal)}
            higherIsBetter={row.higherIsBetter}
            onDark={isHi}
          >
            {isPercentRow ? fmtPctDelta(varLyPct) : fmtVarPct(cur, lyVal)}
          </VariancePill>
        </td>
      </tr>
    );
  }

  // Desktop layout — mirrors StatementTable (Detailed view):
  // label · Outlook · Budget · Var · Var% · LY · Var · Var%
  const varBud = cur - bud;
  const varLy = cur - lyVal;
  return (
    <tr className={`border-t ${isHi ? '' : 'hover:bg-[var(--bg-hover)]'}`} style={{ borderColor: 'var(--border-light)', background: trBg }}>
      <td className={`${padLabel} ${labelClass}`} style={{ color: labelColor }}>{row.label}</td>
      <td className={`${padCell} text-right tabular-nums ${valueClass}`} style={{ color: valuePrimary }}>
        {fmtValue(cur, format)}
      </td>
      <td className={`${padCell} text-right tabular-nums ${valueClass}`} style={{ color: valueMuted }}>
        {fmtValue(bud, format)}
      </td>
      <td className={`${padCell} text-right tabular-nums ${valueClass}`}>
        <VariancePill varValue={varBud} higherIsBetter={row.higherIsBetter} onDark={isHi}>
          {fmtVar(format === 'pct' ? cur - bud : varBud, format)}
        </VariancePill>
      </td>
      <td className={`${padCell} text-right tabular-nums ${valueClass}`}>
        <VariancePill varValue={varBud} higherIsBetter={row.higherIsBetter} onDark={isHi}>
          {fmtVarPct(cur, bud)}
        </VariancePill>
      </td>
      <td className={`${padCell} text-right tabular-nums border-l ${valueClass}`} style={{ color: valueMuted, borderColor: 'var(--border)' }}>
        {fmtValue(lyVal, format)}
      </td>
      <td className={`${padCell} text-right tabular-nums ${valueClass}`}>
        <VariancePill varValue={varLy} higherIsBetter={row.higherIsBetter} onDark={isHi}>
          {fmtVar(format === 'pct' ? cur - lyVal : varLy, format)}
        </VariancePill>
      </td>
      <td className={`${padCell} text-right tabular-nums ${valueClass}`}>
        <VariancePill varValue={varLy} higherIsBetter={row.higherIsBetter} onDark={isHi}>
          {fmtVarPct(cur, lyVal)}
        </VariancePill>
      </td>
    </tr>
  );
}

function fmtPctDelta(deltaPp: number | undefined): string {
  if (deltaPp === undefined || !Number.isFinite(deltaPp)) return '—';
  if (deltaPp === 0) return '-';
  return `${deltaPp >= 0 ? '' : '-'}${Math.abs(deltaPp).toFixed(1)}%`;
}
