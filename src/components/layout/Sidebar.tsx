'use client';
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Home, DollarSign, FileText, Hotel, Users, Wrench, BarChart3, TrendingUp, Sparkles, Star, Pin, PinOff, X, Target, Radar, PlaneTakeoff, ClipboardCheck, Workflow, LineChart, Receipt, Banknote, HardHat } from 'lucide-react';
import { usePermissions } from '@/components/permissions-provider';
import { getAllowedRoutes } from '@/lib/section-keys';

interface MenuItem {
  label: string;
  icon: LucideIcon;
  href: string;
}

interface MenuCategory {
  category: string;
  items: MenuItem[];
}

type MenuEntry = MenuItem | MenuCategory;

const menuItems: MenuEntry[] = [
  { label: 'Home', icon: Home, href: '/dashboard' },
  { category: 'PROFIT & LOSS', items: [
    { label: 'P&L Statement', icon: FileText, href: '/dashboard/pnl/statement' },
  ]},
  { category: 'TOP LINE', items: [
    { label: 'Market Share', icon: TrendingUp, href: '/dashboard/topline/market-share' },
    { label: 'Rooms Rev$ (Pack)', icon: DollarSign, href: '/dashboard/topline/rooms-rev' },
    { label: 'Other Rev$ (Non Pack)', icon: DollarSign, href: '/dashboard/topline/other-rev' },
    { label: 'On the Books', icon: BarChart3, href: '/dashboard/topline/on-the-books' },
    { label: 'Group Pipeline', icon: Workflow, href: '/dashboard/topline/group-pipeline' },
  ]},
  { category: 'BOTTOM LINE', items: [
    { label: 'Profitability', icon: LineChart, href: '/dashboard/bottomline/profitability' },
    { label: 'Expenses', icon: DollarSign, href: '/dashboard/bottomline/expenses' },
    { label: 'Staffing', icon: Users, href: '/dashboard/bottomline/staffing' },
    { label: 'Utilities', icon: Wrench, href: '/dashboard/bottomline/utilities' },
  ]},
  { category: 'OWNER STATEMENT', items: [
    { label: 'Owner Expenses', icon: Receipt, href: '/dashboard/owner/expenses' },
    { label: 'Cash Flow', icon: Banknote, href: '/dashboard/owner/cash-flow' },
    { label: 'Capex', icon: HardHat, href: '/dashboard/bottomline/projects' },
  ]},
  { category: 'GUEST EXPERIENCE', items: [
    { label: 'Guest Satisfaction Performance', icon: Star, href: '/dashboard/guest/satisfaction' },
    { label: 'Hotel META Positioning', icon: Hotel, href: '/dashboard/guest/meta-positioning' },
    { label: 'Competitive Set Radar', icon: Radar, href: '/dashboard/guest/ops-radar' },
  ]},
  { category: 'STRATEGY & PLANNING', items: [
    { label: 'Forecast', icon: Sparkles, href: '/dashboard/strategic/forecast' },
    { label: 'Action Plan Tracker', icon: Target, href: '/dashboard/strategic/action-plan-tracker' },
  ]},
  { category: 'MARKET TRENDS', items: [
    { label: 'Airport Passengers', icon: PlaneTakeoff, href: '/dashboard/market/airport-passengers' },
    { label: 'Market Demand', icon: BarChart3, href: '/dashboard/market/market-demand' },
  ]},
  { category: 'TOOLS', items: [
    { label: 'GFG Hotel Audits', icon: ClipboardCheck, href: '/dashboard/tools/hotel-audits' },
    { label: 'Hotel META Snapshot', icon: FileText, href: '/dashboard/tools/hotel-meta-snapshot' },
  ]},
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  pinned: boolean;
  hovered: boolean;
  onPinToggle: () => void;
  onMenuSelect: () => void;
  onHoverChange: (h: boolean) => void;
}

export default function Sidebar({ mobileOpen, onMobileClose, pinned, hovered, onPinToggle, onMenuSelect, onHoverChange }: SidebarProps) {
  const expanded = pinned || hovered;
  const pathname = usePathname();
  const { hasFullAccess, sections, loading } = usePermissions();

  // Build the set of allowed routes for restricted users.
  // While loading, return an empty set so the sidebar shows nothing (prevents
  // flashing the full menu catalog before permissions resolve).
  const allowedRoutes = useMemo(() => {
    if (loading) return new Set<string>(); // empty = show nothing while loading
    if (hasFullAccess) return null; // null = show all
    return getAllowedRoutes(Object.keys(sections));
  }, [hasFullAccess, sections, loading]);

  // Filter menu items based on permissions
  const visibleItems = useMemo<MenuEntry[]>(() => {
    if (allowedRoutes === null) return menuItems;
    return menuItems.reduce<MenuEntry[]>((acc, entry) => {
      if ('href' in entry) {
        // Home link — show if user has any sections
        if (entry.href === '/dashboard' && allowedRoutes.size > 0) acc.push(entry);
        return acc;
      }
      // Category — filter items, only include category if it has visible items
      const filteredItems = entry.items.filter((item) => allowedRoutes.has(item.href));
      if (filteredItems.length > 0) {
        acc.push({ category: entry.category, items: filteredItems });
      }
      return acc;
    }, []);
  }, [allowedRoutes]);

  useEffect(() => { if (mobileOpen && onMobileClose) { const handleResize = () => { if (window.innerWidth >= 768) onMobileClose(); }; window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); } }, [mobileOpen, onMobileClose]);

  const renderLink = (item: MenuItem, key: number) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    return (
      <Link key={key} href={item.href} onClick={() => { onMobileClose?.(); onMenuSelect(); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200 mb-0.5 ${isActive ? 'text-[var(--primary)] bg-[#F0FFFE] border-l-[3px] border-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--bg-hover)]'}`}>
        <Icon size={20} />{(expanded || mobileOpen) && <span>{item.label}</span>}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {visibleItems.map((item, index) => {
          if ('href' in item) return renderLink(item as MenuItem, index);
          return (
            <div key={index} className="mb-2">
              {(expanded || mobileOpen) && <p className="text-[10px] font-semibold tracking-wider text-[var(--text-secondary)] px-3 pt-4 pb-1">{item.category}</p>}
              {!expanded && !mobileOpen && <div className="border-t my-2" style={{ borderColor: 'var(--border)' }} />}
              {item.items.map((subItem, subIndex) => renderLink(subItem, subIndex))}
            </div>
          );
        })}
      </nav>
      <button onClick={onPinToggle} className="hidden md:flex items-center justify-center py-3 border-t text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors" style={{ borderColor: 'var(--border)' }}>
        {pinned ? <Pin size={18} /> : <PinOff size={18} />}
      </button>
    </div>
  );

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileClose} />}
      <aside
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        className={`fixed top-32 left-0 h-[calc(100vh-128px)] bg-white border-r transition-all duration-300 z-50 ${mobileOpen ? 'w-60 translate-x-0' : '-translate-x-full'} md:translate-x-0 ${expanded ? 'md:w-60' : 'md:w-16'} ${!pinned && hovered ? 'shadow-lg' : ''}`}
        style={{ borderColor: 'var(--border)' }}
      >
        {mobileOpen && (
          <button onClick={onMobileClose} className="absolute top-2 right-2 p-1 rounded-md hover:bg-[var(--bg-hover)] md:hidden"><X size={20} style={{ color: 'var(--text-secondary)' }} /></button>
        )}
        {sidebarContent}
      </aside>
    </>
  );
}
