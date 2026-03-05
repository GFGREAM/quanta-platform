'use client';

import Image from 'next/image';

export default function DashboardHome() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--primary)' }}>Dashboard</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Resumen general de propiedades</p>
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <Image
          src="/dashboard-preview.png"
          alt="Market Share Overview"
          width={1920}
          height={1080}
          className="w-full h-auto"
          priority
        />
      </div>
    </div>
  );
}

