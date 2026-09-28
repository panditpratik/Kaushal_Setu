-- Fix record_trainee_dropout RPC
-- Drop function first to allow clean parameter signature update
DROP FUNCTION IF EXISTS public.record_trainee_dropout(TEXT, TIMESTAMPTZ, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.record_trainee_dropout(
  p_enrollment_id TEXT,
  p_dropout_date TIMESTAMPTZ DEFAULT NULL,
  p_reason TEXT DEFAULT 'Personal reasons',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid UUID;
  v_caller_role TEXT;
  v_provider_id TEXT;
  v_trainee_id TEXT;
  v_cohort_id TEXT;
  v_cohort_provider_id TEXT;
  v_valid_reason BOOLEAN;
  v_audit_id TEXT;
  v_effective_date TIMESTAMPTZ;
BEGIN
  -- Authenticate caller
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required: caller is anonymous' USING ERRCODE = '42501';
  END IF;

  -- Get caller role
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = v_caller_uid;

  -- Validate cohort enrollment exists and fetch associated IDs (note: cohorts column is training_provider_id)
  SELECT
    ce.trainee_id,
    ce.cohort_id,
    c.training_provider_id
  INTO
    v_trainee_id,
    v_cohort_id,
    v_cohort_provider_id
  FROM public.cohort_enrollments ce
  JOIN public.cohorts c ON c.id = ce.cohort_id
  WHERE ce.id = p_enrollment_id;

  IF v_trainee_id IS NULL THEN
    RAISE EXCEPTION 'Cohort enrollment record % not found', p_enrollment_id USING ERRCODE = 'P0002';
  END IF;

  -- Validate caller authorization and cohort tenant ownership
  IF v_caller_role = 'TRAINING_PROVIDER' THEN
    SELECT id INTO v_provider_id
    FROM public.training_providers
    WHERE user_id = v_caller_uid;

    IF v_provider_id IS NULL OR v_cohort_provider_id != v_provider_id THEN
      RAISE EXCEPTION 'Access denied: enrollment % does not belong to your training institution', p_enrollment_id USING ERRCODE = '42501';
    END IF;
  ELSIF v_caller_role != 'GOVERNMENT' THEN
    RAISE EXCEPTION 'Access denied: caller does not have authorization to record dropout' USING ERRCODE = '42501';
  END IF;

  -- Validate reason against controlled vocabulary
  v_valid_reason := p_reason IN (
    'Personal reasons',
    'Health/family reasons',
    'Relocation',
    'Employment elsewhere',
    'Financial constraints',
    'Attendance issues',
    'Skill difficulty',
    'Programme mismatch',
    'Other'
  );

  IF NOT v_valid_reason THEN
    RAISE EXCEPTION 'Invalid dropout reason: %. Reason must conform to NCVET controlled vocabulary.', p_reason USING ERRCODE = '22023';
  END IF;

  v_effective_date := coalesce(p_dropout_date, now());

  -- Update cohort_enrollments status to DROPPED
  UPDATE public.cohort_enrollments
  SET
    status = 'DROPPED',
    dropout_date = v_effective_date,
    dropout_reason = p_reason,
    dropout_notes = p_notes
  WHERE id = p_enrollment_id;

  -- Generate audit log ID
  v_audit_id := 'log_' || replace(gen_random_uuid()::text, '-', '');

  -- Insert into audit log using exact audit_logs schema
  INSERT INTO public.audit_logs (
    id,
    actor_id,
    actor_role,
    action,
    entity,
    entity_id,
    metadata,
    timestamp
  )
  VALUES (
    v_audit_id,
    v_caller_uid::text,
    coalesce(v_caller_role, 'TRAINING_PROVIDER'),
    'RECORD_TRAINEE_DROPOUT',
    'CohortEnrollment',
    p_enrollment_id,
    jsonb_build_object(
      'traineeId', v_trainee_id,
      'cohortId', v_cohort_id,
      'providerId', v_cohort_provider_id,
      'reason', p_reason,
      'dropoutDate', v_effective_date,
      'notes', p_notes
    )::text,
    now()
  );

  -- Section 11: Trigger follow-up if reason indicates post-dropout counseling need
  IF p_reason IN ('Skill difficulty', 'Programme mismatch', 'Financial constraints') THEN
    INSERT INTO public.follow_ups (
      id,
      trainee_id,
      follow_up_date,
      status,
      notes
    )
    VALUES (
      'flw_drop_' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 10),
      v_trainee_id,
      v_effective_date + interval '14 days',
      'SCHEDULED',
      'Post-dropout counseling milestone scheduled. Reason: ' || p_reason
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'enrollmentId', p_enrollment_id,
    'traineeId', v_trainee_id,
    'status', 'DROPPED',
    'dropoutDate', v_effective_date,
    'dropoutReason', p_reason,
    'auditLogId', v_audit_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_trainee_dropout(TEXT, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_trainee_dropout(TEXT, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;
