'use client';
import { Search, ChevronDown, LogOut, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

const searchableDashboards = [
  { label: 'RevPAR', href: '/dashboard/financials/revpar' },
  { label: 'P&L', href: '/dashboard/financials/pl' },
  { label: 'Budget', href: '/dashboard/financials/budget' },
  { label: 'Occupancy', href: '/dashboard/operations/occupancy' },
  { label: 'Staffing', href: '/dashboard/operations/staff' },
  { label: 'Maintenance', href: '/dashboard/operations/maintenance' },
  { label: 'Comp Set', href: '/dashboard/market/comp-set' },
  { label: 'Market Share', href: '/dashboard/market/market-share' },
  { label: 'Forecast', href: '/dashboard/predictive/forecast' },
  { label: 'Favoritos', href: '/dashboard/favorites' },
];

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const userName = session?.user?.name || 'Usuario';
  const userEmail = session?.user?.email || '';
  const initials = getInitials(session?.user?.name);

  const filteredDashboards = searchQuery.trim()
    ? searchableDashboards.filter(d => d.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 h-32 bg-white border-b flex items-center justify-between px-4 z-50" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors md:hidden"><Menu size={20} style={{ color: 'var(--primary)' }} /></button>
        <Link href="/dashboard" className="flex items-center gap-3">
          <img src="/quanta_logo.png" alt="Quanta" className="w-28" />
        </Link>
      </div>
      <div className="flex-1 max-w-md mx-4 md:mx-8 hidden sm:block" ref={searchRef}>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input type="text" placeholder="Buscar dashboards..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }} onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }} className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent" style={{ borderColor: 'var(--border)' }} />
          {searchOpen && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border py-1" style={{ borderColor: 'var(--border)' }}>
              {filteredDashboards.length > 0 ? filteredDashboards.map((d) => (
                <button key={d.href} onClick={() => { router.push(d.href); setSearchQuery(''); setSearchOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[#F3F4F6] transition-colors" style={{ color: 'var(--primary)' }}>{d.label}</button>
              )) : (
                <p className="px-4 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>No se encontraron dashboards</p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="relative">
        <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#F3F4F6] transition-colors">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: 'var(--accent)' }}>{initials}</div>
          <span className="text-sm font-medium hidden md:inline" style={{ color: 'var(--primary)' }}>{userName}</span>
          <ChevronDown size={16} className="text-[var(--text-secondary)] hidden md:inline" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border py-1" style={{ borderColor: 'var(--border)' }}>
            <p className="px-4 py-2 text-sm font-medium" style={{ color: 'var(--primary)' }}>{userName}</p>
            <p className="px-4 pb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{userEmail}</p>
            <div className="border-t" style={{ borderColor: 'var(--border)' }} />
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-[#F3F4F6] transition-colors"><LogOut size={16} />Cerrar sesion</button>
          </div>
        )}
      </div>
    </header>
  );
}
