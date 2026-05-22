'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { selectStyle } from '@/lib/selectStyle';
import {
  CreateAuditInputSchema,
  type CreateAuditInput,
  type Hotel,
} from '@/lib/schemas/audits';
import { AUDITOR_LABELS, AUDITOR_OPTIONS, todayISO } from './data';

interface Props {
  hotels: Hotel[];
  onSuccess: (newId: number) => void;
  onCancel: () => void;
}

export function CreateAuditForm({ hotels, onSuccess, onCancel }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAuditInput>({
    resolver: zodResolver(CreateAuditInputSchema),
    defaultValues: {
      hotel_id: undefined,
      auditor_responsible: undefined,
      audit_date: todayISO(),
    },
  });

  const onSubmit = async (values: CreateAuditInput) => {
    setSubmitting(true);
    setServerError('');
    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError(body.error ?? 'Failed to create audit');
        setSubmitting(false);
        return;
      }
      const created = await res.json();
      onSuccess(created.id);
    } catch {
      setServerError('Connection error');
      setSubmitting(false);
    }
  };

  const inputBase = 'h-9 w-full px-3 rounded-md border text-[0.8125rem] bg-white outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]';
  const labelClass = 'text-[0.75rem] font-semibold' as const;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Hotel */}
      <div className="flex flex-col gap-1">
        <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Hotel *</label>
        <select
          className={`${inputBase} pr-8 appearance-none cursor-pointer`}
          style={selectStyle}
          {...register('hotel_id', { valueAsNumber: true })}
          defaultValue=""
        >
          <option value="" disabled>Select a hotel</option>
          {hotels.map((h) => (
            <option key={h.hotel_id} value={h.hotel_id}>{h.aag_name ?? h.hotel_code}</option>
          ))}
        </select>
        {errors.hotel_id && (
          <span className="text-xs" style={{ color: 'var(--danger)' }}>Please select a hotel</span>
        )}
      </div>

      {/* Auditor */}
      <div className="flex flex-col gap-1">
        <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Responsible auditor *</label>
        <select
          className={`${inputBase} pr-8 appearance-none cursor-pointer`}
          style={selectStyle}
          {...register('auditor_responsible')}
          defaultValue=""
        >
          <option value="" disabled>Select an auditor</option>
          {AUDITOR_OPTIONS.map((a) => (
            <option key={a} value={a}>{AUDITOR_LABELS[a]}</option>
          ))}
        </select>
        {errors.auditor_responsible && (
          <span className="text-xs" style={{ color: 'var(--danger)' }}>Please select an auditor</span>
        )}
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1">
        <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>Audit date *</label>
        <input
          type="date"
          className={inputBase}
          style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
          {...register('audit_date')}
        />
        {errors.audit_date && (
          <span className="text-xs" style={{ color: 'var(--danger)' }}>Date required (YYYY-MM-DD format)</span>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="text-xs px-3 py-2 rounded-md" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}>
          {serverError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-4 rounded-md border text-[0.8125rem] font-semibold cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'transparent' }}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="h-9 px-5 rounded-md text-[0.8125rem] font-semibold text-white border-none cursor-pointer transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent)' }}
          disabled={submitting}
        >
          {submitting ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
  );
}
