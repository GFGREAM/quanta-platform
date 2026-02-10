'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, DollarSign, FileText, Calculator, Hotel, Users, Wrench, BarChart3, TrendingUp, Sparkles, Star, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MenuItem {
  label: string;
  icon: any;
  href: string;
}

interface MenuCategory {
  category: string;
  items: MenuItem[];
}

type MenuEntry = MenuItem | MenuCategory;

const menuItems: MenuEntry[] = [
  { label: 'Home', icon: Home, href: '/dashboard' },
  { category: 'FINANZAS', items: [
    { label: 'RevPAR', icon: DollarSign, href: '/dashboard/financials/revpar' },
    { label: 'P&L', icon: FileText, href: '/dashboard/financials/pl' },
    { label: 'Budget', icon: Calculator, href: '/dashboard/financials/budget' },
  ]},
  { category: 'OPERATIVO', items: [
    { label: 'Occupancy', icon: Hotel, href: '/dashboard/operations/occupancy' },
    { label: 'Staffing', icon: Users, href: '/dashboard/operations/staff' },
    { label: 'Maintenance', icon: Wrench, href: '/dashboard/operations/maintenance' },
  ]},
  { category: 'MERCADO', items: [
    { label: 'Comp Set', icon: BarChart3, href: '/dashboard/market/comp-set' },
    { label: 'Market Share', icon: TrendingUp, href: '/dashboard/market/market-share' },
  ]},
  { category: 'PREDICTIVE', items: [
    { label: 'Forecast', icon: Sparkles, href: '/dashboard/predictive/forecast' },
  ]},
  { label: 'Favoritos', icon: Star, href: '/dashboard/favorites' },
];

export default function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => { if (mobileOpen && onMobileClose) { const handleResize = () => { if (window.innerWidth >= 768) onMobileClose(); }; window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); } }, [mobileOpen, onMobileClose]);

  const renderLink = (item: MenuItem, key: number) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    return (
      <Link key={key} href={item.href} onClick={onMobileClose} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200 mb-0.5 ${isActive ? 'text-[var(--primary)] bg-[#F0FFFE] border-l-[3px] border-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[#F3F4F6]'}`}>
        <Icon size={20} />{!(collapsed && !mobileOpen) && <span>{item.label}</span>}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {menuItems.map((item, index) => {
          if ('href' in item) return renderLink(item as MenuItem, index);
          return (
            <div key={index} className="mb-2">
              {!(collapsed && !mobileOpen) && <p className="text-[10px] font-semibold tracking-wider text-[var(--text-secondary)] px-3 pt-4 pb-1">{item.category}</p>}
              {collapsed && !mobileOpen && <div className="border-t my-2" style={{ borderColor: 'var(--border)' }} />}
              {item.items.map((subItem, subIndex) => renderLink(subItem, subIndex))}
            </div>
          );
        })}
      </nav>
      <button onClick={() => setCollapsed(!collapsed)} className="hidden md:flex items-center justify-center py-3 border-t text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors" style={{ borderColor: 'var(--border)' }}>
        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
    </div>
  );

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileClose} />}
      <aside className={`fixed top-32 left-0 h-[calc(100vh-128px)] bg-white border-r transition-all duration-300 z-50 ${mobileOpen ? 'w-60 translate-x-0' : '-translate-x-full'} md:translate-x-0 ${collapsed ? 'md:w-16' : 'md:w-60'}`} style={{ borderColor: 'var(--border)' }}>
        {mobileOpen && (
          <button onClick={onMobileClose} className="absolute top-2 right-2 p-1 rounded-md hover:bg-[#F3F4F6] md:hidden"><X size={20} style={{ color: 'var(--text-secondary)' }} /></button>
        )}
        {sidebarContent}
      </aside>
    </>
  );
}
