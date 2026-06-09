'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface PermissionsData {
  email: string;
  hasFullAccess: boolean;
  /** section_key → allowed_properties (empty array = all properties) */
  sections: Record<string, string[]>;
  allowedSections: { key: string; label: string }[];
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsData>({
  email: '',
  hasFullAccess: true,
  sections: {},
  allowedSections: [],
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
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/permissions');
        if (!res.ok) {
          // If the API fails, default to full access so the app isn't locked out
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
