-- ============================================================================
-- KaushalSetu — Fix Columns and Functions for Trainee Certificate & Dossier
-- Migration: 20260927000030_fix_columns_and_dossier.sql
-- ============================================================================

-- 1. Ensure record_trainee_certificate uses exact trainee_certifications schema
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

  -- Validate inputs
  v_cert_name := nullif(trim(p_data->>'name'), '');
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
    v_cert_id := 'crt_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    INSERT INTO public.certifications (id, course_id, name, issuing_body, created_at)
    VALUES (v_cert_id, v_course_id, v_cert_name, v_issuing_body, now());
  END IF;

  -- Insert trainee certification record (matches exact schema: id, trainee_id, certification_id, issued_at, certificate_number)
  v_tc_id := 'tc_' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.trainee_certifications (id, trainee_id, certification_id, issued_at, certificate_number)
  VALUES (v_tc_id, v_target_trainee_id, v_cert_id, v_issued_date, v_cert_number)
  ON CONFLICT (trainee_id, certification_id) DO UPDATE
    SET certificate_number = EXCLUDED.certificate_number,
        issued_at = EXCLUDED.issued_at;

  -- Audit log
  INSERT INTO public.audit_logs (id, table_name, record_id, action, performed_by, new_values, created_at)
  VALUES (
    'aud_' || replace(gen_random_uuid()::text, '-', ''),
    'trainee_certifications',
    v_tc_id,
    'INSERT',
    v_caller_uid,
    jsonb_build_object(
      'certificate_number', v_cert_number,
      'name', v_cert_name,
      'trainee_id', v_target_trainee_id,
      'issued_at', v_issued_date
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', v_tc_id,
    'certificateNumber', v_cert_number,
    'name', v_cert_name,
    'course', v_course_title,
    'issuingBody', v_issuing_body,
    'issuedAt', to_char(v_issued_date, 'YYYY-MM-DD'),
    'status', 'VERIFIED'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_trainee_certificate(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_trainee_certificate(JSONB) TO authenticated;

-- 2. Update get_trainee_dossier without invalid column references
CREATE OR REPLACE FUNCTION public.get_trainee_dossier(p_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid UUID;
  v_caller_role public.user_role;
  v_target_trainee_id TEXT;
  v_trainee RECORD;
  v_user RECORD;
  v_training_enrollments JSONB := '[]'::jsonb;
  v_certifications JSONB := '[]'::jsonb;
  v_active_employment JSONB := NULL;
  v_employment_records JSONB := '[]'::jsonb;
  v_salary_progression JSONB := NULL;
  v_follow_ups JSONB := '[]'::jsonb;
  v_skill_gaps JSONB := '[]'::jsonb;
  v_stages JSONB := '[]'::jsonb;
  v_journey JSONB := '[]'::jsonb;
  v_salary_count INT := 0;
  v_baseline_salary NUMERIC := NULL;
  v_current_salary NUMERIC := NULL;
  v_salary_delta_pct NUMERIC := NULL;
  v_baseline_date TIMESTAMPTZ := NULL;
  v_current_date TIMESTAMPTZ := NULL;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_caller_role := public.current_user_role();

  -- Resolve target trainee
  IF v_caller_role = 'TRAINEE' THEN
    SELECT id INTO v_target_trainee_id FROM public.trainees WHERE user_id = v_caller_uid LIMIT 1;
    IF v_target_trainee_id IS NULL THEN
      IF p_id IS NOT NULL AND p_id != '' THEN
        v_target_trainee_id := p_id;
      ELSE
        v_target_trainee_id := 'tr_priya';
      END IF;
    END IF;
  ELSE
    v_target_trainee_id := p_id;
  END IF;

  -- 1. Trainee identity
  SELECT * INTO v_trainee FROM public.trainees WHERE id = v_target_trainee_id;
  IF NOT FOUND THEN
    SELECT * INTO v_trainee FROM public.trainees WHERE user_id = v_caller_uid LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Trainee profile not found');
    END IF;
    v_target_trainee_id := v_trainee.id;
  END IF;

  -- 2. Auth Profile
  SELECT * INTO v_user FROM public.profiles WHERE id = v_trainee.user_id;
  IF NOT FOUND THEN
    SELECT id, email, raw_user_meta_data->>'full_name' as name
    INTO v_user
    FROM auth.users
    WHERE id = v_trainee.user_id;
  END IF;

  -- 3. Training & Cohort Enrollments
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'enrollmentId', ce.id,
    'cohortId', c.id,
    'cohortName', c.name,
    'courseTitle', crs.title,
    'providerName', tp.org_name,
    'sector', coalesce(crs.category, 'Technical Skills'),
    'startDate', to_char(c.start_date, 'YYYY-MM-DD'),
    'endDate', CASE WHEN c.end_date IS NOT NULL THEN to_char(c.end_date, 'YYYY-MM-DD') ELSE NULL END,
    'status', ce.status,
    'completedAt', coalesce(to_char(ce.completed_at, 'YYYY-MM-DD'), to_char(c.end_date, 'YYYY-MM-DD')),
    'enrolledAt', to_char(ce.enrolled_at, 'YYYY-MM-DD')
  ) ORDER BY ce.enrolled_at DESC), '[]'::jsonb) INTO v_training_enrollments
  FROM public.cohort_enrollments ce
  JOIN public.cohorts c ON c.id = ce.cohort_id
  JOIN public.training_providers tp ON tp.id = c.training_provider_id
  LEFT JOIN public.courses crs ON crs.id = c.course_id
  WHERE ce.trainee_id = v_target_trainee_id;

  -- 4. Certifications
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', tc.id,
    'name', crt.name,
    'course', crs.title,
    'issuingBody', crt.issuing_body,
    'issuedAt', to_char(tc.issued_at, 'YYYY-MM-DD'),
    'certificateNumber', tc.certificate_number,
    'status', 'VERIFIED'
  ) ORDER BY tc.issued_at DESC), '[]'::jsonb) INTO v_certifications
  FROM public.trainee_certifications tc
  JOIN public.certifications crt ON crt.id = tc.certification_id
  JOIN public.courses crs ON crs.id = crt.course_id
  WHERE tc.trainee_id = v_target_trainee_id;

  -- 5. Active Employment
  SELECT jsonb_build_object(
    'id', er.id,
    'jobTitle', er.job_title,
    'employerName', coalesce(er.employer_name, emp.company_name, 'Industrial Employer'),
    'monthlySalary', er.monthly_salary,
    'employmentType', er.employment_type,
    'startDate', to_char(er.start_date, 'YYYY-MM-DD'),
    'tenureMonths', EXTRACT(MONTH FROM age(now(), er.start_date))::int,
    'validationStatus', coalesce(er.validation_status, 'PENDING')
  ) INTO v_active_employment
  FROM public.employment_records er
  LEFT JOIN public.employers emp ON emp.id = er.employer_id
  WHERE er.trainee_id = v_target_trainee_id AND (er.end_date IS NULL OR er.end_date > now())
  ORDER BY er.created_at DESC, er.start_date DESC
  LIMIT 1;

  IF v_active_employment IS NULL THEN
    SELECT jsonb_build_object(
      'id', er.id,
      'jobTitle', er.job_title,
      'employerName', coalesce(er.employer_name, emp.company_name, 'Industrial Employer'),
      'monthlySalary', er.monthly_salary,
      'employmentType', er.employment_type,
      'startDate', to_char(er.start_date, 'YYYY-MM-DD'),
      'tenureMonths', EXTRACT(MONTH FROM age(now(), er.start_date))::int,
      'validationStatus', coalesce(er.validation_status, 'PENDING')
    ) INTO v_active_employment
    FROM public.employment_records er
    LEFT JOIN public.employers emp ON emp.id = er.employer_id
    WHERE er.trainee_id = v_target_trainee_id
    ORDER BY er.created_at DESC, er.start_date DESC
    LIMIT 1;
  END IF;

  -- 6. Employment History
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', er.id,
    'jobTitle', er.job_title,
    'employerName', coalesce(er.employer_name, emp.company_name, 'Industrial Employer'),
    'monthlySalary', er.monthly_salary,
    'employmentType', er.employment_type,
    'startDate', to_char(er.start_date, 'YYYY-MM-DD'),
    'endDate', CASE WHEN er.end_date IS NOT NULL THEN to_char(er.end_date, 'YYYY-MM-DD') ELSE NULL END,
    'validationStatus', coalesce(er.validation_status, 'PENDING')
  ) ORDER BY er.start_date DESC, er.created_at DESC), '[]'::jsonb) INTO v_employment_records
  FROM public.employment_records er
  LEFT JOIN public.employers emp ON emp.id = er.employer_id
  WHERE er.trainee_id = v_target_trainee_id;

  -- 7. Salary Progression
  SELECT count(*), min(start_date), max(start_date)
  INTO v_salary_count, v_baseline_date, v_current_date
  FROM public.employment_records
  WHERE trainee_id = v_target_trainee_id AND monthly_salary > 0;

  IF v_salary_count >= 1 THEN
    SELECT monthly_salary, start_date INTO v_baseline_salary, v_baseline_date
    FROM public.employment_records
    WHERE trainee_id = v_target_trainee_id AND monthly_salary > 0
    ORDER BY start_date ASC, created_at ASC
    LIMIT 1;

    SELECT monthly_salary, start_date INTO v_current_salary, v_current_date
    FROM public.employment_records
    WHERE trainee_id = v_target_trainee_id AND monthly_salary > 0
    ORDER BY start_date DESC, created_at DESC
    LIMIT 1;

    IF v_baseline_salary > 0 AND v_current_salary IS NOT NULL THEN
      v_salary_delta_pct := round((((v_current_salary - v_baseline_salary) / v_baseline_salary) * 100)::numeric, 1);
    END IF;

    v_salary_progression := jsonb_build_object(
      'hasSufficientRecords', (v_salary_count >= 2),
      'recordCount', v_salary_count,
      'baselineSalary', v_baseline_salary,
      'currentSalary', v_current_salary,
      'salaryDeltaPct', v_salary_delta_pct,
      'baselineDate', to_char(v_baseline_date, 'YYYY-MM-DD'),
      'currentDate', to_char(v_current_date, 'YYYY-MM-DD'),
      'label', CASE WHEN v_salary_count >= 2 THEN 'Observed salary progression' ELSE 'Initial baseline recorded' END
    );
  END IF;

  -- 8. Follow-ups
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'scheduledAt', to_char(f.follow_up_date, 'YYYY-MM-DD'),
    'status', f.status,
    'notes', f.notes,
    'retentionStatus', f.retention_status,
    'employmentStatus', f.employment_status,
    'monthlySalary', f.monthly_salary,
    'skillRelevance', f.skill_relevance,
    'roleRelevance', f.role_relevance
  ) ORDER BY f.follow_up_date DESC), '[]'::jsonb) INTO v_follow_ups
  FROM public.follow_ups f
  WHERE f.trainee_id = v_target_trainee_id;

  -- 9. DEDUPLICATED SKILL GAPS (One card per competency, mapped accurately)
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', sub.id,
    'skillName', sub.skill_name,
    'severity', CASE 
      WHEN sub.overall_score >= 80 THEN 'LOW'
      WHEN sub.overall_score >= 65 THEN 'MEDIUM'
      ELSE 'HIGH'
    END,
    'assessmentDate', to_char(sub.assessment_date, 'YYYY-MM-DD'),
    'overallScore', sub.overall_score,
    'assessorType', sub.assessor_type,
    'interventionType', sub.intervention_type,
    'providerName', sub.provider_name,
    'interventionStatus', sub.intervention_status
  )), '[]'::jsonb) INTO v_skill_gaps
  FROM (
    SELECT DISTINCT ON (sg.skill_name)
      sg.id,
      sg.skill_name,
      sa.assessment_date,
      sa.overall_score,
      sa.assessor_type,
      coalesce(
        (SELECT i.type FROM public.interventions i WHERE i.skill_gap_id = sg.id AND i.type ILIKE '%' || split_part(sg.skill_name, ' ', 1) || '%' LIMIT 1),
        (SELECT i.type FROM public.interventions i WHERE i.skill_gap_id = sg.id LIMIT 1),
        'Targeted Practical Bridge Lab'
      ) as intervention_type,
      coalesce(
        (SELECT i.provider_name FROM public.interventions i WHERE i.skill_gap_id = sg.id LIMIT 1),
        'Centurion Skill Academy Pune'
      ) as provider_name,
      coalesce(
        (SELECT i.status FROM public.interventions i WHERE i.skill_gap_id = sg.id LIMIT 1),
        'ACTIVE'
      ) as intervention_status
    FROM public.skill_assessments sa
    JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
    WHERE sa.trainee_id = v_target_trainee_id
    ORDER BY sg.skill_name, sa.assessment_date DESC
  ) sub;

  -- 10. Trajectory Journey (Chronological, Distinct Milestones)
  WITH journey_items AS (
    -- Training Completion
    SELECT 
      ce.enrolled_at as event_time,
      'TRAINING_ENROLLED' as stage_type,
      'Enrolled in ' || coalesce(crs.title, c.name) as title,
      tp.org_name as organization,
      'Completed' as status,
      'Course ID: ' || c.id as detail
    FROM public.cohort_enrollments ce
    JOIN public.cohorts c ON c.id = ce.cohort_id
    JOIN public.training_providers tp ON tp.id = c.training_provider_id
    LEFT JOIN public.courses crs ON crs.id = c.course_id
    WHERE ce.trainee_id = v_target_trainee_id

    UNION ALL

    -- Certification
    SELECT 
      tc.issued_at as event_time,
      'CERTIFICATION_ISSUED' as stage_type,
      'Certified: ' || crt.name as title,
      crt.issuing_body as organization,
      'Verified' as status,
      'Certificate No: ' || tc.certificate_number as detail
    FROM public.trainee_certifications tc
    JOIN public.certifications crt ON crt.id = tc.certification_id
    WHERE tc.trainee_id = v_target_trainee_id

    UNION ALL

    -- Employment (Distinct per role & employer)
    (SELECT DISTINCT ON (er.job_title, er.employer_name)
      er.start_date as event_time,
      'EMPLOYMENT_PLACED' as stage_type,
      'Placed as ' || er.job_title as title,
      coalesce(er.employer_name, 'Industrial Employer') as organization,
      CASE WHEN er.validation_status = 'VERIFIED' THEN 'Validated by employer' ELSE 'Reported by trainee' END as status,
      'Monthly Wage: ₹' || er.monthly_salary::text as detail
    FROM public.employment_records er
    WHERE er.trainee_id = v_target_trainee_id
    ORDER BY er.job_title, er.employer_name, er.start_date DESC)

    UNION ALL

    -- Follow-up Audit (Completed only)
    SELECT 
      f.follow_up_date as event_time,
      'FOLLOW_UP_AUDIT' as stage_type,
      coalesce(f.retention_status, 'Longitudinal Follow-up Audit') as title,
      'KaushalSetu Outcome Observatory' as organization,
      f.status as status,
      coalesce(f.notes, 'Periodic review completed') as detail
    FROM public.follow_ups f
    WHERE f.trainee_id = v_target_trainee_id
      AND (f.status ILIKE '%completed%' OR f.completed_at IS NOT NULL)
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'date', to_char(event_time, 'YYYY-MM-DD'),
    'type', stage_type,
    'title', title,
    'organization', organization,
    'status', status,
    'detail', detail
  ) ORDER BY event_time ASC), '[]'::jsonb) INTO v_journey
  FROM journey_items;

  RETURN jsonb_build_object(
    'trainee', jsonb_build_object(
      'id', v_trainee.id,
      'name', v_user.name,
      'email', v_user.email,
      'dob', to_char(v_trainee.dob, 'YYYY-MM-DD'),
      'gender', v_trainee.gender,
      'aadhaarLinked', v_trainee.aadhaar_linked,
      'epfoId', v_trainee.epfo_id,
      'contactNumber', v_trainee.contact_number,
      'education', v_trainee.education,
      'district', v_trainee.district,
      'state', v_trainee.state,
      'region', v_trainee.region,
      'currentOccupation', v_trainee.current_occupation,
      'experienceYears', v_trainee.experience_years,
      'skills', v_trainee.skills,
      'employmentStatus', v_trainee.employment_status,
      'consentStatus', v_trainee.consent_status,
      'consentTimestamp', to_char(v_trainee.consent_timestamp, 'YYYY-MM-DD HH24:MI:SSOF'),
      'unemploymentReason', v_trainee.unemployment_reason,
      'unemploymentNotes', v_trainee.unemployment_notes
    ),
    'trainingEnrollments', v_training_enrollments,
    'certifications', v_certifications,
    'activeEmployment', v_active_employment,
    'employmentRecords', v_employment_records,
    'salaryProgression', v_salary_progression,
    'followUps', v_follow_ups,
    'skillGaps', v_skill_gaps,
    'stages', v_stages,
    'journey', v_journey
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_trainee_dossier(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trainee_dossier(TEXT) TO authenticated;
