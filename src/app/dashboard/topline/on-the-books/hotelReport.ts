/**
 * On The Books · Hotel Report data access (weekly_pace.weekly_pace).
 *
 * Monthly pace, no segments. Fetches /api/otb/hotel-report and exposes the hotel
 * list (Property slicer), the available weekly snapshots, the 12-month board for
 * the selected week, and the FY-total-per-week progression series.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';

export interface HotelMeta { code: string; name: string; rooms: number }

export interface HotelMonth {
  m: number; days: number; avail: number; open: boolean;
  otbRn: number; otbRev: number; stlyRn: number; stlyRev: number;
  budRn: number; budRev: number; lyCloseRn: number; lyCloseRev: number;
  // Pickup vs the prior weekly snapshot (last week) and 4 snapshots back; null = no baseline.
  puRn: number | null; puRev: number | null; pu4Rn: number | null; pu4Rev: number | null;
}

export interface ProgWeek {
  week: string;
  otbRn: number; otbRev: number; budRn: number; budRev: number;
  avail: number; projRn: number; projRev: number;
}

interface HotelReportResponse {
  hotels: HotelMeta[];
  hotel?: HotelMeta;
  weeks?: string[];
  week?: string;
  year?: number;
  months?: HotelMonth[];
  progression?: ProgWeek[];
}

export interface HotelReportData {
  loading: boolean;
  hotels: HotelMeta[];
  hotelName: string;
  weeks: string[];
  week: string;
  setWeek: (w: string) => void;
  months: HotelMonth[];
  progression: ProgWeek[];
}

const EMPTY: HotelReportData = {
  loading: true, hotels: [], hotelName: '', weeks: [], week: '',
  setWeek: () => {}, months: [], progression: [],
};

export function useHotelReport(hotelCode: string, enabled: boolean): HotelReportData {
  const [data, setData] = useState<HotelReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // The selection is tagged with its hotel; when the hotel changes the tag no longer
  // matches, so `week` derives back to null (latest) without an effect or ref write.
  const [weekSel, setWeekSel] = useState<{ hotel: string; week: string } | null>(null);
  const setWeek = useCallback((w: string) => setWeekSel({ hotel: hotelCode, week: w }), [hotelCode]);
  const week = weekSel && weekSel.hotel === hotelCode ? weekSel.week : null;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    // setState lives inside the async runner (not the effect body) to avoid a
    // synchronous-setState-in-effect cascade.
    const run = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (hotelCode) params.set('hotel', hotelCode);
        if (hotelCode && week) params.set('week', week);
        const res = await fetch(`/api/otb/hotel-report?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) { if (!cancelled) setLoading(false); return; }
        const json: HotelReportResponse = await res.json();
        if (!cancelled) { setData(json); setLoading(false); }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [hotelCode, week, enabled]);

  if (!enabled) return EMPTY;
  return {
    loading,
    hotels: data?.hotels ?? [],
    hotelName: data?.hotel?.name ?? '',
    weeks: data?.weeks ?? [],
    week: data?.week ?? '',
    setWeek,
    months: data?.months ?? [],
    progression: data?.progression ?? [],
  };
}
