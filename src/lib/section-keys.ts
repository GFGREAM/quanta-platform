import type { ViewMode } from '@/app/dashboard/pnl/statement/useStatement';

// ─── Section labels (visible in AccessDeniedModal) ─────────────
export const SECTION_LABELS: Record<string, string> = {
  // P&L Statement tabs
  'pnl-summary': 'P&L Summary',
  'pnl-single': 'P&L Expanded',
  'pnl-monthly': 'P&L Monthly',
  'pnl-quarter': 'P&L Quarterly',
  'pnl-yearly': 'P&L Yearly',
  'pnl-portfolio': 'P&L Portfolio',
  // Top Line
  'topline-market-share': 'Market Share',
  'topline-rooms-rev': 'Rooms Revenue (Pack)',
  'topline-other-rev': 'Other Revenue (Non Pack)',
  'topline-on-the-books': 'On the Books',
  'topline-group-pipeline': 'Group Pipeline',
  // Bottom Line
  'bottomline-profitability': 'Profitability',
  'bottomline-expenses': 'Expenses',
  'bottomline-staffing': 'Staffing',
  'bottomline-utilities': 'Utilities',
  'bottomline-projects': 'Capex / Projects',
  // Owner Statement
  'owner-expenses': 'Owner Expenses',
  'owner-cash-flow': 'Cash Flow',
  // Guest Experience
  'guest-satisfaction': 'Guest Satisfaction',
  'guest-meta-positioning': 'Hotel META Positioning',
  'guest-ops-radar': 'Competitive Set Radar',
  // Strategy & Planning
  'strategic-forecast': 'Forecast',
  'strategic-action-plan-tracker': 'Action Plan Tracker',
  // Market Trends
  'market-airport-passengers': 'Airport Passengers',
  'market-market-demand': 'Market Demand',
  // Tools
  'tools-hotel-audits': 'Hotel Audits',
  'tools-hotel-meta-snapshot': 'Hotel META Snapshot',
};

// ─── Route → section_key(s) ────────────────────────────────────
// Empty array means always accessible (e.g. dashboard home).
// For a restricted user, at least ONE of the listed keys must be present.

const ROUTE_SECTIONS: [string, string[]][] = [
  ['/dashboard', []], // home — always accessible
  ['/dashboard/pnl/statement', ['pnl-summary', 'pnl-single', 'pnl-monthly', 'pnl-quarter', 'pnl-yearly', 'pnl-portfolio']],
  ['/dashboard/topline/market-share', ['topline-market-share']],
  ['/dashboard/topline/rooms-rev', ['topline-rooms-rev']],
  ['/dashboard/topline/other-rev', ['topline-other-rev']],
  ['/dashboard/topline/on-the-books', ['topline-on-the-books']],
  ['/dashboard/topline/group-pipeline', ['topline-group-pipeline']],
  ['/dashboard/bottomline/profitability', ['bottomline-profitability']],
  ['/dashboard/bottomline/expenses', ['bottomline-expenses']],
  ['/dashboard/bottomline/staffing', ['bottomline-staffing']],
  ['/dashboard/bottomline/utilities', ['bottomline-utilities']],
  ['/dashboard/bottomline/projects', ['bottomline-projects']],
  ['/dashboard/owner/expenses', ['owner-expenses']],
  ['/dashboard/owner/cash-flow', ['owner-cash-flow']],
  ['/dashboard/guest/satisfaction', ['guest-satisfaction']],
  ['/dashboard/guest/meta-positioning', ['guest-meta-positioning']],
  ['/dashboard/guest/ops-radar', ['guest-ops-radar']],
  ['/dashboard/strategic/forecast', ['strategic-forecast']],
  ['/dashboard/strategic/action-plan-tracker', ['strategic-action-plan-tracker']],
  ['/dashboard/market/airport-passengers', ['market-airport-passengers']],
  ['/dashboard/market/market-demand', ['market-market-demand']],
  ['/dashboard/tools/hotel-audits', ['tools-hotel-audits']],
  ['/dashboard/tools/hotel-meta-snapshot', ['tools-hotel-meta-snapshot']],
];

/**
 * Given a pathname, return the section_keys required for access.
 * Returns empty array if the route is always accessible.
 * Returns null if the route is unknown (treated as restricted).
 */
export function getSectionsForRoute(pathname: string): string[] | null {
  // Exact match first
  for (const [route, sections] of ROUTE_SECTIONS) {
    if (pathname === route) return sections;
  }
  // Prefix match for dynamic routes (e.g. /dashboard/tools/hotel-audits/[id])
  for (const [route, sections] of ROUTE_SECTIONS) {
    if (route !== '/dashboard' && pathname.startsWith(route + '/')) return sections;
  }
  return null;
}

// ─── P&L ViewMode ↔ section_key ────────────────────────────────

export const VIEW_MODE_TO_SECTION: Record<ViewMode, string> = {
  summary: 'pnl-summary',
  single: 'pnl-single',
  monthly: 'pnl-monthly',
  quarter: 'pnl-quarter',
  yearly: 'pnl-yearly',
  portfolio: 'pnl-portfolio',
};

export const SECTION_TO_VIEW_MODE: Record<string, ViewMode> = Object.fromEntries(
  Object.entries(VIEW_MODE_TO_SECTION).map(([vm, sk]) => [sk, vm as ViewMode]),
) as Record<string, ViewMode>;
