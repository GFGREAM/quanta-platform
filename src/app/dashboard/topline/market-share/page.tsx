'use client';
import { useState } from 'react';
import { Star, RefreshCw, Maximize2, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import {
  PROPERTY,
  PERIODS,
  KPM_METRICS,
  SALES_METRICS,
  METRIC_KIND,
  getRow,
  daysFor,
  penetrationIndex,
  changePct,
  vsCompSet,
  change,
  perDay,
  fmtLevel,
  fmtSigned,
  fmtSignedPct,
  fmtIndex,
  type Metric,
  type PeriodKey,
} from './data';

const COLOR_GOOD = 'var(--success)';
const COLOR_BAD = 'var(--danger)';
const BG_GOOD = 'rgba(16, 185, 129, 0.12)';
const BG_BAD = 'rgba(239, 68, 68, 0.12)';

const INDEX_NAME: Record<Metric, string> = {
  OCC: 'MPI', ADR: 'ARI', RevPAR: 'RGI', RoomNights: '', Revenue: '',
};
const METRIC_LABEL: Record<Metric, string> = {
  OCC: 'OCC', ADR: 'ADR', RevPAR: 'RevPAR', RoomNights: 'Room Nights', Revenue: 'Revenue',
};

const isKPM = (m: Metric) => m === 'OCC' || m === 'ADR' || m === 'RevPAR';

// Fair-share gauge track range. 100 sits at the center; values are clamped.
const GAUGE_MIN = 60;
const GAUGE_MAX = 140;
const gaugePos = (idx: number) =>
  Math.max(0, Math.min(100, ((idx - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100));

export default function MarketSharePage() {
  const [isFavorite, setIsFavorite] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>('month');

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        <span className="hover:underline cursor-pointer">Dashboard</span>
        <ChevronRight size={14} />
        <span className="hover:underline cursor-pointer">Top Line</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--primary)' }}>Market Share</span>
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--primary)' }}>Market Share</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {PROPERTY.name} <span className="opacity-60">· {PROPERTY.compSet}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsFavorite(!isFavorite)} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors" aria-label="Favorite">
            <Star size={18} fill={isFavorite ? 'var(--accent)' : 'none'} color={isFavorite ? 'var(--accent)' : 'var(--text-secondary)'} />
          </button>
          <button className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors" aria-label="Refresh">
            <RefreshCw size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors" aria-label="Fullscreen">
            <Maximize2 size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* Period toggle */}
      <div className="mb-5 flex items-center gap-3">
        <div className="inline-flex rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {PERIODS.map((p, i) => {
            const active = p.key === period;
            return (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-4 py-1.5 text-sm transition-colors ${i > 0 ? 'border-l' : ''}`}
                style={{
                  backgroundColor: active ? 'var(--primary)' : 'white',
                  color: active ? 'white' : 'var(--text-secondary)',
                  borderColor: 'var(--border)',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>vs año anterior (LY)</span>
      </div>

      {/* ── Headline: penetration index cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {KPM_METRICS.map((metric) => (
          <IndexCard key={metric} metric={metric} period={period} />
        ))}
      </div>

      {/* ── Detail (non-table tiles) ── */}
      <DetailSection title="KPM's · OCC / ADR / RevPAR" metrics={KPM_METRICS} cols={3} period={period} />
      <DetailSection title="Sales" metrics={SALES_METRICS} cols={2} period={period} />
      <DetailSection title="Sales x Day" metrics={SALES_METRICS} cols={2} period={period} perDayMode />

      {/* Footnotes */}
      <div className="mt-6 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <p><b>MPI / ARI / RGI</b> = índice de penetración Hotel ÷ Comp Set × 100. <b>100 = fair share</b>.</p>
        <p className="mt-1">En cada tile: valor <b>CY</b> arriba, <b>LY</b> debajo y el cambio en chip. KPM&apos;s usa <b>Δ%</b> (variación %); Sales usa <b>Δ absoluto</b>. <b>vs CS</b> = Hotel − Comp Set. <b>Sales x Day</b> = total ÷ días.</p>
        <p className="mt-1 opacity-70">Mock data — to be sourced from SQL.</p>
      </div>
    </div>
  );
}

function IndexCard({ metric, period }: { metric: Metric; period: PeriodKey }) {
  const r = getRow(metric, period);
  const kind = METRIC_KIND[metric];
  const idxCY = penetrationIndex(r.hotelCY, r.compCY);
  const idxLY = penetrationIndex(r.hotelLY, r.compLY);
  const yoy = changePct(idxCY, idxLY);

  const aboveFair = idxCY >= 100;
  const pos = gaugePos(idxCY);
  const up = yoy >= 0;

  return (
    <div className="bg-white rounded-xl border p-5 shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
          {INDEX_NAME[metric]} <span className="font-normal opacity-60">· {METRIC_LABEL[metric]}</span>
        </div>
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ color: aboveFair ? COLOR_GOOD : COLOR_BAD, background: aboveFair ? BG_GOOD : BG_BAD }}
        >
          {aboveFair ? 'Sobre fair share' : 'Bajo fair share'}
        </span>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <span className="text-4xl font-bold tabular-nums" style={{ color: aboveFair ? COLOR_GOOD : COLOR_BAD }}>
          {fmtIndex(idxCY)}
        </span>
        <span className="inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums mb-1" style={{ color: up ? COLOR_GOOD : COLOR_BAD }}>
          {up ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {fmtSignedPct(yoy)} YoY
        </span>
      </div>

      <div className="mt-4">
        <div className="relative h-2 rounded-full" style={{ background: 'var(--muted)' }}>
          <div className="absolute top-[-3px] bottom-[-3px] w-px" style={{ left: '50%', background: 'var(--text-secondary)', opacity: 0.5 }} />
          <div
            className="absolute w-3 h-3 rounded-full border-2 border-white shadow"
            style={{ left: `${pos}%`, top: '-2px', transform: 'translateX(-50%)', background: aboveFair ? COLOR_GOOD : COLOR_BAD }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          <span>{GAUGE_MIN}</span><span>fair = 100</span><span>{GAUGE_MAX}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)' }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          Hotel <b style={{ color: 'var(--text-primary)' }}>{fmtLevel(r.hotelCY, kind)}</b>
          <span className="opacity-50"> · </span>
          Comp <b style={{ color: 'var(--text-primary)' }}>{fmtLevel(r.compCY, kind)}</b>
        </span>
        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Rank {r.rankCY}</span>
      </div>
    </div>
  );
}

function DetailSection({
  title, metrics, cols, period, perDayMode = false,
}: {
  title: string;
  metrics: Metric[];
  cols: 2 | 3;
  period: PeriodKey;
  perDayMode?: boolean;
}) {
  return (
    <div className="mb-6">
      <div className="text-[11px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
        {title}
      </div>
      <div className={`grid grid-cols-1 ${cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        {metrics.map((metric) => (
          <DetailCard key={metric} metric={metric} period={period} perDayMode={perDayMode} />
        ))}
      </div>
    </div>
  );
}

type TileData = {
  label: string;
  cyText: string;
  lyText: string;
  changeText: string;
  changeVal: number;
  colorLevels?: boolean; // color CY/LY by sign too (vs CS tile)
  cyVal?: number;
  lyVal?: number;
};

function DetailCard({ metric, period, perDayMode }: { metric: Metric; period: PeriodKey; perDayMode: boolean }) {
  const r = getRow(metric, period);
  const kind = METRIC_KIND[metric];
  let tiles: TileData[];

  if (isKPM(metric)) {
    const idxCY = penetrationIndex(r.hotelCY, r.compCY);
    const idxLY = penetrationIndex(r.hotelLY, r.compLY);
    tiles = [
      { label: 'Hotel', cyText: fmtLevel(r.hotelCY, kind), lyText: fmtLevel(r.hotelLY, kind), changeText: fmtSignedPct(changePct(r.hotelCY, r.hotelLY)), changeVal: changePct(r.hotelCY, r.hotelLY) },
      { label: 'Comp Set', cyText: fmtLevel(r.compCY, kind), lyText: fmtLevel(r.compLY, kind), changeText: fmtSignedPct(changePct(r.compCY, r.compLY)), changeVal: changePct(r.compCY, r.compLY) },
      { label: INDEX_NAME[metric], cyText: fmtIndex(idxCY), lyText: fmtIndex(idxLY), changeText: fmtSignedPct(changePct(idxCY, idxLY)), changeVal: changePct(idxCY, idxLY) },
    ];
  } else {
    const d = daysFor(period);
    const adj = (v: number) => (perDayMode ? perDay(v, d) : v);
    const hCY = adj(r.hotelCY), cCY = adj(r.compCY), hLY = adj(r.hotelLY), cLY = adj(r.compLY);
    const vsCY = vsCompSet(hCY, cCY);
    const vsLY = vsCompSet(hLY, cLY);
    tiles = [
      { label: 'Hotel', cyText: fmtLevel(hCY, kind), lyText: fmtLevel(hLY, kind), changeText: fmtSigned(change(hCY, hLY), kind), changeVal: change(hCY, hLY) },
      { label: 'Comp Set', cyText: fmtLevel(cCY, kind), lyText: fmtLevel(cLY, kind), changeText: fmtSigned(change(cCY, cLY), kind), changeVal: change(cCY, cLY) },
      { label: 'vs CS', cyText: fmtSigned(vsCY, kind), lyText: fmtSigned(vsLY, kind), changeText: fmtSigned(vsCY - vsLY, kind), changeVal: vsCY - vsLY, colorLevels: true, cyVal: vsCY, lyVal: vsLY },
    ];
  }

  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>{METRIC_LABEL[metric]}</span>
        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Rank {r.rankCY}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => <Tile key={t.label} t={t} />)}
      </div>
    </div>
  );
}

function Tile({ t }: { t: TileData }) {
  const chgGood = t.changeVal >= 0;
  const cyColor = t.colorLevels ? ((t.cyVal ?? 0) >= 0 ? COLOR_GOOD : COLOR_BAD) : 'var(--text-primary)';
  const lyColor = t.colorLevels ? ((t.lyVal ?? 0) >= 0 ? COLOR_GOOD : COLOR_BAD) : 'var(--text-secondary)';
  return (
    <div className="rounded-lg px-2.5 py-2" style={{ background: 'var(--muted)' }}>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t.label}</div>
      <div className="text-base font-bold tabular-nums mt-0.5" style={{ color: cyColor }}>{t.cyText}</div>
      <div className="text-[11px] tabular-nums" style={{ color: lyColor }}>LY {t.lyText}</div>
      <div
        className="mt-1.5 inline-flex items-center text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-sm"
        style={{ color: chgGood ? COLOR_GOOD : COLOR_BAD, background: chgGood ? BG_GOOD : BG_BAD }}
      >
        {t.changeText}
      </div>
    </div>
  );
}
