import type { AuditStatus, AuditorResponsible } from '@/lib/schemas/audits';

// ─── Display labels ──────────────────────────────────────────────

export const STATUS_LABELS: Record<AuditStatus, string> = {
  borrador: 'Draft',
  completada: 'Completed',
  archivada: 'Archived',
};

export const STATUS_COLORS: Record<AuditStatus, string> = {
  borrador: '#F59E0B',   // warning / amber
  completada: '#10B981', // success / green
  archivada: '#9CA3AF',  // muted / gray
};

export const AUDITOR_LABELS: Record<AuditorResponsible, string> = {
  leonardo_cuevas: 'Leonardo Cuevas',
  ray_vazquez: 'Ray Vázquez',
  karina_gomez: 'Karina Gómez',
  otro: 'Other',
};

export const AUDITOR_OPTIONS: AuditorResponsible[] = [
  'leonardo_cuevas',
  'ray_vazquez',
  'karina_gomez',
  'otro',
];

export const STATUS_OPTIONS: AuditStatus[] = ['borrador', 'completada', 'archivada'];

// ─── Formatters ──────────────────────────────────────────────────

export function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtScore(score: number | null): string {
  if (score === null || score === undefined) return '—';
  return `${score.toFixed(2)}%`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
