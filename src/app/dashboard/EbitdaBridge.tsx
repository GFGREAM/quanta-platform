"use client";

// Waterfall chart geometry — mirrors original DAX layout
const W = 1435, H = 620, mL = 30, mR = 30, mT = 60;
const axisY = H - 14;
const baseY = axisY - 55;
const plotH = baseY - mT;   // 506
const plotW = W - mL - mR;  // 1335
const COL_W = plotW / 5;    // 267
const BAR_W = COL_W * 0.82; // ~192.24

const colCx = (i: number) => mL + i * COL_W + COL_W / 2;
const barX  = (i: number) => colCx(i) - BAR_W / 2;

function fmtK(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)} m`;
  if (abs >= 1_000)     return `$${(abs / 1_000).toFixed(2)} K`;
  return `$${Math.round(abs).toLocaleString("en-US")}`;
}

function fmtFull(n: number, forceParens = false): string {
  const s = `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
  return forceParens || n < 0 ? `(${s})` : s;
}

type SegLabelProps = {
  cx: number;
  segY: number;
  segH: number;
  name: string;
  val: number;
  clipId: string;
};

function SegmentLabel({ cx, segY, segH, name, val, clipId }: SegLabelProps) {
  if (segH < 60) return null;
  const midY = segY + segH / 2;
  return (
    <g clipPath={`url(#${clipId})`}>
      <text x={cx} y={midY - 13} textAnchor="middle" fontSize={28} fontWeight={400} fill="#172951">{name}</text>
      <text x={cx} y={midY + 15} textAnchor="middle" fontSize={28} fontWeight={400} fill="#172951">{fmtK(val)}</text>
    </g>
  );
}

type Props = {
  selectedHotels: string[];
  selectedMonths: string[];
  year: string;
  metric: "USD" | "Local";
};

export default function EbitdaBridge({ metric }: Props) {
  // TODO: en producción, query a PostgreSQL filtrando por hotel/month/year
  // USD:   columnas convertidas de AAG (suma directa)
  // Local: columnas Non Converted de AAG (pre-calculadas, NO multiplicar en frontend)
  const LOCAL_FACTOR = 17.2; // TODO: eliminar en producción — solo placeholder visual
  const f = metric === "USD" ? 1 : LOCAL_FACTOR;

  // TODO USD:   SUM(AAG."Rooms Revenue")
  // TODO Local: SUM(AAG."Rooms Revenue Non Converted")
  const roomsRev = 1_530_000 * f;
  // TODO USD:   SUM(AAG."Other Revenue")
  // TODO Local: SUM(AAG."Club Maintenance Fee Non Converted") + SUM(AAG."TimeShare Maintenance Fee Non Converted") + SUM(AAG."Other Revenue Non Converted")
  const otherRev = 226_000 * f;
  // TODO USD:   SUM(AAG."Departmental Expenses")
  // TODO Local: SUM(AAG."Departmental Expenses Non Converted")
  const deptExp = 768_000 * f;
  // TODO USD:   SUM(AAG."Undistributed Expenses")
  // TODO Local: SUM(AAG."Undistributed Expenses Non Converted")
  const undExp = 730_000 * f;
  // TODO USD:   SUM(AAG."Non Operating")
  // TODO Local: SUM(AAG."Non Operating Non Converted")
  const fees = 61_000 * f;
  // TODO USD:   SUM(AAG."Other Expenses")
  // TODO Local: SUM(AAG."Other Expenses Non Converted")
  const othExp = 179_000 * f;

  const totalRev     = roomsRev + otherRev;
  const totalOpex    = deptExp + undExp;
  const gop          = totalRev - totalOpex;
  const totalNonOpex = fees + othExp;
  const ebitda       = gop - totalNonOpex;

  const maxVal = Math.max(totalRev, Math.abs(gop), Math.abs(ebitda));
  const scale  = plotH / (maxVal * 1.08);

  const yRevTop    = baseY - totalRev * scale;
  const yGopTop    = baseY - Math.abs(gop) * scale;
  const yEbitdaTop = baseY - Math.abs(ebitda) * scale;

  const otherRevH = otherRev * scale;
  const roomsRevH = roomsRev * scale;
  const undH      = undExp   * scale;
  const deptH     = deptExp  * scale;
  const gopH      = Math.abs(gop)    * scale;
  const othExpH   = othExp   * scale;
  const feesH     = fees     * scale;
  const ebitdaH   = Math.abs(ebitda) * scale;

  const headerVal = metric === "USD"
    ? `$${Math.round(ebitda).toLocaleString("en-US")} USD`
    : `$${Math.round(ebitda).toLocaleString("en-US")}`;

  const xAxisLabels = ["Total Rev$", "Total Opex$", "GOP$", "Total Non Opex$", "EBITDA$"];

  return (
    <div className="bg-white rounded-xl border flex flex-col h-full" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>EBITDA Bridge</span>
        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{headerVal}</span>
      </div>
      <div className="flex-1 min-h-0" style={{ padding: "6px 10px 10px" }}>
        <svg viewBox={`0 0 ${W} 666`} width="100%" height="100%" style={{ display: "block" }}>
          <defs>
            <clipPath id="eb-c0a"><rect x={barX(0)} y={yRevTop}             width={BAR_W} height={otherRevH} /></clipPath>
            <clipPath id="eb-c0b"><rect x={barX(0)} y={yRevTop + otherRevH} width={BAR_W} height={roomsRevH} /></clipPath>
            <clipPath id="eb-c1a"><rect x={barX(1)} y={yRevTop}             width={BAR_W} height={undH}      /></clipPath>
            <clipPath id="eb-c1b"><rect x={barX(1)} y={yRevTop + undH}      width={BAR_W} height={deptH}     /></clipPath>
            <clipPath id="eb-c2" ><rect x={barX(2)} y={yGopTop}             width={BAR_W} height={gopH}      /></clipPath>
            <clipPath id="eb-c3a"><rect x={barX(3)} y={yGopTop}             width={BAR_W} height={othExpH}   /></clipPath>
            <clipPath id="eb-c3b"><rect x={barX(3)} y={yGopTop + othExpH}   width={BAR_W} height={feesH}     /></clipPath>
            <clipPath id="eb-c4" ><rect x={barX(4)} y={yEbitdaTop}          width={BAR_W} height={ebitdaH}   /></clipPath>
          </defs>

          {/* Baseline */}
          <line x1={mL} y1={baseY} x2={W - mR} y2={baseY} stroke="#ccc" strokeWidth={1.5} />

          {/* Col 0 — Total Rev$ */}
          <rect x={barX(0)} y={yRevTop}             width={BAR_W} height={otherRevH} fill="#69D9D0" />
          <rect x={barX(0)} y={yRevTop + otherRevH} width={BAR_W} height={roomsRevH} fill="#00AFAD" />
          <SegmentLabel cx={colCx(0)} segY={yRevTop}             segH={otherRevH} name="Other Rev:" val={otherRev} clipId="eb-c0a" />
          <SegmentLabel cx={colCx(0)} segY={yRevTop + otherRevH} segH={roomsRevH} name="Rooms Rev:" val={roomsRev} clipId="eb-c0b" />
          <text x={colCx(0)} y={yRevTop - 12} textAnchor="middle" fontSize={34} fontWeight={700} fill="#172951">
            {fmtFull(totalRev)}
          </text>

          {/* Col 1 — Total Opex$ (waterfall floats from yRevTop down to yGopTop) */}
          <rect x={barX(1)} y={yRevTop}       width={BAR_W} height={undH}  fill="rgba(239,68,68,0.40)" />
          <rect x={barX(1)} y={yRevTop + undH} width={BAR_W} height={deptH} fill="#EF4444" />
          <SegmentLabel cx={colCx(1)} segY={yRevTop}       segH={undH}  name="Und Exp:"  val={undExp}  clipId="eb-c1a" />
          <SegmentLabel cx={colCx(1)} segY={yRevTop + undH} segH={deptH} name="Dept Exp:" val={deptExp} clipId="eb-c1b" />
          <text x={colCx(1)} y={yGopTop + 38} textAnchor="middle" fontSize={34} fontWeight={700} fill="#172951">
            {fmtFull(totalOpex, true)}
          </text>

          {/* Col 2 — GOP$ */}
          <rect x={barX(2)} y={yGopTop} width={BAR_W} height={gopH} fill={gop >= 0 ? "#00AFAD" : "#EF4444"} />
          <text x={colCx(2)} y={yGopTop - 12} textAnchor="middle" fontSize={34} fontWeight={700} fill="#172951">
            {fmtFull(gop)}
          </text>

          {/* Col 3 — Total Non Opex$ (waterfall floats from yGopTop down to yEbitdaTop) */}
          <rect x={barX(3)} y={yGopTop}           width={BAR_W} height={othExpH} fill="rgba(239,68,68,0.40)" />
          <rect x={barX(3)} y={yGopTop + othExpH}  width={BAR_W} height={feesH}   fill="#EF4444" />
          <SegmentLabel cx={colCx(3)} segY={yGopTop}           segH={othExpH} name="Oth Exp:" val={othExp} clipId="eb-c3a" />
          <SegmentLabel cx={colCx(3)} segY={yGopTop + othExpH} segH={feesH}   name="Fees:"    val={fees}   clipId="eb-c3b" />
          <text
            x={colCx(3)}
            y={yGopTop > 80 ? yGopTop - 12 : yEbitdaTop + 38}
            textAnchor="middle"
            fontSize={34}
            fontWeight={700}
            fill="#172951"
          >
            {fmtFull(totalNonOpex, true)}
          </text>

          {/* Col 4 — EBITDA$ */}
          <rect x={barX(4)} y={yEbitdaTop} width={BAR_W} height={ebitdaH} fill={ebitda >= 0 ? "#00AFAD" : "#EF4444"} />
          <text x={colCx(4)} y={yEbitdaTop - 12} textAnchor="middle" fontSize={34} fontWeight={700} fill="#172951">
            {fmtFull(ebitda)}
          </text>

          {/* X-axis labels */}
          {xAxisLabels.map((lbl, i) => (
            <text key={lbl} x={colCx(i)} y={axisY} textAnchor="middle" fontSize={32} fontWeight={700} fill="#172951">
              {lbl}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
