'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  currencyLabel,
  scenarioAbbrev,
  scopeLabel,
  type Basis,
  type Currency,
  type Month,
  type Scenario,
  type Scope,
} from './data';
import {
  FLOW_THRU_FORMULA,
  SUMMARY_ROWS,
  TABLE_ROWS,
  basisCalc,
  basisFormat,
  fmtValue,
  fmtVar,
  flowThruPct,
  type TableRow,
} from './tableConfig';
import { FormulaInfo, VariancePill } from './ui';
import type { PortfolioData } from './useStatement';

interface Props {
  scope: Scope;
  periodMonth: Month;
  year: number;
  scenario: Scenario;
  currency: Currency;
  portfolio: PortfolioData;
  basis: Basis;
  compact?: boolean;
}

export default function StatementPortfolioTable({
  scope, periodMonth, year, scenario, currency, portfolio, basis, compact,
}: Props) {
  const curAbbr = scenarioAbbrev(scenario);
  const periodTitle = scopeLabel(scope, periodMonth, year);
  const numHotels = portfolio.groups.length;
  const colsPerGroup = numHotels + 1; // hotels + TOTAL

  const padCell = compact ? 'px-1.5 py-1' : 'px-2.5 py-1.5';
  const padLabel = compact ? 'px-2 py-1' : 'px-3 py-1.5';
  const fontMain = compact ? 'text-[0.6875rem]' : 'text-[0.75rem]';
  const fontHeader = compact ? 'text-[0.625rem]' : 'text-[0.6875rem]';

  // Toggle between Summary subset (default) and the full Expanded row set.
  const [showDetail, setShowDetail] = useState(false);
  // Drill-down state — group rows start collapsed; click toggles their children.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggle = (label: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  const rows = showDetail ? TABLE_ROWS : SUMMARY_ROWS;
  const ToggleIcon = showDetail ? ChevronDown : ChevronRight;

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
            Portfolio
          </div>
          <div className="text-base font-bold" style={{ color: 'var(--primary)' }}>
            {periodTitle}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-[0.6875rem] font-semibold uppercase tracking-wider transition-colors hover:bg-white"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}
          >
            <ToggleIcon size={12} />
            {showDetail ? 'Collapse to summary' : 'Expand to detail'}
          </button>
          <div className="text-[0.6875rem] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {currencyLabel(currency)} · values in thousands where marked
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className={`w-full border-collapse ${fontMain}`} style={{ color: 'var(--text-primary)' }}>
          {/* Group headers (3 spans) */}
          <thead>
            <tr style={{ background: '#FAFAFA', borderBottom: '1px solid var(--border)' }}>
              <th className={`${padLabel} text-left ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }} />
              <th
                colSpan={colsPerGroup}
                className={`${padCell} text-center ${fontHeader} font-semibold uppercase tracking-wider border-l`}
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
              >
                {curAbbr} {year}
              </th>
              <th
                colSpan={colsPerGroup}
                className={`${padCell} text-center ${fontHeader} font-semibold uppercase tracking-wider border-l`}
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
              >
                {curAbbr} {year} vs Budget {year} ($)
              </th>
              <th
                colSpan={colsPerGroup}
                className={`${padCell} text-center ${fontHeader} font-semibold uppercase tracking-wider border-l`}
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
              >
                {curAbbr} {year} vs Last Year ($)
              </th>
            </tr>
            {/* Hotel codes sub-header */}
            <tr style={{ background: '#FAFAFA', borderBottom: '1px solid var(--border)' }}>
              <th className={`${padLabel} text-left ${fontHeader} font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }} />
              {[0, 1, 2].map((groupIdx) => (
                <GroupHeaderCells
                  key={groupIdx}
                  hotelCodes={portfolio.groups.map((g) => g.code)}
                  padCell={padCell}
                  fontHeader={fontHeader}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <PortfolioRow
                key={`${i}-${row.label ?? 'spacer'}`}
                row={row}
                portfolio={portfolio}
                basis={basis}
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

function GroupHeaderCells({
  hotelCodes, padCell, fontHeader,
}: { hotelCodes: string[]; padCell: string; fontHeader: string }) {
  return (
    <>
      {hotelCodes.map((code, idx) => (
        <th
          key={code}
          className={`${padCell} text-right ${fontHeader} font-semibold tracking-wider ${idx === 0 ? 'border-l' : ''}`}
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
        >
          {code}
        </th>
      ))}
      <th
        className={`${padCell} text-right ${fontHeader} font-bold tracking-wider`}
        style={{ color: 'var(--primary)' }}
      >
        TOTAL
      </th>
    </>
  );
}

function PortfolioRow({
  row, portfolio, basis, padCell, padLabel, expanded, onToggle, depth,
}: {
  row: TableRow;
  portfolio: PortfolioData;
  basis: Basis;
  padCell: string;
  padLabel: string;
  expanded: Set<string>;
  onToggle: (label: string) => void;
  depth: number;
}) {
  const numHotels = portfolio.groups.length;
  const totalCols = 1 + 3 * (numHotels + 1);

  if (row.kind === 'spacer') {
    return (
      <tr aria-hidden="true">
        <td colSpan={totalCols} className="h-2" />
      </tr>
    );
  }

  if (row.kind === 'section_header') {
    return (
      <tr style={{ background: '#FAFAFA' }}>
        <td
          colSpan={totalCols}
          className={`${padLabel} text-[0.6875rem] font-semibold uppercase tracking-wider border-t border-b`}
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
        >
          {row.label}
        </td>
      </tr>
    );
  }

  // Each hotel group carries its own noXR row sets (current and LY restated
  // at the matching month's Budget FX). When useNoXR is on, swap them in.
  const pickCur = (g: PortfolioData['groups'][number]) => row.useNoXR ? g.currentNoXR : g.current;
  const pickLy = (g: PortfolioData['groups'][number]) => row.useNoXR ? g.lyNoXR : g.ly;
  const totalCurRows = row.useNoXR ? portfolio.total.currentNoXR : portfolio.total.current;
  const totalLyRows = row.useNoXR ? portfolio.total.lyNoXR : portfolio.total.ly;

  if (row.kind === 'flow_thru') {
    const isHiFt = !!row.highlight;
    const ftLabelClass = row.bold || isHiFt ? 'font-bold' : 'font-normal';
    const ftLabelColor = (row.bold || isHiFt) ? 'var(--primary)' : 'var(--text-secondary)';
    const ftBg = isHiFt ? 'var(--border)' : (row.bold ? 'var(--muted)' : undefined);
    return (
      <tr className="border-t" style={{ borderColor: 'var(--border-light)', background: ftBg }}>
        <td className={`${padLabel} ${ftLabelClass}`} style={{ color: ftLabelColor }}>
          <span className="inline-flex items-center gap-1.5 align-middle">
            <span className="inline-block w-3" />
            {row.label}
            <FormulaInfo text={FLOW_THRU_FORMULA} />
          </span>
        </td>
        {/* Group 1 (current values) — blanks for Flow Thru */}
        {portfolio.groups.map((g) => (
          <td key={`v-${g.code}`} className={`${padCell} text-right ${g === portfolio.groups[0] ? 'border-l' : ''}`} style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>—</td>
        ))}
        <td className={`${padCell} text-right`} style={{ color: 'var(--text-muted)' }}>—</td>
        {/* Group 2 (vs Budget) — flow thru per hotel + total */}
        {portfolio.groups.map((g, i) => {
          const pct = flowThruPct(pickCur(g), g.budget);
          return (
            <td
              key={`b-${g.code}`}
              className={`${padCell} text-right tabular-nums ${i === 0 ? 'border-l' : ''}`}
              style={{ borderColor: 'var(--border)' }}
            >
              {pct === null ? (
                <span style={{ color: 'var(--text-muted)' }}>{fmtFlowThru(pct)}</span>
              ) : (
                <VariancePill varValue={pct} higherIsBetter={row.higherIsBetter}>
                  {fmtFlowThru(pct)}
                </VariancePill>
              )}
            </td>
          );
        })}
        <td className={`${padCell} text-right tabular-nums font-semibold`}>
          {(() => {
            const pct = flowThruPct(totalCurRows, portfolio.total.budget);
            return pct === null ? (
              <span style={{ color: 'var(--text-muted)' }}>{fmtFlowThru(pct)}</span>
            ) : (
              <VariancePill varValue={pct} higherIsBetter={row.higherIsBetter}>
                {fmtFlowThru(pct)}
              </VariancePill>
            );
          })()}
        </td>
        {/* Group 3 (vs LY) */}
        {portfolio.groups.map((g, i) => {
          const pct = flowThruPct(pickCur(g), pickLy(g));
          return (
            <td
              key={`l-${g.code}`}
              className={`${padCell} text-right tabular-nums ${i === 0 ? 'border-l' : ''}`}
              style={{ borderColor: 'var(--border)' }}
            >
              {pct === null ? (
                <span style={{ color: 'var(--text-muted)' }}>{fmtFlowThru(pct)}</span>
              ) : (
                <VariancePill varValue={pct} higherIsBetter={row.higherIsBetter}>
                  {fmtFlowThru(pct)}
                </VariancePill>
              )}
            </td>
          );
        })}
        <td className={`${padCell} text-right tabular-nums font-semibold`}>
          {(() => {
            const pct = flowThruPct(totalCurRows, totalLyRows);
            return pct === null ? (
              <span style={{ color: 'var(--text-muted)' }}>{fmtFlowThru(pct)}</span>
            ) : (
              <VariancePill varValue={pct} higherIsBetter={row.higherIsBetter}>
                {fmtFlowThru(pct)}
              </VariancePill>
            );
          })()}
        </td>
      </tr>
    );
  }

  const format = basisFormat(row, basis);
  const calc = basisCalc(row, basis);
  const isHi = !!row.highlight;
  const labelClass = row.bold || isHi ? 'font-bold' : 'font-normal';
  const labelColor = (row.bold || isHi) ? 'var(--primary)' : 'var(--text-primary)';
  const valuePrimary = 'var(--primary)';
  const isPercentRow = format === 'pct';
  const isGroup = row.kind === 'group';
  const isOpen = isGroup && expanded.has(row.label!);
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  const indentPx = depth * 16;

  // Compute per-hotel + TOTAL for each group
  const cur = portfolio.groups.map((g) => calc(pickCur(g)));
  const bud = portfolio.groups.map((g) => calc(g.budget));
  const ly = portfolio.groups.map((g) => calc(pickLy(g)));
  const totalCur = calc(totalCurRows);
  const totalBud = calc(portfolio.total.budget);
  const totalLy = calc(totalLyRows);

  // Variance vs reference is `current - reference`. For pct rows this becomes
  // a delta in percentage points.
  const varBud = cur.map((v, i) => v - bud[i]);
  const varLy = cur.map((v, i) => v - ly[i]);
  const totalVarBud = totalCur - totalBud;
  const totalVarLy = totalCur - totalLy;

  return (
    <>
    <tr className={`border-t hover:bg-[var(--bg-hover)] ${isGroup ? 'cursor-pointer' : ''}`} style={{ borderColor: 'var(--border-light)', background: isHi ? 'var(--border)' : (row.bold ? 'var(--muted)' : undefined) }} onClick={isGroup ? () => onToggle(row.label!) : undefined}>
      <td className={`${padLabel} ${labelClass}`} style={{ color: labelColor, paddingLeft: indentPx ? `${indentPx + 12}px` : undefined }}>
        <span className="inline-flex items-center gap-1.5 align-middle">
          {isGroup ? <Chevron size={12} style={{ color: 'var(--text-secondary)' }} /> : <span className="inline-block w-3" />}
          {row.label}
        </span>
      </td>
      {/* Group 1: current values per hotel + TOTAL */}
      {cur.map((v, i) => (
        <td key={`v-${i}`} className={`${padCell} text-right tabular-nums ${i === 0 ? 'border-l' : ''} ${row.bold ? 'font-semibold' : ''}`} style={{ color: valuePrimary, borderColor: 'var(--border)' }}>
          {fmtValue(v, format)}
        </td>
      ))}
      <td className={`${padCell} text-right tabular-nums font-bold`} style={{ color: valuePrimary }}>
        {fmtValue(totalCur, format)}
      </td>
      {/* Group 2: vs Budget */}
      {varBud.map((v, i) => (
        <td
          key={`b-${i}`}
          className={`${padCell} text-right tabular-nums ${i === 0 ? 'border-l' : ''}`}
          style={{ borderColor: 'var(--border)' }}
        >
          <VariancePill varValue={v} higherIsBetter={row.higherIsBetter}>
            {isPercentRow ? fmtPctDelta(v) : fmtVar(v, format)}
          </VariancePill>
        </td>
      ))}
      <td className={`${padCell} text-right tabular-nums font-semibold`}>
        <VariancePill varValue={totalVarBud} higherIsBetter={row.higherIsBetter}>
          {isPercentRow ? fmtPctDelta(totalVarBud) : fmtVar(totalVarBud, format)}
        </VariancePill>
      </td>
      {/* Group 3: vs LY */}
      {varLy.map((v, i) => (
        <td
          key={`l-${i}`}
          className={`${padCell} text-right tabular-nums ${i === 0 ? 'border-l' : ''}`}
          style={{ borderColor: 'var(--border)' }}
        >
          <VariancePill varValue={v} higherIsBetter={row.higherIsBetter}>
            {isPercentRow ? fmtPctDelta(v) : fmtVar(v, format)}
          </VariancePill>
        </td>
      ))}
      <td className={`${padCell} text-right tabular-nums font-semibold`}>
        <VariancePill varValue={totalVarLy} higherIsBetter={row.higherIsBetter}>
          {isPercentRow ? fmtPctDelta(totalVarLy) : fmtVar(totalVarLy, format)}
        </VariancePill>
      </td>
    </tr>
    {isGroup && isOpen && row.children?.map((child, ci) => (
      <PortfolioRow key={`${row.label}-${ci}`} row={child} portfolio={portfolio} basis={basis} padCell={padCell} padLabel={padLabel} expanded={expanded} onToggle={onToggle} depth={depth + 1} />
    ))}
    </>
  );
}

function fmtPctDelta(deltaPp: number): string {
  if (!Number.isFinite(deltaPp)) return '—';
  if (deltaPp === 0) return '-';
  return `${deltaPp >= 0 ? '' : '-'}${Math.abs(deltaPp).toFixed(1)}%`;
}

function fmtFlowThru(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return '—';
  return `${pct >= 0 ? '' : '-'}${Math.abs(pct).toFixed(1)}%`;
}

