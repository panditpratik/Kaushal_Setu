import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';
import { withTransaction } from '../_shared/db.ts';
Deno.serve(async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 1. Authenticate & require EMPLOYER or GOVERNMENT
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
    const { candidateId, deficiencyCategory, severity = 'moderate', notes, employerId } = body;

    // 2. Execute atomic transaction
    const result = await withTransaction(async (client) => {
      let resolvedEmployerId = employerId;

      if (user.role === 'EMPLOYER') {
        if (!user.employerId) {
          throw new Error('No employer record found for this user');
        }
        if (employerId && employerId !== user.employerId) {
          const authErr: any = new Error(
            'Access denied: cannot submit feedback on behalf of another employer'
          );
          authErr.status = 403;
          throw authErr;
        }
        resolvedEmployerId = user.employerId;
      } else if (!resolvedEmployerId) {
        const empRes = await client.query('SELECT id FROM public.employers LIMIT 1');
        resolvedEmployerId = empRes.rows[0]?.id;
      }

      // Resolve trainee
      let resolvedTraineeId = candidateId;
      if (!resolvedTraineeId) {
        const trRes = await client.query(
          'SELECT trainee_id FROM public.employment_records WHERE employer_id = $1 LIMIT 1',
          [resolvedEmployerId]
        );
        resolvedTraineeId = trRes.rows[0]?.trainee_id;
      }

      if (!resolvedTraineeId) {
        const reqErr: any = new Error('candidateId is required');
        reqErr.status = 400;
        throw reqErr;
      }

      // Verify that candidate is associated with this employer
      const relCheck = await client.query(
        'SELECT id FROM public.employment_records WHERE trainee_id = $1 AND employer_id = $2 LIMIT 1',
        [resolvedTraineeId, resolvedEmployerId]
      );
      if (relCheck.rows.length === 0 && user.role !== 'GOVERNMENT') {
        const relErr: any = new Error(
          'Access denied: candidate is not an employee of your organization'
        );
        relErr.status = 403;
        throw relErr;
      }

      const rating = severity === 'critical' ? 1 : severity === 'high' ? 2 : severity === 'moderate' ? 3 : 4;
      const feedbackText = `[${deficiencyCategory || 'General Competency'}] (Severity: ${severity}) - ${notes || 'Curriculum feedback submitted.'}`;

      const feedbackId = 'ef_' + Math.random().toString(36).substring(2, 12);
      const insertRes = await client.query(
        `INSERT INTO public.employer_feedback (
           id, trainee_id, employer_id, rating, feedback_text, submitted_at
         ) VALUES ($1, $2, $3, $4, $5, now())
         RETURNING *`,
        [feedbackId, resolvedTraineeId, resolvedEmployerId, rating, feedbackText]
      );
      const feedback = insertRes.rows[0];

      // Audit Log
      const logId = 'log_' + Math.random().toString(36).substring(2, 12);
      await client.query(
        `INSERT INTO public.audit_logs (
           id, actor_id, actor_role, action, entity, entity_id, metadata, timestamp
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [
          logId,
          user.id,
          user.role,
          'EMPLOYER_FEEDBACK_SUBMITTED',
          'EmployerFeedback',
          feedback.id,
          JSON.stringify({
            candidateId: resolvedTraineeId,
            employerId: resolvedEmployerId,
            deficiencyCategory,
            severity,
            rating,
            timestamp: new Date().toISOString(),
          }),
        ]
      );

      // Notify candidate's training provider if enrolled
      const provRes = await client.query(
        `SELECT tp.user_id, tp.org_name
         FROM public.cohort_enrollments ce
         JOIN public.cohorts c ON c.id = ce.cohort_id
         JOIN public.training_providers tp ON tp.id = c.training_provider_id
         WHERE ce.trainee_id = $1 LIMIT 1`,
        [resolvedTraineeId]
      );

      if (provRes.rows.length > 0) {
        const notifId = 'notif_' + Math.random().toString(36).substring(2, 12);
        await client.query(
          `INSERT INTO public.notifications (
             id, user_id, title, message, read, created_at
           ) VALUES ($1, $2, $3, $4, false, now())`,
          [
            notifId,
            provRes.rows[0].user_id,
            'Employer Feedback Received',
            `Feedback on candidate deficiency category "${deficiencyCategory || 'General'}" has been submitted by employer.`,
          ]
        );
      }

      return { feedback, logId };
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Employer feedback submitted and routed successfully',
        data: result.feedback,
        auditLogId: result.logId,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error in submit-feedback Edge Function:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error' }),
      {
        status: err.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
