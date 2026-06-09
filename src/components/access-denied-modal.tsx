'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface AccessDeniedModalProps {
  email: string;
  allowedSections: { key: string; label: string }[];
}

export default function AccessDeniedModal({ email, allowedSections }: AccessDeniedModalProps) {
  const router = useRouter();

  // Group sections by category prefix for cleaner display
  const grouped = new Map<string, { key: string; label: string }[]>();
  for (const s of allowedSections) {
    const prefix = s.key.split('-')[0];
    const category = PREFIX_LABELS[prefix] ?? prefix;
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category)!.push(s);
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
        {/* Header band */}
        <div
          className="flex flex-col items-center gap-3 px-8 pt-8 pb-6"
          style={{ background: 'linear-gradient(135deg, #172951 0%, #1e3a6e 100%)' }}
        >
          <Image src="/quanta_logo.png" alt="Quanta" width={140} height={56} priority />
          <div className="flex items-center gap-2 mt-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00AFAD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h2 className="text-lg font-bold text-white m-0">Restricted Access</h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          <p className="text-sm leading-relaxed m-0 mb-4" style={{ color: '#4B5563' }}>
            The current account (<span className="font-semibold" style={{ color: '#172951' }}>{email}</span>) only has access to the following sections:
          </p>

          {allowedSections.length === 0 ? (
            <p className="text-sm italic" style={{ color: '#9CA3AF' }}>No sections assigned.</p>
          ) : (
            <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
              {[...grouped.entries()].map(([category, items]) => (
                <div key={category}>
                  <p className="text-[0.625rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((s) => (
                      <span
                        key={s.key}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
                        style={{ background: 'rgba(0,175,173,0.1)', color: '#00807E' }}
                      >
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs mt-5 mb-0" style={{ color: '#9CA3AF' }}>
            Navigate to an allowed section or sign out to switch accounts.
          </p>
        </div>

        {/* Footer actions */}
        <div className="px-8 pb-6 flex gap-3">
          {allowedSections.length > 0 && (
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 h-10 rounded-lg text-sm font-semibold border-none cursor-pointer transition-colors"
              style={{ background: '#00AFAD', color: '#fff' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#009997'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#00AFAD'; }}
            >
              Go to Dashboard
            </button>
          )}
          <button
            onClick={() => {
              // signOut is async — import inline to keep this component simple
              import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/login' }));
            }}
            className="flex-1 h-10 rounded-lg text-sm font-semibold cursor-pointer transition-colors"
            style={{ background: 'transparent', border: '1.5px solid #E5E7EB', color: '#172951' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

const PREFIX_LABELS: Record<string, string> = {
  pnl: 'Profit & Loss',
  topline: 'Top Line',
  bottomline: 'Bottom Line',
  owner: 'Owner Statement',
  guest: 'Guest Experience',
  strategic: 'Strategy & Planning',
  market: 'Market Trends',
  tools: 'Tools',
};
