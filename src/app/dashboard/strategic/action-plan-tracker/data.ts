/**
 * Types aligned with Postgres table `registro_acciones`.
 * Convention: camelCase in TS / snake_case in SQL — mapping at API layer.
 */

export type Status = 'Pending' | 'In progress' | 'Completed' | 'On hold' | 'Cancelled';
export type Priority = 'High' | 'Medium' | 'Low';

export interface Action {
  id: number;
  hotelProperty: string;           // hotel_propiedad
  hotelId: number | null;          // hotel_id
  projectId: number | null;        // id_proyecto
  subProjectId: number | null;     // sub_id_proyecto
  project: string;                 // proyecto
  area: string;                    // area
  actionTitle: string;             // titulo_accion
  contextDescription: string;      // descripcion_contexto
  owner: string;                   // responsable
  status: Status;                  // estatus
  startDate: string;               // fecha_inicio (YYYY-MM-DD)
  endDate: string;                 // fecha_fin (YYYY-MM-DD)
  investmentUsd: number;           // inversion_usd
  expectedReturnUsd: number;       // retorno_esperado_usd
  roiPct: number | null;           // roi_pct (precomputed in DB)
  startMonth: number | null;       // mes_inicio (1-12)
  endMonth: number | null;         // mes_fin (1-12)
  durationDays: number | null;     // duracion_dias
  priority: Priority;              // prioridad
  kpiMetric: string;               // kpi_metrica
  notes: string;                   // notas_comentarios
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

export const STATUS_COLORS: Record<Status, string> = {
  'Completed': '#10B981',
  'In progress': '#00AFAD',
  'Pending': '#F59E0B',
  'On hold': '#9CA3AF',
  'Cancelled': '#EF4444',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  'High': '#EF4444',
  'Medium': '#F59E0B',
  'Low': '#10B981',
};

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const AREAS = ['Marketing', 'Operations', 'Maintenance', 'Technology', 'Revenue', 'HR', 'F&B', 'Sales', 'PR / Communications', 'Other'];
export const STATUS_LIST: Status[] = ['Pending', 'In progress', 'Completed', 'On hold', 'Cancelled'];
export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

export const SEED_ACTIONS: Action[] = [
  {
    id: 1, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 1, subProjectId: 1,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Activacion Paquete Hotel + Auto',
    contextDescription: 'Creacion de paquete con inclusion de renta de coche con TenCar Rental',
    owner: 'Andres Llatas', status: 'Completed',
    startDate: '2026-01-01', endDate: '2026-04-10',
    investmentUsd: 20000, expectedReturnUsd: 1253700, roiPct: 6169,
    startMonth: 1, endMonth: 4, durationDays: 99,
    priority: 'Medium', kpiMetric: 'Revenue generado Packages estimado (10%)', notes: 'Replicando paquete creado previo a conversion',
  },
  {
    id: 2, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 1, subProjectId: 2,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Activacion Paquete Transportation',
    contextDescription: 'Creacion de paquete con inclusion de Transporte i/v Aeropuerto',
    owner: 'Andres Llatas / Erica Moreno', status: 'Pending',
    startDate: '2026-01-01', endDate: '2026-12-31',
    investmentUsd: 20000, expectedReturnUsd: 447700, roiPct: 2139,
    startMonth: 1, endMonth: null, durationDays: null,
    priority: 'High', kpiMetric: 'Revenue generado Retail estimado (10%)', notes: 'Replicando paquete que ofrece GFALC y HRH. Equals to Retail con MLOS4',
  },
  {
    id: 3, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 1, subProjectId: 3,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Activacion Paquete SPA Wellness',
    contextDescription: 'Creacion de paquete con inclusion de tratamiento "Sprit Nurturing" de 80-min en Cactus SPA por persona',
    owner: 'Andres Llatas / SPA', status: 'Completed',
    startDate: '2026-01-01', endDate: '2026-01-05',
    investmentUsd: 0, expectedReturnUsd: 20000, roiPct: null,
    startMonth: 1, endMonth: 1, durationDays: 4,
    priority: 'Medium', kpiMetric: 'Revenue generado Packages estimado (1%)', notes: 'Nuevo paquete para incentivar tratamientos en SPA',
  },
  {
    id: 4, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 1, subProjectId: 4,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Activacion Paquete "Descubre Los Cabos"',
    contextDescription: 'Creacion de paquete con inclusion de 2 actividades con Wild Canyon',
    owner: 'Andres Llatas / Hotel Team / Wild Canyon', status: 'On hold',
    startDate: '2026-01-01', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 128000, roiPct: null,
    startMonth: 1, endMonth: null, durationDays: null,
    priority: 'High', kpiMetric: 'Revenue generado Packages estimado (10%)', notes: 'Nuevo paquete para incentivar actividades en destino. Se pone en pausa hasta lograr acuerdo de como se manejaria la venta y operacion del paquete',
  },
  {
    id: 5, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 1, subProjectId: 5,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Ajuste estrategia AAA + AAA Hot Deals',
    contextDescription: 'Revision de descuentos aplicables a AAA y AAA Hot Deals para fechas de baja demanda',
    owner: 'Andres Llatas', status: 'Completed',
    startDate: '2026-03-04', endDate: '2026-03-18',
    investmentUsd: 0, expectedReturnUsd: 300000, roiPct: null,
    startMonth: 3, endMonth: 3, durationDays: 14,
    priority: 'Medium', kpiMetric: 'Incremento en demanda AAA', notes: '',
  },
  {
    id: 6, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 1, subProjectId: 6,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Ajuste estrategia Explore + Explore Friends',
    contextDescription: 'Revision de descuentos aplicables a Explore Friends para fechas de baja demanda con Marketing en Ofic Marriott CDMX. Aumento Allotment permitido para Explore proximos 90 dias',
    owner: 'Andres Llatas', status: 'Completed',
    startDate: '2026-04-01', endDate: '2026-04-08',
    investmentUsd: 0, expectedReturnUsd: 190000, roiPct: null,
    startMonth: 4, endMonth: 4, durationDays: 7,
    priority: 'Medium', kpiMetric: 'Incremento en demanda Associate Leisure y Discounts. Aumento de Bonvoy penetration', notes: '',
  },
  {
    id: 7, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 1, subProjectId: 7,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Campana Travel Zoo',
    contextDescription: 'Activacion de campana por Travel Zoo para incentivar fechas de necesidad',
    owner: 'Edward Burgos', status: 'Completed',
    startDate: '2026-03-17', endDate: '2026-04-17',
    investmentUsd: 0, expectedReturnUsd: 40000, roiPct: null,
    startMonth: 3, endMonth: 4, durationDays: 31,
    priority: 'Medium', kpiMetric: 'Incremento en ingreso Discount', notes: 'Travel Zoo ha sido ayuda en fechas de necesidad para los proximos 90-120 dias. Revenue Generado hasta hoy = $79K USD (241 RNs)',
  },
  {
    id: 8, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 2, subProjectId: 1,
    project: 'Wholesaler', area: 'Revenue',
    actionTitle: 'Conexion nuevas cuentas Wholesalers por Dingus+Omnibees',
    contextDescription: 'Buscar nuevas cuentas con demanda en Los Cabos para conectar via Dingus y Omnibees',
    owner: 'Andres Llatas / Edward Burgos / Diana Rosales', status: 'In progress',
    startDate: '2026-01-01', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 875000, roiPct: null,
    startMonth: 1, endMonth: null, durationDays: null,
    priority: 'High', kpiMetric: 'Incremento en demanda Wholesalers', notes: 'Cuentas en proceso de conexion: TFN. Cuentas conectadas Dingus: 11. Cuentas conectadas Omnibees: pendiente',
  },
  {
    id: 9, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 3, subProjectId: 1,
    project: 'Flash Sale', area: 'Revenue',
    actionTitle: 'Campana Semanal "Flash Sale"',
    contextDescription: 'Activacion "Flash Sale" en canal directo y terceros (OTAs + Wholesaler)',
    owner: 'Andres Llatas / Edward Burgos', status: 'Completed',
    startDate: '2026-04-08', endDate: '2026-04-15',
    investmentUsd: 0, expectedReturnUsd: 40000, roiPct: null,
    startMonth: 4, endMonth: 4, durationDays: 7,
    priority: 'High', kpiMetric: 'Incremento en ingreso Retail', notes: 'Flash Sale ha sido una campana que nos ayuda en fechas de necesidad para los proximos 90 dias. Revenue Generado hasta hoy = $84.2K USD (118 RNs)',
  },
  {
    id: 10, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 4, subProjectId: 1,
    project: 'Travel Curious', area: 'Marketing',
    actionTitle: 'Lanzamiento NPRs Marriott.com/SJDHA',
    contextDescription: 'Lanzamiento de nuevas paginas de resultados en Marriott.com para Hacienda del Mar',
    owner: 'Erica Moreno', status: 'In progress',
    startDate: '2026-03-16', endDate: '2026-04-17',
    investmentUsd: 5387, expectedReturnUsd: 0, roiPct: -100,
    startMonth: 3, endMonth: 4, durationDays: 32,
    priority: 'High', kpiMetric: 'Incremento ingreso No paquete', notes: 'Se mando copy a revision de Direccion General. No se cuenta con fotografias adecuadas por lo que se esta revisando la posibilidad un nuevo photo shooting, mientras tanto, se pudieran usar fotos de stock. Ya se solicito cotizacion de fotografia a fotografo local autorizado por Marriott',
  },
  {
    id: 11, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 5, subProjectId: 1,
    project: 'PR Strategy', area: 'Marketing',
    actionTitle: 'Alineacion next steps, contenido, necesidad demanda',
    contextDescription: 'Enviar informacion sobre contenido, historias, segmentos, necesidad de demanda, etc',
    owner: 'Erica Moreno', status: 'In progress',
    startDate: '2026-04-13', endDate: '2026-04-17',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 4, durationDays: 4,
    priority: 'High', kpiMetric: 'Incremento Brand Awareness', notes: 'Proveer toda la informacion importante del hotel para que la agencia elabore una estrategia de RP que nos apoye a incrementar awareness asi como tambien apoyar en la generacion de ingresos.',
  },
  {
    id: 12, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 6, subProjectId: 1,
    project: 'Incremento leads Bodas', area: 'Sales',
    actionTitle: 'Estrategias incremento generacion de leads de bodas',
    contextDescription: 'Ademas de promociones se necesita incrementar el exposure del hotel en los mercados principales asi como con Wedding Planners locales. Se ha tenido un periodo de ajuste con la conversion de EP a AI pero es importante que la produccion empiece a incrementar.',
    owner: 'Erica Moreno / Ayde Cortez', status: 'In progress',
    startDate: '2026-04-13', endDate: '2026-04-24',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 4, durationDays: 11,
    priority: 'High', kpiMetric: 'Incremento de produccion', notes: '',
  },
  {
    id: 13, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 7, subProjectId: 1,
    project: 'Demand Gen Luminous', area: 'Sales',
    actionTitle: 'Estrategias incremento produccion programa Luminous',
    contextDescription: 'Luminous es el programa enfocado en agentes de viajes que reservan hoteles premium de Marriott. Como reservan tarifas retail o tarifas por arriba de los segmentos como wholesale & special corp, es importante tratar de incrementar la produccion de este canal. Se contacto a la encargada del programa para revisar oportunidades de promociones y mkt para agentes de viajes. Estamos en espera de informacion para establecer siguientes pasos.',
    owner: 'Erica Moreno / Diana Rosales', status: 'In progress',
    startDate: '2026-04-06', endDate: '2026-04-24',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 4, durationDays: 18,
    priority: 'High', kpiMetric: 'Incremento de produccion', notes: '',
  },
];

export const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export const calcRoi = (inv: number, ret: number) => (inv > 0 ? Math.round(((ret - inv) / inv) * 100) : 0);

/** Returns roiPct if precomputed in DB, otherwise calculates it. */
export const getRoi = (a: Action) =>
  a.roiPct !== null && a.roiPct !== undefined ? Math.round(a.roiPct) : calcRoi(a.investmentUsd, a.expectedReturnUsd);

export const monthIdx = (date: string) => new Date(date + 'T00:00:00').getMonth();

export const fmtDate = (str: string) => {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${m}/${d}/${y}`;
};
