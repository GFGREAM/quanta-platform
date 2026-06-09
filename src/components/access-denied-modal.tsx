'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { AllowedMenu } from '@/lib/section-keys';

interface AccessDeniedModalProps {
  email: string;
  allowedMenus: AllowedMenu[];
}

export default function AccessDeniedModal({ email, allowedMenus }: AccessDeniedModalProps) {
  const router = useRouter();
  const hasMenus = allowedMenus.length > 0;

  // Group menus by sidebar category, preserving order
  const grouped: { category: string; items: AllowedMenu[] }[] = [];
  for (const m of allowedMenus) {
    const last = grouped[grouped.length - 1];
    if (last && last.category === m.category) {
      last.items.push(m);
    } else {
      grouped.push({ category: m.category, items: [m] });
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(23,41,81,0.45)' }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#fff' }}
      >
        {/* Top band — white background with logo + lock icon */}
        <div className="flex flex-col items-center gap-3 px-8 pt-8 pb-6 bg-white">
          <Image src="/quanta_logo.png" alt="Quanta" width={140} height={56} priority />
          <div className="flex items-center gap-2 mt-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00AFAD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h2 className="text-lg font-bold m-0" style={{ color: '#172951' }}>Restricted Access</h2>
          </div>
        </div>

        {/* Bottom band — dark background with sections + sign out */}
        <div
          className="px-8 pt-6 pb-7"
          style={{ background: 'linear-gradient(160deg, #172951 0%, #1e3a6e 100%)' }}
        >
          {!hasMenus ? (
            <>
              <p className="text-sm leading-relaxed m-0 mb-2 text-white/85">
                The account <span className="font-semibold text-white">{email}</span> does not have access to this platform.
              </p>
              <p className="text-sm leading-relaxed m-0 mb-6 text-white/85">
                Please contact your administrator to request access.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm leading-relaxed m-0 mb-1 text-white/85">
                The account <span className="font-semibold text-white">{email}</span> has access to:
              </p>
              <p className="text-xs m-0 mb-4" style={{ color: 'rgba(0,175,173,0.8)' }}>
                Click on any section below to navigate there.
              </p>

              <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
                {grouped.map(({ category, items }) => (
                  <div key={category}>
                    <p className="text-[0.6rem] font-semibold uppercase tracking-wider mb-1.5 text-white/40">
                      {category}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((m) => (
                        <button
                          key={m.route}
                          onClick={() => router.push(m.route)}
                          className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border-none cursor-pointer transition-all"
                          style={{ background: 'rgba(0,175,173,0.15)', color: '#5EECEA' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,175,173,0.3)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,175,173,0.15)'; }}
                        >
                          {m.menuName}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Sign Out button */}
          <button
            onClick={() => {
              import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/login' }));
            }}
            className="w-full h-10 mt-5 rounded-lg text-sm font-semibold cursor-pointer transition-colors border-none"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
