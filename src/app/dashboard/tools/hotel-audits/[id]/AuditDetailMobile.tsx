'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { Question } from '@/lib/schemas/audits';
import { StatusBadge } from '../ui';
import { AUDITOR_LABELS, fmtDate, fmtScore } from '../data';
import { scoreColor } from './data';
import { useAuditDetail, type LocalResponse, type PhotoWithUrl } from './useAuditDetail';
import {
  SaveIndicator, SeverityBadge, SegmentedControl,
  PhotoGallery, PhotoUploadButton, AddRoomModal, AddFindingModal,
  SignatureCanvas, LocationButton, ConfirmDelete,
} from './ui';

const SECTIONS = ['Checklist', 'Rooms', 'Findings', 'Summary & Sign-off'] as const;

export default function AuditDetailMobile({ auditId }: { auditId: number }) {
  const h = useAuditDetail(auditId);
  const [openSec, setOpenSec] = useState<string>('Checklist');
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [findingModalOpen, setFindingModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number; msg: string } | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  if (h.loading) {
    return (
      <div className="animate-pulse flex flex-col gap-3">
        <div className="h-4 w-40 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-6 w-56 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-48 rounded-lg" style={{ background: 'var(--muted)' }} />
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
  const serverResponseId = (qId: number): number | null => a.responses.find((r) => r.question_id === qId)?.id ?? null;

  const toggle = (sec: string) => setOpenSec(openSec === sec ? '' : sec);

  const handleComplete = async () => {
    setCompleteError('');
    if (!a.signature) { setCompleteError('Missing signature.'); return; }
    if (!h.summary?.trim()) { setCompleteError('Summary is empty.'); return; }
    const allQ = h.sections.flatMap((s) => s.questions);
    const unanswered = allQ.filter((q) => { const r = h.responses.get(q.id); return !r || (!r.is_na && r.response_value === null); });
    if (unanswered.length > 0) { setCompleteError(`${unanswered.length} question(s) not answered.`); return; }
    setCompleting(true);
    try { await h.completeAudit(); } catch (err) { setCompleteError(err instanceof Error ? err.message : 'Failed'); }
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
    <div className="flex flex-col gap-4" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <Link href="/dashboard/tools/hotel-audits" style={{ color: 'var(--text-secondary)' }}>Audits</Link>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--primary)' }}>#{a.id}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight m-0" style={{ color: 'var(--primary)' }}>
          #{a.id} — {a.hotel_name ?? 'Hotel'}
        </h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>{fmtDate(a.audit_date)}</span>
          <StatusBadge status={a.status} />
          {a.total_score !== null && (
            <span className="font-bold tabular-nums" style={{ color: scoreColor(a.total_score) }}>{fmtScore(a.total_score)}</span>
          )}
        </div>
      </div>

      <SaveIndicator status={h.saveStatus} />

      {!h.isDraft && (
        <button type="button" onClick={handleDownloadPdf} disabled={isDownloadingPdf}
          className="w-full h-10 rounded-md text-sm font-semibold border cursor-pointer hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          style={{ color: 'var(--primary)', borderColor: 'var(--border)', background: 'transparent' }}>
          {isDownloadingPdf && <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
          {isDownloadingPdf ? 'Generating PDF\u2026' : 'Download PDF'}
        </button>
      )}

      {completeError && (
        <div className="text-xs px-3 py-2 rounded-md" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}>{completeError}</div>
      )}
      {pdfError && (
        <div className="text-xs px-3 py-2 rounded-md" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}>{pdfError}</div>
      )}

      {/* Accordion sections */}
      {SECTIONS.map((sec) => (
        <div key={sec} className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={() => toggle(sec)}
            className="w-full flex items-center justify-between px-4 py-3 text-[0.8125rem] font-semibold border-none cursor-pointer"
            style={{ background: openSec === sec ? 'var(--muted)' : 'white', color: 'var(--primary)' }}>
            {sec}
            <ChevronDown size={16} className={`transition-transform ${openSec === sec ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
          </button>
          {openSec === sec && (
            <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
              {sec === 'Checklist' && (
                <MobileChecklist h={h} photosFor={photosFor} serverResponseId={serverResponseId} onDeletePhoto={(id) => setDeleteTarget({ type: 'photo', id, msg: 'Delete this photo?' })} />
              )}
              {sec === 'Rooms' && (
                <MobileRooms h={h} photosFor={photosFor} onAdd={() => setRoomModalOpen(true)} onDeleteRoom={(id) => setDeleteTarget({ type: 'room', id, msg: 'Delete room?' })} onDeletePhoto={(id) => setDeleteTarget({ type: 'photo', id, msg: 'Delete photo?' })} />
              )}
              {sec === 'Findings' && (
                <MobileFindings h={h} photosFor={photosFor} onAdd={() => setFindingModalOpen(true)} onDeleteFinding={(id) => setDeleteTarget({ type: 'finding', id, msg: 'Delete finding?' })} onDeletePhoto={(id) => setDeleteTarget({ type: 'photo', id, msg: 'Delete photo?' })} />
              )}
              {sec === 'Summary & Sign-off' && (
                <MobileSummary h={h} a={a} onComplete={handleComplete} completing={completing} />
              )}
            </div>
          )}
        </div>
      ))}

      <AddRoomModal open={roomModalOpen} onClose={() => setRoomModalOpen(false)} onSubmit={(d) => h.addRoom(d)} />
      <AddFindingModal open={findingModalOpen} onClose={() => setFindingModalOpen(false)} onSubmit={(d) => h.addFinding(d)} sections={h.template?.sections ?? []} />
      <ConfirmDelete open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm} message={deleteTarget?.msg ?? ''} />
    </div>
  );
}

// ─── Mobile sub-components ───────────────────────────────────────

function MobileChecklist({ h, photosFor, serverResponseId, onDeletePhoto }: {
  h: ReturnType<typeof useAuditDetail>; photosFor: (k: 'response_id' | 'finding_id' | 'room_id', id: number) => PhotoWithUrl[];
  serverResponseId: (qId: number) => number | null; onDeletePhoto: (id: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {h.sections.map((sec) => (
        <div key={sec.id}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>{sec.name}</span>
            <span className="text-[0.625rem] font-semibold tabular-nums" style={{ color: sec.answered === sec.total ? 'var(--success)' : 'var(--text-muted)' }}>{sec.answered}/{sec.total}</span>
          </div>
          {sec.questions.map((q) => {
            const r = h.responses.get(q.id) ?? null;
            const value = r?.response_value ?? null;
            const isNa = r?.is_na ?? false;
            const isFail = q.response_type === 'pass_fail' && value === 'fail';
            const isLow = q.response_type === 'scale_1_5' && value !== null && Number(value) <= 2;
            const needsAttention = isFail || isLow;
            const srvId = serverResponseId(q.id);
            return (
              <div key={q.id} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: needsAttention && h.isDraft ? 'var(--danger)' : 'var(--border)' }}>
                <div className="flex items-start gap-2 mb-1.5">
                  <span className="text-xs flex-1" style={{ color: 'var(--text-primary)' }}>{q.question_text}</span>
                  <SeverityBadge severity={q.severity} />
                </div>
                {q.response_type === 'pass_fail' && (
                  <SegmentedControl disabled={!h.isDraft} value={isNa ? 'na' : value} onChange={(v) => h.updateResponse(q.id, v === 'na' ? { is_na: true, response_value: null } : { is_na: false, response_value: v })}
                    options={[{ key: 'pass', label: 'Pass', color: 'var(--success)' }, { key: 'fail', label: 'Fail', color: 'var(--danger)' }, { key: 'na', label: 'N/A', color: 'var(--text-muted)' }]} />
                )}
                {q.response_type === 'scale_1_5' && (
                  <SegmentedControl disabled={!h.isDraft} value={isNa ? 'na' : value} onChange={(v) => h.updateResponse(q.id, v === 'na' ? { is_na: true, response_value: null } : { is_na: false, response_value: v })}
                    options={['1','2','3','4','5','N/A'].map((n) => ({ key: n === 'N/A' ? 'na' : n, label: n }))} />
                )}
                {q.response_type === 'text' && (
                  <textarea className="w-full px-2 py-1.5 rounded border text-xs bg-white outline-none focus:ring-2 focus:ring-[var(--accent)]" rows={2}
                    style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
                    value={value ?? ''} disabled={!h.isDraft}
                    onChange={(e) => h.updateResponse(q.id, { response_value: e.target.value || null, is_na: false })} />
                )}
                {needsAttention && (
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    <textarea className="w-full px-2 py-1.5 rounded border text-xs bg-white outline-none" rows={2} placeholder="Comment required"
                      style={{ borderColor: !r?.comment && h.isDraft ? 'var(--danger)' : 'var(--border)', color: 'var(--primary)' }}
                      value={r?.comment ?? ''} disabled={!h.isDraft}
                      onChange={(e) => h.updateResponse(q.id, { comment: e.target.value || null })} />
                    <PhotoUploadButton onUpload={async (file) => {
                      const rId = await h.ensureResponseId(q.id);
                      if (!rId) { alert('Save the response first, then try again.'); return; }
                      await h.uploadPhoto(file, 'response_id', rId);
                    }} disabled={!h.isDraft} />
                  </div>
                )}
                <PhotoGallery photos={photosFor('response_id', srvId ?? -1)} onDelete={onDeletePhoto} disabled={!h.isDraft} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MobileRooms({ h, photosFor, onAdd, onDeleteRoom, onDeletePhoto }: {
  h: ReturnType<typeof useAuditDetail>; photosFor: (k: 'response_id' | 'finding_id' | 'room_id', id: number) => PhotoWithUrl[];
  onAdd: () => void; onDeleteRoom: (id: number) => void; onDeletePhoto: (id: number) => void;
}) {
  const rooms = h.audit?.rooms ?? [];
  return (
    <div className="flex flex-col gap-3">
      {h.isDraft && <button type="button" onClick={onAdd} className="self-end inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-semibold text-white border-none cursor-pointer" style={{ background: 'var(--accent)' }}><Plus size={12} /> Add room</button>}
      {rooms.length === 0 ? <p className="text-xs text-center py-6" style={{ color: 'var(--text-secondary)' }}>No rooms.</p> : rooms.map((room) => {
        const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
        const debouncedUpdate = (body: Record<string, unknown>) => { if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => h.updateRoom(room.id, body), 800); };
        return (
          <div key={room.id} className="border rounded-lg p-3 flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>Room {room.room_number}</span>
              {h.isDraft && <button type="button" onClick={() => onDeleteRoom(room.id)} className="border-none bg-transparent cursor-pointer" style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>}
            </div>
            <SegmentedControl disabled={!h.isDraft} value={room.cleanliness_score?.toString() ?? null} onChange={(v) => debouncedUpdate({ cleanliness_score: Number(v) })} options={['1','2','3','4','5'].map((n) => ({ key: n, label: n }))} />
            <PhotoUploadButton onUpload={(file) => h.uploadPhoto(file, 'room_id', room.id)} disabled={!h.isDraft} />
            <PhotoGallery photos={photosFor('room_id', room.id)} onDelete={onDeletePhoto} disabled={!h.isDraft} />
          </div>
        );
      })}
    </div>
  );
}

function MobileFindings({ h, photosFor, onAdd, onDeleteFinding, onDeletePhoto }: {
  h: ReturnType<typeof useAuditDetail>; photosFor: (k: 'response_id' | 'finding_id' | 'room_id', id: number) => PhotoWithUrl[];
  onAdd: () => void; onDeleteFinding: (id: number) => void; onDeletePhoto: (id: number) => void;
}) {
  const findings = h.audit?.findings ?? [];
  return (
    <div className="flex flex-col gap-3">
      {h.isDraft && <button type="button" onClick={onAdd} className="self-end inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-semibold text-white border-none cursor-pointer" style={{ background: 'var(--accent)' }}><Plus size={12} /> Add finding</button>}
      {findings.length === 0 ? <p className="text-xs text-center py-6" style={{ color: 'var(--text-secondary)' }}>No findings.</p> : findings.map((f) => (
        <div key={f.id} className="border rounded-lg p-3 flex flex-col gap-1.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between gap-2">
            <SeverityBadge severity={f.severity} />
            {h.isDraft && <button type="button" onClick={() => onDeleteFinding(f.id)} className="border-none bg-transparent cursor-pointer" style={{ color: 'var(--danger)' }}><Trash2 size={12} /></button>}
          </div>
          <p className="text-xs m-0" style={{ color: 'var(--text-primary)' }}>{f.description}</p>
          <PhotoUploadButton onUpload={(file) => h.uploadPhoto(file, 'finding_id', f.id)} disabled={!h.isDraft} />
          <PhotoGallery photos={photosFor('finding_id', f.id)} onDelete={onDeletePhoto} disabled={!h.isDraft} />
        </div>
      ))}
    </div>
  );
}

function MobileSummary({ h, a, onComplete, completing }: {
  h: ReturnType<typeof useAuditDetail>; a: { geo_lat: number | null; geo_lng: number | null; signature: { signed_url: string; signed_at: string } | null };
  onComplete: () => void; completing: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Summary</label>
        <textarea className="w-full px-2 py-1.5 rounded border text-xs bg-white outline-none focus:ring-2 focus:ring-[var(--accent)]" rows={4}
          style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
          value={h.summary} disabled={!h.isDraft}
          onChange={(e) => h.updateSummary(e.target.value)} placeholder="General audit summary…" />
      </div>
      <LocationButton geoLat={a.geo_lat} geoLng={a.geo_lng} onCapture={h.captureLocation} disabled={!h.isDraft} />
      <div>
        <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Signature</label>
        {a.signature ? (
          <img src={a.signature.signed_url} alt="Signature" className="w-full h-[120px] border rounded-lg object-contain mt-1" style={{ borderColor: 'var(--border)', background: '#fff' }} />
        ) : h.isDraft ? (
          <SignatureCanvas onSave={h.saveSignature} disabled={!h.isDraft} />
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No signature.</p>
        )}
      </div>
      {h.isDraft && (
        <button type="button" onClick={onComplete} disabled={completing}
          className="w-full h-11 rounded-md text-sm font-semibold text-white border-none cursor-pointer hover:opacity-90 disabled:opacity-50 sticky bottom-0"
          style={{ background: 'var(--accent)' }}>
          {completing ? 'Completing…' : 'Complete audit'}
        </button>
      )}
    </div>
  );
}
