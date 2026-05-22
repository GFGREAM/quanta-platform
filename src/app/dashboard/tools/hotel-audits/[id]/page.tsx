'use client';

import { useParams } from 'next/navigation';
import { useIsMobile } from '@/lib/useIsMobile';
import AuditDetailDesktop from './AuditDetailDesktop';
import AuditDetailMobile from './AuditDetailMobile';

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  const auditId = Number(id);

  if (isMobile === null || !Number.isInteger(auditId) || auditId <= 0) {
    return (
      <div className="animate-pulse flex flex-col gap-4">
        <div className="h-4 w-48 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-8 w-64 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-64 rounded-lg" style={{ background: 'var(--muted)' }} />
      </div>
    );
  }

  return isMobile
    ? <AuditDetailMobile auditId={auditId} />
    : <AuditDetailDesktop auditId={auditId} />;
}
