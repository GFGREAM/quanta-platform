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

// Evaluated once at module load. Both views anchor today's position in the
// Gantt/timeline visualizations off these two — keep them here so the two
// views can't drift.
export const TODAY = new Date();
export const CURRENT_MONTH = TODAY.getMonth();

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const AREAS = ['Marketing', 'Operations', 'Maintenance', 'Technology', 'Revenue', 'HR', 'F&B', 'Sales', 'PR / Communications', 'Other'];
export const STATUS_LIST: Status[] = ['Pending', 'In progress', 'Completed', 'On hold', 'Cancelled'];
export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

export const SEED_ACTIONS: Action[] = [
  {
    id: 2, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 2, subProjectId: 1,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Activación Paquete Hotel + Auto',
    contextDescription: 'Implementación de paquete con renta de auto para incrementar ticket promedio y conversión',
    owner: 'Andres Llatas', status: 'Completed',
    startDate: '2026-01-01', endDate: '2026-04-10',
    investmentUsd: 0, expectedReturnUsd: 128000, roiPct: null,
    startMonth: 1, endMonth: 4, durationDays: 99,
    priority: 'Medium', kpiMetric: 'Revenue Packages', notes: 'Replicación de paquete previo exitoso',
  },
  {
    id: 3, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 2, subProjectId: 2,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Activación Paquete Transportation',
    contextDescription: 'Desarrollo de paquete con transporte aeropuerto-hotel para capturar ingresos adicionales y mejorar experiencia',
    owner: 'Andres Llatas / Erica Moreno', status: 'Pending',
    startDate: '2026-01-01', endDate: '2026-12-31',
    investmentUsd: 20000, expectedReturnUsd: 447700, roiPct: 2139,
    startMonth: 1, endMonth: null, durationDays: null,
    priority: 'High', kpiMetric: 'Revenue Retail', notes: 'Benchmark vs GFALC y HRH (MLOS4)',
  },
  {
    id: 4, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 2, subProjectId: 3,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Activación Paquete SPA Wellness',
    contextDescription: 'Activación de paquete con tratamiento SPA para incentivar consumo en Cactus SPA',
    owner: 'Andres Llatas / SPA', status: 'Completed',
    startDate: '2026-01-01', endDate: '2026-01-05',
    investmentUsd: 0, expectedReturnUsd: 20000, roiPct: null,
    startMonth: 1, endMonth: 1, durationDays: 4,
    priority: 'Medium', kpiMetric: 'Revenue Packages', notes: 'Nuevo producto enfocado a upselling',
  },
  {
    id: 5, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 2, subProjectId: 4,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Activación Paquete "Descubre Los Cabos"',
    contextDescription: 'Desarrollo de paquete con experiencias en destino; en pausa hasta definir modelo operativo y comercial',
    owner: 'Hotel Team / Wild Canyon', status: 'On hold',
    startDate: '2026-01-01', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 128000, roiPct: null,
    startMonth: 1, endMonth: null, durationDays: null,
    priority: 'High', kpiMetric: 'Revenue Packages', notes: 'Pendiente definición comercial',
  },
  {
    id: 6, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 2, subProjectId: 5,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Ajuste estrategia AAA + AAA Hot Deals',
    contextDescription: 'Optimización de descuentos AAA para estimular demanda en periodos de baja ocupación',
    owner: 'Andres Llatas', status: 'Completed',
    startDate: '2026-03-04', endDate: '2026-03-18',
    investmentUsd: 0, expectedReturnUsd: 300000, roiPct: null,
    startMonth: 3, endMonth: 3, durationDays: 14,
    priority: 'Medium', kpiMetric: 'Incremento demanda AAA', notes: '—',
  },
  {
    id: 7, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 2, subProjectId: 6,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Ajuste estrategia Explore + Explore Friends',
    contextDescription: 'Ajuste de descuentos y ampliación de inventario para aumentar penetración Bonvoy y demanda en ventanas cortas',
    owner: 'Andres Llatas', status: 'Completed',
    startDate: '2026-04-01', endDate: '2026-04-08',
    investmentUsd: 0, expectedReturnUsd: 190000, roiPct: null,
    startMonth: 4, endMonth: 4, durationDays: 7,
    priority: 'Medium', kpiMetric: 'Demanda Associate / Bonvoy', notes: 'Coordinación con Marketing Marriott',
  },
  {
    id: 8, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 3, subProjectId: 1,
    project: 'Wholesaler', area: 'Revenue',
    actionTitle: 'Conexión nuevas cuentas Wholesalers',
    contextDescription: 'Apertura y conexión de nuevas cuentas vía Dingus y Omnibees para incrementar producción',
    owner: 'Llatas / Burgos / Rosales', status: 'In progress',
    startDate: '2026-01-01', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 875000, roiPct: null,
    startMonth: 1, endMonth: null, durationDays: null,
    priority: 'High', kpiMetric: 'Demanda Wholesalers', notes: '11 cuentas conectadas',
  },
  {
    id: 9, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 4, subProjectId: 1,
    project: 'Flash Sale', area: 'Revenue',
    actionTitle: 'Campaña semanal Flash Sale',
    contextDescription: 'Ejecución de campañas tácticas para desplazar inventario en ventanas de necesidad',
    owner: 'Llatas / Burgos', status: 'Completed',
    startDate: '2026-04-08', endDate: '2026-04-15',
    investmentUsd: 0, expectedReturnUsd: 40000, roiPct: null,
    startMonth: 4, endMonth: 4, durationDays: 7,
    priority: 'High', kpiMetric: 'Revenue Retail', notes: '+$84K USD generados',
  },
  {
    id: 10, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 2, subProjectId: 7,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Campaña Travel Zoo',
    contextDescription: 'Activación de campaña para generar demanda en ventanas de corto plazo',
    owner: 'Edward Burgos', status: 'Completed',
    startDate: '2026-03-17', endDate: '2026-04-17',
    investmentUsd: 0, expectedReturnUsd: 40000, roiPct: null,
    startMonth: 3, endMonth: 4, durationDays: 31,
    priority: 'Medium', kpiMetric: 'Revenue Discount', notes: '+$79K USD generados',
  },
  {
    id: 11, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 5, subProjectId: 1,
    project: 'Travel Curious', area: 'Marketing',
    actionTitle: 'Lanzamiento NPRs Marriott.com',
    contextDescription: 'Desarrollo de contenido y assets para Marriott.com enfocado en ingresos no paquete',
    owner: 'Erica Moreno', status: 'In progress',
    startDate: '2026-03-16', endDate: '2026-04-17',
    investmentUsd: 5387, expectedReturnUsd: 0, roiPct: -100,
    startMonth: 3, endMonth: 4, durationDays: 32,
    priority: 'High', kpiMetric: 'Ingreso No paquete', notes: 'Pendiente material fotográfico',
  },
  {
    id: 12, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 6, subProjectId: 1,
    project: 'PR Strategy', area: 'Marketing',
    actionTitle: 'Estrategia PR & Contenido',
    contextDescription: 'Definición de narrativa, segmentos y necesidades de demanda para estrategia de RP',
    owner: 'Erica Moreno', status: 'In progress',
    startDate: '2026-04-13', endDate: '2026-04-17',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 4, durationDays: 4,
    priority: 'High', kpiMetric: 'Brand Awareness', notes: 'En coordinación con agencia',
  },
  {
    id: 13, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 7, subProjectId: 1,
    project: 'Bodas', area: 'Sales',
    actionTitle: 'Incremento leads bodas',
    contextDescription: 'Estrategia para incrementar exposición y conversión en segmento bodas',
    owner: 'Moreno / Cortez', status: 'In progress',
    startDate: '2026-04-13', endDate: '2026-04-24',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 4, durationDays: 11,
    priority: 'High', kpiMetric: 'Producción', notes: 'Ajuste post transición EP → AI',
  },
  {
    id: 14, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 8, subProjectId: 1,
    project: 'Luminous', area: 'Sales',
    actionTitle: 'Incremento producción Luminous',
    contextDescription: 'Activación de canal premium de agencias para capturar demanda de mayor valor',
    owner: 'Moreno / Rosales', status: 'In progress',
    startDate: '2026-04-06', endDate: '2026-04-24',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 4, durationDays: 18,
    priority: 'High', kpiMetric: 'Producción', notes: 'En espera de definición con Marriott',
  },
  {
    id: 15, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: null, subProjectId: null,
    project: 'Centros de Consumo', area: 'F&B',
    actionTitle: 'Mejora experiencia comensal',
    contextDescription: 'Optimización de servicio, reducción de tiempos de espera y mejora en gestión de reservas',
    owner: 'Avila / Olachea', status: 'In progress',
    startDate: '2026-04-01', endDate: '2026-06-30',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 90,
    priority: 'High', kpiMetric: 'Satisfacción huésped', notes: 'Enfoque en eficiencia operativa',
  },
  {
    id: 16, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 9, subProjectId: 1,
    project: 'Spa', area: 'Operations',
    actionTitle: 'Mejora experiencia SPA',
    contextDescription: 'Refuerzo de protocolos de servicio y personalización para aumentar satisfacción y ventas adicionales',
    owner: 'Castañeda / De la Mora', status: 'In progress',
    startDate: '2026-04-01', endDate: '2026-06-30',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 90,
    priority: 'Medium', kpiMetric: 'Satisfacción', notes: 'Enfoque en upselling',
  },
  {
    id: 17, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 10, subProjectId: 1,
    project: 'Habitaciones', area: 'Operations',
    actionTitle: 'Mejora limpieza habitaciones',
    contextDescription: 'Programa de capacitación continua en estándares de limpieza y servicio',
    owner: 'Castañeda / Rojas', status: 'Pending',
    startDate: '2026-05-01', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 5, endMonth: 12, durationDays: 244,
    priority: 'Medium', kpiMetric: 'Satisfacción', notes: 'Inicio en mayo',
  },
  {
    id: 18, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 11, subProjectId: 1,
    project: 'Fitness Center', area: 'Operations',
    actionTitle: 'Mejora experiencia gimnasio',
    contextDescription: 'Capacitación de personal y mantenimiento preventivo de equipos',
    owner: 'Castañeda / Mejía', status: 'In progress',
    startDate: '2026-04-01', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 12, durationDays: 274,
    priority: 'Medium', kpiMetric: 'Satisfacción', notes: '—',
  },
  {
    id: 19, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 557, projectId: 12, subProjectId: 1,
    project: 'Áreas Públicas', area: 'Operations',
    actionTitle: 'Mejora áreas públicas',
    contextDescription: 'Refuerzo de limpieza profunda y optimización de turnos para mejorar percepción del huésped',
    owner: 'Castañeda / Pimienta', status: 'In progress',
    startDate: '2026-04-01', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 12, durationDays: 274,
    priority: 'Medium', kpiMetric: 'Satisfacción', notes: 'Enfoque en áreas de alto tráfico',
  },
  {
    id: 20, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 1, subProjectId: 1,
    project: 'Guest view urgent actions', area: 'Operations',
    actionTitle: 'Guest view urgent actions',
    contextDescription: 'Uniforms',
    owner: 'GM + RH + Head Dept', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'High', kpiMetric: '', notes: 'Budget · Priority should be given to A&B and FOH',
  },
  {
    id: 21, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 2, subProjectId: 1,
    project: 'Corrective maintenance', area: 'Operations',
    actionTitle: 'Guest-facing urgent maintenance actions',
    contextDescription: 'Guest-facing urgent maintenance actions',
    owner: 'GM + Maintenance Director', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'High', kpiMetric: '', notes: 'Maintenance budget · Review PDF',
  },
  {
    id: 22, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 2, subProjectId: 2,
    project: 'Corrective maintenance', area: 'Operations',
    actionTitle: 'Landscaping areas',
    contextDescription: 'Guest-facing urgent maintenance actions',
    owner: 'Maintenance Director', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'Medium', kpiMetric: '', notes: 'Landscape budget · Review PDF',
  },
  {
    id: 23, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 3, subProjectId: 1,
    project: 'Staff training', area: 'Operations',
    actionTitle: 'Strengthen operational discipline (OJT)',
    contextDescription: 'On-floor supervision, reinforced through structured OJT and service standards review',
    owner: 'GM + Head Departments + Training Mng', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'High', kpiMetric: '', notes: 'Operations · Front Desk, F&B, Bell Boys, Housekeeping',
  },
  {
    id: 24, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 4, subProjectId: 1,
    project: 'F&B Strategy', area: 'F&B',
    actionTitle: 'F&B Enhancements',
    contextDescription: 'Implement low-cost F&B initiatives to enhance guest experience',
    owner: 'GM + F&B', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-06-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 61,
    priority: 'High', kpiMetric: '', notes: 'Operations · F&B + Echeff to present plan by outlet',
  },
  {
    id: 25, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 4, subProjectId: 2,
    project: 'F&B Strategy', area: 'F&B',
    actionTitle: 'F&B Enhancements',
    contextDescription: 'Optimize ambiance (lighting, music, decor)',
    owner: 'GM + F&B', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-06-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 61,
    priority: 'High', kpiMetric: '', notes: 'Operations · F&B + Echeff to present plan by outlet',
  },
  {
    id: 26, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 4, subProjectId: 3,
    project: 'F&B Strategy', area: 'F&B',
    actionTitle: 'F&B Enhancements',
    contextDescription: 'Improve outlet layout and flow',
    owner: 'GM + F&B', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-06-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 61,
    priority: 'High', kpiMetric: '', notes: 'Operations · F&B + Echeff to present plan by outlet',
  },
  {
    id: 27, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 5, subProjectId: 1,
    project: 'Service Culture', area: 'HR',
    actionTitle: 'Structured OJT',
    contextDescription: 'Strengthen service delivery',
    owner: 'GM + RH + Head Dept', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'High', kpiMetric: '', notes: 'Operations + Training Mnge · All front of the house associates',
  },
  {
    id: 28, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 4, subProjectId: 4,
    project: 'F&B Strategy', area: 'Other',
    actionTitle: 'Cross departamental F&B promotion',
    contextDescription: 'Boost internal promotion and capture demand',
    owner: 'GM + Head Departments', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'High', kpiMetric: '', notes: 'Operations · Internal MRK strategy + staff training',
  },
  {
    id: 29, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 6, subProjectId: 1,
    project: 'Staffing', area: 'HR',
    actionTitle: 'Staffing Ratios by occupancy',
    contextDescription: 'Align staffing strategy with demand',
    owner: 'GM + RH', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'High', kpiMetric: '', notes: 'Operation + HR · HR to follow-up with GM and Finance',
  },
  {
    id: 30, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 4, subProjectId: 5,
    project: 'F&B Strategy', area: 'F&B',
    actionTitle: 'Menu & offerings strategy',
    contextDescription: 'Optimize F&B through menu engineering',
    owner: 'GM + F&B Director + Echeff', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-06-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 61,
    priority: 'Medium', kpiMetric: '', notes: 'F&B · F&B + Echeff to present plan by outlet',
  },
  {
    id: 31, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 7, subProjectId: 1,
    project: 'HR', area: 'HR',
    actionTitle: 'Brand & service standards',
    contextDescription: 'Implement Waldorf Astoria online training programs in Spanish & English',
    owner: 'GM + RH + F&B', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'High', kpiMetric: '', notes: 'HR + Training Mngr · HR to follow-up with GM',
  },
  {
    id: 32, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 8, subProjectId: 1,
    project: 'Beach Experience', area: 'Operations',
    actionTitle: 'Beach Experience',
    contextDescription: 'Develop and implement beach experience',
    owner: 'GM', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-06-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 61,
    priority: 'High', kpiMetric: '', notes: 'GM + Team · Create or refine beach experience',
  },
  {
    id: 33, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 9, subProjectId: 1,
    project: 'Forbes certification', area: 'Operations',
    actionTitle: 'Forbes training',
    contextDescription: 'Reschedule Forbes standards training (pending new GM decision)',
    owner: 'GM + HR', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 36000, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'Medium', kpiMetric: '', notes: 'GM · Funds reserved 36K planned for May',
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
