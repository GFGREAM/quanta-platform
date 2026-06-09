'use client';

import { useMemo } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
import { usePermissions } from '@/components/permissions-provider';
import { VIEW_MODE_TO_SECTION, SECTION_TO_VIEW_MODE } from '@/lib/section-keys';
import { VIEW_ORDER } from './ui';
import type { UseStatementOptions, ViewMode } from './useStatement';
import StatementDesktop from './StatementDesktop';
import StatementMobile from './StatementMobile';

export default function PnLStatementPage() {
  const isMobile = useIsMobile();
  const { hasFullAccess, sections, loading } = usePermissions();

  const permissionOpts = useMemo<UseStatementOptions | undefined>(() => {
    if (hasFullAccess) return undefined;

    // Determine which P&L view modes the user can access
    const allowedViewModes = VIEW_ORDER.filter(
      (vm) => VIEW_MODE_TO_SECTION[vm] in sections,
    );

    // Collect allowed properties across all P&L section_keys (union)
    const propsSet = new Set<string>();
    for (const vm of allowedViewModes) {
      const sk = VIEW_MODE_TO_SECTION[vm];
      const props = sections[sk];
      if (props) for (const p of props) propsSet.add(p);
    }
    const allowedProperties = propsSet.size > 0 ? [...propsSet] : undefined;

    return { allowedViewModes, allowedProperties };
  }, [hasFullAccess, sections]);

  if (isMobile === null || loading) {
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

  return isMobile
    ? <StatementMobile permissionOpts={permissionOpts} />
    : <StatementDesktop permissionOpts={permissionOpts} />;
}
