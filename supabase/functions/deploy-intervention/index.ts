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

  // 1. Authenticate & require TRAINING_PROVIDER or GOVERNMENT
  const { user, errorResponse } = await authenticateRequest(req, [
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
    const { providerId, moduleName, batchId, cohortName, skillGapId } = body;

    if (!moduleName) {
      return new Response(
        JSON.stringify({ success: false, error: 'moduleName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Execute atomic transaction
    const result = await withTransaction(async (client) => {
      let resolvedProviderId = providerId;

      if (user.role === 'TRAINING_PROVIDER') {
        if (!user.providerId) {
          throw new Error('No training provider record found for this user');
        }
        if (providerId && providerId !== user.providerId) {
          const authErr: any = new Error(
            'Access denied: cannot deploy curriculum for another training provider'
          );
          authErr.status = 403;
          throw authErr;
        }
        resolvedProviderId = user.providerId;
      } else if (!resolvedProviderId) {
        // Government: fallback to first training provider
        const tpRes = await client.query('SELECT id FROM public.training_providers LIMIT 1');
        resolvedProviderId = tpRes.rows[0]?.id;
      }

      const providerRes = await client.query(
        'SELECT id, org_name, user_id FROM public.training_providers WHERE id = $1',
        [resolvedProviderId]
      );
      if (providerRes.rows.length === 0) {
        const notFoundErr: any = new Error('Training provider not found');
        notFoundErr.status = 404;
        throw notFoundErr;
      }
      const provider = providerRes.rows[0];

      // Resolve skill gap
      let resolvedSkillGapId = skillGapId;
      if (!resolvedSkillGapId) {
        const existingGapRes = await client.query('SELECT id FROM public.skill_gaps LIMIT 1');
        if (existingGapRes.rows.length > 0) {
          resolvedSkillGapId = existingGapRes.rows[0].id;
        } else {
          // Create baseline assessment and gap if none exists
          const traineeRes = await client.query('SELECT id FROM public.trainees LIMIT 1');
          let traineeId = traineeRes.rows[0]?.id;
          if (!traineeId) {
            throw new Error('No trainee available to establish skill gap link');
          }
          const saId = 'sa_' + Math.random().toString(36).substring(2, 12);
          await client.query(
            `INSERT INTO public.skill_assessments (id, trainee_id, assessment_date, overall_score, assessor_type)
             VALUES ($1, $2, now(), 80.0, 'Batch Baseline')`,
            [saId, traineeId]
          );
          resolvedSkillGapId = 'sg_' + Math.random().toString(36).substring(2, 12);
          await client.query(
            `INSERT INTO public.skill_gaps (id, skill_assessment_id, skill_name, severity)
             VALUES ($1, $2, $3, 'MEDIUM')`,
            [resolvedSkillGapId, saId, moduleName]
          );
        }
      }

      // Create intervention
      const interventionId = 'int_' + Math.random().toString(36).substring(2, 12);
      const invRes = await client.query(
        `INSERT INTO public.interventions (
           id, skill_gap_id, type, provider_name, status, start_date, created_at
         ) VALUES ($1, $2, $3, $4, 'ACTIVE', now(), now())
         RETURNING *`,
        [interventionId, resolvedSkillGapId, moduleName, provider.org_name]
      );
      const intervention = invRes.rows[0];

      // Create audit log
      const logId = 'log_' + Math.random().toString(36).substring(2, 12);
      await client.query(
        `INSERT INTO public.audit_logs (
           id, actor_id, actor_role, action, entity, entity_id, metadata, timestamp
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [
          logId,
          user.id,
          user.role,
          'MODULE_DEPLOYED',
          'Intervention',
          intervention.id,
          JSON.stringify({
            moduleName,
            batchId,
            cohortName,
            providerName: provider.org_name,
            providerId: resolvedProviderId,
            timestamp: new Date().toISOString(),
          }),
        ]
      );

      // Create notification
      const notifId = 'notif_' + Math.random().toString(36).substring(2, 12);
      await client.query(
        `INSERT INTO public.notifications (
           id, user_id, title, message, read, created_at
         ) VALUES ($1, $2, $3, $4, false, now())`,
        [
          notifId,
          user.id,
          'Curriculum Module Deployed',
          `Module "${moduleName}" has been deployed to ${cohortName || 'Active Batch'}.`,
        ]
      );

      return { intervention, logId };
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Curriculum module deployed successfully to cohort',
        data: result.intervention,
        auditLogId: result.logId,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error in deploy-intervention Edge Function:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error' }),
      {
        status: err.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
