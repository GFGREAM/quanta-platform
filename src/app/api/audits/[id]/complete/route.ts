import { NextResponse } from 'next/server';
import { auditsPool as pool } from '@/lib/db-audits';
import { guardDraftAudit, auditLog } from '../../_helpers';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await context.params;
    const guard = await guardDraftAudit(idParam);
    if (!guard.ok) return guard.response;
    const { auditId, email } = guard;

    // ─── Validation: signature required ───────────────────────────
    const sigRes = await pool.query(
      `SELECT id FROM hotel_audits.signatures WHERE audit_id = $1;`,
      [auditId],
    );
    if (!sigRes.rowCount || sigRes.rowCount === 0) {
      return NextResponse.json({ error: 'Missing signature — sign the audit before completing' }, { status: 400 });
    }

    // ─── Validation: all non-NA questions must have a response ────
    const templateRes = await pool.query(
      `SELECT template_id FROM hotel_audits.audits WHERE id = $1;`,
      [auditId],
    );
    const templateId = templateRes.rows[0].template_id;

    const questionsRes = await pool.query(
      `SELECT q.id AS question_id
       FROM hotel_audits.questions q
       JOIN hotel_audits.sections s ON s.id = q.section_id
       WHERE s.template_id = $1;`,
      [templateId],
    );
    const allQuestionIds = new Set<number>(questionsRes.rows.map((r) => r.question_id));

    const answeredRes = await pool.query(
      `SELECT question_id FROM hotel_audits.audit_responses WHERE audit_id = $1 AND (is_na = TRUE OR response_value IS NOT NULL);`,
      [auditId],
    );
    const answeredIds = new Set<number>(answeredRes.rows.map((r) => r.question_id));

    const unanswered = [...allQuestionIds].filter((qid) => !answeredIds.has(qid));
    if (unanswered.length > 0) {
      return NextResponse.json({
        error: `${unanswered.length} question(s) have not been answered`,
        missing_question_ids: unanswered,
      }, { status: 400 });
    }

    // ─── Calculate total_score ────────────────────────────────────
    const scoringRes = await pool.query(
      `SELECT q.response_type, q.weight, ar.response_value, ar.is_na
       FROM hotel_audits.questions q
       JOIN hotel_audits.sections s ON s.id = q.section_id
       LEFT JOIN hotel_audits.audit_responses ar ON ar.audit_id = $1 AND ar.question_id = q.id
       WHERE s.template_id = $2;`,
      [auditId, templateId],
    );

    let pointsObtained = 0;
    let pointsPossible = 0;

    for (const row of scoringRes.rows) {
      if (row.is_na) continue;
      const weight = Number(row.weight);

      if (row.response_type === 'pass_fail') {
        pointsPossible += weight;
        if (row.response_value === 'pass') {
          pointsObtained += weight;
        }
        // fail = 0 points
      } else if (row.response_type === 'scale_1_5') {
        const val = Number(row.response_value);
        if (Number.isFinite(val) && val >= 1 && val <= 5) {
          pointsPossible += weight;
          pointsObtained += ((val - 1) / 4) * weight;
        }
      }
      // response_type='text' does not count for score
    }

    const totalScore = pointsPossible > 0
      ? Math.round(((pointsObtained / pointsPossible) * 100) * 100) / 100
      : null;

    // ─── Close the audit in a transaction ─────────────────────────
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updateRes = await client.query(
        `UPDATE hotel_audits.audits
         SET status = 'completada', total_score = $1, completed_at = NOW()
         WHERE id = $2
         RETURNING id, status, total_score, completed_at;`,
        [totalScore, auditId],
      );
      await client.query(
        `INSERT INTO hotel_audits.audit_log (audit_id, action, actor_email, details) VALUES ($1, 'complete', $2, $3::jsonb);`,
        [auditId, email, JSON.stringify({ total_score: totalScore })],
      );
      await client.query('COMMIT');
      const r = updateRes.rows[0];
      return NextResponse.json({
        id: r.id,
        status: r.status,
        total_score: r.total_score !== null ? Number(r.total_score) : null,
        completed_at: r.completed_at.toISOString(),
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST /api/audits/[id]/complete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
