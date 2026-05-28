'use client';
import { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [hovered, setHovered] = useState(false);
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <Header onMenuClick={() => setMobileOpen(!mobileOpen)} />
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        pinned={pinned}
        hovered={hovered}
        onPinToggle={() => setPinned(p => !p)}
        onHoverChange={setHovered}
      />
      <main className={`${pinned ? 'md:ml-60' : 'md:ml-16'} mt-32 p-6 transition-all duration-300`}>
        {children}
      </main>
    </div>
  );
}
