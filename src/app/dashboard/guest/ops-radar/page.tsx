'use client';

import { useIsMobile } from '@/lib/useIsMobile';
import OpsRadarDesktop from './OpsRadarDesktop';
import OpsRadarMobile from './OpsRadarMobile';

export default function OpsRadarPage() {
  const isMobile = useIsMobile();

  if (isMobile === null) {
    return (
      <div className="animate-pulse p-7 flex flex-col gap-4">
        <div className="h-8 w-80 rounded" style={{ background: 'var(--border)' }} />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg" style={{ background: 'var(--muted)' }} />
          ))}
        </div>
        <div className="h-96 rounded-xl" style={{ background: 'var(--muted)' }} />
      </div>
    );
  }

  return isMobile ? <OpsRadarMobile /> : <OpsRadarDesktop />;
}
