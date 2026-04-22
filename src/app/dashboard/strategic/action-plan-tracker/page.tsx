'use client';

import { useIsMobile } from '@/lib/useIsMobile';
import ActionPlanTrackerDesktop from './ActionPlanTrackerDesktop';
import ActionPlanTrackerMobile from './ActionPlanTrackerMobile';

export default function ActionPlanTrackerPage() {
  const isMobile = useIsMobile();

  if (isMobile === null) {
    return (
      <div className="animate-pulse flex flex-col gap-4">
        <div className="h-4 w-48 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-8 w-64 rounded" style={{ background: 'var(--border)' }} />
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg" style={{ background: 'var(--muted)' }} />
          ))}
        </div>
        <div className="h-64 rounded-lg" style={{ background: 'var(--muted)' }} />
      </div>
    );
  }

  return isMobile ? <ActionPlanTrackerMobile /> : <ActionPlanTrackerDesktop />;
}
