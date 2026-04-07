/**
 * Types aligned with Postgres table `registro_acciones`.
 * Convention: camelCase in TS / snake_case in SQL → mapping at API layer.
 */

export type Estatus = 'Pending' | 'In progress' | 'Completed' | 'On hold' | 'Cancelled';
export type Prioridad = 'High' | 'Medium' | 'Low';

export interface Accion {
  id: number;
  hotelPropiedad: string;          // hotel_propiedad
  hotelId: number | null;          // hotel_id
  idProyecto: number | null;       // id_proyecto
  subIdProyecto: number | null;    // sub_id_proyecto
  proyecto: string;                // proyecto
  area: string;                    // area
  tituloAccion: string;            // titulo_accion
  descripcionContexto: string;     // descripcion_contexto
  responsable: string;             // responsable
  estatus: Estatus;                // estatus
  fechaInicio: string;             // fecha_inicio (YYYY-MM-DD)
  fechaFin: string;                // fecha_fin (YYYY-MM-DD)
  inversionUsd: number;            // inversion_usd
  retornoEsperadoUsd: number;      // retorno_esperado_usd
  roiPct: number | null;           // roi_pct (precomputed in DB)
  mesInicio: number | null;        // mes_inicio (1-12)
  mesFin: number | null;           // mes_fin (1-12)
  duracionDias: number | null;     // duracion_dias
  prioridad: Prioridad;            // prioridad
  kpiMetrica: string;              // kpi_metrica
  notasComentarios: string;        // notas_comentarios
}

export const AREA_COLORS: Record<string, string> = {
  'Marketing': '#00AFAD',
  'Operations': '#3B82F6',
  'Maintenance': '#F59E0B',
  'Technology': '#8B5CF6',
  'Revenue': '#10B981',
  'HR': '#EC4899',
  'F&B': '#F97316',
  'Sales': '#172951',
  'PR / Communications': '#14B8A6',
  'Other': '#9CA3AF',
};

export const ESTATUS_COLORS: Record<Estatus, string> = {
  'Completed': '#10B981',
  'In progress': '#00AFAD',
  'Pending': '#F59E0B',
  'On hold': '#9CA3AF',
  'Cancelled': '#EF4444',
};

export const PRIORIDAD_COLORS: Record<Prioridad, string> = {
  'High': '#EF4444',
  'Medium': '#F59E0B',
  'Low': '#10B981',
};

export const MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const AREAS = ['Marketing', 'Operations', 'Maintenance', 'Technology', 'Revenue', 'HR', 'F&B', 'Sales', 'PR / Communications', 'Other'];
export const ESTATUS_LIST: Estatus[] = ['Pending', 'In progress', 'Completed', 'On hold', 'Cancelled'];
export const PRIORIDADES: Prioridad[] = ['High', 'Medium', 'Low'];

export const SEED_ACCIONES: Accion[] = [
  {
    id: 1, hotelPropiedad: 'Hotel Centro', hotelId: 1, idProyecto: 100, subIdProyecto: 1,
    proyecto: 'High Season 2025', area: 'Marketing',
    tituloAccion: 'High season campaign',
    descripcionContexto: 'Digital campaign on social media and email marketing to increase occupancy in high season.',
    responsable: 'Ana Torres', estatus: 'In progress',
    fechaInicio: '2025-03-15', fechaFin: '2025-04-30',
    inversionUsd: 15000, retornoEsperadoUsd: 45000, roiPct: 200,
    mesInicio: 3, mesFin: 4, duracionDias: 46,
    prioridad: 'High', kpiMetrica: 'Occupancy, RevPAR', notasComentarios: 'Coordinate with external agency',
  },
  {
    id: 2, hotelPropiedad: 'Hotel Norte', hotelId: 2, idProyecto: 101, subIdProyecto: 1,
    proyecto: 'Lobby Renovation', area: 'Maintenance',
    tituloAccion: 'Lobby and common areas renovation',
    descripcionContexto: 'Complete lobby remodel to improve NPS and OTA scores.',
    responsable: 'Carlos Ruiz', estatus: 'In progress',
    fechaInicio: '2025-02-01', fechaFin: '2025-05-15',
    inversionUsd: 28000, retornoEsperadoUsd: 50680, roiPct: 81,
    mesInicio: 2, mesFin: 5, duracionDias: 103,
    prioridad: 'High', kpiMetrica: 'NPS, OTA Score', notasComentarios: 'Contractor confirmed',
  },
  {
    id: 3, hotelPropiedad: 'Hotel Sur', hotelId: 3, idProyecto: 102, subIdProyecto: 1,
    proyecto: 'PMS Migration', area: 'Technology',
    tituloAccion: 'Cloud PMS implementation',
    descripcionContexto: 'Migration to the new cloud-based hotel management system.',
    responsable: 'Diego Mora', estatus: 'Pending',
    fechaInicio: '2025-04-01', fechaFin: '2025-06-30',
    inversionUsd: 12000, retornoEsperadoUsd: 18000, roiPct: 50,
    mesInicio: 4, mesFin: 6, duracionDias: 90,
    prioridad: 'Medium', kpiMetrica: 'Check-in time, System errors', notasComentarios: 'Requires team training',
  },
  {
    id: 4, hotelPropiedad: 'Hotel Centro', hotelId: 1, idProyecto: 103, subIdProyecto: 1,
    proyecto: 'Training 2025', area: 'Operations',
    tituloAccion: 'Front desk team training',
    descripcionContexto: 'Customer service training program for the entire front desk team.',
    responsable: 'María López', estatus: 'Completed',
    fechaInicio: '2025-01-03', fechaFin: '2025-02-14',
    inversionUsd: 3200, retornoEsperadoUsd: 9600, roiPct: 200,
    mesInicio: 1, mesFin: 2, duracionDias: 42,
    prioridad: 'Medium', kpiMetrica: 'Guest satisfaction, Complaints', notasComentarios: 'Certificates issued to the team',
  },
  {
    id: 5, hotelPropiedad: 'Hotel Norte', hotelId: 2, idProyecto: 104, subIdProyecto: 1,
    proyecto: 'Preventive Maintenance', area: 'Maintenance',
    tituloAccion: 'A/C preventive maintenance (24 units)',
    descripcionContexto: 'Complete preventive service for all 24 air conditioning units.',
    responsable: 'Luis Pérez', estatus: 'Completed',
    fechaInicio: '2025-01-20', fechaFin: '2025-01-28',
    inversionUsd: 4800, retornoEsperadoUsd: 14400, roiPct: 200,
    mesInicio: 1, mesFin: 1, duracionDias: 8,
    prioridad: 'High', kpiMetrica: 'Equipment failures, Repair cost', notasComentarios: 'Next review Jul-25',
  },
  {
    id: 6, hotelPropiedad: 'Hotel Centro', hotelId: 1, idProyecto: 105, subIdProyecto: 1,
    proyecto: 'Annual Revenue Management', area: 'Revenue',
    tituloAccion: 'Revenue Management — annual consultancy',
    descripcionContexto: 'Specialized revenue management consultancy to optimize rates.',
    responsable: 'Sofía Castro', estatus: 'In progress',
    fechaInicio: '2025-03-01', fechaFin: '2025-12-31',
    inversionUsd: 18000, retornoEsperadoUsd: 54000, roiPct: 200,
    mesInicio: 3, mesFin: 12, duracionDias: 305,
    prioridad: 'High', kpiMetrica: 'RevPAR, ADR, Occupancy', notasComentarios: 'Monthly follow-up meeting',
  },
  // ── Sub-actions (subIdProyecto > 1) ───────────────────────────
  {
    id: 7, hotelPropiedad: 'Hotel Centro', hotelId: 1, idProyecto: 100, subIdProyecto: 2,
    proyecto: 'High Season 2025', area: 'Marketing',
    tituloAccion: 'Campaign creative design',
    descripcionContexto: 'Production of graphic assets and videos for the campaign.',
    responsable: 'Ana Torres', estatus: 'Completed',
    fechaInicio: '2025-03-15', fechaFin: '2025-03-31',
    inversionUsd: 4500, retornoEsperadoUsd: 0, roiPct: 0,
    mesInicio: 3, mesFin: 3, duracionDias: 16,
    prioridad: 'Medium', kpiMetrica: 'Deliverables', notasComentarios: '',
  },
  {
    id: 8, hotelPropiedad: 'Hotel Centro', hotelId: 1, idProyecto: 100, subIdProyecto: 3,
    proyecto: 'High Season 2025', area: 'Marketing',
    tituloAccion: 'Meta + Google paid ads',
    descripcionContexto: 'Investment in paid ads on social media and search engines.',
    responsable: 'Ana Torres', estatus: 'In progress',
    fechaInicio: '2025-04-01', fechaFin: '2025-04-30',
    inversionUsd: 8500, retornoEsperadoUsd: 25000, roiPct: 194,
    mesInicio: 4, mesFin: 4, duracionDias: 30,
    prioridad: 'High', kpiMetrica: 'CTR, CPC, conversions', notasComentarios: '',
  },
  {
    id: 9, hotelPropiedad: 'Hotel Norte', hotelId: 2, idProyecto: 101, subIdProyecto: 2,
    proyecto: 'Lobby Renovation', area: 'Maintenance',
    tituloAccion: 'Furniture and decor purchase',
    descripcionContexto: 'Acquisition of furniture, lamps and art for the new lobby.',
    responsable: 'Carlos Ruiz', estatus: 'In progress',
    fechaInicio: '2025-03-01', fechaFin: '2025-04-15',
    inversionUsd: 12000, retornoEsperadoUsd: 0, roiPct: 0,
    mesInicio: 3, mesFin: 4, duracionDias: 45,
    prioridad: 'High', kpiMetrica: 'Deliverables', notasComentarios: '',
  },
  {
    id: 10, hotelPropiedad: 'Hotel Norte', hotelId: 2, idProyecto: 101, subIdProyecto: 3,
    proyecto: 'Lobby Renovation', area: 'Maintenance',
    tituloAccion: 'Civil works and painting',
    descripcionContexto: 'Civil works, installations and general painting.',
    responsable: 'Carlos Ruiz', estatus: 'Pending',
    fechaInicio: '2025-04-01', fechaFin: '2025-05-15',
    inversionUsd: 16000, retornoEsperadoUsd: 0, roiPct: 0,
    mesInicio: 4, mesFin: 5, duracionDias: 44,
    prioridad: 'High', kpiMetrica: 'Progress %', notasComentarios: '',
  },
];

export const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export const calcRoi = (inv: number, ret: number) => (inv > 0 ? Math.round(((ret - inv) / inv) * 100) : 0);

/** Returns roiPct if precomputed in DB, otherwise calculates it. */
export const getRoi = (a: Accion) =>
  a.roiPct !== null && a.roiPct !== undefined ? Math.round(a.roiPct) : calcRoi(a.inversionUsd, a.retornoEsperadoUsd);

export const mesIdx = (fecha: string) => new Date(fecha + 'T00:00:00').getMonth();

export const fmtDate = (str: string) => {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${m}/${d}/${y}`;
};
