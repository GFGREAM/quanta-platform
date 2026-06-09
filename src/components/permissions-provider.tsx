'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AllowedMenu } from '@/lib/section-keys';

export interface PermissionsData {
  email: string;
  hasFullAccess: boolean;
  /** section_key → allowed_properties (empty array = all properties) */
  sections: Record<string, string[]>;
  allowedSections: { key: string; label: string }[];
  /** Menu-level list for modal / sidebar (deduplicated by route) */
  allowedMenus: AllowedMenu[];
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsData>({
  email: '',
  hasFullAccess: true,
  sections: {},
  allowedSections: [],
  allowedMenus: [],
  loading: true,
});

export function usePermissions() {
  return useContext(PermissionsContext);
}

export default function PermissionsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PermissionsData>({
    email: '',
    hasFullAccess: true,
    sections: {},
    allowedSections: [],
    allowedMenus: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/permissions');
        if (!res.ok) {
          if (!cancelled) setData((d) => ({ ...d, loading: false }));
          return;
        }
        const json = await res.json();
        if (!cancelled) {
          setData({
            email: json.email ?? '',
            hasFullAccess: json.hasFullAccess ?? true,
            sections: json.sections ?? {},
            allowedSections: json.allowedSections ?? [],
            allowedMenus: json.allowedMenus ?? [],
            loading: false,
          });
        }
      } catch {
        if (!cancelled) setData((d) => ({ ...d, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <PermissionsContext.Provider value={data}>
      {children}
    </PermissionsContext.Provider>
  );
}
