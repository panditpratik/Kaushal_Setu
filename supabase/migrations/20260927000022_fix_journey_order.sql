-- ============================================================================
-- Migration: 20260927000022_fix_journey_order.sql
-- Description: Clean get_trainee_dossier without created_time in journey_items
-- ============================================================================

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
  v_trainee RECORD;
  v_user RECORD;
  v_target_trainee_id TEXT;
  v_verif_aadhaar TEXT := 'PENDING';
  v_verif_epfo TEXT := 'PENDING';
  v_current_cohort JSONB := NULL;
  v_training_history JSONB := '[]'::jsonb;
  v_certifications JSONB := '[]'::jsonb;
  v_active_employment JSONB := NULL;
  v_employment_records JSONB := '[]'::jsonb;
  v_salary_progression JSONB := NULL;
  v_follow_ups JSONB := '[]'::jsonb;
  v_skill_gaps JSONB := '[]'::jsonb;
  v_stages JSONB := '[]'::jsonb;
  v_journey JSONB := '[]'::jsonb;
  v_is_authorized BOOLEAN := FALSE;
  v_baseline_salary NUMERIC := NULL;
  v_baseline_date TIMESTAMPTZ := NULL;
  v_current_salary NUMERIC := NULL;
  v_current_date TIMESTAMPTZ := NULL;
  v_salary_delta_pct NUMERIC := 0.0;
  v_salary_count INT := 0;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view trainee dossier' USING ERRCODE = '42501';
  END IF;

  v_caller_role := public.current_user_role();

  -- Resolve target trainee
  IF p_id IS NULL OR lower(p_id) IN ('me', 'default', 'priya') THEN
    IF v_caller_role = 'TRAINEE' THEN
      SELECT * INTO v_trainee FROM public.trainees WHERE user_id = v_caller_uid LIMIT 1;
    ELSE
      SELECT t.* INTO v_trainee
      FROM public.trainees t
      JOIN public.profiles p ON p.id = t.user_id
      WHERE p.name ILIKE '%Priya%' OR p.email ILIKE '%priya%'
      LIMIT 1;

      IF v_trainee.id IS NULL THEN
        SELECT * INTO v_trainee FROM public.trainees ORDER BY created_at ASC LIMIT 1;
      END IF;
    END IF;
  ELSE
    SELECT * INTO v_trainee
    FROM public.trainees
    WHERE id = p_id OR user_id::text = p_id
    LIMIT 1;
  END IF;

  IF v_trainee.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trainee not found');
  END IF;

  v_target_trainee_id := v_trainee.id;

  -- Authorization enforcement
  IF v_trainee.user_id = v_caller_uid THEN
    v_is_authorized := TRUE;
  ELSIF v_caller_role = 'GOVERNMENT' THEN
    v_is_authorized := TRUE;
  ELSIF v_caller_role = 'TRAINING_PROVIDER' AND public.is_trainee_of_provider(v_target_trainee_id) THEN
    v_is_authorized := TRUE;
  ELSIF v_caller_role = 'EMPLOYER' AND public.is_candidate_of_employer(v_target_trainee_id) THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied: unauthorized to view trainee dossier %', v_target_trainee_id USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_user FROM public.profiles WHERE id = v_trainee.user_id;

  -- 1. Verifications
  SELECT status INTO v_verif_aadhaar FROM public.verifications WHERE trainee_id = v_target_trainee_id AND type = 'AADHAAR' ORDER BY created_at DESC LIMIT 1;
  SELECT status INTO v_verif_epfo FROM public.verifications WHERE trainee_id = v_target_trainee_id AND type = 'EPFO' ORDER BY created_at DESC LIMIT 1;

  -- 2. Current Cohort
  SELECT jsonb_build_object('name', c.name, 'trainingProvider', tp.org_name) INTO v_current_cohort
  FROM public.cohort_enrollments ce
  JOIN public.cohorts c ON c.id = ce.cohort_id
  JOIN public.training_providers tp ON tp.id = c.training_provider_id
  WHERE ce.trainee_id = v_target_trainee_id
  LIMIT 1;

  -- 3. Comprehensive Training History
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', ce.id,
    'cohortId', c.id,
    'programme', c.name,
    'providerName', tp.org_name,
    'enrolledAt', to_char(ce.enrolled_at, 'YYYY-MM-DD'),
    'startDate', to_char(c.start_date, 'YYYY-MM-DD'),
    'endDate', CASE WHEN c.end_date IS NOT NULL THEN to_char(c.end_date, 'YYYY-MM-DD') ELSE NULL END,
    'status', CASE 
      WHEN c.end_date IS NOT NULL AND c.end_date <= now() THEN 'COMPLETED'
      WHEN c.start_date <= now() THEN 'IN_PROGRESS'
      ELSE 'ENROLLED'
    END,
    'isCompleted', CASE WHEN c.end_date IS NOT NULL AND c.end_date <= now() THEN true ELSE false END
  ) ORDER BY ce.enrolled_at DESC), '[]'::jsonb) INTO v_training_history
  FROM public.cohort_enrollments ce
  JOIN public.cohorts c ON c.id = ce.cohort_id
  JOIN public.training_providers tp ON tp.id = c.training_provider_id
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
  )), '[]'::jsonb) INTO v_certifications
  FROM public.trainee_certifications tc
  JOIN public.certifications crt ON crt.id = tc.certification_id
  JOIN public.courses crs ON crs.id = crt.course_id
  WHERE tc.trainee_id = v_target_trainee_id;

  -- 5. Active Employment (Tie-break by created_at DESC)
  SELECT jsonb_build_object(
    'jobTitle', er.job_title,
    'employerName', coalesce(er.employer_name, emp.company_name, 'Tata Motors Ancillary Ltd.'),
    'monthlySalary', er.monthly_salary,
    'employmentType', er.employment_type,
    'startDate', to_char(er.start_date, 'YYYY-MM-DD'),
    'tenureMonths', EXTRACT(MONTH FROM age(now(), er.start_date))::int,
    'validationStatus', coalesce(er.validation_status, 'PENDING')
  ) INTO v_active_employment
  FROM public.employment_records er
  LEFT JOIN public.employers emp ON emp.id = er.employer_id
  WHERE er.trainee_id = v_target_trainee_id AND (er.end_date IS NULL OR er.end_date > now())
  ORDER BY er.start_date DESC, er.created_at DESC
  LIMIT 1;

  -- 6. Employment Records History
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', er.id,
    'jobTitle', er.job_title,
    'employerName', coalesce(er.employer_name, emp.company_name, 'Tata Motors Ancillary Ltd.'),
    'monthlySalary', er.monthly_salary,
    'employmentType', er.employment_type,
    'startDate', to_char(er.start_date, 'YYYY-MM-DD'),
    'endDate', CASE WHEN er.end_date IS NOT NULL THEN to_char(er.end_date, 'YYYY-MM-DD') ELSE NULL END,
    'validationStatus', coalesce(er.validation_status, 'PENDING')
  ) ORDER BY er.start_date DESC, er.created_at DESC), '[]'::jsonb) INTO v_employment_records
  FROM public.employment_records er
  LEFT JOIN public.employers emp ON emp.id = er.employer_id
  WHERE er.trainee_id = v_target_trainee_id;

  -- 7. Salary Progression Calculation (From real chronological records)
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
      'baselineDate', to_char(v_baseline_date, 'YYYY-MM-DD'),
      'currentSalary', v_current_salary,
      'currentDate', to_char(v_current_date, 'YYYY-MM-DD'),
      'absoluteChange', (v_current_salary - v_baseline_salary),
      'percentChange', v_salary_delta_pct
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

  -- 9. Real Skill Gaps & Assessment Records
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', sg.id,
    'skillName', sg.skill_name,
    'severity', sg.severity,
    'assessmentDate', to_char(sa.assessment_date, 'YYYY-MM-DD'),
    'overallScore', sa.overall_score,
    'assessorType', sa.assessor_type,
    'interventionType', i.type,
    'providerName', i.provider_name,
    'interventionStatus', i.status
  ) ORDER BY sa.assessment_date DESC), '[]'::jsonb) INTO v_skill_gaps
  FROM public.skill_assessments sa
  JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
  LEFT JOIN public.interventions i ON i.skill_gap_id = sg.id
  WHERE sa.trainee_id = v_target_trainee_id;

  -- 10. Stages / Lifecycle Stages
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'assessment', jsonb_build_object('id', sa.id, 'date', to_char(sa.assessment_date, 'YYYY-MM-DD'), 'overallScore', sa.overall_score),
    'skillGap', jsonb_build_object('id', sg.id, 'skillName', sg.skill_name, 'severity', sg.severity),
    'intervention', jsonb_build_object('id', i.id, 'type', i.type, 'providerName', i.provider_name, 'status', i.status, 'startDate', to_char(i.start_date, 'YYYY-MM-DD'), 'endDate', to_char(i.end_date, 'YYYY-MM-DD')),
    'outcome', jsonb_build_object('id', o.id, 'type', o.outcome_type, 'wageLiftPercent', o.wage_lift_percent, 'employerName', emp.company_name, 'recordedAt', to_char(o.recorded_at, 'YYYY-MM-DD'), 'validationStatus', o.validation_status)
  ) ORDER BY sa.assessment_date ASC), '[]'::jsonb) INTO v_stages
  FROM public.skill_assessments sa
  JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
  JOIN public.interventions i ON i.skill_gap_id = sg.id
  LEFT JOIN public.outcomes o ON o.intervention_id = i.id
  LEFT JOIN public.employers emp ON emp.id = o.employer_id
  WHERE sa.trainee_id = v_target_trainee_id;

  -- 11. Chronological Journey
  WITH journey_items AS (
    -- Enrollment
    SELECT 
      ce.enrolled_at as event_time,
      'TRAINING_ENROLLED' as stage_type,
      'Enrolled in ' || c.name as title,
      tp.org_name as organization,
      'Completed' as status
    FROM public.cohort_enrollments ce
    JOIN public.cohorts c ON c.id = ce.cohort_id
    JOIN public.training_providers tp ON tp.id = c.training_provider_id
    WHERE ce.trainee_id = v_target_trainee_id

    UNION ALL

    -- Certification
    SELECT 
      tc.issued_at as event_time,
      'CERTIFICATION_ISSUED' as stage_type,
      'Certified: ' || crt.name as title,
      crt.issuing_body as organization,
      'Verified' as status
    FROM public.trainee_certifications tc
    JOIN public.certifications crt ON crt.id = tc.certification_id
    WHERE tc.trainee_id = v_target_trainee_id

    UNION ALL

    -- Employment
    SELECT 
      er.start_date as event_time,
      'EMPLOYMENT_PLACED' as stage_type,
      'Placed as ' || er.job_title as title,
      coalesce(er.employer_name, 'Industrial Employer') as organization,
      CASE WHEN er.validation_status = 'VERIFIED' THEN 'Validated' ELSE 'Active' END as status
    FROM public.employment_records er
    WHERE er.trainee_id = v_target_trainee_id

    UNION ALL

    -- Follow-up
    SELECT 
      f.follow_up_date as event_time,
      'FOLLOW_UP_AUDIT' as stage_type,
      coalesce(f.retention_status, 'Longitudinal Follow-up Audit') as title,
      'KaushalSetu Outcome Observatory' as organization,
      f.status as status
    FROM public.follow_ups f
    WHERE f.trainee_id = v_target_trainee_id
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'date', to_char(event_time, 'YYYY-MM-DD'),
    'type', stage_type,
    'title', title,
    'organization', organization,
    'status', status
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
      'consentVersion', v_trainee.consent_version,
      'selfEmploymentCategory', v_trainee.self_employment_category,
      'selfEmploymentIncome', v_trainee.self_employment_income,
      'apprenticeshipEmployer', v_trainee.apprenticeship_employer,
      'unemploymentReason', v_trainee.unemployment_reason,
      'unemploymentNotes', v_trainee.unemployment_notes
    ),
    'verification', jsonb_build_object('aadhaar', v_verif_aadhaar, 'epfo', v_verif_epfo),
    'cohort', v_current_cohort,
    'trainingHistory', v_training_history,
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
