type Props = {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  accent?: string;
  /** Compact mode for mobile views — smaller text and padding. */
  compact?: boolean;
};

export default function KpiCard({ label, value, sub, color, accent, compact }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-white flex flex-col transition-shadow ${compact ? 'p-3 gap-1' : 'p-4 gap-1.5 hover:shadow-md'}`}
      style={{ borderColor: 'var(--border)' }}
    >
      <div
        className={compact ? 'text-[0.625rem] font-semibold uppercase tracking-wider' : 'text-[0.6875rem] font-semibold uppercase tracking-wider'}
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </div>
      <div
        className={compact ? 'text-[0.9375rem] font-bold leading-tight tracking-tight' : 'text-xl font-bold leading-tight tracking-tight'}
        style={{ color: color ?? 'var(--primary)' }}
      >
        {value}
      </div>
      {sub && (
        <div className={compact ? 'text-[0.625rem]' : 'text-xs'} style={{ color: 'var(--text-secondary)' }}>
          {sub}
        </div>
      )}
      {accent && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px]"
          style={{ background: accent }}
        />
      )}
    </div>
  );
}
