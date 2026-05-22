'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus } from 'lucide-react';
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

export default function HotelAuditsDesktop() {
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

  const hotelName = (id: number | null) =>
    hotels.find((h) => h.hotel_id === id)?.aag_name ?? '—';

  return (
    <div className="flex flex-col gap-5 font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif]" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Tools</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--primary)' }}>GFG Hotel Audits</span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
          GFG Hotel Audits
        </h1>
        <p className="text-sm mt-0.5 m-0" style={{ color: 'var(--text-secondary)' }}>
          Quality control and operational audits for GFG hotels.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          className="h-9 w-44 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={selectStyle}
          value={hotelFilter}
          onChange={(e) => setHotelFilter(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">All hotels</option>
          {hotels.map((h) => (
            <option key={h.hotel_id} value={h.hotel_id}>{h.aag_name ?? h.hotel_code}</option>
          ))}
        </select>

        <select
          className="h-9 w-36 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={selectStyle}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AuditStatus | '')}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        <select
          className="h-9 w-40 px-3 pr-8 rounded-md border text-[0.8125rem] bg-white appearance-none cursor-pointer transition-colors outline-none truncate focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={selectStyle}
          value={auditorFilter}
          onChange={(e) => setAuditorFilter(e.target.value as AuditorResponsible | '')}
        >
          <option value="">All auditors</option>
          {AUDITOR_OPTIONS.map((a) => (
            <option key={a} value={a}>{AUDITOR_LABELS[a]}</option>
          ))}
        </select>

        <input
          type="date"
          className="h-9 px-3 rounded-md border text-[0.8125rem] bg-white cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          title="From date"
        />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
        <input
          type="date"
          className="h-9 px-3 rounded-md border text-[0.8125rem] bg-white cursor-pointer outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
          style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          title="To date"
        />

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[0.8125rem] font-semibold text-white border-none cursor-pointer transition-colors hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          <Plus size={16} />
          New audit
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.8125rem]" style={{ color: 'var(--text-primary)' }}>
            <thead>
              <tr style={{ background: '#FAFAFA', borderBottom: '1px solid var(--border)' }}>
                <th className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Date</th>
                <th className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Hotel</th>
                <th className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Auditor</th>
                <th className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="px-4 py-3 text-right text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Score</th>
                <th className="px-4 py-3 text-right text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--border-light)' }}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: 'var(--muted)', width: j === 4 ? '3rem' : '6rem' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : audits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No audits registered. Create the first one with the <strong>New audit</strong> button.
                  </td>
                </tr>
              ) : (
                audits.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                    style={{ borderColor: 'var(--border-light)' }}
                    onClick={() => router.push(`/dashboard/tools/hotel-audits/${a.id}`)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(a.audit_date)}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--primary)' }}>{a.hotel_name ?? hotelName(a.hotel_id)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{AUDITOR_LABELS[a.auditor_responsible]}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: a.total_score !== null ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {fmtScore(a.total_score)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/tools/hotel-audits/${a.id}`); }}
                        className="text-[0.75rem] font-semibold px-3 py-1 rounded-md border cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                        style={{ color: 'var(--accent)', borderColor: 'var(--border)', background: 'transparent' }}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create audit modal */}
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
