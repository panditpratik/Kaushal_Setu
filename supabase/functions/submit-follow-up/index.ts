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

  // 1. Authenticate & require TRAINEE, TRAINING_PROVIDER, or GOVERNMENT
  const { user, errorResponse } = await authenticateRequest(req, [
    'TRAINEE',
    'TRAINING_PROVIDER',
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
      followUpId,
      actionType = 'FOLLOW_UP',
      skillCategory,
      notes,
      status = 'Completed',
    } = body;

    // 2. Execute atomic transaction
    const result = await withTransaction(async (client) => {
      let resolvedTraineeId = traineeId;

      if (user.role === 'TRAINEE') {
        if (!user.traineeId) {
          throw new Error('Trainee record not found for this user');
        }
        if (traineeId && traineeId !== user.traineeId) {
          const authErr: any = new Error(
            'Access denied: cannot create or modify follow-up for another trainee'
          );
          authErr.status = 403;
          throw authErr;
        }
        resolvedTraineeId = user.traineeId;
      } else if (user.role === 'TRAINING_PROVIDER') {
        if (!resolvedTraineeId) {
          const badErr: any = new Error('traineeId is required for training provider follow-ups');
          badErr.status = 400;
          throw badErr;
        }
        // Verify trainee is enrolled in provider's cohort
        const enrollmentCheck = await client.query(
          `SELECT 1 FROM public.cohort_enrollments ce
           JOIN public.cohorts c ON c.id = ce.cohort_id
           WHERE ce.trainee_id = $1 AND c.training_provider_id = $2
           LIMIT 1`,
          [resolvedTraineeId, user.providerId]
        );
        if (enrollmentCheck.rows.length === 0) {
          const enrollErr: any = new Error(
            'Access denied: trainee is not enrolled in any cohort of your training academy'
          );
          enrollErr.status = 403;
          throw enrollErr;
        }
      }

      if (!resolvedTraineeId && !followUpId) {
        const reqErr: any = new Error('traineeId or followUpId is required');
        reqErr.status = 400;
        throw reqErr;
      }

      let followUpRecord: any = null;

      // Updating existing or creating milestone follow-up
      if (followUpId) {
        // Verify ownership/scoping
        const existingRes = await client.query(
          'SELECT f.*, t.user_id as trainee_user_id FROM public.follow_ups f JOIN public.trainees t ON t.id = f.trainee_id WHERE f.id = $1',
          [followUpId]
        );
        if (existingRes.rows.length > 0) {
          const existing = existingRes.rows[0];
          if (user.role === 'TRAINEE' && existing.trainee_user_id !== user.id) {
            const forbidErr: any = new Error('Access denied: cannot update another user follow-up');
            forbidErr.status = 403;
            throw forbidErr;
          }

          const updateRes = await client.query(
            `UPDATE public.follow_ups
             SET status = coalesce($1, status),
                 notes = coalesce($2, notes)
             WHERE id = $3
             RETURNING *`,
            [status, notes, followUpId]
          );
          followUpRecord = updateRes.rows[0];
          resolvedTraineeId = followUpRecord.trainee_id;
        } else {
          // If followUpId was not yet in DB, create new verified record
          const safeId = followUpId.startsWith('flw_') ? followUpId : ('flw_' + Math.random().toString(36).substring(2, 10));
          const insertRes = await client.query(
            `INSERT INTO public.follow_ups (
               id, trainee_id, follow_up_date, status, notes, created_at
             ) VALUES ($1, $2, now(), $3, $4, now())
             RETURNING *`,
            [safeId, resolvedTraineeId, status, notes || 'Longitudinal follow-up survey verified.']
          );
          followUpRecord = insertRes.rows[0];
        }
      } else {
        // Creating new follow-up
        const newId = 'flw_' + Math.random().toString(36).substring(2, 12);
        const followUpNotes =
          actionType === 'ASSESSMENT_REQUEST'
            ? notes || `Requested Level 5 assessment for: ${skillCategory || 'Industrial Automation'}`
            : notes || 'Longitudinal follow-up survey submitted.';

        const insertRes = await client.query(
          `INSERT INTO public.follow_ups (
             id, trainee_id, follow_up_date, status, notes, created_at
           ) VALUES ($1, $2, now(), $3, $4, now())
           RETURNING *`,
          [newId, resolvedTraineeId, actionType === 'ASSESSMENT_REQUEST' ? 'Assessment Requested' : status, followUpNotes]
        );
        followUpRecord = insertRes.rows[0];
      }

      // Create Audit Log
      const logId = 'log_' + Math.random().toString(36).substring(2, 12);
      await client.query(
        `INSERT INTO public.audit_logs (
           id, actor_id, actor_role, action, entity, entity_id, metadata, timestamp
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [
          logId,
          user.id,
          user.role,
          actionType === 'ASSESSMENT_REQUEST' ? 'ASSESSMENT_REQUESTED' : 'FOLLOW_UP_RECORDED',
          'FollowUp',
          followUpRecord.id,
          JSON.stringify({
            traineeId: resolvedTraineeId,
            actionType,
            status: followUpRecord.status,
            notes: followUpRecord.notes,
            skillCategory,
            timestamp: new Date().toISOString(),
          }),
        ]
      );

      // Create Notification
      const notifId = 'notif_' + Math.random().toString(36).substring(2, 12);
      const notifMsg =
        actionType === 'ASSESSMENT_REQUEST'
          ? `Your assessment request for ${skillCategory || 'Advanced Skill'} has been submitted.`
          : `Follow-up survey status updated: "${followUpRecord.status}".`;

      await client.query(
        `INSERT INTO public.notifications (
           id, user_id, title, message, read, created_at
         ) VALUES ($1, $2, $3, $4, false, now())`,
        [
          notifId,
          user.role === 'TRAINEE' ? user.id : (await client.query('SELECT user_id FROM public.trainees WHERE id = $1', [resolvedTraineeId])).rows[0]?.user_id,
          actionType === 'ASSESSMENT_REQUEST' ? 'Assessment Request Logged' : 'Follow-up Confirmed',
          notifMsg,
        ]
      );

      return { followUpRecord, logId };
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: result.followUpRecord,
        auditLogId: result.logId,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error in submit-follow-up Edge Function:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error' }),
      {
        status: err.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
