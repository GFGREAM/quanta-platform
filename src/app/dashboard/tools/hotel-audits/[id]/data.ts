import type { Severity } from '@/lib/schemas/audits';

export { STATUS_LABELS, STATUS_COLORS, AUDITOR_LABELS, fmtDate, fmtScore } from '../data';

export const SEVERITY_LABELS: Record<Severity, string> = {
  critica: 'Critical',
  alta: 'High',
  media: 'Medium',
  baja: 'Low',
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  critica: '#EF4444',
  alta: '#F97316',
  media: '#F59E0B',
  baja: '#9CA3AF',
};

export function scoreColor(score: number | null): string {
  if (score === null) return 'var(--text-muted)';
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--danger)';
}
