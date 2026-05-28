'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  QUARTERS,
  currencyLabel,
  scenarioAbbrev,
  type Basis,
  type Currency,
  type ForecastRow,
  type Month,
  type Scenario,
} from './data';
import {
  FLOW_THRU_FORMULA,
  SUMMARY_ROWS,
  TABLE_ROWS,
  basisCalc,
  basisFormat,
  flowThruPct,
  type TableRow,
} from './tableConfig';
import {
  type Layer,
  LAYER_LABELS,
  LAYER_ORDER,
  computeCell,
  fmtFlow,
  renderCell,
} from './layerHelpers';
import { FormulaInfo, VariancePill } from './ui';

interface Props {
  hotel: string;
  year: number;
  scenario: Scenario;
  currency: Currency;
  current: ForecastRow[];
  budget: ForecastRow[];
  ly: ForecastRow[];
  currentNoXR: ForecastRow[];
  budgetNoXR: ForecastRow[];
  lyNoXR: ForecastRow[];
  basis: Basis;
}

export default function StatementQuarterlyTable({
  hotel, year, scenario, currency,
  current, budget, ly,
  currentNoXR, budgetNoXR, lyNoXR,
  basis,
}: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const [layer, setLayer] = useState<Layer>('out');
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

  const heading = hotel || 'All hotels';
  const curAbbr = scenarioAbbrev(scenario);
  const lyAbbr = scenarioAbbrev('Actual');

  const padCell = 'px-2 py-1.5';
  const padLabel = 'px-3 py-1.5';

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b gap-3 flex-wrap" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
        <div>
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{heading} · Quarterly</div>
          <div className="text-base font-bold" style={{ color: 'var(--primary)' }}>{curAbbr} {year} vs Budget vs {lyAbbr} {year - 1}</div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg p-[3px] gap-0.5" style={{ background: 'white', border: '1px solid var(--border)' }}>
            {LAYER_ORDER.map((k) => (
              <button key={k} onClick={() => setLayer(k)} className={`px-2.5 py-1 rounded-md text-[0.75rem] font-medium border-none cursor-pointer transition-all ${layer === k ? 'shadow-sm' : ''}`} style={{ color: layer === k ? 'var(--primary)' : 'var(--text-secondary)', background: layer === k ? 'var(--muted)' : 'transparent' }}>{LAYER_LABELS[k]}</button>
            ))}
          </div>
          <button type="button" onClick={() => setShowDetail((v) => !v)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-[0.6875rem] font-semibold uppercase tracking-wider transition-colors hover:bg-white" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}>
            <ToggleIcon size={12} />{showDetail ? 'Collapse to summary' : 'Expand to detail'}
          </button>
          <div className="text-[0.6875rem] font-medium" style={{ color: 'var(--text-secondary)' }}>{currencyLabel(currency)} · values in thousands where marked</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.75rem]" style={{ color: 'var(--text-primary)' }}>
          <thead>
            <tr style={{ background: '#FAFAFA', borderBottom: '1px solid var(--border)' }}>
              <th className={`${padLabel} text-left text-[0.6875rem] font-semibold uppercase tracking-wider sticky left-0 bg-[#FAFAFA] z-10`} style={{ color: 'var(--text-secondary)' }} />
              {QUARTERS.map((q) => (<th key={q.label} className={`${padCell} text-right text-[0.6875rem] font-semibold uppercase tracking-wider`} style={{ color: 'var(--text-secondary)' }}>{q.label}</th>))}
              <th className={`${padCell} text-right text-[0.6875rem] font-semibold uppercase tracking-wider border-l`} style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>FY</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <QuarterRow key={`${i}-${row.label ?? 'spacer'}`} row={row} layer={layer} current={current} budget={budget} ly={ly} currentNoXR={currentNoXR} budgetNoXR={budgetNoXR} lyNoXR={lyNoXR} basis={basis} padCell={padCell} padLabel={padLabel} expanded={expanded} onToggle={toggle} depth={0} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuarterRow({ row, layer, current, budget, ly, currentNoXR, budgetNoXR, lyNoXR, basis, padCell, padLabel, expanded, onToggle, depth }: {
  row: TableRow; layer: Layer; current: ForecastRow[]; budget: ForecastRow[]; ly: ForecastRow[];
  currentNoXR: ForecastRow[]; budgetNoXR: ForecastRow[]; lyNoXR: ForecastRow[]; basis: Basis; padCell: string; padLabel: string;
  expanded: Set<string>; onToggle: (label: string) => void; depth: number;
}) {
  const totalCols = 1 + QUARTERS.length + 1;

  if (row.kind === 'spacer') return (<tr aria-hidden="true"><td colSpan={totalCols} className="h-2" /></tr>);
  if (row.kind === 'section_header') {
    return (<tr style={{ background: '#FAFAFA' }}><td colSpan={totalCols} className={`${padLabel} text-[0.6875rem] font-semibold uppercase tracking-wider border-t border-b`} style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>{row.label}</td></tr>);
  }

  const curRows = row.useNoXR ? currentNoXR : current;
  const budRows = row.useNoXR ? budgetNoXR : budget;
  const lyRows = row.useNoXR ? lyNoXR : ly;

  const isHi = !!row.highlight;
  const labelClass = row.bold || isHi ? 'font-bold' : 'font-normal';
  const labelColor = (row.bold || isHi) ? 'var(--primary)' : 'var(--text-primary)';
  const valueClass = row.bold || isHi ? 'font-bold' : 'font-normal';

  if (row.kind === 'flow_thru') {
    const flowFor = (refRows: ForecastRow[]) => QUARTERS.map((q) => flowThruPct(filterQuarter(curRows, q), filterQuarter(refRows, q)));
    const flowFY = (refRows: ForecastRow[]) => flowThruPct(curRows, refRows);
    let cellsByQuarter: (number | null)[] = [];
    let cellFY: number | null = null;
    if (layer === 'varBud' || layer === 'varBudPct') { cellsByQuarter = flowFor(budRows); cellFY = flowFY(budRows); }
    else if (layer === 'varLy' || layer === 'varLyPct') { cellsByQuarter = flowFor(lyRows); cellFY = flowFY(lyRows); }
    else { cellsByQuarter = QUARTERS.map(() => null); cellFY = null; }

    return (
      <tr className="border-t" style={{ borderColor: 'var(--border-light)', background: isHi ? 'var(--border)' : (row.bold ? 'var(--muted)' : undefined) }}>
        <td className={`${padLabel} ${labelClass} sticky left-0 z-10`} style={{ color: labelColor, background: isHi ? 'var(--border)' : (row.bold ? 'var(--muted)' : 'white') }}>
          <span className="inline-flex items-center gap-1.5 align-middle"><span className="inline-block w-3" />{row.label}<FormulaInfo text={FLOW_THRU_FORMULA} /></span>
        </td>
        {cellsByQuarter.map((v, i) => (
          <td key={`q-${i}`} className={`${padCell} text-right tabular-nums`}>
            {v === null ? <span style={{ color: 'var(--text-muted)' }}>{fmtFlow(v)}</span> : <VariancePill varValue={v} higherIsBetter={row.higherIsBetter}>{fmtFlow(v)}</VariancePill>}
          </td>
        ))}
        <td className={`${padCell} text-right tabular-nums font-semibold border-l`} style={{ borderColor: 'var(--border)' }}>
          {cellFY === null ? <span style={{ color: 'var(--text-muted)' }}>{fmtFlow(cellFY)}</span> : <VariancePill varValue={cellFY} higherIsBetter={row.higherIsBetter}>{fmtFlow(cellFY)}</VariancePill>}
        </td>
      </tr>
    );
  }

  const format = basisFormat(row, basis);
  const calc = basisCalc(row, basis);
  const isPercentRow = format === 'pct';
  const sumOver = (rs: ForecastRow[]) => calc(rs);

  const quarterCells = QUARTERS.map((q) => {
    const cur = sumOver(filterQuarter(curRows, q));
    const bud = sumOver(filterQuarter(budRows, q));
    const lyV = sumOver(filterQuarter(lyRows, q));
    return computeCell(layer, isPercentRow, cur, bud, lyV);
  });
  const fyCur = sumOver(curRows);
  const fyBud = sumOver(budRows);
  const fyLy = sumOver(lyRows);
  const fyCell = computeCell(layer, isPercentRow, fyCur, fyBud, fyLy);

  const trBg = isHi ? 'var(--border)' : (row.bold ? 'var(--muted)' : undefined);
  const stickyBg = isHi ? 'var(--border)' : (row.bold ? 'var(--muted)' : 'white');
  const outColor = 'var(--primary)';
  const isGroup = row.kind === 'group';
  const isOpen = isGroup && expanded.has(row.label!);
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  const indentPx = depth * 16;
  return (
    <>
      <tr className={`border-t hover:bg-[var(--bg-hover)] ${isGroup ? 'cursor-pointer' : ''}`} style={{ borderColor: 'var(--border-light)', background: trBg }} onClick={isGroup ? () => onToggle(row.label!) : undefined}>
        <td className={`${padLabel} ${labelClass} sticky left-0 z-10`} style={{ color: labelColor, background: stickyBg, paddingLeft: indentPx ? `${indentPx + 12}px` : undefined }}>
          <span className="inline-flex items-center gap-1.5 align-middle">
            {isGroup ? <Chevron size={12} style={{ color: 'var(--text-secondary)' }} /> : <span className="inline-block w-3" />}
            {row.label}
          </span>
        </td>
        {quarterCells.map((cell, i) => (
          <td key={`q-${i}`} className={`${padCell} text-right tabular-nums ${valueClass}`} style={layer === 'out' ? { color: outColor } : undefined}>
            {renderCell(layer, cell, format, isPercentRow, row.higherIsBetter)}
          </td>
        ))}
        <td className={`${padCell} text-right tabular-nums font-semibold border-l`} style={layer === 'out' ? { color: outColor, borderColor: 'var(--border)' } : { borderColor: 'var(--border)' }}>
          {renderCell(layer, fyCell, format, isPercentRow, row.higherIsBetter)}
        </td>
      </tr>
      {isGroup && isOpen && row.children?.map((child, ci) => (
        <QuarterRow key={`${row.label}-${ci}`} row={child} layer={layer} current={current} budget={budget} ly={ly} currentNoXR={currentNoXR} budgetNoXR={budgetNoXR} lyNoXR={lyNoXR} basis={basis} padCell={padCell} padLabel={padLabel} expanded={expanded} onToggle={onToggle} depth={depth + 1} />
      ))}
    </>
  );
}

function filterQuarter(rows: ForecastRow[], q: { months: Month[] }): ForecastRow[] {
  return rows.filter((r) => q.months.includes(r.month));
}
