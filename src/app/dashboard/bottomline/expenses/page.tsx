'use client';

import { useState } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
import ExpensesDesktop from './ExpensesDesktop';
import ExpensesMobile from './ExpensesMobile';
import type { Timeframe } from './data';

export default function ExpensesPage() {
  // Filters live in the container so the same selection survives a desktop ↔
  // mobile resize swap without resetting.
  const [hotel, setHotel] = useState('Fort');
  const [year, setYear] = useState('2026');
  const [month, setMonth] = useState('March');
  const [timeframe, setTimeframe] = useState<Timeframe>('MTD');

  const isMobile = useIsMobile();

  const shared = {
    hotel, setHotel,
    year, setYear,
    month, setMonth,
    timeframe, setTimeframe,
  };

  // Pre-hydration render (isMobile === null): show a skeleton so the server-
  // rendered HTML doesn't mismatch the client tree chosen after matchMedia.
  if (isMobile === null) {
    return (
      <div className="animate-pulse flex flex-col gap-4">
        <div className="h-4 w-48 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-8 w-40 rounded" style={{ background: 'var(--border)' }} />
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg" style={{ background: 'var(--muted)' }} />
          ))}
        </div>
      </div>
    );
  }

  return isMobile ? <ExpensesMobile {...shared} /> : <ExpensesDesktop {...shared} />;
}
