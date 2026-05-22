'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { Question, Severity } from '@/lib/schemas/audits';
import { StatusBadge } from '../ui';
import { AUDITOR_LABELS, fmtDate, fmtScore } from '../data';
import { scoreColor, SEVERITY_COLORS, SEVERITY_LABELS } from './data';
import { useAuditDetail, type LocalResponse, type PhotoWithUrl } from './useAuditDetail';
import {
  SaveIndicator, SeverityBadge, SegmentedControl,
  PhotoGallery, PhotoUploadButton, AddRoomModal, AddFindingModal,
  SignatureCanvas, LocationButton, ConfirmDelete,
} from './ui';

const TABS = ['Checklist', 'Rooms', 'Findings', 'Summary & Sign-off'] as const;
type Tab = typeof TABS[number];

export default function AuditDetailDesktop({ auditId }: { auditId: number }) {
  const h = useAuditDetail(auditId);
  const [tab, setTab] = useState<Tab>('Checklist');
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [findingModalOpen, setFindingModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number; msg: string } | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  if (h.loading) {
    return (
      <div className="animate-pulse flex flex-col gap-4">
        <div className="h-4 w-48 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-8 w-96 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-64 rounded-lg" style={{ background: 'var(--muted)' }} />
      </div>
    );
  }

  if (h.notFound || !h.audit) {
    return (
      <div className="flex flex-col gap-4 items-center py-16">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Audit not found.</p>
        <Link href="/dashboard/tools/hotel-audits" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Back to list</Link>
      </div>
    );
  }

  const a = h.audit;
  const photosFor = (key: 'response_id' | 'finding_id' | 'room_id', id: number): PhotoWithUrl[] =>
    a.photos.filter((p) => p[key] === id);

  // Server-side response ID (for displaying photos already linked)
  const serverResponseId = (questionId: number): number | null =>
    a.responses.find((r) => r.question_id === questionId)?.id ?? null;

  const handleComplete = async () => {
    setCompleteError('');
    // Local pre-validation
    if (!a.signature) { setCompleteError('Missing signature. Go to Summary & Sign-off tab.'); return; }
    if (!h.summary?.trim()) { setCompleteError('Summary is empty. Go to Summary & Sign-off tab.'); return; }
    const allQ = h.sections.flatMap((s) => s.questions);
    const unanswered = allQ.filter((q) => {
      const r = h.responses.get(q.id);
      return !r || (!r.is_na && r.response_value === null);
    });
    if (unanswered.length > 0) { setCompleteError(`${unanswered.length} question(s) not answered. Review the Checklist.`); return; }

    setCompleting(true);
    try {
      await h.completeAudit();
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : 'Failed to complete');
    }
    setCompleting(false);
  };

  const handleDownloadPdf = async () => {
    setPdfError('');
    setIsDownloadingPdf(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/pdf`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `PDF generation failed (${res.status})`);
      }
      const dispo = res.headers.get('content-disposition') || '';
      const match = dispo.match(/filename="?([^"]+)"?/i);
      const filename = match ? match[1] : `audit_${auditId}.pdf`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF download failed', e);
      setPdfError(e instanceof Error ? e.message : 'PDF generation failed. Try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'room') await h.deleteRoom(deleteTarget.id);
    if (deleteTarget.type === 'finding') await h.deleteFinding(deleteTarget.id);
    if (deleteTarget.type === 'photo') await h.deletePhoto(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col gap-5 font-[Inter,-apple-system,BlinkMacSystemFont,sans-serif]" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Tools</span>
        <ChevronRight size={14} />
        <Link href="/dashboard/tools/hotel-audits" className="hover:underline" style={{ color: 'var(--text-secondary)' }}>GFG Hotel Audits</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--primary)' }}>Audit #{a.id}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
            Audit #{a.id} — {a.hotel_name ?? 'Hotel'}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{fmtDate(a.audit_date)}</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{AUDITOR_LABELS[a.auditor_responsible as keyof typeof AUDITOR_LABELS] ?? a.auditor_responsible}</span>
            <StatusBadge status={a.status} />
            {a.total_score !== null && (
              <span className="text-sm font-bold tabular-nums" style={{ color: scoreColor(a.total_score) }}>
                Score: {fmtScore(a.total_score)}
              </span>
            )}
          </div>
        </div>
        {h.isDraft ? (
          <button type="button" onClick={handleComplete} disabled={completing}
            className="h-9 px-5 rounded-md text-[0.8125rem] font-semibold text-white border-none cursor-pointer hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)' }}>
            {completing ? 'Completing…' : 'Complete audit'}
          </button>
        ) : (
          <button type="button" onClick={handleDownloadPdf} disabled={isDownloadingPdf}
            className="h-9 px-5 rounded-md text-[0.8125rem] font-semibold border cursor-pointer hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            style={{ color: 'var(--primary)', borderColor: 'var(--border)', background: 'transparent' }}>
            {isDownloadingPdf && <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {isDownloadingPdf ? 'Generating PDF\u2026' : 'Download PDF'}
          </button>
        )}
      </div>

      {completeError && (
        <div className="text-xs px-3 py-2 rounded-md" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}>
          {completeError}
        </div>
      )}
      {pdfError && (
        <div className="text-xs px-3 py-2 rounded-md" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}>
          {pdfError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 rounded-lg p-[3px]" style={{ background: 'var(--muted)' }}>
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-[0.8125rem] font-medium border-none cursor-pointer transition-all ${tab === t ? 'shadow-sm' : ''}`}
            style={{ color: tab === t ? 'var(--primary)' : 'var(--text-secondary)', background: tab === t ? 'white' : 'transparent' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {/* Save indicator bar */}
        <div className="flex items-center justify-end px-4 py-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
          <SaveIndicator status={h.saveStatus} />
        </div>

        <div className="p-4">
          {tab === 'Checklist' && <ChecklistTab h={h} photosFor={photosFor} serverResponseId={serverResponseId} onDeletePhoto={(id) => setDeleteTarget({ type: 'photo', id, msg: 'Delete this photo?' })} />}
          {tab === 'Rooms' && <RoomsTab h={h} photosFor={photosFor} onAddRoom={() => setRoomModalOpen(true)} onDeleteRoom={(id) => setDeleteTarget({ type: 'room', id, msg: 'Delete this room and its photos?' })} onDeletePhoto={(id) => setDeleteTarget({ type: 'photo', id, msg: 'Delete this photo?' })} />}
          {tab === 'Findings' && <FindingsTab h={h} photosFor={photosFor} onAddFinding={() => setFindingModalOpen(true)} onDeleteFinding={(id) => setDeleteTarget({ type: 'finding', id, msg: 'Delete this finding and its photos?' })} onDeletePhoto={(id) => setDeleteTarget({ type: 'photo', id, msg: 'Delete this photo?' })} />}
          {tab === 'Summary & Sign-off' && <SummaryTab h={h} />}
        </div>
      </div>

      {/* Modals */}
      <AddRoomModal open={roomModalOpen} onClose={() => setRoomModalOpen(false)} onSubmit={(d) => h.addRoom(d)} />
      <AddFindingModal open={findingModalOpen} onClose={() => setFindingModalOpen(false)} onSubmit={(d) => h.addFinding(d)} sections={h.template?.sections ?? []} />
      <ConfirmDelete open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm} message={deleteTarget?.msg ?? ''} />
    </div>
  );
}

// ─── Checklist Tab ───────────────────────────────────────────────

function ChecklistTab({ h, photosFor, serverResponseId, onDeletePhoto }: {
  h: ReturnType<typeof useAuditDetail>;
  photosFor: (key: 'response_id' | 'finding_id' | 'room_id', id: number) => PhotoWithUrl[];
  serverResponseId: (qId: number) => number | null;
  onDeletePhoto: (id: number) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {h.sections.map((sec) => (
        <div key={sec.id}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[0.8125rem] font-bold m-0" style={{ color: 'var(--primary)' }}>{sec.name}</h3>
            <span className="text-[0.6875rem] font-semibold tabular-nums" style={{ color: sec.answered === sec.total ? 'var(--success)' : 'var(--text-muted)' }}>
              {sec.answered} / {sec.total} answered
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {sec.questions.map((q) => (
              <QuestionRow key={q.id} question={q} response={h.responses.get(q.id) ?? null}
                onUpdate={(patch) => h.updateResponse(q.id, patch)} disabled={!h.isDraft}
                photos={photosFor('response_id', serverResponseId(q.id) ?? -1)}
                onUploadPhoto={async (file) => {
                  // Ensure the response row exists server-side before uploading
                  const rId = await h.ensureResponseId(q.id);
                  if (!rId) { alert('Save the response first, then try again.'); return; }
                  await h.uploadPhoto(file, 'response_id', rId);
                }}
                onDeletePhoto={onDeletePhoto} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionRow({ question: q, response: r, onUpdate, disabled, photos, onUploadPhoto, onDeletePhoto }: {
  question: Question;
  response: LocalResponse | null;
  onUpdate: (patch: Partial<LocalResponse>) => void;
  disabled: boolean;
  photos: PhotoWithUrl[];
  onUploadPhoto: (file: File) => Promise<void>;
  onDeletePhoto: (id: number) => void;
}) {
  const [commentOpen, setCommentOpen] = useState(!!(r?.comment));
  const value = r?.response_value ?? null;
  const isNa = r?.is_na ?? false;
  const isFail = q.response_type === 'pass_fail' && value === 'fail';
  const isLowScale = q.response_type === 'scale_1_5' && value !== null && Number(value) <= 2;
  const needsAttention = isFail || isLowScale;

  return (
    <div className="border rounded-lg p-3" style={{ borderColor: needsAttention && !disabled ? 'var(--danger)' : 'var(--border)' }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[0.8125rem]" style={{ color: 'var(--text-primary)' }}>{q.question_text}</span>
          <SeverityBadge severity={q.severity} />
        </div>
      </div>
      {/* Response control */}
      {q.response_type === 'pass_fail' && (
        <SegmentedControl disabled={disabled} value={isNa ? 'na' : value} onChange={(v) => {
          if (v === 'na') onUpdate({ is_na: true, response_value: null });
          else onUpdate({ is_na: false, response_value: v });
        }} options={[
          { key: 'pass', label: 'Pass', color: 'var(--success)' },
          { key: 'fail', label: 'Fail', color: 'var(--danger)' },
          { key: 'na', label: 'N/A', color: 'var(--text-muted)' },
        ]} />
      )}
      {q.response_type === 'scale_1_5' && (
        <SegmentedControl disabled={disabled} value={isNa ? 'na' : value} onChange={(v) => {
          if (v === 'na') onUpdate({ is_na: true, response_value: null });
          else onUpdate({ is_na: false, response_value: v });
        }} options={[
          { key: '1', label: '1', color: 'var(--danger)' },
          { key: '2', label: '2', color: '#F97316' },
          { key: '3', label: '3', color: 'var(--warning)' },
          { key: '4', label: '4', color: '#84CC16' },
          { key: '5', label: '5', color: 'var(--success)' },
          { key: 'na', label: 'N/A', color: 'var(--text-muted)' },
        ]} />
      )}
      {q.response_type === 'text' && (
        <textarea className="w-full px-3 py-2 rounded-md border text-[0.8125rem] bg-white outline-none focus:ring-2 focus:ring-[var(--accent)] mt-1" rows={2}
          style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
          value={value ?? ''} disabled={disabled}
          onChange={(e) => onUpdate({ response_value: e.target.value || null, is_na: false })} />
      )}
      {/* Conditional comment + photo (required on fail/low score) */}
      {needsAttention && (
        <div className="mt-2 flex flex-col gap-2">
          <textarea className="w-full px-3 py-2 rounded-md border text-[0.8125rem] bg-white outline-none focus:ring-2 focus:ring-[var(--accent)]" rows={2}
            placeholder="Comment (required on fail/low score)"
            style={{ borderColor: !r?.comment && !disabled ? 'var(--danger)' : 'var(--border)', color: 'var(--primary)' }}
            value={r?.comment ?? ''} disabled={disabled}
            onChange={(e) => onUpdate({ comment: e.target.value || null })} />
          <PhotoUploadButton onUpload={onUploadPhoto} disabled={disabled} />
        </div>
      )}
      {/* Optional comment toggle */}
      {!needsAttention && q.response_type !== 'text' && (
        <div className="mt-1.5">
          <button type="button" onClick={() => setCommentOpen(!commentOpen)} className="text-[0.6875rem] font-medium border-none bg-transparent cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            {commentOpen ? '▾ Hide comment' : '▸ Add comment'}
          </button>
          {commentOpen && (
            <textarea className="w-full px-3 py-2 rounded-md border text-[0.8125rem] bg-white outline-none focus:ring-2 focus:ring-[var(--accent)] mt-1" rows={2}
              style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
              value={r?.comment ?? ''} disabled={disabled}
              onChange={(e) => onUpdate({ comment: e.target.value || null })} />
          )}
        </div>
      )}
      <PhotoGallery photos={photos} onDelete={onDeletePhoto} disabled={disabled} />
    </div>
  );
}

// ─── Rooms Tab ───────────────────────────────────────────────────

function RoomsTab({ h, photosFor, onAddRoom, onDeleteRoom, onDeletePhoto }: {
  h: ReturnType<typeof useAuditDetail>;
  photosFor: (key: 'response_id' | 'finding_id' | 'room_id', id: number) => PhotoWithUrl[];
  onAddRoom: () => void;
  onDeleteRoom: (id: number) => void;
  onDeletePhoto: (id: number) => void;
}) {
  const rooms = h.audit?.rooms ?? [];
  return (
    <div className="flex flex-col gap-4">
      {h.isDraft && (
        <div className="flex justify-end">
          <button type="button" onClick={onAddRoom}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[0.75rem] font-semibold text-white border-none cursor-pointer hover:opacity-90"
            style={{ background: 'var(--accent)' }}><Plus size={14} /> Add room</button>
        </div>
      )}
      {rooms.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>No rooms inspected yet.</p>
      ) : rooms.map((room) => (
        <RoomCard key={room.id} room={room} photos={photosFor('room_id', room.id)} disabled={!h.isDraft}
          onUpdate={(body) => h.updateRoom(room.id, body)} onDelete={() => onDeleteRoom(room.id)}
          onUploadPhoto={(file) => h.uploadPhoto(file, 'room_id', room.id)} onDeletePhoto={onDeletePhoto} />
      ))}
    </div>
  );
}

function RoomCard({ room, photos, disabled, onUpdate, onDelete, onUploadPhoto, onDeletePhoto }: {
  room: { id: number; room_number: string; cleanliness_score: number | null; bathroom_score: number | null; functionality_pass: boolean | null; notes: string | null };
  photos: PhotoWithUrl[];
  disabled: boolean;
  onUpdate: (body: Record<string, unknown>) => void;
  onDelete: () => void;
  onUploadPhoto: (file: File) => Promise<void>;
  onDeletePhoto: (id: number) => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const debouncedUpdate = (body: Record<string, unknown>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onUpdate(body), 800);
  };

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-[0.8125rem] font-bold" style={{ color: 'var(--primary)' }}>Room {room.room_number}</span>
        {!disabled && (
          <button type="button" onClick={onDelete} className="text-[0.75rem] font-semibold border-none bg-transparent cursor-pointer" style={{ color: 'var(--danger)' }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[0.6875rem] font-semibold" style={{ color: 'var(--text-secondary)' }}>Cleanliness (1-5)</label>
          <SegmentedControl disabled={disabled} value={room.cleanliness_score?.toString() ?? null} onChange={(v) => debouncedUpdate({ cleanliness_score: Number(v) })}
            options={['1','2','3','4','5'].map((n) => ({ key: n, label: n }))} />
        </div>
        <div>
          <label className="text-[0.6875rem] font-semibold" style={{ color: 'var(--text-secondary)' }}>Bathroom (1-5)</label>
          <SegmentedControl disabled={disabled} value={room.bathroom_score?.toString() ?? null} onChange={(v) => debouncedUpdate({ bathroom_score: Number(v) })}
            options={['1','2','3','4','5'].map((n) => ({ key: n, label: n }))} />
        </div>
      </div>
      <div>
        <label className="text-[0.6875rem] font-semibold" style={{ color: 'var(--text-secondary)' }}>Functionality</label>
        <SegmentedControl disabled={disabled} value={room.functionality_pass === true ? 'pass' : room.functionality_pass === false ? 'fail' : null}
          onChange={(v) => debouncedUpdate({ functionality_pass: v === 'pass' })}
          options={[{ key: 'pass', label: 'Pass', color: 'var(--success)' }, { key: 'fail', label: 'Fail', color: 'var(--danger)' }]} />
      </div>
      <div>
        <label className="text-[0.6875rem] font-semibold" style={{ color: 'var(--text-secondary)' }}>Notes</label>
        <textarea className="w-full px-3 py-2 rounded-md border text-[0.8125rem] bg-white outline-none focus:ring-2 focus:ring-[var(--accent)]" rows={2}
          style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
          defaultValue={room.notes ?? ''} disabled={disabled}
          onChange={(e) => debouncedUpdate({ notes: e.target.value || null })} />
      </div>
      <div className="flex items-center gap-2">
        <PhotoUploadButton onUpload={onUploadPhoto} disabled={disabled} />
      </div>
      <PhotoGallery photos={photos} onDelete={onDeletePhoto} disabled={disabled} />
    </div>
  );
}

// ─── Findings Tab ────────────────────────────────────────────────

function FindingsTab({ h, photosFor, onAddFinding, onDeleteFinding, onDeletePhoto }: {
  h: ReturnType<typeof useAuditDetail>;
  photosFor: (key: 'response_id' | 'finding_id' | 'room_id', id: number) => PhotoWithUrl[];
  onAddFinding: () => void;
  onDeleteFinding: (id: number) => void;
  onDeletePhoto: (id: number) => void;
}) {
  const findings = h.audit?.findings ?? [];
  return (
    <div className="flex flex-col gap-4">
      {h.isDraft && (
        <div className="flex justify-end">
          <button type="button" onClick={onAddFinding}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[0.75rem] font-semibold text-white border-none cursor-pointer hover:opacity-90"
            style={{ background: 'var(--accent)' }}><Plus size={14} /> Add finding</button>
        </div>
      )}
      {findings.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>No findings recorded yet.</p>
      ) : findings.map((f) => (
        <div key={f.id} className="border rounded-lg p-4 flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <SeverityBadge severity={f.severity} />
              {f.section && <span className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>{f.section}</span>}
            </div>
            {h.isDraft && (
              <button type="button" onClick={() => onDeleteFinding(f.id)} className="border-none bg-transparent cursor-pointer" style={{ color: 'var(--danger)' }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <p className="text-[0.8125rem] m-0" style={{ color: 'var(--text-primary)' }}>{f.description}</p>
          <div className="flex items-center gap-2">
            <PhotoUploadButton onUpload={(file) => h.uploadPhoto(file, 'finding_id', f.id)} disabled={!h.isDraft} />
          </div>
          <PhotoGallery photos={photosFor('finding_id', f.id)} onDelete={onDeletePhoto} disabled={!h.isDraft} />
        </div>
      ))}
    </div>
  );
}

// ─── Summary & Sign-off Tab ──────────────────────────────────────

function SummaryTab({ h }: { h: ReturnType<typeof useAuditDetail> }) {
  const a = h.audit!;
  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="flex flex-col gap-2">
        <label className="text-[0.75rem] font-semibold" style={{ color: 'var(--text-secondary)' }}>Summary</label>
        <textarea className="w-full px-3 py-2 rounded-md border text-[0.8125rem] bg-white outline-none focus:ring-2 focus:ring-[var(--accent)]" rows={5}
          style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
          value={h.summary} disabled={!h.isDraft}
          onChange={(e) => h.updateSummary(e.target.value)} placeholder="General audit summary…" />
      </div>

      {/* Location */}
      <div className="flex flex-col gap-2">
        <label className="text-[0.75rem] font-semibold" style={{ color: 'var(--text-secondary)' }}>Location</label>
        <LocationButton geoLat={a.geo_lat} geoLng={a.geo_lng} onCapture={h.captureLocation} disabled={!h.isDraft} />
      </div>

      {/* Signature */}
      <div className="flex flex-col gap-2">
        <label className="text-[0.75rem] font-semibold" style={{ color: 'var(--text-secondary)' }}>Signature</label>
        {a.signature ? (
          <div className="flex flex-col gap-2">
            <img src={a.signature.signed_url} alt="Signature" className="h-[120px] border rounded-lg object-contain" style={{ borderColor: 'var(--border)', background: '#fff' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Signed at {new Date(a.signature.signed_at).toLocaleString()}</span>
          </div>
        ) : h.isDraft ? (
          <SignatureCanvas onSave={h.saveSignature} disabled={!h.isDraft} />
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No signature.</p>
        )}
      </div>
    </div>
  );
}

