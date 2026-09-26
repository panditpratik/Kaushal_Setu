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

  // 1. Authenticate & require TRAINEE, EMPLOYER, or GOVERNMENT
  const { user, errorResponse } = await authenticateRequest(req, [
    'TRAINEE',
    'EMPLOYER',
    'GOVERNMENT',
  ]);
  if (errorResponse) return errorResponse;
  if (!user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const {
      traineeId,
      outcomeType = 'EMPLOYED',
      monthlySalary,
      jobTitle = 'Industrial Electrician',
      employerId,
      employerName,
      wageLiftPercent = 22.0,
    } = body;

    // 2. Execute atomic transaction
    const result = await withTransaction(async (client) => {
      let resolvedTraineeId = traineeId;

      if (user.role === 'TRAINEE') {
        if (!user.traineeId) {
          throw new Error('Trainee profile not found for this account');
        }
        if (traineeId && traineeId !== user.traineeId) {
          const authErr: any = new Error(
            'Access denied: cannot submit outcome for another trainee'
          );
          authErr.status = 403;
          throw authErr;
        }
        resolvedTraineeId = user.traineeId;
      } else if (!resolvedTraineeId) {
        const reqErr: any = new Error('traineeId is required');
        reqErr.status = 400;
        throw reqErr;
      }

      // Verify trainee existence
      const traineeRes = await client.query(
        'SELECT t.id, t.user_id, p.name FROM public.trainees t JOIN public.profiles p ON p.id = t.user_id WHERE t.id = $1',
        [resolvedTraineeId]
      );
      if (traineeRes.rows.length === 0) {
        const notFoundErr: any = new Error('Trainee not found');
        notFoundErr.status = 404;
        throw notFoundErr;
      }
      const trainee = traineeRes.rows[0];

      // Resolve or find employer
      let resolvedEmployerId = employerId;
      if (user.role === 'EMPLOYER') {
        resolvedEmployerId = user.employerId;
      } else if (!resolvedEmployerId && employerName) {
        const empSearch = await client.query(
          'SELECT id FROM public.employers WHERE company_name ILIKE $1 LIMIT 1',
          ['%' + employerName + '%']
        );
        resolvedEmployerId = empSearch.rows[0]?.id;
      }

      // Ensure an intervention exists to link the outcome
      let interventionRes = await client.query(
        `SELECT i.id FROM public.interventions i
         JOIN public.skill_gaps sg ON sg.id = i.skill_gap_id
         JOIN public.skill_assessments sa ON sa.id = sg.skill_assessment_id
         WHERE sa.trainee_id = $1
         ORDER BY i.created_at DESC
         LIMIT 1`,
        [resolvedTraineeId]
      );

      let interventionId = interventionRes.rows[0]?.id;
      if (!interventionId) {
        // Create baseline assessment, gap, and intervention atomically
        const saId = 'sa_' + Math.random().toString(36).substring(2, 12);
        await client.query(
          `INSERT INTO public.skill_assessments (id, trainee_id, assessment_date, overall_score, assessor_type)
           VALUES ($1, $2, now(), 85.0, 'Self Reported Outcome')`,
          [saId, resolvedTraineeId]
        );

        const sgId = 'sg_' + Math.random().toString(36).substring(2, 12);
        await client.query(
          `INSERT INTO public.skill_gaps (id, skill_assessment_id, skill_name, severity)
           VALUES ($1, $2, 'General Workplace Competency', 'LOW')`,
          [sgId, saId]
        );

        interventionId = 'int_' + Math.random().toString(36).substring(2, 12);
        await client.query(
          `INSERT INTO public.interventions (id, skill_gap_id, type, provider_name, status, start_date)
           VALUES ($1, $2, 'Direct Employment Tracking', 'State Skill Mission', 'COMPLETED', now())`,
          [interventionId, sgId]
        );
      }

      // Create Outcome record
      const outcomeId = 'out_' + Math.random().toString(36).substring(2, 12);
      const valStatus = user.role === 'EMPLOYER' ? 'VERIFIED' : 'PENDING';
      const outRes = await client.query(
        `INSERT INTO public.outcomes (
           id, intervention_id, outcome_type, wage_lift_percent, employer_id, validation_status, recorded_at
         ) VALUES ($1, $2, $3, $4, $5, $6, now())
         RETURNING *`,
        [outcomeId, interventionId, outcomeType, wageLiftPercent, resolvedEmployerId, valStatus]
      );
      const outcome = outRes.rows[0];

      // Create or update Employment Record if salary and employer provided
      let employmentRecord = null;
      if (resolvedEmployerId && monthlySalary) {
        const erId = 'er_' + Math.random().toString(36).substring(2, 12);
        const erRes = await client.query(
          `INSERT INTO public.employment_records (
             id, trainee_id, employer_id, job_title, start_date, monthly_salary
           ) VALUES ($1, $2, $3, $4, now(), $5)
           RETURNING *`,
          [erId, resolvedTraineeId, resolvedEmployerId, jobTitle, monthlySalary]
        );
        employmentRecord = erRes.rows[0];
      }

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
          'OUTCOME_RECORDED',
          'Outcome',
          outcome.id,
          JSON.stringify({
            traineeId: resolvedTraineeId,
            outcomeType,
            monthlySalary,
            employerId: resolvedEmployerId,
            wageLiftPercent,
            validationStatus: valStatus,
            timestamp: new Date().toISOString(),
          }),
        ]
      );

      // Notification
      const notifId = 'notif_' + Math.random().toString(36).substring(2, 12);
      await client.query(
        `INSERT INTO public.notifications (
           id, user_id, title, message, read, created_at
         ) VALUES ($1, $2, $3, $4, false, now())`,
        [
          notifId,
          trainee.user_id,
          'Outcome Recorded',
          `Your outcome (${outcomeType}) has been logged and queued for validation.`,
        ]
      );

      return { outcome, employmentRecord, logId };
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Trainee outcome recorded and employment status synchronized',
        data: result.outcome,
        employmentRecord: result.employmentRecord,
        auditLogId: result.logId,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error in record-outcome Edge Function:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error' }),
      {
        status: err.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
