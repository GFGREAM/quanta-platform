'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus, SlidersHorizontal } from 'lucide-react';
import { selectStyle } from '@/lib/selectStyle';
import type { AuditStatus, AuditorResponsible } from '@/lib/schemas/audits';
import { useHotelAudits } from './useHotelAudits';
import {
  STATUS_LABELS, STATUS_OPTIONS,
  AUDITOR_LABELS, AUDITOR_OPTIONS,
  fmtDate, fmtScore,
} from './data';
import { StatusBadge, Modal } from './ui';
import { CreateAuditForm } from './CreateAuditForm';

export default function HotelAuditsMobile() {
  const router = useRouter();
  const {
    hotelFilter, setHotelFilter,
    statusFilter, setStatusFilter,
    auditorFilter, setAuditorFilter,
    fromDate, setFromDate,
    toDate, setToDate,
    audits, hotels, loading, refresh,
  } = useHotelAudits();

  const [modalOpen, setModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hotelName = (id: number | null) =>
    hotels.find((h) => h.hotel_id === id)?.aag_name ?? '—';

  return (
    <div className="flex flex-col gap-4" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>Tools</span>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--primary)' }}>GFG Hotel Audits</span>
      </div>

      {/* Title + actions */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
            GFG Hotel Audits
          </h1>
          <p className="text-xs mt-0.5 m-0" style={{ color: 'var(--text-secondary)' }}>
            Operational audits
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-9 h-9 rounded-md border flex items-center justify-center cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}
          >
            <SlidersHorizontal size={16} />
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="h-9 px-3 rounded-md text-sm font-semibold text-white border-none cursor-pointer transition-colors hover:opacity-90 inline-flex items-center gap-1"
            style={{ background: 'var(--accent)' }}
          >
            <Plus size={14} />
            New
          </button>
        </div>
      </div>

      {/* Collapsible filters */}
      {filtersOpen && (
        <div className="flex flex-col gap-2 p-3 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
          <select
            className="h-10 px-3 pr-8 rounded-md border text-sm bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)]"
            style={selectStyle}
            value={hotelFilter}
            onChange={(e) => setHotelFilter(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">All hotels</option>
            {hotels.map((h) => (
              <option key={h.hotel_id} value={h.hotel_id}>{h.aag_name ?? h.hotel_code}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              className="h-10 flex-1 px-3 pr-8 rounded-md border text-sm bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={selectStyle}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AuditStatus | '')}
            >
              <option value="">Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select
              className="h-10 flex-1 px-3 pr-8 rounded-md border text-sm bg-white appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={selectStyle}
              value={auditorFilter}
              onChange={(e) => setAuditorFilter(e.target.value as AuditorResponsible | '')}
            >
              <option value="">Auditor</option>
              {AUDITOR_OPTIONS.map((a) => (
                <option key={a} value={a}>{AUDITOR_LABELS[a]}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              className="h-10 flex-1 px-3 rounded-md border text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="From"
            />
            <input
              type="date"
              className="h-10 flex-1 px-3 rounded-md border text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="To"
            />
          </div>
        </div>
      )}

      {/* Audit cards */}
      {loading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg animate-pulse" style={{ background: 'var(--muted)' }} />
          ))}
        </div>
      ) : audits.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          No audits registered. Create the first one with <strong>New</strong>.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {audits.map((a) => (
            <div
              key={a.id}
              className="bg-white border rounded-lg p-3.5 cursor-pointer transition-shadow hover:shadow-md"
              style={{ borderColor: 'var(--border)' }}
              onClick={() => router.push(`/dashboard/tools/hotel-audits/${a.id}`)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-semibold text-sm" style={{ color: 'var(--primary)' }}>
                  {a.hotel_name ?? hotelName(a.hotel_id)}
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>{fmtDate(a.audit_date)} · {AUDITOR_LABELS[a.auditor_responsible]}</span>
                <span className="font-semibold tabular-nums" style={{ color: a.total_score !== null ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {fmtScore(a.total_score)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New audit">
        <CreateAuditForm
          hotels={hotels}
          onSuccess={(newId) => {
            setModalOpen(false);
            refresh();
            router.push(`/dashboard/tools/hotel-audits/${newId}`);
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
