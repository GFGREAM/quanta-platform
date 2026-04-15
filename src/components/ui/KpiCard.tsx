'use client';

interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  color?: string;
  accentColor?: string;
}

export default function KpiCard({ label, value, sub, color, accentColor }: KpiCardProps) {
  return (
    <div
      className="relative overflow-hidden bg-white rounded-xl border p-4 flex flex-col gap-1.5 transition-shadow hover:shadow-md"
      style={{ borderColor: 'var(--border)' }}
    >
      <div
        className="text-[0.6875rem] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </div>
      <div
        className="text-xl font-bold leading-tight"
        style={{ color: color || 'var(--primary)' }}
      >
        {value}
      </div>
      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {sub}
      </div>
      {accentColor && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px]"
          style={{ background: accentColor }}
        />
      )}
    </div>
  );
}
