'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  AuditListItem,
  AuditStatus,
  AuditorResponsible,
  Hotel,
} from '@/lib/schemas/audits';

export function useHotelAudits() {
  // ─── Filter state ────────────────────────────────────────────────
  const [hotelFilter, setHotelFilter] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | ''>('');
  const [auditorFilter, setAuditorFilter] = useState<AuditorResponsible | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ─── Data state ──────────────────────────────────────────────────
  const [audits, setAudits] = useState<AuditListItem[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [hotelsLoading, setHotelsLoading] = useState(true);

  // ─── Fetch hotels (once) ─────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/audits/hotels', { signal: controller.signal });
        if (res.ok) {
          const data: Hotel[] = await res.json();
          if (!controller.signal.aborted) setHotels(data);
        }
      } catch { /* aborted */ }
      if (!controller.signal.aborted) setHotelsLoading(false);
    })();
    return () => controller.abort();
  }, []);

  // ─── Fetch audits (on filter change) ─────────────────────────────
  const fetchAudits = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams();
    if (hotelFilter) params.set('hotel_id', String(hotelFilter));
    if (statusFilter) params.set('status', statusFilter);
    if (auditorFilter) params.set('auditor_responsible', auditorFilter);
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);

    (async () => {
      try {
        const res = await fetch(`/api/audits?${params}`, { signal: controller.signal });
        if (res.ok) {
          const data: AuditListItem[] = await res.json();
          if (!controller.signal.aborted) setAudits(data);
        } else {
          if (!controller.signal.aborted) setAudits([]);
        }
      } catch {
        if (!controller.signal.aborted) setAudits([]);
      }
      if (!controller.signal.aborted) setLoading(false);
    })();

    return () => controller.abort();
  }, [hotelFilter, statusFilter, auditorFilter, fromDate, toDate]);

  useEffect(() => {
    const abort = fetchAudits();
    return abort;
  }, [fetchAudits]);

  // ─── Refresh (called after creating an audit) ────────────────────
  const refresh = useCallback(() => {
    fetchAudits();
  }, [fetchAudits]);

  return {
    // filters
    hotelFilter, setHotelFilter,
    statusFilter, setStatusFilter,
    auditorFilter, setAuditorFilter,
    fromDate, setFromDate,
    toDate, setToDate,
    // data
    audits,
    hotels,
    loading,
    hotelsLoading,
    refresh,
  };
}
