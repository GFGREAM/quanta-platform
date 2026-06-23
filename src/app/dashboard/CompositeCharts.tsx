"use client";

import { LOCAL_EXCHANGE_FACTOR } from "./_placeholders";

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: r4(cx + r * Math.sin(rad)), y: r4(cy - r * Math.cos(rad)) };
}

function donutSegmentPath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startDeg: number, endDeg: number,
): string {
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const so = polarToCartesian(cx, cy, outerR, startDeg);
  const eo = polarToCartesian(cx, cy, outerR, endDeg);
  const si = polarToCartesian(cx, cy, innerR, startDeg);
  const ei = polarToCartesian(cx, cy, innerR, endDeg);
  return [
    `M ${so.x} ${so.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${eo.x} ${eo.y}`,
    `L ${ei.x} ${ei.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${si.x} ${si.y}`,
    "Z",
  ].join(" ");
}

type Segment = { label: string; value: number; color: string };

function DonutChart({ title, segments }: { title: string; segments: Segment[] }) {
  const CX = 100, CY = 100, R = 90, RI = 42;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  if (total === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-2">
        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>No data</span>
      </div>
    );
  }

  const slices = segments.reduce<Array<Segment & { start: number; end: number; sweep: number }>>((acc, seg) => {
    const start = acc.length > 0 ? acc[acc.length - 1].end : 0;
    const sweep = (seg.value / total) * 360;
    return [...acc, { ...seg, start, end: start + sweep, sweep }];
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 px-2 pt-1">
      <div className="flex-1 min-h-0">
        <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ display: "block" }}>
          {slices.map((s) => {
            const midDeg = (s.start + s.end) / 2;
            const midR   = (R + RI) / 2;
            const lp     = polarToCartesian(CX, CY, midR, midDeg);
            const showLabel = (s.sweep * Math.PI) / 180 > 0.3;
            const pct = ((s.value / total) * 100).toFixed(0) + "%";
            return (
              <g key={s.label}>
                <path d={donutSegmentPath(CX, CY, R, RI, s.start, s.end)} fill={s.color} />
                {showLabel && (
                  <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight={700} fill="var(--primary)">
                    {pct}
                  </text>
                )}
              </g>
            );
          })}
          {title.includes(' ') ? (
            <>
              <text x={CX} y={CY - 11} textAnchor="middle" dominantBaseline="middle" fontSize={16} fontWeight={700} fill="var(--primary)">
                {title.split(' ')[0]}
              </text>
              <text x={CX} y={CY + 11} textAnchor="middle" dominantBaseline="middle" fontSize={16} fontWeight={700} fill="var(--primary)">
                {title.split(' ').slice(1).join(' ')}
              </text>
            </>
          ) : (
            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize={16} fontWeight={700} fill="var(--primary)">
              {title}
            </text>
          )}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 justify-center pb-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1">
            <div style={{ width: 7, height: 7, background: seg.color, borderRadius: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type Props = {
  metric: "USD" | "Local";
};

export default function CompositeCharts({ metric }: Props) {
  // TODO: en producción, query a PostgreSQL filtrando por hotel/month/year
  // USD:   columnas convertidas de AAG (suma directa)
  // Local: columnas Non Converted de AAG (pre-calculadas, NO multiplicar en frontend)
  const f = metric === "USD" ? 1 : LOCAL_EXCHANGE_FACTOR;

  const donuts = [
    {
      title: "Rev$",
      segments: [
        // TODO USD:   SUM(AAG."Rooms Revenue")
        // TODO Local: SUM(AAG."Rooms Revenue Non Converted")
        { label: "Rooms", value: 1_530_000 * f, color: "#00AFAD" },
        // TODO USD:   SUM(AAG."Other Revenue")
        // TODO Local: SUM(AAG."Club Maintenance Fee Non Converted") +
        //   SUM(AAG."TimeShare Maintenance Fee Non Converted") +
        //   SUM(AAG."Other Revenue Non Converted")
        { label: "Other", value: 226_000 * f, color: "#69D9D0" },
      ],
    },
    {
      title: "Opex$",
      segments: [
        // TODO USD:   SUM(AAG."Departmental Expenses")
        // TODO Local: SUM(AAG."Departmental Expenses Non Converted")
        { label: "Dept", value: 768_000 * f, color: "#EF4444" },
        // TODO USD:   SUM(AAG."Undistributed Expenses")
        // TODO Local: SUM(AAG."Undistributed Expenses Non Converted")
        { label: "Und", value: 730_000 * f, color: "rgba(239,68,68,0.40)" },
      ],
    },
    {
      title: "Non Opex$",
      segments: [
        // TODO USD:   SUM(AAG."Non Operating")
        // TODO Local: SUM(AAG."Non Operating Non Converted")
        { label: "Fees", value: 61_000 * f, color: "#EF4444" },
        // TODO USD:   SUM(AAG."Other Expenses")
        // TODO Local: SUM(AAG."Other Expenses Non Converted")
        { label: "Other", value: 179_000 * f, color: "rgba(239,68,68,0.40)" },
      ],
    },
  ];

  return (
    <div className="bg-white rounded-xl border flex flex-col h-full" style={{ borderColor: "var(--border)" }}>
      <div className="px-4 py-3 border-b flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>Composite%</span>
      </div>
      <div className="flex-1 flex flex-row min-h-0" style={{ borderColor: "var(--border-light)" }}>
        {donuts.map((d, i) => (
          <div
            key={d.title}
            className={`flex-1 flex flex-col min-h-0${i > 0 ? " border-l" : ""}`}
            style={{ borderColor: "var(--border-light)" }}
          >
            <DonutChart title={d.title} segments={d.segments} />
          </div>
        ))}
      </div>
    </div>
  );
}
