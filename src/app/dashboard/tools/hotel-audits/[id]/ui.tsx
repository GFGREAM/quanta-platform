'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, Loader2, MapPin, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { selectStyle } from '@/lib/selectStyle';
import {
  CreateRoomInputSchema, CreateFindingInputSchema, SeveritySchema,
  type CreateRoomInput, type CreateFindingInput, type Severity, type Section,
} from '@/lib/schemas/audits';
import { Modal } from '../ui';
import { SEVERITY_LABELS, SEVERITY_COLORS } from './data';
import type { PhotoWithUrl, SaveStatus } from './useAuditDetail';

// ─── Severity badge ──────────────────────────────────────────────

export function SeverityBadge({ severity }: { severity: Severity }) {
  const color = SEVERITY_COLORS[severity];
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[0.625rem] font-semibold whitespace-nowrap"
      style={{ background: `${color}18`, color }}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

// ─── Save indicator ──────────────────────────────────────────────

export function SaveIndicator({ status }: { status: SaveStatus }) {
  const colors: Record<SaveStatus, string> = {
    saved: 'var(--success)',
    saving: 'var(--text-muted)',
    error: 'var(--danger)',
  };
  const labels: Record<SaveStatus, string> = {
    saved: 'All changes saved',
    saving: 'Saving…',
    error: 'Failed to save',
  };
  return (
    <span className="text-[0.6875rem] font-medium" style={{ color: colors[status] }}>
      {labels[status]}
    </span>
  );
}

// ─── Segmented button group ──────────────────────────────────────

export function SegmentedControl({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { key: string; label: string; color?: string }[];
  value: string | null;
  onChange: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex rounded-md overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.key)}
            className="px-3 py-1.5 text-[0.75rem] font-semibold border-none cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px] md:min-h-0"
            style={{
              background: active ? (opt.color ?? 'var(--accent)') : 'white',
              color: active ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Photo gallery ───────────────────────────────────────────────

export function PhotoGallery({
  photos,
  onDelete,
  disabled,
}: {
  photos: PhotoWithUrl[];
  onDelete: (photoId: number) => void;
  disabled?: boolean;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (photos.length === 0) return null;
  return (
    <>
      <div className="flex gap-2 flex-wrap mt-2">
        {photos.map((p) => (
          <div key={p.id} className="relative group">
            <img
              src={p.signed_url}
              alt={p.caption ?? 'Photo'}
              className="w-20 h-20 object-cover rounded-md border cursor-pointer"
              style={{ borderColor: 'var(--border)' }}
              onClick={() => setLightbox(p.signed_url)}
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => onDelete(p.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
                style={{ background: 'var(--danger)', color: '#fff' }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Full size" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
        </div>
      )}
    </>
  );
}

// ─── Photo upload button ─────────────────────────────────────────

export function PhotoUploadButton({
  onUpload,
  disabled,
}: {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} disabled={disabled} />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold px-2 py-1 rounded border cursor-pointer transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderColor: 'var(--border)', color: 'var(--accent)', background: 'transparent' }}
      >
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
        {uploading ? 'Uploading…' : 'Add photo'}
      </button>
    </>
  );
}

// ─── Add Room Modal ──────────────────────────────────────────────

export function AddRoomModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRoomInput) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateRoomInput>({
    resolver: zodResolver(CreateRoomInputSchema),
  });

  const handle = async (values: CreateRoomInput) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
      reset();
      onClose();
    } catch { /* handled upstream */ }
    setSubmitting(false);
  };

  const labelCls = 'text-[0.75rem] font-semibold';
  const inputCls = 'h-9 w-full px-3 rounded-md border text-[0.8125rem] bg-white outline-none focus:ring-2 focus:ring-[var(--accent)]';

  return (
    <Modal open={open} onClose={onClose} title="Add room">
      <form onSubmit={handleSubmit(handle)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Room number *</label>
          <input className={inputCls} style={{ borderColor: 'var(--border)', color: 'var(--primary)' }} {...register('room_number')} />
          {errors.room_number && <span className="text-xs" style={{ color: 'var(--danger)' }}>Required</span>}
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border text-[0.8125rem] font-semibold cursor-pointer hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'transparent' }}>Cancel</button>
          <button type="submit" disabled={submitting} className="h-9 px-5 rounded-md text-[0.8125rem] font-semibold text-white border-none cursor-pointer hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--accent)' }}>{submitting ? 'Adding…' : 'Add'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Add Finding Modal ───────────────────────────────────────────

export function AddFindingModal({
  open,
  onClose,
  onSubmit,
  sections,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFindingInput) => Promise<void>;
  sections: Section[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateFindingInput>({
    resolver: zodResolver(CreateFindingInputSchema),
  });

  const handle = async (values: CreateFindingInput) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
      reset();
      onClose();
    } catch { /* handled upstream */ }
    setSubmitting(false);
  };

  const labelCls = 'text-[0.75rem] font-semibold';
  const inputCls = 'w-full px-3 py-2 rounded-md border text-[0.8125rem] bg-white outline-none focus:ring-2 focus:ring-[var(--accent)]';

  return (
    <Modal open={open} onClose={onClose} title="Add finding">
      <form onSubmit={handleSubmit(handle)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Description *</label>
          <textarea className={inputCls} rows={3} style={{ borderColor: 'var(--border)', color: 'var(--primary)' }} {...register('description')} />
          {errors.description && <span className="text-xs" style={{ color: 'var(--danger)' }}>Required</span>}
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Section</label>
          <select className={`h-9 ${inputCls} pr-8 appearance-none cursor-pointer`} style={selectStyle} {...register('section')}>
            <option value="">None</option>
            {sections.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls} style={{ color: 'var(--text-secondary)' }}>Severity *</label>
          <select className={`h-9 ${inputCls} pr-8 appearance-none cursor-pointer`} style={selectStyle} {...register('severity')}>
            <option value="" disabled>Select</option>
            {SeveritySchema.options.map((s) => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
          </select>
          {errors.severity && <span className="text-xs" style={{ color: 'var(--danger)' }}>Required</span>}
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border text-[0.8125rem] font-semibold cursor-pointer hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'transparent' }}>Cancel</button>
          <button type="submit" disabled={submitting} className="h-9 px-5 rounded-md text-[0.8125rem] font-semibold text-white border-none cursor-pointer hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--accent)' }}>{submitting ? 'Adding…' : 'Add'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Signature Canvas ────────────────────────────────────────────

export function SignatureCanvas({
  onSave,
  disabled,
}: {
  onSave: (base64: string) => Promise<void>;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [saving, setSaving] = useState(false);

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

  const startDraw = useCallback((x: number, y: number) => {
    const ctx = getCtx();
    if (!ctx || disabled) return;
    setDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [disabled]);

  const draw = useCallback((x: number, y: number) => {
    if (!drawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'var(--primary)';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  }, [drawing]);

  const endDraw = useCallback(() => setDrawing(false), []);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = e.touches[0];
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };

  const clear = () => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (ctx && canvas) { ctx.clearRect(0, 0, canvas.width, canvas.height); setHasContent(false); }
  };

  const save = async () => {
    if (!canvasRef.current || !hasContent) return;
    setSaving(true);
    try {
      const base64 = canvasRef.current.toDataURL('image/png');
      await onSave(base64);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save signature');
    }
    setSaving(false);
  };

  // Set canvas size on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        className="w-full h-[200px] rounded-lg border cursor-crosshair"
        style={{ borderColor: 'var(--border)', background: '#fff', touchAction: 'none' }}
        onMouseDown={(e) => { const p = getPos(e); startDraw(p.x, p.y); }}
        onMouseMove={(e) => { const p = getPos(e); draw(p.x, p.y); }}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={(e) => { e.preventDefault(); const p = getTouchPos(e); startDraw(p.x, p.y); }}
        onTouchMove={(e) => { e.preventDefault(); const p = getTouchPos(e); draw(p.x, p.y); }}
        onTouchEnd={endDraw}
      />
      <div className="flex gap-2">
        <button type="button" onClick={clear} disabled={disabled || !hasContent}
          className="h-8 px-3 rounded-md border text-[0.75rem] font-semibold cursor-pointer hover:bg-[var(--bg-hover)] disabled:opacity-50"
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'transparent' }}>Clear</button>
        <button type="button" onClick={save} disabled={disabled || !hasContent || saving}
          className="h-8 px-4 rounded-md text-[0.75rem] font-semibold text-white border-none cursor-pointer hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--accent)' }}>{saving ? 'Saving…' : 'Save signature'}</button>
      </div>
    </div>
  );
}

// ─── Confirm dialog ──────────────────────────────────────────────

export function ConfirmDelete({
  open,
  onClose,
  onConfirm,
  message,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Confirm">
      <div className="flex flex-col gap-4">
        <p className="text-sm m-0" style={{ color: 'var(--text-secondary)' }}>{message}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border text-[0.8125rem] font-semibold cursor-pointer hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'transparent' }}>Cancel</button>
          <button type="button" onClick={() => { onConfirm(); onClose(); }} className="h-9 px-4 rounded-md text-[0.8125rem] font-semibold text-white border-none cursor-pointer hover:opacity-90" style={{ background: 'var(--danger)' }}>Delete</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Location capture button ─────────────────────────────────────

export function LocationButton({
  geoLat,
  geoLng,
  onCapture,
  disabled,
}: {
  geoLat: number | null;
  geoLng: number | null;
  onCapture: () => Promise<{ lat: number; lng: number }>;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(
    geoLat !== null && geoLng !== null ? { lat: geoLat, lng: geoLng } : null,
  );

  const capture = async () => {
    setLoading(true);
    try {
      const result = await onCapture();
      setLoc(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to capture location');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={capture} disabled={disabled || loading}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-[0.8125rem] font-semibold cursor-pointer hover:bg-[var(--bg-hover)] disabled:opacity-50"
        style={{ color: 'var(--accent)', borderColor: 'var(--border)', background: 'transparent' }}>
        {loading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
        Capture location
      </button>
      {loc && (
        <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
          {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
        </span>
      )}
    </div>
  );
}
