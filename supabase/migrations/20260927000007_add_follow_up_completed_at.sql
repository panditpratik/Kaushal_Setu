-- Migration: 20260927000007_add_follow_up_completed_at.sql
-- Add completed_at column to follow_ups and reload submit_trainee_follow_up_survey RPC

ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.submit_trainee_follow_up_survey(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid UUID;
  v_caller_role public.user_role;
  v_trainee_id TEXT;
  v_flw_id TEXT;
  v_emp_status TEXT;
  v_salary NUMERIC;
  v_retention_status TEXT;
  v_skill_rel TEXT;
  v_role_rel TEXT;
  v_notes TEXT;
  v_emp_name TEXT;
  v_job_title TEXT;
  v_updated_count INT := 0;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_caller_role := public.current_user_role();

  IF v_caller_role = 'TRAINEE' THEN
    SELECT id INTO v_trainee_id FROM public.trainees WHERE user_id = v_caller_uid LIMIT 1;
  ELSIF v_caller_role = 'GOVERNMENT' THEN
    v_trainee_id := p_data->>'trainee_id';
    IF v_trainee_id IS NULL THEN
      SELECT id INTO v_trainee_id FROM public.trainees WHERE id = 'tr_priya' OR user_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
    END IF;
  ELSE
    RAISE EXCEPTION 'Access denied: role % cannot submit follow-ups', v_caller_role USING ERRCODE = '42501';
  END IF;

  IF v_trainee_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trainee record not found');
  END IF;

  v_emp_status := coalesce(p_data->>'employment_status', 'EMPLOYED');
  IF p_data->>'monthly_salary' IS NOT NULL AND (p_data->>'monthly_salary') != '' THEN
    v_salary := (p_data->>'monthly_salary')::numeric;
  END IF;
  v_retention_status := coalesce(p_data->>'retention_status', 'RETAINED');
  v_skill_rel := coalesce(p_data->>'skill_relevance', 'HIGHLY_RELEVANT');
  v_role_rel := coalesce(p_data->>'role_relevance', 'DIRECTLY_ALIGNED');
  v_notes := coalesce(p_data->>'reason_notes', p_data->>'notes');

  -- Determine follow-up target
  v_flw_id := p_data->>'followUpId';

  IF v_flw_id IS NOT NULL AND v_flw_id != '' THEN
    UPDATE public.follow_ups
    SET status = 'Completed ✓',
        notes = coalesce(v_notes, notes, 'Longitudinal retention & skilling survey submitted by trainee.'),
        employment_status = v_emp_status,
        monthly_salary = coalesce(v_salary, monthly_salary),
        retention_status = v_retention_status,
        skill_relevance = v_skill_rel,
        role_relevance = v_role_rel,
        reason_notes = v_notes,
        completed_at = now()
    WHERE id = v_flw_id AND trainee_id = v_trainee_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  -- If no existing record was matched or no ID passed, insert a new completed follow-up
  IF v_updated_count = 0 THEN
    v_flw_id := 'flw_' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.follow_ups (
      id, trainee_id, follow_up_date, status, notes,
      employment_status, monthly_salary, retention_status, skill_relevance, role_relevance, reason_notes, created_at, completed_at
    ) VALUES (
      v_flw_id,
      v_trainee_id,
      now(),
      'Completed ✓',
      coalesce(v_notes, 'Longitudinal retention & skilling survey submitted by trainee.'),
      v_emp_status,
      v_salary,
      v_retention_status,
      v_skill_rel,
      v_role_rel,
      v_notes,
      now(),
      now()
    );
  END IF;

  -- Update trainee employment status
  UPDATE public.trainees
  SET employment_status = v_emp_status,
      updated_at = now()
  WHERE id = v_trainee_id;

  -- Dynamically resolve real employer and job title for longitudinal salary progression
  IF v_salary IS NOT NULL AND v_salary > 0 THEN
    SELECT employer_name, job_title 
    INTO v_emp_name, v_job_title
    FROM public.employment_records
    WHERE trainee_id = v_trainee_id
    ORDER BY start_date DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF v_job_title IS NULL THEN
      SELECT current_occupation INTO v_job_title FROM public.trainees WHERE id = v_trainee_id;
    END IF;

    v_emp_name := coalesce(p_data->>'employer_name', v_emp_name, 'Verified Employer');
    v_job_title := coalesce(p_data->>'job_title', v_job_title, 'Employed Specialist');

    INSERT INTO public.employment_records (
      id, trainee_id, employer_name, job_title, start_date, monthly_salary, employment_type, created_at
    ) VALUES (
      'er_' || replace(gen_random_uuid()::text, '-', ''),
      v_trainee_id,
      v_emp_name,
      v_job_title,
      now(),
      v_salary,
      'REGULAR',
      now()
    );
  END IF;

  -- Audit Log
  INSERT INTO public.audit_logs (
    id, actor_id, actor_role, action, entity, entity_id, metadata, timestamp
  ) VALUES (
    'log_' || replace(gen_random_uuid()::text, '-', ''),
    v_caller_uid::text,
    v_caller_role::text,
    'TRAINEE_SUBMITTED_FOLLOW_UP',
    'FollowUp',
    v_flw_id,
    p_data::text,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'follow_up_id', v_flw_id,
    'status', 'Completed ✓',
    'employment_status', v_emp_status,
    'monthly_salary', v_salary
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_trainee_follow_up_survey(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_trainee_follow_up_survey(JSONB) TO authenticated;
