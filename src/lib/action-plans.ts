import type { Action, Status, Priority } from "@/app/dashboard/strategic/action-plan-tracker/data";
import { query } from "@/lib/db";

interface ActionRow {
  id: string;
  hotel_propiedad: string;
  hotel_id: number | null;
  id_proyecto: number | null;
  sub_id_proyecto: number | null;
  proyecto: string | null;
  area: string | null;
  titulo_accion: string;
  descripcion_contexto: string | null;
  responsable: string | null;
  estatus: string | null;
  fecha_inicio: Date | null;
  fecha_fin: Date | null;
  inversion_usd: string | null;
  retorno_esperado_usd: string | null;
  roi_pct: string | null;
  mes_inicio: number | null;
  mes_fin: number | null;
  duracion_dias: number | null;
  prioridad: string | null;
  kpi_metrica: string | null;
  notas_comentarios: string | null;
  created_at: Date;
  updated_at: Date;
}

function formatDate(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function mapRowToAction(row: ActionRow): Action {
  return {
    id: Number(row.id),
    hotelProperty: row.hotel_propiedad,
    hotelId: row.hotel_id,
    projectId: row.id_proyecto,
    subProjectId: row.sub_id_proyecto,
    project: row.proyecto ?? "",
    area: row.area ?? "",
    actionTitle: row.titulo_accion,
    contextDescription: row.descripcion_contexto ?? "",
    owner: row.responsable ?? "",
    status: (row.estatus ?? "Pending") as Status,
    startDate: formatDate(row.fecha_inicio),
    endDate: formatDate(row.fecha_fin),
    investmentUsd: row.inversion_usd ? Number(row.inversion_usd) : 0,
    expectedReturnUsd: row.retorno_esperado_usd ? Number(row.retorno_esperado_usd) : 0,
    roiPct: row.roi_pct !== null ? Number(row.roi_pct) : null,
    startMonth: row.mes_inicio,
    endMonth: row.mes_fin,
    durationDays: row.duracion_dias,
    priority: (row.prioridad ?? "Medium") as Priority,
    kpiMetric: row.kpi_metrica ?? "",
    notes: row.notas_comentarios ?? "",
  };
}

export async function getActionPlans(): Promise<Action[]> {
  const rows = await query<ActionRow>(`
    SELECT
      id,
      hotel_propiedad,
      hotel_id,
      id_proyecto,
      sub_id_proyecto,
      proyecto,
      area,
      titulo_accion,
      descripcion_contexto,
      responsable,
      estatus,
      fecha_inicio,
      fecha_fin,
      inversion_usd,
      retorno_esperado_usd,
      roi_pct,
      mes_inicio,
      mes_fin,
      duracion_dias,
      prioridad,
      kpi_metrica,
      notas_comentarios,
      created_at,
      updated_at
    FROM action_tracker.registro_acciones
    ORDER BY created_at DESC
    LIMIT 100
  `);

  return rows.map(mapRowToAction);
}
