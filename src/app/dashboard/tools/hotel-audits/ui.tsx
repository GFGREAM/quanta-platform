'use client';

import { X } from 'lucide-react';
import type { AuditStatus } from '@/lib/schemas/audits';
import { STATUS_LABELS, STATUS_COLORS } from './data';

// ─── Status badge ────────────────────────────────────────────────

export function StatusBadge({ status }: { status: AuditStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-[10px] text-[0.6875rem] font-semibold whitespace-nowrap"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Modal overlay ───────────────────────────────────────────────
// Follows the same pattern as action-plan-tracker/ui.tsx (hand-rolled overlay).

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div
        className="relative z-10 bg-white rounded-lg border shadow-lg w-full max-w-md mx-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h3 className="text-base font-bold m-0" style={{ color: 'var(--primary)' }}>
            {title}
          </h3>
          <button
            type="button"
            className="w-8 h-8 rounded-md flex items-center justify-center cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none' }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
