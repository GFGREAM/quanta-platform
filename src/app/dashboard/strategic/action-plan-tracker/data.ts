/**
 * Types aligned with Postgres table `registro_acciones`.
 * Convention: camelCase in TS / snake_case in SQL — mapping at API layer.
 */

export type Status = 'Pending' | 'In progress' | 'Completed' | 'On hold' | 'Cancelled';
export type Priority = 'High' | 'Medium' | 'Low';

// dayOfWeek follows JS getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat.
export type Recurrence =
  | { cadence: 'weekly'; dayOfWeek: number }
  | { cadence: 'biweekly'; dayOfWeek: number }
  | { cadence: 'monthly'; dayOfMonth: number };

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
  recurrence?: Recurrence | null;  // recurrencia (Gantt renders dots instead of a bar when set)
}

export const AREA_COLORS: Record<string, string> = {
  'Marketing': 'var(--accent)',
  'Operations': '#3B82F6',
  'Maintenance': '#F59E0B',
  'Technology': '#8B5CF6',
  'Revenue': 'var(--success)',
  'HR': '#EC4899',
  'F&B': '#F97316',
  'Sales': '#172951',
  'PR / Communications': '#14B8A6',
  'Other': '#9CA3AF',
};

export const STATUS_COLORS: Record<Status, string> = {
  'Completed': 'var(--success)',
  'In progress': 'var(--accent)',
  'Pending': '#F59E0B',
  'On hold': '#9CA3AF',
  'Cancelled': 'var(--danger)',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  'High': 'var(--danger)',
  'Medium': '#F59E0B',
  'Low': 'var(--success)',
};

// Evaluated once at module load. Both views anchor today's position in the
// Gantt/timeline visualizations off these two — keep them here so the two
// views can't drift.
export const TODAY = new Date();
export const CURRENT_MONTH = TODAY.getMonth();

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const STATUS_LIST: Status[] = ['Pending', 'In progress', 'Completed', 'On hold', 'Cancelled'];
export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

// NOTE: Temporary hard-coded snapshot provided by Ops. Replace with a SQL-backed
// fetch once `registro_acciones` is wired up. Dates parsed from the source
// sheet (mixed D/M and M/D formats) using startMonth/endMonth as ground truth.
export const SEED_ACTIONS: Action[] = [
  // ── Waldorf Astoria Costa Rica (hotelId 392) ─────────────────
  {
    id: 1, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 1, subProjectId: 1,
    project: 'Guest view urgent actions', area: 'Operations',
    actionTitle: 'Guest-facing urgent actions',
    contextDescription: 'Implementación de acciones prioritarias visibles al huésped, con enfoque en uniformes y estándares de presentación',
    owner: 'GM + RH + Head Dept', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'High', kpiMetric: '', notes: 'Prioridad en A&B y FOH',
  },
  {
    id: 2, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 2, subProjectId: 1,
    project: 'Corrective maintenance', area: 'Operations',
    actionTitle: 'Guest-facing maintenance',
    contextDescription: 'Ejecución de mantenimiento correctivo en áreas críticas de cara al huésped',
    owner: 'GM + Maintenance Director', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'High', kpiMetric: '', notes: 'Validar contra PDF',
  },
  {
    id: 3, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 2, subProjectId: 2,
    project: 'Corrective maintenance', area: 'Operations',
    actionTitle: 'Landscaping improvements',
    contextDescription: 'Intervención en áreas de jardinería para mejorar la experiencia visual del huésped',
    owner: 'Maintenance Director', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'Medium', kpiMetric: '', notes: 'Validar contra PDF',
  },
  {
    id: 4, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 3, subProjectId: 1,
    project: 'Staff training', area: 'Operations',
    actionTitle: 'Strengthen operational discipline (OJT)',
    contextDescription: 'Refuerzo de disciplina operativa mediante supervisión en piso y ejecución estructurada de OJT',
    owner: 'GM + Head Departments + Training Mng', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'High', kpiMetric: '', notes: 'Enfocado en FO, F&B, Bell y HK',
  },
  {
    id: 5, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 4, subProjectId: 1,
    project: 'F&B Strategy', area: 'F&B',
    actionTitle: 'F&B Enhancements',
    contextDescription: 'Implementación de iniciativas de bajo costo para mejorar experiencia del huésped en F&B',
    owner: 'GM + F&B', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-06-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 61,
    priority: 'High', kpiMetric: '', notes: 'Plan por outlet requerido',
  },
  {
    id: 6, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 4, subProjectId: 2,
    project: 'F&B Strategy', area: 'F&B',
    actionTitle: 'Optimización de ambientación',
    contextDescription: 'Mejora de iluminación, música y decoración para elevar experiencia en puntos de consumo',
    owner: 'GM + F&B', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-06-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 61,
    priority: 'High', kpiMetric: '', notes: 'Plan por outlet requerido',
  },
  {
    id: 7, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 4, subProjectId: 3,
    project: 'F&B Strategy', area: 'F&B',
    actionTitle: 'Optimización layout y flujo',
    contextDescription: 'Rediseño de layout operativo para mejorar flujo y eficiencia en servicio',
    owner: 'GM + F&B', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-06-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 61,
    priority: 'High', kpiMetric: '', notes: 'Plan por outlet requerido',
  },
  {
    id: 8, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 5, subProjectId: 1,
    project: 'Service Culture', area: 'HR',
    actionTitle: 'Structured OJT',
    contextDescription: 'Implementación de programa estructurado de entrenamiento para fortalecer servicio',
    owner: 'GM + RH + Head Dept', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'High', kpiMetric: '', notes: 'Enfocado en FOH',
  },
  {
    id: 9, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 4, subProjectId: 4,
    project: 'F&B Strategy', area: 'Other',
    actionTitle: 'Cross-department F&B promotion',
    contextDescription: 'Impulso de promoción interna para incrementar captura de demanda en F&B',
    owner: 'GM + Head Departments', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'High', kpiMetric: '', notes: 'Requiere alineación comercial interna',
  },
  {
    id: 10, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 6, subProjectId: 1,
    project: 'Staffing', area: 'HR',
    actionTitle: 'Staffing ratios by occupancy',
    contextDescription: 'Alineación de staffing a niveles de ocupación para optimizar eficiencia operativa',
    owner: 'GM + RH', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'High', kpiMetric: '', notes: 'Seguimiento RH con GM y Finanzas',
  },
  {
    id: 11, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 4, subProjectId: 5,
    project: 'F&B Strategy', area: 'F&B',
    actionTitle: 'Menu & offerings strategy',
    contextDescription: 'Optimización de oferta gastronómica mediante menu engineering',
    owner: 'GM + F&B Director + Echeff', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-06-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 61,
    priority: 'Medium', kpiMetric: '', notes: 'Plan por outlet requerido',
  },
  {
    id: 12, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 7, subProjectId: 1,
    project: 'RRHH', area: 'HR',
    actionTitle: 'Brand & service standards',
    contextDescription: 'Implementación de programas de entrenamiento Waldorf Astoria en español e inglés',
    owner: 'GM + RH + F&B', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'High', kpiMetric: '', notes: 'Seguimiento RH',
  },
  {
    id: 13, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 8, subProjectId: 1,
    project: 'Beach Experience', area: 'Operations',
    actionTitle: 'Beach experience enhancement',
    contextDescription: 'Desarrollo y ejecución de experiencia diferenciada en área de playa',
    owner: 'GM', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-06-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 61,
    priority: 'High', kpiMetric: '', notes: 'Definir concepto y ejecución',
  },
  {
    id: 14, hotelProperty: 'Waldorf Astoria Costa Rica', hotelId: 392, projectId: 9, subProjectId: 1,
    project: 'Forbes certification', area: 'Operations',
    actionTitle: 'Forbes training',
    contextDescription: 'Reprogramación de entrenamiento en estándares Forbes, sujeto a decisión del nuevo GM',
    owner: 'GM + HR', status: 'Pending',
    startDate: '2026-04-20', endDate: '2026-05-20',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 30,
    priority: 'Medium', kpiMetric: '', notes: 'Presupuesto $36K reservado para mayo',
  },

  // ── Hacienda del Mar Los Cabos (hotelId 766) ─────────────────
  {
    id: 15, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 10, subProjectId: 1,
    project: 'MKT', area: 'PR / Communications',
    actionTitle: 'Activación de ingresos no paquete en canal directo',
    contextDescription: 'Consolidar la implementación de venta no paquete en canal directo, asegurando correcta integración del tercero y activación comercial para capturar ingresos incrementales pre-arrival.',
    owner: 'Jose Salomon / Hotel Team', status: 'Completed',
    startDate: '2026-01-01', endDate: '2026-02-01',
    investmentUsd: 4500, expectedReturnUsd: 6000, roiPct: 33,
    startMonth: 1, endMonth: 2, durationDays: 31,
    priority: 'High', kpiMetric: 'Incremento en ingreso No paquete',
    notes: 'Replicando casos de éxito en otras propiedades gestionadas por GFG.',
  },
  {
    id: 16, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 11, subProjectId: 1,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Activación Paquete Hotel + Auto',
    contextDescription: 'Creacion de paquete con inclusión de renta de coche con TenCar Rental',
    owner: 'Andres Llatas', status: 'Completed',
    startDate: '2026-01-01', endDate: '2026-04-10',
    investmentUsd: 0, expectedReturnUsd: 128000, roiPct: null,
    startMonth: 1, endMonth: 4, durationDays: 99,
    priority: 'Medium', kpiMetric: 'Revenue generado Packages estimado (10%)',
    notes: 'Replicando paquete creado previo a conversión',
  },
  {
    id: 17, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 11, subProjectId: 2,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Activación Paquete Transportation',
    contextDescription: 'Creacion de paquete con inclusión de Transporte i/v Aeropuerto',
    owner: 'Andres Llatas / Erica Moreno', status: 'Completed',
    startDate: '2026-01-01', endDate: '2026-04-17',
    investmentUsd: 20000, expectedReturnUsd: 447700, roiPct: 2139,
    startMonth: 1, endMonth: 4, durationDays: 106,
    priority: 'High', kpiMetric: 'Revenue generado Retail estimado (10%)',
    notes: 'Replicando paquete que ofrece GFALC y HRH. Equals to Retail con MLOS4',
  },
  {
    id: 18, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 11, subProjectId: 3,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Activación Paquete SPA Wellness',
    contextDescription: 'Creacion de paquete con inclusión de tratamiento "Sprit Nurturing" de 80-min en Cactus SPA por persona',
    owner: 'Andres Llatas / SPA', status: 'Completed',
    startDate: '2026-01-01', endDate: '2026-05-01',
    investmentUsd: 0, expectedReturnUsd: 20000, roiPct: null,
    startMonth: 1, endMonth: 5, durationDays: 120,
    priority: 'Medium', kpiMetric: 'Revenue generado Packages estimado (1%)',
    notes: 'Nuevo paquete para incentivar tratamientos en SPA',
  },
  {
    id: 19, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 11, subProjectId: 4,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Activación Paquete "Descubre Los Cabos"',
    contextDescription: 'Creacion de paquete con inclusión de 2 actividades con Wild Canyon',
    owner: 'Andres Llatas / Hotel Team / Wild Canyon', status: 'On hold',
    startDate: '2026-01-01', endDate: '',
    investmentUsd: 0, expectedReturnUsd: 128000, roiPct: null,
    startMonth: 1, endMonth: null, durationDays: null,
    priority: 'High', kpiMetric: 'Revenue generado Packages estimado (10%)',
    notes: 'Nuevo paquete para incentivar actividades en destino. Se pone en pausa hasta lograr acuerdo de cómo se manejaría la venta y operación del paquete',
  },
  {
    id: 20, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 11, subProjectId: 5,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Ajuste estrategia AAA + AAA Hot Deals',
    contextDescription: 'Revisión de descuentos aplicables a AAA y AAA Hot Deals para fechas de baja demanda',
    owner: 'Andres Llatas', status: 'Completed',
    startDate: '2026-03-04', endDate: '2026-03-18',
    investmentUsd: 0, expectedReturnUsd: 300000, roiPct: null,
    startMonth: 3, endMonth: 3, durationDays: 14,
    priority: 'Medium', kpiMetric: 'Incremento en demanda AAA', notes: '',
  },
  {
    id: 21, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 11, subProjectId: 6,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Ajuste estrategia Explore + Explore Friends',
    contextDescription: 'Revisión de descuentos aplicables a Explore Friends para fechas de baja demanda con Marketing en Ofic Marriott CDMX. Aumento Allotment permitido para Explore próximos 90 días',
    owner: 'Andres Llatas', status: 'Completed',
    startDate: '2026-04-01', endDate: '2026-04-08',
    investmentUsd: 0, expectedReturnUsd: 190000, roiPct: null,
    startMonth: 4, endMonth: 4, durationDays: 7,
    priority: 'Medium',
    kpiMetric: 'Incremento en demanda Associate Leisure y Discounts\nAumento de Bonvoy penetration',
    notes: '',
  },
  {
    id: 22, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 12, subProjectId: 1,
    project: 'Wholesaler', area: 'Revenue',
    actionTitle: 'Conexión nuevas cuentas Wholesalers por Dingus+Omnibees',
    contextDescription: 'Buscar nuevas cuentas con demanda en Los Cabos para conectar via Dingus y Omnibees',
    owner: 'Andres Llatas / Edward Burgos / Diana Rosales', status: 'In progress',
    startDate: '2026-01-01', endDate: '',
    investmentUsd: 0, expectedReturnUsd: 875000, roiPct: null,
    startMonth: 1, endMonth: null, durationDays: null,
    priority: 'High', kpiMetric: 'Incremento en demanda Wholesalers',
    notes: 'Cuentas en proceso de conexión: TFN, Nuitee, Caribeo, Euromundo\nCuentas conectadas Dingus: 8\nCuentas conectadas Omnibees: 13',
  },
  {
    id: 23, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 13, subProjectId: 1,
    project: 'Flash Sale', area: 'Revenue',
    actionTitle: 'Campaña Semanal "Flash Sale"',
    contextDescription: 'Activación "Flash Sale" en canal directo y terceros (OTAs + Wholesaler)',
    owner: 'Andres Llatas / Edward Burgos', status: 'Completed',
    startDate: '2026-04-08', endDate: '2026-04-22',
    investmentUsd: 0, expectedReturnUsd: 180000, roiPct: null,
    startMonth: 4, endMonth: 4, durationDays: 14,
    priority: 'High', kpiMetric: 'Incremento en ingreso Retail',
    notes: 'Flash Sale ha sido una campaña que nos ayuda en fechas de necesidad. La campaña actual tiene un TW hasta 31/10/2026.\nRevenue Generado hasta hoy = $141.7K USD (221 RNs) en canal directo. En OTAs $37.6K USD (72 RNs)',
  },
  {
    id: 24, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 11, subProjectId: 7,
    project: 'Demand Gen', area: 'Revenue',
    actionTitle: 'Campaña Travel Zoo',
    contextDescription: 'Activación de campaña por Travel Zoo para incentivar fechas de necesidad',
    owner: 'Edward Burgos', status: 'Completed',
    startDate: '2026-03-17', endDate: '2026-04-30',
    investmentUsd: 0, expectedReturnUsd: 80000, roiPct: null,
    startMonth: 3, endMonth: 4, durationDays: 44,
    priority: 'Medium', kpiMetric: 'Incremento en ingreso Discount',
    notes: 'Travel Zoo ha sido ayuda en fechas de necesidad para los próximos 90-120 días.\n167 Vouchers vendidos=353 RNTS- Reservado un 80% ; OTB 290 RNTS y REV $72,815',
  },
  {
    id: 25, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 14, subProjectId: 1,
    project: 'Travel Curious', area: 'Marketing',
    actionTitle: 'Lanzamiento NPRs Marriott.com/SJDHA',
    contextDescription: '',
    owner: 'Erica Moreno', status: 'Completed',
    startDate: '2026-03-16', endDate: '2026-04-21',
    investmentUsd: 5387, expectedReturnUsd: 200000, roiPct: 3613,
    startMonth: 3, endMonth: 4, durationDays: 36,
    priority: 'High', kpiMetric: 'Incremento ingreso No paquete',
    notes: 'Se mandó copy a revisión de Dirección General. No se cuenta con fotografías adecuadas por lo que se está revisando la posibilidad de un nuevo photo shooting, mientras tanto, se pudieran usar fotos de stock. Ya se solicitó cotización de fotografía a fotografo local autorizado por Marriott',
  },
  {
    id: 26, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 15, subProjectId: 1,
    project: 'PR Strategy', area: 'Marketing',
    actionTitle: 'Alineación next steps, contenido, necesidad demanda',
    contextDescription: 'Enviar información sobre contenido, historias, segmentos, necesidad de demanda, etc',
    owner: 'Erica Moreno', status: 'Completed',
    startDate: '2026-04-13', endDate: '2026-04-17',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 4, durationDays: 4,
    priority: 'High', kpiMetric: 'Incremento Brand Awardness',
    notes: 'Proveer toda la información importante del hotel para que la agencia elabore una estrategia de RP que nos apoye a incrementar awareness así como también apoyar en la generación de ingresos.',
  },
  {
    id: 27, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 16, subProjectId: 1,
    project: 'Incremento leads Bodas', area: 'Sales',
    actionTitle: 'Establecer estrategias enfocadas en incremento de generación de leads de bodas',
    contextDescription: 'Además de promociones se necesita incrementar el exposure del hotel en los mercados principales así como con Wedding Planners locales. Se ha tenido un periodo de ajuste con la conversión de EP a AI pero es importante que la producción empiece a incrementar.',
    owner: 'Erica Moreno / Ayde Cortez', status: 'In progress',
    startDate: '2026-04-13', endDate: '2026-05-18',
    investmentUsd: 50000, expectedReturnUsd: 250000, roiPct: 400,
    startMonth: 4, endMonth: 5, durationDays: 35,
    priority: 'High', kpiMetric: 'Incremento de producción',
    notes: 'Se cambió fecha de entrega del proyecto debido a la tardanza que estamos teniendo de las plataformas especializadas para que nos envíen sus paquetes de marketing y costos involucrados.',
  },
  {
    id: 28, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 17, subProjectId: 1,
    project: 'Demand Gen Luminous', area: 'Sales',
    actionTitle: 'Establecer estrategias enfocadas en incremento de producción del programa Luminous',
    contextDescription: 'Luminous es el programa enfocado en agentes de viajes que reservan hoteles premium de Marriott. Como reservan tarifas retail o tarifas por arriba de los segmentos como wholesale & special corp, es importante tratar de incrementar la producción de este canal. Se contactó a la encargada del programa para revisar oportunidades de promociones y mkt para agentes de viajes. Estamos en espera de información para establecer siguientes pasos.',
    owner: 'Erica Moreno / Diana Rosales', status: 'In progress',
    startDate: '2026-04-06', endDate: '2026-09-18',
    investmentUsd: 5000, expectedReturnUsd: 50000, roiPct: 900,
    startMonth: 4, endMonth: 9, durationDays: 165,
    priority: 'High', kpiMetric: 'Incremento de producción',
    notes: 'Se cambió fecha de fin porque se estarán haciendo acciones constantemente.',
  },
  {
    id: 29, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 18, subProjectId: 1,
    project: 'Centros de Consumo', area: 'F&B',
    actionTitle: 'Establecer planes de acción para mejorar experiencia de comensal',
    contextDescription: 'Personalizar servicio reforzando uso del nombre del huésped, anticipar, asistir a huéspedes, entre otros.\nDisminuir filas y líneas de espera en pódiums de restaurante mejorando procesos de asignación de mesas.\nAmpliar y mejorar ajustes de reservaciones en Open Table de la mano con nuestro equipo de BOH para eficientar número de comensales por centro de consumo cada determinado lapso de tiempo.',
    owner: 'Rubén Avila / Guadalupe Olachea', status: 'In progress',
    startDate: '2026-04-01', endDate: '2026-06-30',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 90,
    priority: 'High', kpiMetric: 'Mejorar experiencia e indicadores de satisfacción',
    notes: 'Personalizar servicio por medio de reconocimiento de cada cliente llamandole por su nombre y recordando sus gustos, preferencias y restricciones. Ser dinamicos en el servicio para evitar esperas y tiempos de entrega.',
  },
  {
    id: 30, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 19, subProjectId: 1,
    project: 'Spa', area: 'Operations',
    actionTitle: 'Reforzar protocolos de servicio para mejorar experiencia del usuario',
    contextDescription: 'Llamar al cliente por su nombre y usarlo al menos 2 veces en la conversación. Si tiene estatus Marriott Bonvoy agradecerle su fidelidad. A los Socios del Club vacacional reconocerles su fidelidad. En Cabina trabajaremos más allá del protocolo y leer la necesidad del cuerpo y enfocarse, lo cual ayudará en la recomendación del 2do servicio. Al cierre, preguntar por su experiencia, tratar de cerrar venta y si notamos que algo no está al 100% indagar para saber si hay algo más que podamos hacer por el cliente de manera significativa y emocional.',
    owner: 'Jorge Castañeda / Josselyn De La Mora', status: 'In progress',
    startDate: '2026-04-01', endDate: '2026-06-30',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 90,
    priority: 'Medium', kpiMetric: 'Mejorar experiencia e indicadores de satisfacción', notes: '',
  },
  {
    id: 31, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 20, subProjectId: 1,
    project: 'Habitaciones', area: 'Operations',
    actionTitle: 'Mejora integral de limpieza en general de habitaciones',
    contextDescription: 'A partir de la primera semana de mayo, tendremos un supervisor capacitador, reforzando estándares y procedimientos de limpieza, los cuales serán en habitaciones directamente, iniciando por camaristas recientes, hasta llegar a las de mayor antigüedad. Será una capacitación constante todo referente a limpieza, procedimientos, estándares y servicio. Reforzaremos también capacitación de las limpiezas profundas en habitaciones. Se capacitará a surtidores, haciéndoles ver la importancia de su trabajo, en entregas a huéspedes para evitar quejas por entregar tardías a solicitudes.',
    owner: 'Jorge Castañeda / Beatriz Rojas', status: 'Pending',
    startDate: '2026-05-01', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 5, endMonth: 12, durationDays: 244,
    priority: 'Medium', kpiMetric: 'Mejorar experiencia e indicadores de satisfacción', notes: '',
  },
  {
    id: 32, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 21, subProjectId: 1,
    project: 'Fitness Center', area: 'Operations',
    actionTitle: 'Establecer planes de acción para mejorar experiencia de huésped.',
    contextDescription: 'Capacitación de atención al cliente al personal nuevo del GYM y reforzar supervisión y capacitación con los cubreturnos y supervisores. Seguimiento con la contratación de empresa para el mantenimiento preventivo del equipo para no tener fuera de servicio ningún equipo.',
    owner: 'Jorge Castañeda / Alejandro Mejía', status: 'In progress',
    startDate: '2026-04-01', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 12, durationDays: 274,
    priority: 'Medium', kpiMetric: 'Mejorar experiencia e indicadores de satisfacción', notes: '',
  },
  {
    id: 33, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 22, subProjectId: 1,
    project: 'Áreas Públicas', area: 'Operations',
    actionTitle: 'Establecer planes de acción para mejorar experiencia de huésped.',
    contextDescription: 'Se incrementó el número de personal del equipo nocturno para realizar las limpiezas a detalle y profundidad, así como el lavado constante de áreas que no se pueden lavar durante el día por la afluencia de huéspedes. Se implementa un rol de lavado de áreas en general (Albercas, centro de consumo, villas, andadores) para dar mayor continuidad al lavado constante. Se ajustan la operación y las tareas del personal de las 5:00am para enfocarnos en andadores y elevadores limpios antes de los huéspedes empiecen a circular por las áreas.',
    owner: 'Jorge Castañeda / Daniel Pimienta', status: 'In progress',
    startDate: '2026-04-01', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 12, durationDays: 274,
    priority: 'Medium', kpiMetric: 'Mejorar experiencia e indicadores de satisfacción', notes: '',
  },
  {
    id: 34, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 23, subProjectId: 1,
    project: 'Actividad The Mark HDM', area: 'Operations',
    actionTitle: 'Retomar la actividad de The Mark',
    contextDescription: 'Se llevará a Cabo miércoles de cada semana a las 18:00 hrs antes de la fiesta y cena mexicana. La actividad comienza en lobby bar donde se ofrecerá una bebida de bienvenida llamada "make a wish" mientras el equipo de actividades recolecta las tarjetas de los deseos para colocarlos en una caja de madera. Después de que los deseos son recolectados, se invitará a los huéspedes a la plazuela para disfrutar de un ritual de danza del venado con la quema de deseos. Actividad Incluida.',
    owner: 'Alejandro Mejía / Rubén Ávila / Jose Lazcarro / Jorge Castañeda', status: 'In progress',
    startDate: '2026-04-29', endDate: '',
    investmentUsd: 1000, expectedReturnUsd: 0, roiPct: -100,
    startMonth: 4, endMonth: null, durationDays: null,
    priority: 'Medium', kpiMetric: 'Mejorar experiencia y reconocimiento de marca',
    notes: 'Inversión aproximada semanal.',
  },
  {
    id: 35, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 24, subProjectId: 1,
    project: 'Actividad Ritual de Llegada', area: 'Operations',
    actionTitle: 'Establecer ritual que cree un vínculo con el resort desde la llegada del huésped',
    contextDescription: 'Antes de hacer registro en el resort, se invitará a los huéspedes a ser parte de un ritual para dejar huella en haciend del mar. Se elaborará una pared movible donde los huéspedes amarrarán un lazo creando un vínculo especial con la propiedad. Actividad Incluida',
    owner: 'Humberto Mercado / Jorge Castañeda / Bellboys', status: 'Pending',
    startDate: '2026-05-07', endDate: '',
    investmentUsd: 1500, expectedReturnUsd: 0, roiPct: -100,
    startMonth: 5, endMonth: null, durationDays: null,
    priority: 'Medium', kpiMetric: 'Mejorar experiencia y reconocimiento de marca',
    notes: 'Inversión para empezar.',
  },
  {
    id: 36, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 25, subProjectId: 1,
    project: 'Implementar actividad "The Guide & Me"', area: 'Operations',
    actionTitle: 'Incluir caminata guiada de la propiedad, por áreas que resaltan la identidad y riqueza cultural e histórica del resort.',
    contextDescription: 'Se incluirá esta actividad a la agenda de actividades semanales. Se visitarán áreas como la capilla, las fuentes, el santo de cabeza, flora endémica y otros representativos del resort. Actividad incluida.',
    owner: 'Alejandro Mejía / Jorge Castañeda', status: 'Pending',
    startDate: '2026-05-04', endDate: '',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 5, endMonth: null, durationDays: null,
    priority: 'Medium', kpiMetric: 'Mejorar experiencia y reconocimiento de marca', notes: '',
  },
  {
    id: 37, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 26, subProjectId: 1,
    project: 'F&B Hideaway - Experiencia La Cava', area: 'F&B',
    actionTitle: 'Resaltar una experiencia única de F&B',
    contextDescription: 'Se escogió la experiencia en Cava de Santiago por ser el lugar una de las áreas con mas tradición del resort. En la cava se ofrece cena de 6 tiempos con maridaje con opción de dos seatings en mesas de dos personas o una mesa de 6 personas.',
    owner: 'José Lazcarro / Rubén Avila / Jorge Castañeda', status: 'In progress',
    startDate: '2026-04-13', endDate: '',
    investmentUsd: 0, expectedReturnUsd: 40000, roiPct: null,
    startMonth: 4, endMonth: null, durationDays: null,
    priority: 'High', kpiMetric: 'Incremento de Ingreso no paquete', notes: '',
  },
  {
    id: 38, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 27, subProjectId: 1,
    project: 'Optimizacion de Costo de Nómina-Eficiencia Operativa', area: 'Operations',
    actionTitle: 'Implementación de Reforecast mensual de acuerdo a ocupacion, para optimizacion de la nómina, ajustada a la operación.',
    contextDescription: 'Ajustar la plantilla de nómina, asegurando la operación sin afectar sobrecosto, ni el nivel de servicio.',
    owner: 'CE', status: 'In progress',
    startDate: '2026-04-01', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 4, endMonth: 12, durationDays: 274,
    priority: 'High',
    kpiMetric: 'Operar con eficiencia, eliminar sobre pagos (tiempo extra, dobles, turnos, descansos trabajados, cuartos extras), productividad',
    notes: 'Eliminación de sobrepagos (20 abril, 2026 al 30 septiembre, 2026)',
  },
  {
    id: 39, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 27, subProjectId: 2,
    project: 'Optimizacion de Costo de Nómina-Eficiencia Operativa', area: 'Operations',
    actionTitle: 'Programación y ejecucion de vacaciones de acuerdo al plan anual, enfatizando en los meses de baja ocupacion (mayo a septiembre).',
    contextDescription: 'Planificar las vacaciones del staff, alineada a la proyeccion de la baja ocupación, lo que nos permitira reducir la carga operativa, optimizar la productividad y evitar acumulación de las mismas.',
    owner: 'CE', status: 'In progress',
    startDate: '2026-01-01', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 1, endMonth: 12, durationDays: 364,
    priority: 'High', kpiMetric: 'Reducción de pasivo laboral (vacaciones acumuladas)',
    notes: 'Aprovechar los meses de baja ocupación para ejecutar las vacaciones planificadas.',
  },
  {
    id: 40, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 28, subProjectId: 1,
    project: 'Upgrade Minibar Elite Members', area: 'F&B',
    actionTitle: 'Reconocimiento a Elite Members',
    contextDescription: 'Se incluirá un snack y una bebida exclusiva para reconocer a los Elite Members de MB y agradecer su lealtad. Por el momento se están esperando muestras de los productos para decidir.',
    owner: 'Rubén Avila / Miguel Martinez / Jorge Castañeda', status: 'Pending',
    startDate: '2026-06-01', endDate: '',
    investmentUsd: 15, expectedReturnUsd: 0, roiPct: -100,
    startMonth: 6, endMonth: null, durationDays: null,
    priority: 'Medium', kpiMetric: '',
    notes: 'Inversión estimada por cuarto ocupado por Elite Member',
  },
  {
    id: 41, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 29, subProjectId: 1,
    project: 'Coctel Elite Members', area: 'Operations',
    actionTitle: 'Ofrecer coctel exclusivo para Elite Members MB',
    contextDescription: 'Los jueves de cada semana, se ofrecerá coctel con bebidas, canapés y música ambiental. A las 6PM en la terraza de Pitayitas',
    owner: 'Ruben Ávila / José Lazcarro / Alejandro Mejía / Jorge Castañeda', status: 'In progress',
    startDate: '2026-04-30', endDate: '',
    investmentUsd: 300, expectedReturnUsd: 0, roiPct: -100,
    startMonth: 4, endMonth: null, durationDays: null,
    priority: 'Medium', kpiMetric: 'Mejora experiencia e indicadores de satisfacción',
    notes: 'Se llevó a Cabo el primer coctel el 30 de Abril',
  },
  {
    id: 42, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 30, subProjectId: 1,
    project: 'Hospitality Room', area: 'Operations',
    actionTitle: 'Crear un área para mejorar tiempo de espera en llegada y salida de huéspedes',
    contextDescription: 'De acuerdo a los brand standards, este es un servicio para mejorar la experiencia en tiempos de espera o un área de tranquilidad para huéspedes. Se deja como pendiente pues por el momento no se tiene un área adecuada para establecer esta experiencia. Se revisará en un futuro',
    owner: 'Jorge Castañeda', status: 'On hold',
    startDate: '', endDate: '',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: null, endMonth: null, durationDays: null,
    priority: 'Medium', kpiMetric: '', notes: '',
  },
  {
    id: 43, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 31, subProjectId: 1,
    project: 'Demand Gen Mayoreo', area: 'Sales',
    actionTitle: 'Incentivo de Venta a Agentes de Viajes afiliados a Pleasant Holidays',
    contextDescription: 'Por cada 5 cuartos reservados con un mínimo de 4 noches, los agentes recibirán una noche gratis para visitar el hotel en fechas futuras',
    owner: 'Erica Moreno / Diana Rosales', status: 'In progress',
    startDate: '2026-05-01', endDate: '2026-07-31',
    investmentUsd: 0, expectedReturnUsd: 16000, roiPct: null,
    startMonth: 5, endMonth: 7, durationDays: 91,
    priority: 'High', kpiMetric: 'Incremento de Producción de Pleasant Holidays', notes: '',
  },
  {
    id: 44, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 32, subProjectId: 1,
    project: 'Demand Gen EBB ACV', area: 'Sales',
    actionTitle: 'Promoción Early Booking 2026 & 2026 Air Canada Vacations',
    contextDescription: 'Con esta acción se busca incrementar las ventas del mercado canadiense a largo plazo. Aunque Air Canada deja de volar el 30 de Abril, estarán promocionando el invierno.',
    owner: 'Erica Moreno / Diana Rosales', status: 'In progress',
    startDate: '2026-04-22', endDate: '2026-06-28',
    investmentUsd: 0, expectedReturnUsd: 36000, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 67,
    priority: 'High', kpiMetric: 'Incremento de Producción ACV',
    notes: 'Para el retorno se tomó en cuenta una producción de 100 CN por adelantado. Es el primer año que trabajamos con Air Canada por lo que haremos lo posible para incentivar la venta a largo plazo.',
  },
  {
    id: 45, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 33, subProjectId: 1,
    project: 'Demand Gen Agentes de Viajes', area: 'Sales',
    actionTitle: 'Promoción para Agentes Afiliados al programa Luminous',
    contextDescription: 'Se ofrecerá un descuento del 20% por un mínimo de 4 noches reservadas. Clientes recibirán $100 USD resort credit, early check in y late check out y upgrade de categoría sujeto a disponibilidad.',
    owner: 'Erica Moreno / Diana Rosales', status: 'In progress',
    startDate: '2026-04-21', endDate: '2026-08-31',
    investmentUsd: 0, expectedReturnUsd: 25000, roiPct: null,
    startMonth: 4, endMonth: 8, durationDays: 132,
    priority: 'High', kpiMetric: 'Incremento de Producción de Agentes de Viajes',
    notes: '2026 a la fecha se tiene solo una producción del programa de 56 CN. Estamos trabajando para además de promociones, encontrar oportunidades de marketing.',
  },
  {
    id: 46, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 34, subProjectId: 1,
    project: 'Demand Gen & Exposure Agentes de Viajes', area: 'Sales',
    actionTitle: 'Promocion Tarifa especial Agentes de Viajes',
    contextDescription: 'Tarifa especial para Agentes de Viajes interesados en vacacionar en HDM. Esta acción también nos ayuda a que los agentes conozcan la propiedad y la puedan recomendar a sus clientes.',
    owner: 'Erica Moreno / Diana Rosales', status: 'In progress',
    startDate: '2026-04-21', endDate: '2026-08-31',
    investmentUsd: 0, expectedReturnUsd: 10000, roiPct: null,
    startMonth: 4, endMonth: 8, durationDays: 132,
    priority: 'Medium', kpiMetric: 'Incremento Exposure de HDM para Agentes de Viajes', notes: '',
  },
  {
    id: 47, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 35, subProjectId: 1,
    project: 'Demand Gen Grupos', area: 'Sales',
    actionTitle: 'Promoción grupos USA & Canada, Todos los hoteles',
    contextDescription: 'Promoción aplica para todos los hoteles que maneja CALA Market Sales USA & Canada, sin importar si son EP o All Inclusive',
    owner: 'Erica Moreno / Group Sales', status: 'In progress',
    startDate: '2026-04-21', endDate: '2026-06-30',
    investmentUsd: 0, expectedReturnUsd: 75000, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 70,
    priority: 'High', kpiMetric: 'Incremento producción grupos', notes: '',
  },
  {
    id: 48, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 35, subProjectId: 2,
    project: 'Demand Gen Grupos', area: 'Sales',
    actionTitle: 'Promoción grupos USA & Canada, Hoteles Todo Incluido',
    contextDescription: 'Promoción aplica para los hoteles All Inclusive que vende el equipo de CALA Market Sales USA & Canada.',
    owner: 'Erica Moreno / Group Sales', status: 'In progress',
    startDate: '2026-04-21', endDate: '2026-10-31',
    investmentUsd: 0, expectedReturnUsd: 500000, roiPct: null,
    startMonth: 4, endMonth: 10, durationDays: 193,
    priority: 'High', kpiMetric: 'Incremento producción grupos', notes: '',
  },
  {
    id: 49, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 35, subProjectId: 3,
    project: 'Demand Gen Grupos', area: 'Sales',
    actionTitle: 'Promoción grupos Nacionales',
    contextDescription: 'Promoción aplica para grupos con estancia hasta el 31 de Diciembre del 2027. El BW es hasta Junio 30 pero se extenderá si es necesario.',
    owner: 'Erica Moreno / Group Sales', status: 'In progress',
    startDate: '2026-04-22', endDate: '2026-06-30',
    investmentUsd: 0, expectedReturnUsd: 300000, roiPct: null,
    startMonth: 4, endMonth: 6, durationDays: 69,
    priority: 'High', kpiMetric: 'Incremento producción grupos', notes: '',
  },
  {
    id: 50, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 36, subProjectId: 1,
    project: 'Marketing Miembros Costco', area: 'Sales',
    actionTitle: 'Marketing Digital Costco & Costco Travel',
    contextDescription: 'Marketing gratuito en Costco & Costco Travel. Valor de $10K',
    owner: 'Erica Moreno / Diana Rosales', status: 'In progress',
    startDate: '2026-04-20', endDate: '2026-04-26',
    investmentUsd: 0, expectedReturnUsd: 50000, roiPct: null,
    startMonth: 4, endMonth: 4, durationDays: 6,
    priority: 'High', kpiMetric: 'Incremento producción de la cuenta',
    notes: 'Se promocionó $400 USD Instant Savings + $100 Resort Credit.',
  },
  {
    id: 51, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 37, subProjectId: 1,
    project: 'Marketing Agencias Pleasant Holidays', area: 'Sales',
    actionTitle: 'Marketing Digital Costco & Costco Travel',
    contextDescription: 'Marketing gratuito para agentes de viajes afiliados a Pleasant Holidays. Valor $3K.',
    owner: 'Erica Moreno / Diana Rosales', status: 'In progress',
    startDate: '2026-04-20', endDate: '2026-05-10',
    investmentUsd: 0, expectedReturnUsd: 20000, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 20,
    priority: 'High', kpiMetric: 'Incremento producción de la cuenta',
    notes: 'Oferta: 30% de descuento y niños gratis.',
  },
  {
    id: 52, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 38, subProjectId: 1,
    project: 'Marketing Agentes de Viajes USA', area: 'Sales',
    actionTitle: 'Marketing Digital para Agentes de Viajes / VAX',
    contextDescription: 'VAX de ALG, nos ofreció participar en una promoción de Travel Agent Appreciation Month con marketing gratuito. Valor $4K',
    owner: 'Erica Moreno / Diana Rosales', status: 'In progress',
    startDate: '2026-04-19', endDate: '2026-05-30',
    investmentUsd: 0, expectedReturnUsd: 10000, roiPct: null,
    startMonth: 4, endMonth: 5, durationDays: 41,
    priority: 'Medium', kpiMetric: 'Incremento Exposure e Ingrresos de HDM para Agentes de Viajes', notes: '',
  },
  {
    id: 53, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 39, subProjectId: 1,
    project: 'Demand Gen Expedia', area: 'Revenue',
    actionTitle: 'Participación en campaña Hot Sale',
    contextDescription: 'Campaña de Hot Sale llamada The Holiday Getaway. BW Mayo 05 a Junio 01, 2026. BW Mayo 5 a Oct 31, 2026. Descuento mínimo de 20% + 10% de descuento para socios de Expedia',
    owner: 'Edward Burgos / Erica Moreno', status: 'Pending',
    startDate: '2026-05-05', endDate: '2026-06-01',
    investmentUsd: 0, expectedReturnUsd: 80000, roiPct: null,
    startMonth: 5, endMonth: 6, durationDays: 27,
    priority: 'High', kpiMetric: 'Incremento de ingresos para el Verano', notes: '',
  },
  {
    id: 54, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 40, subProjectId: 1,
    project: 'Demand Gen Cuenta Corporativa', area: 'Sales',
    actionTitle: 'Participación en campaña Hot Sale',
    contextDescription: 'Campaña de Hot Sale con BW del 01 de mayo al 30 de Jun, 2026 y TW del 01 de mayo al 30 de Sep, 2026. 25% de descuento, 15% de descuento en Spa, Early Check in y Late Check Out sujeto a disponibilidad.',
    owner: 'Erica Moreno / Diana Rosales', status: 'In progress',
    startDate: '2026-05-01', endDate: '2026-06-30',
    investmentUsd: 0, expectedReturnUsd: 10000, roiPct: null,
    startMonth: 5, endMonth: 6, durationDays: 60,
    priority: 'Medium', kpiMetric: 'Incremento de producción de AMEX', notes: '',
  },
  {
    id: 55, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 41, subProjectId: 1,
    project: 'Hotel Exposure', area: 'PR / Communications',
    actionTitle: 'Campaña Conde Nast Traveler Readers\' Choice Award',
    contextDescription: 'Se terminó el diseño de todos los assets que se estarán usando para la campaña de incremento de votos del award de Conde Nast. Campaña termina el 30 de Junio y el primer esfuerzo se hizo el 01 de Mayo a través de Feed de FB & IG',
    owner: 'Erica Moreno / Fatyma Camacho', status: 'In progress',
    startDate: '2026-05-01', endDate: '2026-06-30',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 5, endMonth: 6, durationDays: 60,
    priority: 'High', kpiMetric: 'Ser elegido en la lista de Best Resorts en Los Cabos', notes: '',
  },
  {
    id: 56, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 38, subProjectId: 2,
    project: 'Marketing Agentes de Viajes USA', area: 'Marketing',
    actionTitle: 'Marketing Digital para Agentes de Viajes / VAX',
    contextDescription: 'Complementando la estrategia de promoción de Appreciation Month de ALG, el hotel fué incluido en emailing y página de promocion de la campaña. Valor $2.5. HDM fué mencionado junto con otros hoteles y cadenas como Fiesta Americana Travelty Collection, Hyatt Hotels & Resorts, Melia Hotels International, Riu Hotels & Resorts, etc.',
    owner: 'Erica Moreno / Diana Rosales / Fatyma Camacho', status: 'Completed',
    startDate: '2026-05-01', endDate: '2026-05-30',
    investmentUsd: 0, expectedReturnUsd: 5000, roiPct: null,
    startMonth: 5, endMonth: 5, durationDays: 29,
    priority: 'Medium', kpiMetric: 'Incremento Exposure e Ingrresos de HDM para Agentes de Viajes', notes: '',
  },
  {
    id: 57, hotelProperty: 'Hacienda del Mar Los Cabos', hotelId: 766, projectId: 42, subProjectId: 1,
    project: 'Demand Gen Marriott.com', area: 'Sales',
    actionTitle: 'Re-activación Promoción Flash Sale',
    contextDescription: '25% de descuento sobre tarifa retail para reservar en Marriott.com. Es la tercera vez que la activamos y nos ayuda a subir tarifa promedio así como incrementar volumen de producción de Marriott.',
    owner: 'Erica Moreno / Andrés Llatas', status: 'Pending',
    startDate: '2026-05-05', endDate: '2026-05-12',
    investmentUsd: 0, expectedReturnUsd: 40000, roiPct: null,
    startMonth: 5, endMonth: 5, durationDays: 7,
    priority: 'High', kpiMetric: 'Incremento de Producción Retail Marriott', notes: '',
  },

  // ── Izla Hotel (hotelId 1001, placeholder) ───────────────────
  {
    id: 58, hotelProperty: 'Izla Hotel', hotelId: 1001, projectId: 43, subProjectId: 1,
    project: 'Solicitud de Critical Path', area: 'Operations',
    actionTitle: 'Solicitud de Critical Path',
    contextDescription: 'GFG Asset Management solicitó al hotel la entrega del Critical Path para tener visibilidad completa de las métricas clave de operación. Se espera recibir el documento durante la presente semana.',
    owner: 'GFG Asset Management / Hotel Team', status: 'In progress',
    startDate: '2026-05-12', endDate: '2026-05-18',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 5, endMonth: 5, durationDays: 6,
    priority: 'High', kpiMetric: 'Entrega del documento',
    notes: 'Seguimiento inmediato si no se recibe antes del viernes.',
  },
  {
    id: 59, hotelProperty: 'Izla Hotel', hotelId: 1001, projectId: 44, subProjectId: 1,
    project: 'Revisión de POB — Llamada Bisemanal', area: 'Operations',
    actionTitle: 'Revisión de POB — Llamada Bisemanal',
    contextDescription: 'GFG Asset Management y el equipo del hotel sostendrán llamadas bisemanales para la revisión del Pick-Up On Books (POB), con el objetivo de monitorear el comportamiento de reservas y ajustar estrategia comercial en tiempo real.',
    owner: 'GFG Asset Management / Hotel Team', status: 'Pending',
    startDate: '2026-05-19', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 5, endMonth: 12, durationDays: 226,
    priority: 'High', kpiMetric: 'POB, Ocupación, Pick-Up semanal',
    notes: 'Llamadas todos los martes. Primera sesión: martes 19 de mayo.',
    recurrence: { cadence: 'biweekly', dayOfWeek: 2 },
  },
  {
    id: 60, hotelProperty: 'Izla Hotel', hotelId: 1001, projectId: 45, subProjectId: 1,
    project: 'Recepción de Reportes Mensuales de Cierre', area: 'Operations',
    actionTitle: 'Recepción de Reportes Mensuales de Cierre',
    contextDescription: 'El hotel entregará mensualmente a GFG Asset Management los reportes de cierre de mes, permitiendo el análisis oportuno de resultados financieros y operativos para la toma de decisiones.',
    owner: 'Hotel Team', status: 'In progress',
    startDate: '2026-05-01', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 5, endMonth: 12, durationDays: 244,
    priority: 'High', kpiMetric: 'Fecha de entrega, Reporte de cierre mensual',
    notes: 'Entrega obligatoria antes del día 10 de cada mes.',
    recurrence: { cadence: 'monthly', dayOfMonth: 10 },
  },
  {
    id: 61, hotelProperty: 'Izla Hotel', hotelId: 1001, projectId: 46, subProjectId: 1,
    project: 'Recepción de Reportes Semanales — Pace y Forecast', area: 'Revenue',
    actionTitle: 'Recepción de Reportes Semanales — Pace y Forecast',
    contextDescription: 'El hotel enviará semanalmente a GFG Asset Management los reportes de Pace y Forecast para los meses siguientes, con el fin de mantener visibilidad anticipada sobre el comportamiento de la demanda y ajustar la estrategia comercial en tiempo real.',
    owner: 'Hotel Team', status: 'Pending',
    startDate: '2026-05-15', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 5, endMonth: 12, durationDays: 230,
    priority: 'Medium', kpiMetric: 'Pace, Forecast, RevPAR proyectado',
    notes: 'Entrega todos los jueves. Incluir forecast de los siguientes 3 meses.',
    recurrence: { cadence: 'weekly', dayOfWeek: 4 },
  },
  {
    id: 62, hotelProperty: 'Izla Hotel', hotelId: 1001, projectId: 47, subProjectId: 1,
    project: 'Llamada Mensual con Operador', area: 'Operations',
    actionTitle: 'Llamada Mensual con Operador',
    contextDescription: 'GFG Asset Management y el operador del hotel sostendrán una llamada mensual de seguimiento para la revisión de resultados, estrategia y acuerdos operativos. La sesión se realizará el día 11 de cada mes.',
    owner: 'GFG Asset Management / Operador', status: 'Pending',
    startDate: '2026-06-11', endDate: '2026-12-31',
    investmentUsd: 0, expectedReturnUsd: 0, roiPct: null,
    startMonth: 6, endMonth: 12, durationDays: 203,
    priority: 'High', kpiMetric: 'Acuerdos alcanzados, Seguimiento de compromisos',
    notes: 'Llamada fija todos los días 11 de cada mes. Si el día 11 cae en fin de semana, reagendar al lunes inmediato siguiente.',
    recurrence: { cadence: 'monthly', dayOfMonth: 11 },
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

const toIsoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Enumerates every occurrence of a recurring action between startDate and endDate
// (inclusive). Returns [] when recurrence is absent or dates are missing.
export function occurrenceDates(a: Action): string[] {
  if (!a.recurrence || !a.startDate || !a.endDate) return [];
  const start = new Date(a.startDate + 'T00:00:00');
  const end = new Date(a.endDate + 'T00:00:00');
  const out: string[] = [];

  if (a.recurrence.cadence === 'weekly' || a.recurrence.cadence === 'biweekly') {
    const target = a.recurrence.dayOfWeek;
    const stepDays = a.recurrence.cadence === 'weekly' ? 7 : 14;
    const d = new Date(start);
    while (d.getDay() !== target) d.setDate(d.getDate() + 1);
    while (d <= end) {
      out.push(toIsoDate(d));
      d.setDate(d.getDate() + stepDays);
    }
  } else {
    const target = a.recurrence.dayOfMonth;
    let y = start.getFullYear();
    let m = start.getMonth();
    while (true) {
      const dim = new Date(y, m + 1, 0).getDate();
      const d = new Date(y, m, Math.min(target, dim));
      if (d > end) break;
      if (d >= start) out.push(toIsoDate(d));
      m++;
      if (m > 11) { m = 0; y++; }
    }
  }
  return out;
}
