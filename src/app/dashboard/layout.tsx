'use client';
import { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import PermissionsProvider from '@/components/permissions-provider';
import PermissionGate from '@/components/permission-gate';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [hovered, setHovered] = useState(false);
  return (
    <PermissionsProvider>
      <div className="min-h-screen" style={{ background: 'var(--background)' }}>
        <Header onMenuClick={() => setMobileOpen(!mobileOpen)} />
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          pinned={pinned}
          hovered={hovered}
          onPinToggle={() => setPinned(p => !p)}
          onMenuSelect={() => { setPinned(false); setHovered(false); }}
          onHoverChange={setHovered}
        />
        <main className={`${pinned ? 'md:ml-60' : 'md:ml-16'} mt-32 transition-all duration-300`}>
          <div className="p-6 pb-2">
            <PermissionGate>
              {children}
            </PermissionGate>
          </div>
          <p className="text-xs text-center py-3" style={{ color: "var(--text-secondary)" }}>
            &copy; 2026 GFG Asset Management. All Rights Reserved. CONFIDENTIAL &amp; PROPRIETARY. May not be reproduced or distributed without written permission.
          </p>
        </main>
      </div>
    </PermissionsProvider>
  );
}
