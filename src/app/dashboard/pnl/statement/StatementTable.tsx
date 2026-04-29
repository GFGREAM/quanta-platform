'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
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
  TABLE_ROWS,
  fmtValue,
  fmtVar,
  fmtVarPct,
  flowThruPct,
  varianceStyle,
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
  /** FX-stripped variants — current and LY restated at Budget FX. Used by
   *  rows flagged with `useNoXR: true` in tableConfig. */
  currentNoXR: ForecastRow[];
  budgetNoXR: ForecastRow[];
  lyNoXR: ForecastRow[];
  /** Compact density for mobile — smaller padding/font. */
  compact?: boolean;
}

export default function StatementTable({
  hotel, scope, periodMonth, year, scenario, currency,
  current, budget, ly,
  currentNoXR, budgetNoXR, lyNoXR,
  compact,
}: Props) {
  const curAbbr = scenarioAbbrev(scenario);
  const refAbbr = scenarioAbbrev('Budget');
  const lyAbbr = scenarioAbbrev('Actual'); // LY is always closed Actual

  const periodTitle = scopeLabel(scope, periodMonth, year);
  const heading = hotel || 'All hotels';

  const padCell = compact ? 'px-1.5 py-1' : 'px-3 py-1.5';
  const padLabel = compact ? 'px-2 py-1' : 'px-3 py-1.5';
  const fontMain = compact ? 'text-[0.6875rem]' : 'text-[0.8125rem]';
  const fontHeader = compact ? 'text-[0.625rem]' : 'text-[0.6875rem]';

  // Drill-down state — group rows start collapsed; click toggles their children.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggle = (label: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

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
              <th className={`${padLabel} text-left ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }}>
                {/* metric label column */}
              </th>
              <th className={`${padCell} text-right ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }}>
                {curAbbr} {year}
              </th>
              <th className={`${padCell} text-right ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }}>
                {refAbbr} {year}
              </th>
              <th className={`${padCell} text-right ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }}>
                Var
              </th>
              <th className={`${padCell} text-right ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }}>
                Var%
              </th>
              <th className={`${padCell} text-right ${fontHeader} font-semibold uppercase tracking-wider border-l`} style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                {lyAbbr} {year - 1}
              </th>
              <th className={`${padCell} text-right ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }}>
                Var
              </th>
              <th className={`${padCell} text-right ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }}>
                Var%
              </th>
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((row, i) => (
              <Row
                key={row.label ?? `spacer-${i}`}
                row={row}
                current={current}
                budget={budget}
                ly={ly}
                currentNoXR={currentNoXR}
                budgetNoXR={budgetNoXR}
                lyNoXR={lyNoXR}
                padCell={padCell}
                padLabel={padLabel}
                expanded={expanded}
                onToggle={toggle}
                depth={0}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RowProps {
  row: TableRow;
  current: ForecastRow[];
  budget: ForecastRow[];
  ly: ForecastRow[];
  currentNoXR: ForecastRow[];
  budgetNoXR: ForecastRow[];
  lyNoXR: ForecastRow[];
  padCell: string;
  padLabel: string;
  expanded: Set<string>;
  onToggle: (label: string) => void;
  depth: number;
}

function Row(props: RowProps) {
  const {
    row, current, budget, ly, currentNoXR, budgetNoXR, lyNoXR,
    padCell, padLabel, expanded, onToggle, depth,
  } = props;

  if (row.kind === 'spacer') {
    return (
      <tr aria-hidden="true">
        <td colSpan={8} className="h-2" />
      </tr>
    );
  }

  // Rows flagged with useNoXR read from the FX-stripped row sets. Budget passes
  // through unchanged since Budget @ Budget FX is identity.
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
        <td className={`${padCell} text-right font-medium`} style={vsBud === null ? undefined : varianceStyle(vsBud, row.higherIsBetter)}>
          {vsBud === null ? '—' : `${vsBud >= 0 ? '' : '-'}${Math.abs(vsBud).toFixed(1)}%`}
        </td>
        <td className={`${padCell} text-right border-l`} style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>—</td>
        <td className={`${padCell} text-right`} style={{ color: 'var(--text-muted)' }}>—</td>
        <td className={`${padCell} text-right font-medium`} style={vsLy === null ? undefined : varianceStyle(vsLy, row.higherIsBetter)}>
          {vsLy === null ? '—' : `${vsLy >= 0 ? '' : '-'}${Math.abs(vsLy).toFixed(1)}%`}
        </td>
      </tr>
    );
  }

  // Both 'data' and 'group' rows render the same value/variance cells. Groups
  // additionally show a chevron, are clickable, and reveal their children.
  const isGroup = row.kind === 'group';
  const isOpen = isGroup && expanded.has(row.label!);
  const format = row.format ?? 'integer';
  const calc = row.calc ?? (() => 0);
  const cur = calc(curRows);
  const bud = calc(budRows);
  const lyVal = calc(lyRows);
  const varBud = cur - bud;
  const varLy = cur - lyVal;

  const labelClass = row.bold ? 'font-bold' : 'font-normal';
  const valueClass = row.bold ? 'font-bold' : 'font-normal';
  const labelColor = row.bold ? 'var(--primary)' : 'var(--text-primary)';
  // Indent child rows under the group label; chevron icon takes ~14px room.
  const indentPx = depth * 16;
  const Chevron = isOpen ? ChevronDown : ChevronRightIcon;

  return (
    <>
      <tr
        className={`border-t hover:bg-[var(--bg-hover)] ${isGroup ? 'cursor-pointer' : ''}`}
        style={{ borderColor: 'var(--border-light)' }}
        onClick={isGroup ? () => onToggle(row.label!) : undefined}
      >
        <td className={`${padLabel} ${labelClass}`} style={{ color: labelColor, paddingLeft: indentPx ? `${indentPx + 12}px` : undefined }}>
          <span className="inline-flex items-center gap-1.5">
            {isGroup ? (
              <Chevron size={12} style={{ color: 'var(--text-secondary)' }} />
            ) : (
              <span className="inline-block w-3" />
            )}
            {row.label}
          </span>
        </td>
        <td className={`${padCell} text-right tabular-nums ${valueClass}`} style={{ color: 'var(--primary)' }}>
          {fmtValue(cur, format)}
        </td>
        <td className={`${padCell} text-right tabular-nums`} style={{ color: 'var(--text-secondary)' }}>
          {fmtValue(bud, format)}
        </td>
        <td className={`${padCell} text-right tabular-nums`} style={varianceStyle(varBud, row.higherIsBetter)}>
          {fmtVar(format === 'pct' ? cur - bud : varBud, format)}
        </td>
        <td className={`${padCell} text-right tabular-nums`} style={varianceStyle(varBud, row.higherIsBetter)}>
          {fmtVarPct(cur, bud)}
        </td>
        <td className={`${padCell} text-right tabular-nums border-l`} style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
          {fmtValue(lyVal, format)}
        </td>
        <td className={`${padCell} text-right tabular-nums`} style={varianceStyle(varLy, row.higherIsBetter)}>
          {fmtVar(format === 'pct' ? cur - lyVal : varLy, format)}
        </td>
        <td className={`${padCell} text-right tabular-nums`} style={varianceStyle(varLy, row.higherIsBetter)}>
          {fmtVarPct(cur, lyVal)}
        </td>
      </tr>
      {isGroup && isOpen && row.children?.map((child, ci) => (
        <Row
          key={`${row.label}-${ci}`}
          row={child}
          current={current}
          budget={budget}
          ly={ly}
          currentNoXR={currentNoXR}
          budgetNoXR={budgetNoXR}
          lyNoXR={lyNoXR}
          padCell={padCell}
          padLabel={padLabel}
          expanded={expanded}
          onToggle={onToggle}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

