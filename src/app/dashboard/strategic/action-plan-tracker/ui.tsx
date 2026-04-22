'use client';

import { X } from 'lucide-react';
import {
  Action, AREA_COLORS, STATUS_COLORS, PRIORITY_COLORS,
  fmtMoney, fmtDate, getRoi,
} from './data';

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-[10px] text-[0.6875rem] font-semibold whitespace-nowrap"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {label}
    </span>
  );
}

export function DotBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-[5px] text-xs font-medium">
      <span className="w-[7px] h-[7px] rounded-full shrink-0 inline-block" style={{ background: color }} />
      {label}
    </span>
  );
}

export function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-start gap-3 py-2 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-[0.8125rem] shrink-0" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-[0.8125rem] font-semibold text-right" style={{ color: valueColor || 'var(--primary)' }}>{value}</span>
    </div>
  );
}

export function ActionDetailPanel({
  action, onClose,
}: {
  action: Action | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex justify-end transition-all"
      style={{ pointerEvents: action ? 'all' : 'none' }}
    >
      {action && (
        <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      )}
      <div
        className="w-[420px] max-w-full h-screen bg-white border-l flex flex-col shadow-[-4px_0_20px_rgba(0,0,0,0.08)] transition-transform duration-300 relative z-10"
        style={{
          borderColor: 'var(--border)',
          transform: action ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {action && (
          <>
            <div className="flex items-start justify-between p-5 border-b shrink-0 gap-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-base font-bold leading-tight m-0" style={{ color: 'var(--primary)' }}>
                {action.actionTitle}
              </h3>
              <button
                className="w-8 h-8 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center shrink-0 transition-colors hover:bg-[#F3F4F6]"
                style={{ color: 'var(--text-secondary)' }}
                onClick={onClose}
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              <div className="flex gap-2 flex-wrap">
                <Badge label={action.area} color={AREA_COLORS[action.area] || '#9CA3AF'} />
                <Badge label={action.status} color={STATUS_COLORS[action.status]} />
                <Badge label={action.priority} color={PRIORITY_COLORS[action.priority]} />
              </div>

              <DetailSection title="Description">
                <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>
                  {action.contextDescription || 'No description.'}
                </p>
              </DetailSection>

              <DetailSection title="Details">
                <DetailRow label="Hotel" value={action.hotelProperty} />
                <DetailRow label="Project" value={action.project || '—'} />
                <DetailRow label="Owner" value={action.owner} />
                <DetailRow label="Start date" value={fmtDate(action.startDate)} />
                <DetailRow label="End date" value={fmtDate(action.endDate)} />
                {action.durationDays != null && (
                  <DetailRow label="Duration" value={`${action.durationDays} days`} />
                )}
                <DetailRow label="KPI / Metric" value={action.kpiMetric || '—'} />
              </DetailSection>

              <DetailSection title="Financial">
                <DetailRow label="Investment" value={fmtMoney(action.investmentUsd)} valueColor="#EF4444" />
                <DetailRow label="Expected return" value={fmtMoney(action.expectedReturnUsd)} valueColor="#10B981" />
                {(() => {
                  const r = getRoi(action);
                  const c = r > 0 ? '#10B981' : '#EF4444';
                  return (
                    <>
                      <DetailRow
                        label="Net benefit"
                        value={fmtMoney(action.expectedReturnUsd - action.investmentUsd)}
                        valueColor={c}
                      />
                      <div className="flex justify-between items-start gap-3 py-2">
                        <span className="text-[0.8125rem] shrink-0" style={{ color: 'var(--text-secondary)' }}>ROI</span>
                        <span
                          className="inline-flex items-center gap-[5px] px-2.5 py-1 rounded-xl text-[0.8125rem] font-bold ml-auto"
                          style={{ background: `${c}22`, color: c }}
                        >
                          {r > 0 ? '+' : ''}{r}%
                        </span>
                      </div>
                    </>
                  );
                })()}
              </DetailSection>

              {action.notes && (
                <DetailSection title="Notes">
                  <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>
                    {action.notes}
                  </p>
                </DetailSection>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const dayPct = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  const m = d.getMonth();
  const dim = new Date(d.getFullYear(), m + 1, 0).getDate();
  return ((m + (d.getDate() - 1) / dim) / 12) * 100;
};
