type Props = {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  accent?: string;
};

export default function KpiCard({ label, value, sub, color, accent }: Props) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border bg-white p-4 flex flex-col gap-1.5 transition-shadow hover:shadow-md"
      style={{ borderColor: 'var(--border)' }}
    >
      <div
        className="text-[0.6875rem] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </div>
      <div
        className="text-xl font-bold leading-tight tracking-tight"
        style={{ color: color ?? 'var(--primary)' }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
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
