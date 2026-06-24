import type { ViewMode } from '@/app/dashboard/pnl/statement/useStatement';

// ─── Section labels (individual section_key → label) ───────────
export const SECTION_LABELS: Record<string, string> = {
  'pnl-summary': 'P&L Summary', 'pnl-single': 'P&L Expanded', 'pnl-monthly': 'P&L Monthly',
  'pnl-quarter': 'P&L Quarterly', 'pnl-yearly': 'P&L Yearly', 'pnl-portfolio': 'P&L Portfolio',
  'topline-market-share': 'Market Share', 'topline-rooms-rev': 'Rooms Revenue (Pack)',
  'topline-other-rev': 'Other Revenue (Non Pack)',
  'topline-otb-hotel-report': 'OTB Hotel Report', 'topline-otb-demand-360': 'OTB Demand 360',
  'topline-group-pipeline': 'Group Pipeline',
  'bottomline-profitability': 'Profitability', 'bottomline-expenses': 'Expenses',
  'bottomline-staffing': 'Staffing', 'bottomline-utilities': 'Utilities',
  'bottomline-projects': 'Capex / Projects',
  'owner-expenses': 'Owner Expenses', 'owner-cash-flow': 'Cash Flow',
  'guest-satisfaction': 'Guest Satisfaction', 'guest-meta-positioning': 'Hotel META Positioning',
  'guest-ops-radar': 'Competitive Set Radar',
  'strategic-forecast': 'Forecast', 'strategic-action-plan-tracker': 'Action Plan Tracker',
  'market-airport-passengers': 'Airport Passengers', 'market-market-demand': 'Market Demand',
  'tools-hotel-audits': 'Hotel Audits', 'tools-hotel-meta-snapshot': 'Hotel META Snapshot',
};

// ─── Menu-level mapping ────────────────────────────────────────
// Maps each section_key to its parent sidebar menu item for modal display.

export interface MenuInfo {
  menuName: string;
  category: string;
  route: string;
}

const menu = (menuName: string, category: string, route: string): MenuInfo => ({ menuName, category, route });

export const SECTION_TO_MENU: Record<string, MenuInfo> = {
  'pnl-summary':    menu('P&L Statement', 'PROFIT & LOSS', '/dashboard/pnl/statement'),
  'pnl-single':     menu('P&L Statement', 'PROFIT & LOSS', '/dashboard/pnl/statement'),
  'pnl-monthly':    menu('P&L Statement', 'PROFIT & LOSS', '/dashboard/pnl/statement'),
  'pnl-quarter':    menu('P&L Statement', 'PROFIT & LOSS', '/dashboard/pnl/statement'),
  'pnl-yearly':     menu('P&L Statement', 'PROFIT & LOSS', '/dashboard/pnl/statement'),
  'pnl-portfolio':  menu('P&L Statement', 'PROFIT & LOSS', '/dashboard/pnl/statement'),
  'topline-market-share':  menu('Market Share', 'TOP LINE', '/dashboard/topline/market-share'),
  'topline-rooms-rev':     menu('Rooms Rev$ (Pack)', 'TOP LINE', '/dashboard/topline/rooms-rev'),
  'topline-other-rev':     menu('Other Rev$ (Non Pack)', 'TOP LINE', '/dashboard/topline/other-rev'),
  'topline-otb-hotel-report': menu('On the Books', 'TOP LINE', '/dashboard/topline/on-the-books'),
  'topline-otb-demand-360':   menu('On the Books', 'TOP LINE', '/dashboard/topline/on-the-books'),
  'topline-group-pipeline': menu('Group Pipeline', 'TOP LINE', '/dashboard/topline/group-pipeline'),
  'bottomline-profitability': menu('Profitability', 'BOTTOM LINE', '/dashboard/bottomline/profitability'),
  'bottomline-expenses':  menu('Expenses', 'BOTTOM LINE', '/dashboard/bottomline/expenses'),
  'bottomline-staffing':  menu('Staffing', 'BOTTOM LINE', '/dashboard/bottomline/staffing'),
  'bottomline-utilities': menu('Utilities', 'BOTTOM LINE', '/dashboard/bottomline/utilities'),
  'bottomline-projects':  menu('Capex', 'OWNER STATEMENT', '/dashboard/bottomline/projects'),
  'owner-expenses':   menu('Owner Expenses', 'OWNER STATEMENT', '/dashboard/owner/expenses'),
  'owner-cash-flow':  menu('Cash Flow', 'OWNER STATEMENT', '/dashboard/owner/cash-flow'),
  'guest-satisfaction':     menu('Guest Satisfaction Performance', 'GUEST EXPERIENCE', '/dashboard/guest/satisfaction'),
  'guest-meta-positioning': menu('Hotel META Positioning', 'GUEST EXPERIENCE', '/dashboard/guest/meta-positioning'),
  'guest-ops-radar':        menu('Competitive Set Radar', 'GUEST EXPERIENCE', '/dashboard/guest/ops-radar'),
  'strategic-forecast':            menu('Forecast', 'STRATEGY & PLANNING', '/dashboard/strategic/forecast'),
  'strategic-action-plan-tracker': menu('Action Plan Tracker', 'STRATEGY & PLANNING', '/dashboard/strategic/action-plan-tracker'),
  'market-airport-passengers': menu('Airport Passengers', 'MARKET TRENDS', '/dashboard/market/airport-passengers'),
  'market-market-demand':      menu('Market Demand', 'MARKET TRENDS', '/dashboard/market/market-demand'),
  'tools-hotel-audits':       menu('GFG Hotel Audits', 'TOOLS', '/dashboard/tools/hotel-audits'),
  'tools-hotel-meta-snapshot': menu('Hotel META Snapshot', 'TOOLS', '/dashboard/tools/hotel-meta-snapshot'),
};

/**
 * Deduplicate section_keys into unique menu items grouped by sidebar category.
 * Returns them in the order categories appear in the sidebar.
 */
const CATEGORY_ORDER = [
  'PROFIT & LOSS', 'TOP LINE', 'BOTTOM LINE', 'OWNER STATEMENT',
  'GUEST EXPERIENCE', 'STRATEGY & PLANNING', 'MARKET TRENDS', 'TOOLS',
];

export interface AllowedMenu {
  menuName: string;
  category: string;
  route: string;
}

export function getAllowedMenus(sectionKeys: string[]): AllowedMenu[] {
  const seen = new Set<string>();
  const menus: AllowedMenu[] = [];
  for (const sk of sectionKeys) {
    const info = SECTION_TO_MENU[sk];
    if (!info || seen.has(info.route)) continue;
    seen.add(info.route);
    menus.push({ menuName: info.menuName, category: info.category, route: info.route });
  }
  menus.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
  return menus;
}

/**
 * Returns the set of sidebar routes a restricted user can access.
 * Used by the Sidebar to filter visible menu items.
 */
export function getAllowedRoutes(sectionKeys: string[]): Set<string> {
  const routes = new Set<string>();
  for (const sk of sectionKeys) {
    const info = SECTION_TO_MENU[sk];
    if (info) routes.add(info.route);
  }
  return routes;
}

// ─── Route → section_key(s) ────────────────────────────────────
// Empty array means always accessible (e.g. dashboard home).
// For a restricted user, at least ONE of the listed keys must be present.

const ROUTE_SECTIONS: [string, string[]][] = [
  ['/dashboard', []], // home — always accessible
  ['/dashboard/pnl/statement', ['pnl-summary', 'pnl-single', 'pnl-monthly', 'pnl-quarter', 'pnl-yearly', 'pnl-portfolio']],
  ['/dashboard/topline/market-share', ['topline-market-share']],
  ['/dashboard/topline/rooms-rev', ['topline-rooms-rev']],
  ['/dashboard/topline/other-rev', ['topline-other-rev']],
  ['/dashboard/topline/on-the-books', ['topline-otb-hotel-report', 'topline-otb-demand-360']],
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
