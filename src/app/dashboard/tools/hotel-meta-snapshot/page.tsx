'use client';

import { ChevronRight } from 'lucide-react';

export default function HotelMetaSnapshotPage() {
  return (
    <div className="flex flex-col gap-5" style={{ color: 'var(--text-primary)' }}>
      <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Tools</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--primary)' }}>Hotel META Snapshot</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
          Hotel META Snapshot
        </h1>
        <p className="text-sm mt-0.5 m-0" style={{ color: 'var(--text-secondary)' }}>
          META positioning snapshot for GFG hotels.
        </p>
      </div>

      <div
        className="bg-white border rounded-lg p-10 text-center text-sm"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        Coming soon
      </div>
    </div>
  );
}
