import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';
import { withTransaction } from '../_shared/db.ts';
Deno.serve(async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 1. Authenticate & require EMPLOYER or GOVERNMENT role
  const { user, errorResponse } = await authenticateRequest(req, ['EMPLOYER', 'GOVERNMENT']);
  if (errorResponse) return errorResponse;
  if (!user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { candidateId, milestone, status = 'verified', employerId } = body;

    // 2. Validate input
    if (!candidateId) {
      return new Response(
        JSON.stringify({ success: false, error: 'candidateId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['3m', '6m', '12m'].includes(milestone)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid milestone. Must be 3m, 6m, or 12m' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Execute atomic transaction
    const result = await withTransaction(async (client) => {
      // Resolve employer
      let resolvedEmployerId = employerId;
      if (user.role === 'EMPLOYER') {
        if (!user.employerId) {
          throw new Error('No employer profile associated with this account');
        }
        if (employerId && employerId !== user.employerId) {
          const authErr: any = new Error('Access denied: cannot verify retention for another employer');
          authErr.status = 403;
          throw authErr;
        }
        resolvedEmployerId = user.employerId;
      } else if (!resolvedEmployerId) {
        // Government calling without employerId: will look up candidate's employer
        const empRec = await client.query(
          'SELECT employer_id FROM public.employment_records WHERE trainee_id = $1 LIMIT 1',
          [candidateId]
        );
        resolvedEmployerId = empRec.rows[0]?.employer_id;
      }

      // Verify that the candidate is actually employed by this employer
      const relationRes = await client.query(
        `SELECT er.id, er.trainee_id, t.user_id as trainee_user_id, emp.company_name
         FROM public.employment_records er
         JOIN public.trainees t ON t.id = er.trainee_id
         JOIN public.employers emp ON emp.id = er.employer_id
         WHERE er.trainee_id = $1 AND er.employer_id = $2
         LIMIT 1`,
        [candidateId, resolvedEmployerId]
      );

      if (relationRes.rows.length === 0) {
        const relationErr: any = new Error(
          `Unauthorized: candidate ${candidateId} is not employed by employer ${resolvedEmployerId}`
        );
        relationErr.status = 403;
        throw relationErr;
      }

      const relation = relationRes.rows[0];

      // Find the outcome record linked to this trainee's intervention
      const outcomeRes = await client.query(
        `SELECT o.id, o.retention_3m, o.retention_6m, o.retention_12m, o.validation_status
         FROM public.outcomes o
         JOIN public.interventions i ON i.id = o.intervention_id
         JOIN public.skill_gaps sg ON sg.id = i.skill_gap_id
         JOIN public.skill_assessments sa ON sa.id = sg.skill_assessment_id
         WHERE sa.trainee_id = $1
         ORDER BY o.recorded_at DESC
         LIMIT 1`,
        [candidateId]
      );

      if (outcomeRes.rows.length === 0) {
        const outcomeErr: any = new Error(`No outcome record found for candidate ${candidateId}`);
        outcomeErr.status = 404;
        throw outcomeErr;
      }

      const outcome = outcomeRes.rows[0];
      const columnToUpdate =
        milestone === '3m'
          ? 'retention_3m'
          : milestone === '12m'
          ? 'retention_12m'
          : 'retention_6m';

      // 4. Update outcome atomically
      const updateRes = await client.query(
        `UPDATE public.outcomes
         SET ${columnToUpdate} = $1,
             validation_status = 'VERIFIED',
             validated_at = now(),
             validated_by = $2
         WHERE id = $3
         RETURNING *`,
        [status, user.id, outcome.id]
      );

      const updatedOutcome = updateRes.rows[0];

      // 5. Create immutable audit log
      const logId = 'log_' + Math.random().toString(36).substring(2, 12);
      await client.query(
        `INSERT INTO public.audit_logs (
           id, actor_id, actor_role, action, entity, entity_id, metadata, timestamp
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [
          logId,
          user.id,
          user.role,
          'RETENTION_VERIFIED',
          'Outcome',
          outcome.id,
          JSON.stringify({
            candidateId,
            milestone,
            status,
            employerId: resolvedEmployerId,
            previousStatus: outcome[columnToUpdate],
            verifiedAt: new Date().toISOString(),
          }),
        ]
      );

      // 6. Create notification for the trainee
      const notifId = 'notif_' + Math.random().toString(36).substring(2, 12);
      await client.query(
        `INSERT INTO public.notifications (
           id, user_id, title, message, read, created_at
         ) VALUES ($1, $2, $3, $4, false, now())`,
        [
          notifId,
          relation.trainee_user_id,
          'Retention Milestone Verified',
          `Your ${milestone.toUpperCase()} retention milestone was confirmed by ${relation.company_name}.`,
        ]
      );

      return {
        updatedOutcome,
        logId,
        notifId,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Milestone ${milestone} successfully verified.`,
        data: result.updatedOutcome,
        auditLogId: result.logId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error in verify-retention Edge Function:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error' }),
      {
        status: err.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
