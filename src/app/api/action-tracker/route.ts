import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { Action } from '@/app/dashboard/strategic/action-plan-tracker/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Row = {
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
  fecha_inicio: string | null;
  fecha_fin: string | null;
  inversion_usd: string | null;
  retorno_esperado_usd: string | null;
  roi_pct: string | null;
  mes_inicio: number | null;
  mes_fin: number | null;
  duracion_dias: number | null;
  prioridad: string | null;
  kpi_metrica: string | null;
  notas_comentarios: string | null;
};

const toNum = (v: string | null): number | null => (v == null ? null : Number(v));

export async function GET() {
  try {
    const { rows } = await pool.query<Row>(`
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
        to_char(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
        to_char(fecha_fin, 'YYYY-MM-DD')    AS fecha_fin,
        inversion_usd,
        retorno_esperado_usd,
        roi_pct,
        mes_inicio,
        mes_fin,
        duracion_dias,
        prioridad,
        kpi_metrica,
        notas_comentarios
      FROM action_tracker.registro_acciones
      ORDER BY id ASC
    `);

    const actions: Action[] = rows.map((r) => ({
      id: Number(r.id),
      hotelProperty: r.hotel_propiedad,
      hotelId: r.hotel_id,
      projectId: r.id_proyecto,
      subProjectId: r.sub_id_proyecto,
      project: r.proyecto ?? '',
      area: r.area ?? '',
      actionTitle: r.titulo_accion,
      contextDescription: r.descripcion_contexto ?? '',
      owner: r.responsable ?? '',
      status: (r.estatus ?? '') as Action['status'],
      startDate: r.fecha_inicio ?? '',
      endDate: r.fecha_fin ?? '',
      investmentUsd: toNum(r.inversion_usd) ?? 0,
      expectedReturnUsd: toNum(r.retorno_esperado_usd) ?? 0,
      roiPct: toNum(r.roi_pct),
      startMonth: r.mes_inicio,
      endMonth: r.mes_fin,
      durationDays: r.duracion_dias,
      priority: (r.prioridad ?? '') as Action['priority'],
      kpiMetric: r.kpi_metrica ?? '',
      notes: r.notas_comentarios ?? '',
      recurrence: null,
    }));

    return NextResponse.json(actions);
  } catch (err) {
    console.error('[api/action-tracker] query failed:', err);
    return NextResponse.json({ error: 'Failed to load action tracker data' }, { status: 500 });
  }
}
