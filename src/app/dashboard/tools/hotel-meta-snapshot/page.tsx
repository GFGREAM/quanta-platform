'use client';

import { useState, useRef } from 'react';

const STEP_DURATIONS = [5, 60, 60, 90, 10, 20]; // segundos, total ~245s
const STEP_LABELS = [
  { icon: '🔍', text: 'Processing URLs and discovering IDs' },
  { icon: '⭐', text: 'Collecting ratings (4 platforms)' },
  { icon: '🏆', text: 'Collecting rankings (4 platforms)' },
  { icon: '💬', text: 'Extracting reviews (4 platforms)' },
  { icon: '📄', text: 'Building HTML report' },
  { icon: '📥', text: 'Generating PDF' },
];

interface FormState {
  hotelName: string;
  city: string;
  googleUrl: string;
  tripadvisorUrl: string;
  bookingUrl: string;
  expediaUrl: string;
  email: string;
}

const INITIAL_FORM: FormState = {
  hotelName: '',
  city: '',
  googleUrl: '',
  tripadvisorUrl: '',
  bookingUrl: '',
  expediaUrl: '',
  email: '',
};

const PERIOD_OPTIONS = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '1 month' },
  { days: 90, label: '3 months' },
  { days: 180, label: '6 months' },
];

type Status = 'idle' | 'submitting' | 'success' | 'error';

function validUrl(value: string, mustInclude: string): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol.startsWith('http') && u.hostname.includes(mustInclude);
  } catch {
    return false;
  }
}

function validGoogleMapsUrl(value: string): boolean {
  if (!validUrl(value, 'google.')) return false;
  return value.includes('/maps/');
}

function validEmail(value: string): boolean {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function HotelMetaSnapshotPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [progressPct, setProgressPct] = useState(2);
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [periodDays, setPeriodDays] = useState(180);
  const [warnOpen, setWarnOpen] = useState(false);
  const [missingPlatforms, setMissingPlatforms] = useState<string[]>([]);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const stepElapsedRef = useRef(0);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: false }));
    }
  };

  const startProgress = () => {
    const total = STEP_DURATIONS.reduce((a, b) => a + b, 0);
    elapsedRef.current = 0;
    stepElapsedRef.current = 0;
    setActiveStep(0);
    setCompletedSteps([]);
    setProgressPct(2);

    progressIntervalRef.current = setInterval(() => {
      elapsedRef.current += 1;
      const pct = Math.min(95, (elapsedRef.current / total) * 100);
      setProgressPct(pct);
    }, 1000);

    stepIntervalRef.current = setInterval(() => {
      stepElapsedRef.current += 1;
      setActiveStep((curr) => {
        if (curr < STEP_LABELS.length && stepElapsedRef.current >= STEP_DURATIONS[curr]) {
          setCompletedSteps((done) => [...done, curr]);
          stepElapsedRef.current = 0;
          return curr + 1;
        }
        return curr;
      });
    }, 1000);
  };

  const stopProgress = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    setProgressPct(100);
    setCompletedSteps(STEP_LABELS.map((_, i) => i));
    setActiveStep(STEP_LABELS.length);
  };

  const reset = () => {
    stopProgress();
    setStatus('idle');
    setErrorMessage('');
    setProgressPct(2);
    setActiveStep(0);
    setCompletedSteps([]);
  };

  const validateAll = (): string[] => {
    const errs: string[] = [];
    const newErrors: Record<string, boolean> = {};

    if (!form.hotelName.trim()) { errs.push('Hotel name'); newErrors.hotelName = true; }
    if (!form.city.trim()) { errs.push('City'); newErrors.city = true; }

    const g = form.googleUrl.trim();
    if (g && !validGoogleMapsUrl(g)) {
      errs.push('Google URL must be from google.com/maps/ (not Travel or Search)');
      newErrors.googleUrl = true;
    }
    const t = form.tripadvisorUrl.trim();
    if (t && !validUrl(t, 'tripadvisor.')) { errs.push('valid TripAdvisor URL'); newErrors.tripadvisorUrl = true; }
    const b = form.bookingUrl.trim();
    if (b && !validUrl(b, 'booking.')) { errs.push('valid Booking URL'); newErrors.bookingUrl = true; }
    const ex = form.expediaUrl.trim();
    if (ex && !validUrl(ex, 'expedia.')) { errs.push('valid Expedia URL'); newErrors.expediaUrl = true; }

    if (!g && !t && !b && !ex) {
      errs.push('at least one review platform URL (Google, TripAdvisor, Booking, or Expedia)');
    }

    if (!form.email.trim()) { errs.push('Email is required to receive the report'); newErrors.email = true; }
    else if (!validEmail(form.email.trim())) { errs.push('valid email format'); newErrors.email = true; }

    setErrors(newErrors);
    return errs;
  };

  const handleSubmit = () => {
    const errs = validateAll();
    if (errs.length) { alert('Please fix: ' + errs.join(', ')); return; }

    const missing: string[] = [];
    if (!form.googleUrl.trim()) missing.push('Google');
    if (!form.tripadvisorUrl.trim()) missing.push('TripAdvisor');
    if (!form.bookingUrl.trim()) missing.push('Booking');
    if (!form.expediaUrl.trim()) missing.push('Expedia');

    if (missing.length > 0) {
      setMissingPlatforms(missing);
      setWarnOpen(true);
      return;
    }
    launchSnapshot();
  };

  const launchSnapshot = async () => {
    setWarnOpen(false);
    setStatus('submitting');
    setErrorMessage('');
    startProgress();

    const jobId = crypto.randomUUID();

    const payload = {
      job_id: jobId,
      hotel_name: form.hotelName.trim(),
      city: form.city.trim(),
      period_days: periodDays,
      google_url: form.googleUrl.trim(),
      tripadvisor_url: form.tripadvisorUrl.trim(),
      booking_url: form.bookingUrl.trim(),
      expedia_url: form.expediaUrl.trim(),
      email: form.email.trim(),
    };

    try {
      // Disparar el job (espera 202)
      const runRes = await fetch('/api/snapshot/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (runRes.status !== 202) {
        const text = await runRes.text().catch(() => '');
        throw new Error(text || `HTTP ${runRes.status}`);
      }

      // Polling cada 5 segundos al status endpoint
      const POLL_INTERVAL_MS = 5000;
      const MAX_POLL_DURATION_MS = 30 * 60 * 1000; // 30 min
      const pollStart = Date.now();

      while (Date.now() - pollStart < MAX_POLL_DURATION_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

        const statusRes = await fetch(`/api/snapshot/status/${jobId}`, {
          method: 'GET',
        });

        if (statusRes.status === 202) {
          // Aún procesando, continuar polling
          continue;
        }

        if (statusRes.status === 200) {
          // PDF listo, descargar
          const blob = await statusRes.blob();
          stopProgress();
          setStatus('success');

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download =
            form.hotelName.replace(/[^a-zA-Z0-9 ]/g, '').replace(/ /g, '_') +
            '_Digital_Presence_Snapshot.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }

        // Cualquier otro status es error
        const errText = await statusRes.text().catch(() => '');
        throw new Error(`Status check failed (HTTP ${statusRes.status}): ${errText.slice(0, 200)}`);
      }

      throw new Error('Snapshot timed out after 30 minutes. Check your email — the report may have been sent there.');
    } catch (e) {
      stopProgress();
      const message = e instanceof Error ? e.message : 'Unknown error';
      setErrorMessage(message);
      setStatus('error');
    }
  };

  const periodLabel = PERIOD_OPTIONS.find((o) => o.days === periodDays)?.label ?? '6 months';

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 13px',
    border: '1.5px solid ' + (hasError ? '#E08080' : '#D5DDE5'),
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1E2756',
    outline: 'none',
    fontFamily: 'inherit',
    background: hasError ? '#FFF8F8' : '#F8FAFB',
    transition: 'border-color 0.2s',
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 4px 32px rgba(30,39,86,0.10)',
          padding: '40px',
          maxWidth: '520px',
          width: '100%',
        }}
      >
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#1E2756',
            marginBottom: '6px',
            textAlign: 'center',
          }}
        >
          Hotel META Snapshot
        </h1>

        {status === 'idle' && (
          <div>
            <p style={{ fontSize: '13px', color: '#607080', marginBottom: '20px', lineHeight: 1.6, textAlign: 'center' }}>
              Complete analysis of Digital Presence over the last 6 months. PDF downloads automatically when ready.
            </p>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px', justifyContent: 'center' }}>
              {[
                { icon: '🔍', label: 'Google' },
                { icon: '✈️', label: 'TripAdvisor' },
                { icon: '🏨', label: 'Booking.com' },
                { icon: '🌐', label: 'Expedia' },
              ].map((t) => (
                <span
                  key={t.label}
                  style={{
                    fontSize: '11px',
                    background: '#E8F4F6',
                    color: '#3A8A95',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontWeight: 600,
                  }}
                >
                  {t.icon} {t.label}
                </span>
              ))}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Hotel name *</label>
              <input
                type="text"
                value={form.hotelName}
                onChange={(e) => update('hotelName', e.target.value)}
                placeholder="e.g. Hacienda del Mar Los Cabos"
                style={inputStyle(!!errors.hotelName)}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>City / Destination *</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="e.g. Los Cabos, Cancún, Punta Cana"
                style={inputStyle(!!errors.city)}
              />
            </div>

            <p
              style={{
                fontSize: '12px',
                color: '#3A8A95',
                background: '#E8F4F6',
                borderLeft: '3px solid #5BAAB3',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '14px',
                lineHeight: 1.5,
              }}
            >
              📅 The analysis covers the most recent {periodLabel} of reviews across all platforms.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1E2756', marginBottom: '6px' }}>
                Analysis time range
              </label>
              <select
                value={periodDays}
                onChange={(e) => setPeriodDays(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 13px',
                  border: '1.5px solid #D5DDE5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#1E2756',
                  outline: 'none',
                  fontFamily: 'inherit',
                  background: '#fff',
                  transition: 'border-color 0.2s',
                  cursor: 'pointer',
                }}
              >
                {PERIOD_OPTIONS.map((o) => (
                  <option key={o.days} value={o.days}>{o.label}</option>
                ))}
              </select>
            </div>

            <div style={sectionLabelStyle}>
              <span>Platform URLs *</span>
              <div style={{ flex: 1, height: '1px', background: '#EEF2F5', marginLeft: '8px' }} />
            </div>
            <p style={{ fontSize: '11px', color: '#aab0bb', marginBottom: '12px' }}>
              At least one URL is required. Provide all 4 for best results.
            </p>

            <div style={urlRowStyle}>
              <span style={urlIconStyle}>🔍</span>
              <input
                type="url"
                value={form.googleUrl}
                onChange={(e) => update('googleUrl', e.target.value)}
                placeholder="Google Maps URL — https://www.google.com/maps/place/..."
                style={inputStyle(!!errors.googleUrl)}
              />
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#C47A00',
                background: '#FFF8E1',
                borderLeft: '3px solid #EF9F27',
                padding: '6px 10px',
                borderRadius: '4px',
                marginTop: '4px',
                marginLeft: '30px',
                lineHeight: 1.5,
              }}
            >
              ⚠️ Must be a Google <strong>Maps</strong> URL (from google.com/maps), <strong>not</strong> a Google Travel or Google Search result. Open the hotel in Google Maps and copy the URL from the address bar.
            </div>

            <div style={{ ...urlRowStyle, marginTop: '10px' }}>
              <span style={urlIconStyle}>✈️</span>
              <input
                type="url"
                value={form.tripadvisorUrl}
                onChange={(e) => update('tripadvisorUrl', e.target.value)}
                placeholder="TripAdvisor URL — https://www.tripadvisor.com/Hotel_Review-g..."
                style={inputStyle(!!errors.tripadvisorUrl)}
              />
            </div>

            <div style={urlRowStyle}>
              <span style={urlIconStyle}>🏨</span>
              <input
                type="url"
                value={form.bookingUrl}
                onChange={(e) => update('bookingUrl', e.target.value)}
                placeholder="Booking URL — https://www.booking.com/hotel/..."
                style={inputStyle(!!errors.bookingUrl)}
              />
            </div>

            <div style={urlRowStyle}>
              <span style={urlIconStyle}>🌐</span>
              <input
                type="url"
                value={form.expediaUrl}
                onChange={(e) => update('expediaUrl', e.target.value)}
                placeholder="Expedia URL — https://www.expedia.com/..."
                style={inputStyle(!!errors.expediaUrl)}
              />
            </div>

            <div style={{ marginTop: '18px', marginBottom: '14px' }}>
              <label style={labelStyle}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="your.email@company.com"
                style={inputStyle(!!errors.email)}
              />
            </div>

            <button
              onClick={handleSubmit}
              style={{
                width: '100%',
                background: '#5BAAB3',
                color: '#fff',
                border: 'none',
                padding: '13px',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: '20px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1E2756')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#5BAAB3')}
            >
              Generate report and download PDF →
            </button>
          </div>
        )}

        {(status === 'submitting' || status === 'success') && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            {status === 'submitting' && (
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  border: '4px solid #E8F4F6',
                  borderTopColor: '#5BAAB3',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  animation: 'snapshot-spin 0.85s linear infinite',
                }}
              />
            )}
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#1E2756', marginBottom: '6px' }}>
              {status === 'success' ? 'Report ready!' : 'Generating report…'}
            </div>
            <div style={{ fontSize: '13px', color: '#607080', lineHeight: 1.6 }}>
              {status === 'success' ? (
                'The PDF is downloading now.'
              ) : (
                <>
                  PDF downloads automatically when ready.
                  <br />
                  <strong>Please keep this tab open.</strong>
                  <br />
                  <span style={{ fontSize: '11px', color: '#8B9AAB' }}>
                    A copy will also be sent to your email.
                  </span>
                </>
              )}
            </div>

            <div
              style={{
                width: '100%',
                height: '4px',
                background: '#E8F4F6',
                borderRadius: '2px',
                margin: '16px 0 4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #5BAAB3, #7DBFC8)',
                  borderRadius: '2px',
                  width: progressPct + '%',
                  transition: 'width 1s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '11px', color: '#aab0bb', textAlign: 'right', marginBottom: '16px' }}>
              {Math.round(progressPct)}% complete{progressPct >= 100 ? '' : '…'}
            </div>

            <div style={{ border: '1px solid #EEF2F5', borderRadius: '8px', overflow: 'hidden' }}>
              {STEP_LABELS.map((step, i) => {
                const isDone = completedSteps.includes(i);
                const isActive = activeStep === i && !isDone;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 13px',
                      fontSize: '13px',
                      color: isDone ? '#5BAAB3' : isActive ? '#1E2756' : '#BEC9D3',
                      background: isActive ? '#F0F7F8' : 'transparent',
                      fontWeight: isActive ? 600 : 400,
                      borderBottom: i < STEP_LABELS.length - 1 ? '1px solid #F5F7FA' : 'none',
                    }}
                  >
                    <span style={{ minWidth: '20px', textAlign: 'center' }}>
                      {isDone ? '✅' : step.icon}
                    </span>
                    {step.text}
                  </div>
                );
              })}
            </div>

            {status === 'success' && (
              <button
                onClick={reset}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: '12px',
                  background: '#fff',
                  border: '1.5px solid #1E2756',
                  color: '#1E2756',
                  padding: '9px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Start new snapshot
              </button>
            )}
          </div>
        )}

        {status === 'error' && (
          <div>
            <div
              style={{
                background: '#FFF3F3',
                border: '1px solid #FFCDD2',
                borderRadius: '8px',
                padding: '13px',
                marginTop: '16px',
                fontSize: '13px',
                color: '#C62828',
                lineHeight: 1.5,
              }}
            >
              Error: {errorMessage}
            </div>
            <button
              onClick={reset}
              style={{
                display: 'block',
                width: '100%',
                marginTop: '12px',
                background: '#fff',
                border: '1.5px solid #1E2756',
                color: '#1E2756',
                padding: '9px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ← Start over
            </button>
          </div>
        )}
      </div>

      {warnOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setWarnOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(30,39,86,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '420px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}
          >
            <h3 style={{ margin: 0, marginBottom: '10px', fontSize: '17px', fontWeight: 700, color: '#1E2756' }}>
              Missing review platforms
            </h3>
            <p style={{ margin: 0, marginBottom: '18px', fontSize: '14px', color: '#444', lineHeight: 1.5 }}>
              No URL provided for: <strong>{missingPlatforms.join(', ')}</strong>. Do you want to continue anyway?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setWarnOpen(false)}
                style={{ background: '#fff', color: '#1E2756', border: '1px solid #C9D2D6', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={launchSnapshot}
                style={{ background: '#5BAAB3', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes snapshot-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: '#3A4A5A',
  marginBottom: '5px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#3A4A5A',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '12px',
  marginTop: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const urlRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '10px',
};

const urlIconStyle: React.CSSProperties = {
  fontSize: '14px',
  minWidth: '22px',
  textAlign: 'center',
};
