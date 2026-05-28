'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Template, Section, AuditStatus, AuditResponse, AuditRoom, Finding, Photo,
} from '@/lib/schemas/audits';

// ─── Types ───────────────────────────────────────────────────────

export interface AuditHeader {
  id: number;
  hotel_id: number;
  hotel_name: string | null;
  template_id: number;
  auditor_responsible: string;
  auditor_email: string;
  status: AuditStatus;
  audit_date: string;
  summary: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  total_score: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface SignatureData {
  id: number;
  blob_url: string;
  signed_at: string;
  signed_url: string;
}

export interface PhotoWithUrl extends Photo {
  signed_url: string;
}

export interface AuditDetail extends AuditHeader {
  responses: AuditResponse[];
  rooms: AuditRoom[];
  findings: Finding[];
  photos: PhotoWithUrl[];
  signature: SignatureData | null;
}

export type SaveStatus = 'saved' | 'saving' | 'error';

// ─── Local response state (not yet persisted) ────────────────────

export interface LocalResponse {
  question_id: number;
  response_value: string | null;
  comment: string | null;
  is_na: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────

export function useAuditDetail(auditId: number) {
  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Local response map: question_id → LocalResponse
  const [responses, setResponses] = useState<Map<number, LocalResponse>>(new Map());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Summary autosave
  const [summary, setSummary] = useState('');
  const summaryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDraft = audit?.status === 'borrador';
  const initialLoadDone = useRef(false);

  // ─── Fetch audit detail ──────────────────────────────────────────
  const fetchAudit = useCallback(async () => {
    // Cancel any pending response autosave — the refetch will give us
    // the server state and we don't want a stale flush racing it.
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }

    try {
      const res = await fetch(`/api/audits/${auditId}`);
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      if (!res.ok) { setLoading(false); return; }
      const data: AuditDetail = await res.json();
      setAudit(data);
      setSummary(data.summary ?? '');

      // Seed local responses ONLY on initial load. Subsequent refetches
      // (triggered by signature/photo/room/finding mutations) must NOT
      // overwrite local response edits that haven't been flushed yet.
      if (!initialLoadDone.current) {
        const map = new Map<number, LocalResponse>();
        for (const r of data.responses) {
          map.set(r.question_id, {
            question_id: r.question_id,
            response_value: r.response_value,
            comment: r.comment,
            is_na: r.is_na,
          });
        }
        setResponses(map);
        initialLoadDone.current = true;
      }
    } catch { /* network error */ }
    setLoading(false);
  }, [auditId]);

  // ─── Fetch template ──────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/audits/template', { signal: controller.signal });
        if (res.ok) {
          const data: Template = await res.json();
          if (!controller.signal.aborted) setTemplate(data);
        }
      } catch { /* aborted */ }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  // ─── Response mutations ──────────────────────────────────────────
  const updateResponse = useCallback((questionId: number, patch: Partial<LocalResponse>) => {
    setResponses((prev) => {
      const next = new Map(prev);
      const existing = next.get(questionId) ?? { question_id: questionId, response_value: null, comment: null, is_na: false };
      next.set(questionId, { ...existing, ...patch });
      return next;
    });

    // Debounced save — use flushRef so the timer always reads the latest
    // responses state instead of a stale closure capture.
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    saveTimer.current = setTimeout(() => { flushRef.current(); }, 800);
  }, [auditId]); // eslint-disable-line react-hooks/exhaustive-deps

  const flushResponses = useCallback(async () => {
    const arr = Array.from(responses.values()).filter(
      (r) => r.response_value !== null || r.is_na || r.comment !== null,
    );
    if (arr.length === 0) { setSaveStatus('saved'); return; }
    try {
      const res = await fetch(`/api/audits/${auditId}/responses`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: arr }),
      });
      setSaveStatus(res.ok ? 'saved' : 'error');
    } catch {
      setSaveStatus('error');
    }
  }, [auditId, responses]);

  // Make flushResponses accessible to the debounce
  const flushRef = useRef(flushResponses);
  flushRef.current = flushResponses;
  // Re-wire the debounce timer to use latest flushResponses
  useEffect(() => {
    // no-op — just ensures flushRef stays current
  }, [flushResponses]);

  // Override the debounced save to use the ref
  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  // ─── Ensure response exists server-side (for photo uploads) ──────
  // Flushes pending responses, then fetches the server-side response ID
  // for a given question. Returns null only if the flush or fetch fails.
  const ensureResponseId = useCallback(async (questionId: number): Promise<number | null> => {
    // Cancel pending debounce and flush immediately
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    await flushRef.current();
    // Now fetch the audit detail to get the server-assigned response ID
    try {
      const res = await fetch(`/api/audits/${auditId}`);
      if (!res.ok) return null;
      const data: AuditDetail = await res.json();
      // Update photos/signature/rooms/findings from the fresh fetch
      setAudit(data);
      const serverResp = data.responses.find((r) => r.question_id === questionId);
      return serverResp?.id ?? null;
    } catch {
      return null;
    }
  }, [auditId]);

  // ─── Summary autosave ────────────────────────────────────────────
  const updateSummary = useCallback((value: string) => {
    setSummary(value);
    if (summaryTimer.current) clearTimeout(summaryTimer.current);
    setSaveStatus('saving');
    summaryTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/audits/${auditId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ summary: value || null }),
        });
        setSaveStatus(res.ok ? 'saved' : 'error');
      } catch {
        setSaveStatus('error');
      }
    }, 1500);
  }, [auditId]);

  // ─── Rooms CRUD ──────────────────────────────────────────────────
  const addRoom = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/audits/${auditId}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to add room');
    await fetchAudit();
  }, [auditId, fetchAudit]);

  const updateRoom = useCallback(async (roomId: number, body: Record<string, unknown>) => {
    // Optimistic local update so the UI reflects the change immediately
    setAudit((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map((r) => r.id === roomId ? { ...r, ...body } as typeof r : r),
      };
    });
    await fetch(`/api/audits/${auditId}/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }, [auditId]);

  const deleteRoom = useCallback(async (roomId: number) => {
    await fetch(`/api/audits/${auditId}/rooms/${roomId}`, { method: 'DELETE' });
    await fetchAudit();
  }, [auditId, fetchAudit]);

  // ─── Findings CRUD ───────────────────────────────────────────────
  const addFinding = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/audits/${auditId}/findings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to add finding');
    await fetchAudit();
  }, [auditId, fetchAudit]);

  const updateFinding = useCallback(async (findingId: number, body: Record<string, unknown>) => {
    await fetch(`/api/audits/${auditId}/findings/${findingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await fetchAudit();
  }, [auditId, fetchAudit]);

  const deleteFinding = useCallback(async (findingId: number) => {
    await fetch(`/api/audits/${auditId}/findings/${findingId}`, { method: 'DELETE' });
    await fetchAudit();
  }, [auditId, fetchAudit]);

  // ─── Photos ──────────────────────────────────────────────────────
  const uploadPhoto = useCallback(async (
    file: File,
    parentKey: 'response_id' | 'finding_id' | 'room_id',
    parentId: number,
    caption?: string,
  ) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append(parentKey, String(parentId));
    if (caption) fd.append('caption', caption);
    const res = await fetch(`/api/audits/${auditId}/photos`, { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error);
    }
    await fetchAudit();
  }, [auditId, fetchAudit]);

  const deletePhoto = useCallback(async (photoId: number) => {
    await fetch(`/api/audits/${auditId}/photos/${photoId}`, { method: 'DELETE' });
    await fetchAudit();
  }, [auditId, fetchAudit]);

  // ─── Signature ───────────────────────────────────────────────────
  const saveSignature = useCallback(async (base64: string) => {
    const res = await fetch(`/api/audits/${auditId}/signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature_base64: base64 }),
    });
    if (!res.ok) throw new Error('Failed to save signature');
    await fetchAudit();
  }, [auditId, fetchAudit]);

  // ─── Geolocation ─────────────────────────────────────────────────
  const captureLocation = useCallback(async () => {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          await fetch(`/api/audits/${auditId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ geo_lat: lat, geo_lng: lng }),
          });
          setAudit((prev) => prev ? { ...prev, geo_lat: lat, geo_lng: lng } : prev);
          resolve({ lat, lng });
        },
        (err) => reject(err),
      );
    });
  }, [auditId]);

  // ─── Complete ────────────────────────────────────────────────────
  const completeAudit = useCallback(async () => {
    // Flush pending responses first
    await flushRef.current();
    const res = await fetch(`/api/audits/${auditId}/complete`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to complete' }));
      throw new Error(err.error ?? err.missing_question_ids ? `${err.error}` : 'Failed');
    }
    await fetchAudit();
  }, [auditId, fetchAudit]);

  // ─── Sections with question count ────────────────────────────────
  // Filter out sections with zero questions (e.g. "Closing" — handled
  // by Summary & Sign-off tab, not by the Checklist).
  const sections: (Section & { answered: number; total: number })[] = (template?.sections ?? [])
    .filter((s) => s.questions.length > 0)
    .map((s) => {
      const total = s.questions.length;
      const answered = s.questions.filter((q) => {
        const r = responses.get(q.id);
        return r && (r.is_na || r.response_value !== null);
      }).length;
      return { ...s, answered, total };
    });

  return {
    audit, template, loading, notFound, isDraft, sections,
    responses, updateResponse, saveStatus, flushResponses: () => flushRef.current(), ensureResponseId,
    summary, updateSummary,
    addRoom, updateRoom, deleteRoom,
    addFinding, updateFinding, deleteFinding,
    uploadPhoto, deletePhoto,
    saveSignature,
    captureLocation,
    completeAudit,
    refresh: fetchAudit,
  };
}
