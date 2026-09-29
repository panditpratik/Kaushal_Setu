-- ============================================================================
-- KaushalSetu — Support both name and certificate_name in record_trainee_certificate
-- Migration: 20260927000038_flexible_cert_param.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_trainee_certificate(p_data JSONB)
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
  v_target_trainee_id TEXT;
  v_cert_name TEXT;
  v_course_title TEXT;
  v_issuing_body TEXT;
  v_issued_date TIMESTAMPTZ;
  v_cert_number TEXT;
  v_course_id TEXT;
  v_cert_id TEXT;
  v_tc_id TEXT;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_caller_role := public.current_user_role();
  v_target_trainee_id := p_data->>'trainee_id';

  -- Resolve permissions
  IF v_caller_role = 'TRAINEE' THEN
    SELECT id INTO v_trainee_id FROM public.trainees WHERE user_id = v_caller_uid LIMIT 1;
    IF v_trainee_id IS NULL THEN
      RAISE EXCEPTION 'Trainee profile not found' USING ERRCODE = '42501';
    END IF;
    -- Trainees can only add certificates to their own profile
    IF v_target_trainee_id IS NOT NULL AND v_target_trainee_id != v_trainee_id THEN
      RAISE EXCEPTION 'Access denied: cannot add certificate for another trainee' USING ERRCODE = '42501';
    END IF;
    v_target_trainee_id := v_trainee_id;
  ELSIF v_caller_role IN ('TRAINING_PROVIDER', 'GOVERNMENT') THEN
    IF v_target_trainee_id IS NULL THEN
      RAISE EXCEPTION 'trainee_id is required' USING ERRCODE = '22023';
    END IF;
  ELSE
    RAISE EXCEPTION 'Access denied: role % cannot record certificates', v_caller_role USING ERRCODE = '42501';
  END IF;

  -- Validate inputs: support both 'name' and 'certificate_name'
  v_cert_name := coalesce(
    nullif(trim(p_data->>'name'), ''),
    nullif(trim(p_data->>'certificate_name'), '')
  );
  IF v_cert_name IS NULL THEN
    RAISE EXCEPTION 'Certificate title/name is required' USING ERRCODE = '22023';
  END IF;

  v_course_title := coalesce(nullif(trim(p_data->>'course_title'), ''), 'Technical & Vocational Skills');
  v_issuing_body := coalesce(nullif(trim(p_data->>'issuing_body'), ''), 'NCVET Authorized Body');
  
  IF p_data->>'issued_at' IS NOT NULL AND p_data->>'issued_at' != '' THEN
    v_issued_date := (p_data->>'issued_at')::timestamptz;
  ELSE
    v_issued_date := now();
  END IF;

  v_cert_number := coalesce(
    nullif(trim(p_data->>'certificate_number'), ''),
    'CERT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  );

  -- Resolve or create course
  SELECT id INTO v_course_id FROM public.courses WHERE title ILIKE v_course_title LIMIT 1;
  IF v_course_id IS NULL THEN
    v_course_id := 'crs_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    INSERT INTO public.courses (id, title, category, created_at)
    VALUES (v_course_id, v_course_title, 'Technical Skills', now());
  END IF;

  -- Resolve or create certification definition
  SELECT id INTO v_cert_id FROM public.certifications 
  WHERE name ILIKE v_cert_name AND issuing_body ILIKE v_issuing_body LIMIT 1;

  IF v_cert_id IS NULL THEN
    v_cert_id := 'cert_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    INSERT INTO public.certifications (id, course_id, name, issuing_body, created_at)
    VALUES (v_cert_id, v_course_id, v_cert_name, v_issuing_body, now());
  END IF;

  -- Insert trainee certification link
  v_tc_id := 'tc_' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.trainee_certifications (
    id,
    trainee_id,
    certification_id,
    issued_at,
    certificate_number
  )
  VALUES (
    v_tc_id,
    v_target_trainee_id,
    v_cert_id,
    v_issued_date,
    v_cert_number
  );

  -- Record audit log
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
    'aud_' || replace(gen_random_uuid()::text, '-', ''),
    v_caller_uid,
    v_caller_role::text,
    'CERTIFICATION_RECORDED',
    'trainee_certifications',
    v_tc_id,
    jsonb_build_object(
      'trainee_id', v_target_trainee_id,
      'certification_name', v_cert_name,
      'certificate_number', v_cert_number,
      'issuing_body', v_issuing_body,
      'recorded_by_role', v_caller_role
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', v_tc_id,
    'certificate_number', v_cert_number,
    'certificate_name', v_cert_name,
    'issuing_body', v_issuing_body,
    'issued_at', v_issued_date,
    'message', 'Certificate successfully recorded and linked'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_trainee_certificate(JSONB) TO authenticated;
