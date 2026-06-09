'use client';

import { usePathname } from 'next/navigation';
import { usePermissions } from './permissions-provider';
import AccessDeniedModal from './access-denied-modal';
import { getSectionsForRoute } from '@/lib/section-keys';

export default function PermissionGate({ children }: { children: React.ReactNode }) {
  const { hasFullAccess, sections, allowedSections, email, loading } = usePermissions();
  const pathname = usePathname();

  // While loading, render nothing (the layout skeleton is already visible)
  if (loading) return null;

  // Full-access users see everything
  if (hasFullAccess) return <>{children}</>;

  // No sections at all → denied everywhere
  const sectionKeys = Object.keys(sections);
  if (sectionKeys.length === 0) {
    return <AccessDeniedModal email={email} allowedSections={allowedSections} />;
  }

  // Check if the current route requires specific section_keys
  const required = getSectionsForRoute(pathname);

  // Route with empty required array (e.g. /dashboard home) → accessible for
  // any user that has at least one section (already checked above).
  if (required !== null && required.length === 0) return <>{children}</>;

  // Route has no mapping (unknown route) → block restricted users
  if (required === null) {
    return <AccessDeniedModal email={email} allowedSections={allowedSections} />;
  }

  // User must have at least one of the required section_keys
  const hasAccess = required.some((key) => key in sections);
  if (!hasAccess) {
    return <AccessDeniedModal email={email} allowedSections={allowedSections} />;
  }

  return <>{children}</>;
}
