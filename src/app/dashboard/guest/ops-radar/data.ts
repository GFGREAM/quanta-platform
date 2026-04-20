// Shared types, data, and helpers for the Competitive Set Radar page.
// Both Desktop and Mobile views import from here.

export type Prop = {
  name: string;
  full: string;
  color: string;
  scores: number[];
  mine: boolean;
};

export const DIMS = ['Location', 'Cleanliness', 'Service', 'Value', 'Sense of Arrival'];

export const PROPS: Prop[] = [
  { name: 'Waldorf Astoria', full: 'Waldorf Astoria Costa Rica', color: '#172951', scores: [4.7, 4.7, 4.7, 3.8, 3.6], mine: true },
  { name: 'Nekajui RC Reserve', full: 'Nekajui, a Ritz-Carlton Reserve', color: '#00AFAD', scores: [5.0, 5.0, 4.9, 4.7, 4.9], mine: false },
  { name: 'Four Seasons', full: 'Four Seasons Peninsula Papagayo', color: '#1E4080', scores: [4.7, 4.9, 4.8, 4.2, 4.8], mine: false },
  { name: 'Andaz Papagayo', full: 'Andaz Peninsula Papagayo', color: '#69D9D0', scores: [4.7, 4.9, 4.7, 4.4, 4.4], mine: false },
  { name: 'JW Marriott Guanacaste', full: 'JW Marriott Hotel Guanacaste Resort & Spa', color: '#7C3AED', scores: [3.9, 4.7, 4.3, 3.8, 4.0], mine: false },
  { name: 'El Mangroove', full: 'El Mangroove, Autograph Collection', color: '#D97706', scores: [4.5, 4.7, 4.5, 4.1, 4.3], mine: false },
  { name: 'Waldorf Site Inspection', full: 'Waldorf Astoria Costa Rica — Site Inspection', color: '#BE123C', scores: [4.8, 4.7, 4.3, 3.8, 3.6], mine: false },
];

// ── Styling tokens used by both views ────────────────────────
export const DEEP = 'var(--primary)';
export const GREEN_OCEAN = 'var(--accent)';
export const LIGHT_GREEN = 'var(--accent-light)';
export const BORDER_LIGHT = 'var(--border-light)';
export const BORDER = 'var(--border)';
export const MUTED = 'var(--muted)';
export const TEXT_MUTED = 'var(--text-muted)';
export const TEXT_SECONDARY = 'var(--text-secondary)';
export const TEXT_PRIMARY = 'var(--primary)';
export const ACTIVE_BG = 'rgba(0,175,173,0.08)';
export const SUCCESS = 'var(--success)';
export const SUCCESS_BG = 'rgba(16,185,129,0.12)';
export const INFO = 'var(--info)';
export const INFO_BG = 'rgba(14,165,233,0.12)';
export const WARNING = 'var(--warning)';
export const WARNING_BG = 'rgba(245,158,11,0.12)';
export const DANGER = 'var(--danger)';

// ── Score → color band ──────────────────────────────────────
export function heatColor(score: number) {
  if (score >= 4.5) return { bg: '#172951', text: '#FFFFFF' };
  if (score >= 4.0) return { bg: '#BFEFFF', text: '#0C3D5A' };
  if (score >= 3.5) return { bg: '#E0F7FF', text: '#0E4D6B' };
  if (score >= 3.0) return { bg: '#F0FFFE', text: '#0E7490' };
  if (score >= 2.5) return { bg: '#FFFBEB', text: '#92400E' };
  if (score >= 2.0) return { bg: '#FEF2F2', text: '#EF4444' };
  return { bg: '#FEE2E2', text: '#991B1B' };
}

export function heatLabel(score: number) {
  if (score >= 4.5) return 'Benchmark';
  if (score >= 4.0) return 'Excellent';
  if (score >= 3.5) return 'Above standard';
  if (score >= 3.0) return 'Standard';
  if (score >= 2.5) return 'Below';
  return 'Poor';
}

export const SCALE_STEPS = ['#FEE2E2', '#FEF2F2', '#FFFBEB', '#F0FFFE', '#E0F7FF', '#BFEFFF', '#172951'];

// ── Polar math for radar chart ──────────────────────────────
// CX/CY/RAD/ANG depend on the chosen viewBox — the desktop uses a 620x420
// canvas, mobile uses a smaller one. So the helpers are parameterized.
export const ANG_FOR = (count: number) =>
  Array.from({ length: count }, (_, i) => (i / count) * 2 * Math.PI - Math.PI / 2);

export const pointAt = (cx: number, cy: number, a: number, r: number) => ({
  x: cx + r * Math.cos(a),
  y: cy + r * Math.sin(a),
});

export const polyAt = (cx: number, cy: number, angles: number[], r: number) =>
  angles
    .map((a) => pointAt(cx, cy, a, r))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
