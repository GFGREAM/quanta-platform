type Props = {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  accent?: string;
  /** Overrides the muted gray default for the `sub` line (e.g. success/danger
   *  when the sub conveys a positive/negative delta). */
  subColor?: string;
  /** Optional second sub shown right-aligned on the same line as `sub`
   *  (e.g. a "vs LY" delta beside a "vs budget" one). */
  subRight?: string;
  subRightColor?: string;
  /** Compact mode for mobile views — smaller text and padding. */
  compact?: boolean;
};

export default function KpiCard({ label, value, sub, color, accent, subColor, subRight, subRightColor, compact }: Props) {
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
      {subRight ? (
        <div className={`flex items-center justify-between gap-2 ${compact ? 'text-[0.625rem]' : 'text-xs'}`}>
          <span style={{ color: subColor ?? 'var(--text-secondary)' }}>{sub}</span>
          <span style={{ color: subRightColor ?? 'var(--text-secondary)' }}>{subRight}</span>
        </div>
      ) : sub ? (
        <div className={compact ? 'text-[0.625rem]' : 'text-xs'} style={{ color: subColor ?? 'var(--text-secondary)' }}>
          {sub}
        </div>
      ) : null}
      {accent && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px]"
          style={{ background: accent }}
        />
      )}
    </div>
  );
}
