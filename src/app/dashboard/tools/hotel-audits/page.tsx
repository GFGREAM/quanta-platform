'use client';

import { useIsMobile } from '@/lib/useIsMobile';
import HotelAuditsDesktop from './HotelAuditsDesktop';
import HotelAuditsMobile from './HotelAuditsMobile';

export default function HotelAuditsPage() {
  const isMobile = useIsMobile();

  if (isMobile === null) {
    return (
      <div className="animate-pulse flex flex-col gap-4">
        <div className="h-4 w-48 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-8 w-64 rounded" style={{ background: 'var(--border)' }} />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-32 rounded-md" style={{ background: 'var(--muted)' }} />
          ))}
        </div>
        <div className="h-64 rounded-lg" style={{ background: 'var(--muted)' }} />
      </div>
    );
  }

  return isMobile ? <HotelAuditsMobile /> : <HotelAuditsDesktop />;
}
