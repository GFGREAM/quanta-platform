import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { hasAccessToSection, getAllowedProperties } from '@/lib/permissions';
import type { Action } from '@/app/dashboard/strategic/action-plan-tracker/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SECTION_KEY = 'strategic-action-plan-tracker';

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

const SQL_BASE = `
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
`;

const SQL_ALL = `${SQL_BASE} ORDER BY id ASC`;
const SQL_FILTERED = `${SQL_BASE} WHERE hotel_propiedad = ANY($1::text[]) ORDER BY id ASC`;

const toNum = (v: string | null): number | null => (v == null ? null : Number(v));

function mapRow(r: Row): Action {
  return {
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
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const email = session.user.email;

    if (!(await hasAccessToSection(email, SECTION_KEY))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allowedProperties = await getAllowedProperties(email, SECTION_KEY);

    const { rows } = allowedProperties
      ? await pool.query<Row>(SQL_FILTERED, [allowedProperties])
      : await pool.query<Row>(SQL_ALL);

    return NextResponse.json(rows.map(mapRow));
  } catch (err) {
    console.error('[api/action-tracker] query failed:', err);
    return NextResponse.json({ error: 'Failed to load action tracker data' }, { status: 500 });
  }
}
