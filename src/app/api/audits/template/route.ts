import { NextResponse } from 'next/server';
import { getSessionOrBypass } from '@/lib/auth';
import { auditsPool as pool } from '@/lib/db-audits';
import type { Question, Section, Template } from '@/lib/schemas/audits';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionOrBypass();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const templateResult = await pool.query(`
      SELECT id, name, version, is_active, created_at
      FROM hotel_audits.templates
      WHERE is_active = TRUE
      ORDER BY version DESC LIMIT 1;
    `);
    if (templateResult.rowCount === 0) {
      return NextResponse.json({ error: 'No active template found' }, { status: 404 });
    }
    const t = templateResult.rows[0];
    const detailResult = await pool.query(`
      SELECT s.id AS section_id, s.template_id AS section_template_id, s.name AS section_name,
             s.display_order AS section_display_order,
             q.id AS question_id, q.question_text, q.response_type, q.severity, q.weight,
             q.requires_photo_on_fail, q.display_order AS question_display_order
      FROM hotel_audits.sections s
      LEFT JOIN hotel_audits.questions q ON q.section_id = s.id
      WHERE s.template_id = $1
      ORDER BY s.display_order ASC, q.display_order ASC NULLS LAST;
    `, [t.id]);
    const sectionsMap = new Map<number, Section>();
    for (const row of detailResult.rows) {
      if (!sectionsMap.has(row.section_id)) {
        sectionsMap.set(row.section_id, {
          id: row.section_id,
          template_id: row.section_template_id,
          name: row.section_name,
          display_order: row.section_display_order,
          questions: [],
        });
      }
      if (row.question_id !== null) {
        const q: Question = {
          id: row.question_id,
          section_id: row.section_id,
          question_text: row.question_text,
          response_type: row.response_type,
          severity: row.severity,
          weight: Number(row.weight),
          requires_photo_on_fail: row.requires_photo_on_fail,
          display_order: row.question_display_order,
        };
        sectionsMap.get(row.section_id)!.questions.push(q);
      }
    }
    const template: Template = {
      id: t.id,
      name: t.name,
      version: t.version,
      is_active: t.is_active,
      created_at: t.created_at.toISOString(),
      sections: Array.from(sectionsMap.values()).sort((a, b) => a.display_order - b.display_order),
    };
    return NextResponse.json(template);
  } catch (err) {
    console.error('GET /api/audits/template error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
