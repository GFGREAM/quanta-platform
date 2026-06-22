'use client';

import { usePathname } from 'next/navigation';
import { usePermissions } from './permissions-provider';
import AccessDeniedModal from './access-denied-modal';
import { getSectionsForRoute } from '@/lib/section-keys';

export default function PermissionGate({ children }: { children: React.ReactNode }) {
  const { hasFullAccess, sections, allowedMenus, email, loading } = usePermissions();
  const pathname = usePathname();

  if (loading) return null;
  if (hasFullAccess) return <>{children}</>;

  // No sections at all → denied everywhere (including /dashboard)
  const sectionKeys = Object.keys(sections);
  if (sectionKeys.length === 0) {
    return <AccessDeniedModal email={email} allowedMenus={allowedMenus} />;
  }

  // /dashboard home → restricted users always see the modal as landing/navigation
  if (pathname === '/dashboard') {
    return <AccessDeniedModal email={email} allowedMenus={allowedMenus} />;
  }

  const required = getSectionsForRoute(pathname);

  // Unknown route or route with no mapping → block
  if (required === null || (required.length === 0)) {
    return <AccessDeniedModal email={email} allowedMenus={allowedMenus} />;
  }

  // User must have at least one of the required section_keys
  const hasAccess = required.some((key) => key in sections);
  if (!hasAccess) {
    return <AccessDeniedModal email={email} allowedMenus={allowedMenus} />;
  }

  return <>{children}</>;
}
