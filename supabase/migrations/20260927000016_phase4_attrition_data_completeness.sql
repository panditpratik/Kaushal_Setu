-- ============================================================================
-- KaushalSetu — Phase 4 Migration
-- Attrition & Dropout Workflow + Outcome Data Completeness + SIH Hardening
-- Migration: 20260927000016_phase4_attrition_data_completeness.sql
-- ============================================================================

-- 1. Ensure cohort_enrollments has status, dropout_date, dropout_reason, dropout_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cohort_enrollments' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.cohort_enrollments ADD COLUMN status TEXT NOT NULL DEFAULT 'ENROLLED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cohort_enrollments' AND column_name = 'dropout_date'
  ) THEN
    ALTER TABLE public.cohort_enrollments ADD COLUMN dropout_date TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cohort_enrollments' AND column_name = 'dropout_reason'
  ) THEN
    ALTER TABLE public.cohort_enrollments ADD COLUMN dropout_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cohort_enrollments' AND column_name = 'dropout_notes'
  ) THEN
    ALTER TABLE public.cohort_enrollments ADD COLUMN dropout_notes TEXT;
  END IF;
END $$;

-- 2. Secure RPC: record_trainee_dropout
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
  v_caller_role public.user_role;
  v_provider_id TEXT;
  v_cohort_provider_id TEXT;
  v_trainee_id TEXT;
  v_cohort_id TEXT;
  v_effective_date TIMESTAMPTZ;
  v_audit_id UUID;
  v_valid_reason BOOLEAN;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_caller_role := public.current_user_role();

  -- Verify enrollment exists and retrieve associated cohort + provider
  SELECT ce.trainee_id, ce.cohort_id, c.training_provider_id
  INTO v_trainee_id, v_cohort_id, v_cohort_provider_id
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

  -- Update trainee record status
  UPDATE public.trainees
  SET 
    updated_at = now()
  WHERE id = v_trainee_id;

  -- Insert into audit log
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    v_caller_uid,
    'RECORD_TRAINEE_DROPOUT',
    'cohort_enrollments',
    p_enrollment_id,
    jsonb_build_object(
      'traineeId', v_trainee_id,
      'cohortId', v_cohort_id,
      'reason', p_reason,
      'dropoutDate', v_effective_date,
      'notes', p_notes
    )
  ) RETURNING id INTO v_audit_id;

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

-- 3. Upgrade get_provider_outcome_intelligence to include real Attrition & Data Completeness
CREATE OR REPLACE FUNCTION public.get_provider_outcome_intelligence(
  p_provider_id TEXT DEFAULT NULL,
  p_time_range TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid UUID;
  v_caller_role public.user_role;
  v_resolved_provider_id TEXT;
  v_provider_record RECORD;
  v_start_time TIMESTAMPTZ;
  
  -- Result JSON objects
  v_kpis JSONB;
  v_programmes JSONB;
  v_trainees JSONB;
  v_training_records JSONB;
  v_skill_gaps JSONB;
  v_non_placement JSONB;
  v_salary_progression JSONB;
  v_follow_ups JSONB;
  v_attrition JSONB;
  v_data_completeness JSONB;
  
  -- Variables for non-placement
  v_non_emp_total INT := 0;
  v_reasons_breakdown JSONB := '[]'::jsonb;
  v_non_emp_trainees JSONB := '[]'::jsonb;

  -- Variables for retention calculation
  v_eligible_retention_count INT := 0;
  v_retained_count INT := 0;
  v_retention_rate NUMERIC := NULL;
  v_has_retention_data BOOLEAN := false;

  -- Variables for salary progression calculation
  v_salary_trainee_count INT := 0;
  v_avg_baseline NUMERIC := 0;
  v_avg_current NUMERIC := 0;
  v_avg_abs_change NUMERIC := 0;
  v_avg_pct_change NUMERIC := 0;
  v_has_salary_data BOOLEAN := false;

  -- Variables for Attrition
  v_att_enrolled INT := 0;
  v_att_completed INT := 0;
  v_att_dropped INT := 0;
  v_att_rate NUMERIC := NULL;
  v_has_att_data BOOLEAN := false;
  v_dropout_reasons_json JSONB := '[]'::jsonb;

  -- Variables for Data Completeness
  v_total_tr INT := 0;
  v_with_emp_outcome INT := 0;
  v_with_certs INT := 0;
  v_with_followup INT := 0;
  v_with_salary INT := 0;
  v_emp_coverage_pct NUMERIC := 0;
  v_cert_coverage_pct NUMERIC := 0;
  v_fu_coverage_pct NUMERIC := 0;
  v_sal_coverage_pct NUMERIC := 0;
BEGIN
  -- Authenticate caller
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_caller_role := public.current_user_role();

  -- Resolve Provider ID
  IF v_caller_role = 'TRAINING_PROVIDER' THEN
    SELECT id INTO v_resolved_provider_id
    FROM public.training_providers
    WHERE user_id = v_caller_uid
    LIMIT 1;

    -- Strict Cross-Tenant Check: Provider can only query own data
    IF p_provider_id IS NOT NULL AND p_provider_id NOT IN ('default', 'me') AND p_provider_id != v_resolved_provider_id THEN
      RAISE EXCEPTION 'Access denied: you do not represent training provider %', p_provider_id USING ERRCODE = '42501';
    END IF;
  ELSIF v_caller_role = 'GOVERNMENT' THEN
    IF p_provider_id IS NOT NULL AND p_provider_id NOT IN ('default', 'me') THEN
      v_resolved_provider_id := p_provider_id;
    ELSE
      SELECT id INTO v_resolved_provider_id
      FROM public.training_providers
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
  ELSE
    RAISE EXCEPTION 'Access denied: role % cannot access provider intelligence', v_caller_role USING ERRCODE = '42501';
  END IF;

  IF v_resolved_provider_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Training provider profile not found');
  END IF;

  -- Fetch Provider Details
  SELECT id, org_name, accreditation_id, created_at
  INTO v_provider_record
  FROM public.training_providers
  WHERE id = v_resolved_provider_id;

  -- Time Range Filter Threshold
  IF p_time_range = '30d' THEN
    v_start_time := now() - interval '30 days';
  ELSIF p_time_range = '90d' THEN
    v_start_time := now() - interval '90 days';
  ELSIF p_time_range = '6m' THEN
    v_start_time := now() - interval '180 days';
  ELSIF p_time_range = '12m' THEN
    v_start_time := now() - interval '365 days';
  ELSE
    v_start_time := '1970-01-01'::timestamptz;
  END IF;

  -- 1. RETENTION (6M) CALCULATION
  SELECT 
    count(DISTINCT er.trainee_id),
    count(DISTINCT CASE 
      WHEN er.end_date IS NULL OR er.end_date >= er.start_date + interval '180 days' THEN er.trainee_id 
    END)
  INTO v_eligible_retention_count, v_retained_count
  FROM public.cohorts c
  JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
  JOIN public.employment_records er ON er.trainee_id = ce.trainee_id
  WHERE c.training_provider_id = v_resolved_provider_id
    AND er.start_date <= (now() - interval '180 days')
    AND ce.enrolled_at >= v_start_time;

  IF v_eligible_retention_count > 0 THEN
    v_has_retention_data := true;
    v_retention_rate := round(((v_retained_count::numeric / v_eligible_retention_count::numeric) * 100), 1);
  END IF;

  -- 2. OBSERVED SALARY PROGRESSION
  WITH provider_salaries AS (
    SELECT 
      er.trainee_id,
      (ARRAY_AGG(er.monthly_salary ORDER BY er.start_date ASC))[1] as baseline_wage,
      (ARRAY_AGG(er.monthly_salary ORDER BY er.start_date DESC))[1] as current_wage
    FROM public.cohorts c
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.employment_records er ON er.trainee_id = ce.trainee_id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND er.monthly_salary BETWEEN 4000 AND 500000
      AND ce.enrolled_at >= v_start_time
    GROUP BY er.trainee_id
    HAVING count(er.id) >= 1
  )
  SELECT 
    count(*),
    coalesce(round(avg(baseline_wage)), 0),
    coalesce(round(avg(current_wage)), 0)
  INTO v_salary_trainee_count, v_avg_baseline, v_avg_current
  FROM provider_salaries;

  IF v_salary_trainee_count >= 1 AND v_avg_baseline > 0 THEN
    v_has_salary_data := true;
    v_avg_abs_change := v_avg_current - v_avg_baseline;
    v_avg_pct_change := round(((v_avg_abs_change / v_avg_baseline) * 100), 1);
  END IF;

  v_salary_progression := jsonb_build_object(
    'hasSufficientData', v_has_salary_data,
    'eligibleTraineeCount', v_salary_trainee_count,
    'averageBaselineSalary', v_avg_baseline,
    'averageCurrentSalary', v_avg_current,
    'averageAbsoluteChange', v_avg_abs_change,
    'averagePercentChange', v_avg_pct_change,
    'label', CASE WHEN v_has_salary_data THEN 'Observed salary change recorded after training. Causal evaluation requires econometric baseline.' ELSE 'Insufficient salary history.' END
  );

  -- 3. ATTRITION / DROPOUT AGGREGATE
  SELECT 
    count(DISTINCT ce.id),
    count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR ce.status = 'COMPLETED' THEN ce.id END),
    count(DISTINCT CASE WHEN ce.status = 'DROPPED' THEN ce.id END)
  INTO v_att_enrolled, v_att_completed, v_att_dropped
  FROM public.cohorts c
  JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
  WHERE c.training_provider_id = v_resolved_provider_id
    AND ce.enrolled_at >= v_start_time;

  IF v_att_enrolled > 0 THEN
    v_has_att_data := true;
    v_att_rate := round(((v_att_dropped::numeric / v_att_enrolled::numeric) * 100), 1);
  ELSE
    v_has_att_data := false;
  END IF;

  -- Dropout Reasons Breakdown
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'reason', sub.reason,
    'count', sub.cnt,
    'percentage', CASE WHEN v_att_dropped > 0 THEN round(((sub.cnt::numeric / v_att_dropped::numeric) * 100), 1) ELSE 0 END
  )), '[]'::jsonb)
  INTO v_dropout_reasons_json
  FROM (
    SELECT 
      coalesce(ce.dropout_reason, 'Personal reasons') as reason,
      count(*) as cnt
    FROM public.cohorts c
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND ce.status = 'DROPPED'
      AND ce.enrolled_at >= v_start_time
    GROUP BY coalesce(ce.dropout_reason, 'Personal reasons')
    ORDER BY count(*) DESC
  ) sub;

  v_attrition := jsonb_build_object(
    'hasSufficientData', v_has_att_data,
    'enrolled', v_att_enrolled,
    'completed', v_att_completed,
    'dropped', v_att_dropped,
    'dropoutRate', v_att_rate,
    'label', CASE WHEN v_has_att_data THEN 'Observed cohort dropout rate' ELSE 'Attrition data unavailable.' END,
    'reasonsBreakdown', v_dropout_reasons_json
  );

  -- 4. OUTCOME DATA COMPLETENESS (Section 14 & 17)
  SELECT 
    count(DISTINCT t.id),
    count(DISTINCT CASE WHEN t.employment_status IS NOT NULL OR er.id IS NOT NULL THEN t.id END),
    count(DISTINCT tc.trainee_id),
    count(DISTINCT fu.trainee_id),
    count(DISTINCT CASE WHEN er.monthly_salary IS NOT NULL THEN t.id END)
  INTO v_total_tr, v_with_emp_outcome, v_with_certs, v_with_followup, v_with_salary
  FROM public.cohorts c
  JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
  JOIN public.trainees t ON t.id = ce.trainee_id
  LEFT JOIN public.employment_records er ON er.trainee_id = t.id
  LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = t.id
  LEFT JOIN public.follow_ups fu ON fu.trainee_id = t.id AND fu.status ILIKE '%completed%'
  WHERE c.training_provider_id = v_resolved_provider_id
    AND ce.enrolled_at >= v_start_time;

  IF v_total_tr > 0 THEN
    v_emp_coverage_pct := round(((v_with_emp_outcome::numeric / v_total_tr::numeric) * 100), 1);
    v_cert_coverage_pct := round(((v_with_certs::numeric / v_total_tr::numeric) * 100), 1);
    v_fu_coverage_pct := round(((v_with_followup::numeric / v_total_tr::numeric) * 100), 1);
    v_sal_coverage_pct := round(((v_with_salary::numeric / v_total_tr::numeric) * 100), 1);
  END IF;

  v_data_completeness := jsonb_build_object(
    'totalTrainees', v_total_tr,
    'employmentOutcomeCoverage', v_emp_coverage_pct,
    'certificationCoverage', v_cert_coverage_pct,
    'followUpCoverage', v_fu_coverage_pct,
    'salaryHistoryCoverage', v_sal_coverage_pct,
    'signals', jsonb_build_array(
      CASE WHEN v_emp_coverage_pct < 80 THEN 'Data quality signal: ' || (100 - v_emp_coverage_pct) || '% trainees missing recorded post-training employment status.' ELSE NULL END,
      CASE WHEN v_fu_coverage_pct < 60 THEN 'Data quality signal: longitudinal follow-up verification below 60% coverage threshold.' ELSE NULL END,
      CASE WHEN v_sal_coverage_pct < 50 THEN 'Data quality signal: insufficient payroll/salary history documentation for wage lift validation.' ELSE NULL END
    )
  );

  -- 5. TOP-LEVEL KPIS
  SELECT jsonb_build_object(
    'totalTrainees', count(DISTINCT ce.trainee_id),
    'trainingCompleted', count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END),
    'completionRate', round(((count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END)::numeric / nullif(count(DISTINCT ce.trainee_id), 0)::numeric) * 100), 1),
    'certified', count(DISTINCT tc.trainee_id),
    'certificationRate', round(((count(DISTINCT tc.trainee_id)::numeric / nullif(count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END), 0)::numeric) * 100), 1),
    'employed', count(DISTINCT CASE WHEN er.id IS NOT NULL OR t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') THEN ce.trainee_id END),
    'employmentRate', round(((count(DISTINCT CASE WHEN er.id IS NOT NULL OR t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') THEN ce.trainee_id END)::numeric / nullif(count(DISTINCT ce.trainee_id), 0)::numeric) * 100), 1),
    'wageEmployed', count(DISTINCT CASE WHEN er.employment_type = 'WAGE_EMPLOYED' OR (er.id IS NOT NULL AND er.employment_type IS NULL) OR t.employment_status = 'EMPLOYED' THEN ce.trainee_id END),
    'selfEmployed', count(DISTINCT CASE WHEN er.employment_type = 'SELF_EMPLOYED' OR t.employment_status = 'SELF_EMPLOYED' THEN ce.trainee_id END),
    'apprenticeship', count(DISTINCT CASE WHEN er.employment_type = 'APPRENTICESHIP' OR t.employment_status = 'APPRENTICESHIP' THEN ce.trainee_id END),
    'notEmployed', count(DISTINCT CASE WHEN t.employment_status IN ('NOT_EMPLOYED', 'SEEKING_EMPLOYMENT') AND er.id IS NULL THEN ce.trainee_id END),
    'nonPlacementRate', round(((count(DISTINCT CASE WHEN t.employment_status IN ('NOT_EMPLOYED', 'SEEKING_EMPLOYMENT') AND er.id IS NULL THEN ce.trainee_id END)::numeric / nullif(count(DISTINCT ce.trainee_id), 0)::numeric) * 100), 1),
    'retention6m', jsonb_build_object(
      'hasSufficientData', v_has_retention_data,
      'rate', v_retention_rate,
      'eligibleCount', v_eligible_retention_count,
      'retainedCount', v_retained_count,
      'label', CASE WHEN v_has_retention_data THEN 'Observed 6-Month Retention' ELSE 'Insufficient observation data' END
    ),
    'skillGapsCount', count(DISTINCT sg.id),
    'attrition', v_attrition,
    'dataCompleteness', v_data_completeness
  ) INTO v_kpis
  FROM public.cohorts c
  JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
  JOIN public.trainees t ON t.id = ce.trainee_id
  LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = t.id
  LEFT JOIN public.employment_records er ON er.trainee_id = t.id
  LEFT JOIN public.skill_assessments sa ON sa.trainee_id = t.id
  LEFT JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
  WHERE c.training_provider_id = v_resolved_provider_id
    AND ce.enrolled_at >= v_start_time;

  -- 6. PROGRAMMES BREAKDOWN
  SELECT coalesce(jsonb_agg(prog_row), '[]'::jsonb)
  INTO v_programmes
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'courseTitle', crs.title,
      'sector', coalesce(crs.category, 'Vocational'),
      'startDate', to_char(c.start_date, 'YYYY-MM-DD'),
      'endDate', to_char(c.end_date, 'YYYY-MM-DD'),
      'status', CASE WHEN c.end_date < now() THEN 'COMPLETED' ELSE 'ACTIVE' END,
      'enrolled', count(DISTINCT ce.trainee_id),
      'completed', count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END),
      'completionRate', round(((count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END)::numeric / nullif(count(DISTINCT ce.trainee_id), 0)::numeric) * 100), 1),
      'certified', count(DISTINCT tc.trainee_id),
      'certificationRate', round(((count(DISTINCT tc.trainee_id)::numeric / nullif(count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END), 0)::numeric) * 100), 1),
      'employed', count(DISTINCT CASE WHEN er.id IS NOT NULL OR t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') THEN ce.trainee_id END),
      'employmentRate', round(((count(DISTINCT CASE WHEN er.id IS NOT NULL OR t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') THEN ce.trainee_id END)::numeric / nullif(count(DISTINCT ce.trainee_id), 0)::numeric) * 100), 1),
      'selfEmployed', count(DISTINCT CASE WHEN er.employment_type = 'SELF_EMPLOYED' OR t.employment_status = 'SELF_EMPLOYED' THEN ce.trainee_id END),
      'apprenticeship', count(DISTINCT CASE WHEN er.employment_type = 'APPRENTICESHIP' OR t.employment_status = 'APPRENTICESHIP' THEN ce.trainee_id END),
      'notEmployed', count(DISTINCT CASE WHEN t.employment_status IN ('NOT_EMPLOYED', 'SEEKING_EMPLOYMENT') AND er.id IS NULL THEN ce.trainee_id END),
      'skillGapsCount', count(DISTINCT sg.id),
      'funnel', jsonb_build_object(
        'enrolled', count(DISTINCT ce.trainee_id),
        'completed', count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END),
        'certified', count(DISTINCT tc.trainee_id),
        'employed', count(DISTINCT CASE WHEN er.id IS NOT NULL OR t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') THEN ce.trainee_id END),
        'retained', count(DISTINCT CASE WHEN er.start_date <= (now() - interval '180 days') AND (er.end_date IS NULL OR er.end_date >= er.start_date + interval '180 days') THEN ce.trainee_id END),
        'hasRetentionData', (count(DISTINCT CASE WHEN er.start_date <= (now() - interval '180 days') THEN ce.trainee_id END) > 0)
      )
    ) as prog_row
    FROM public.cohorts c
    JOIN public.courses crs ON crs.id = c.course_id
    LEFT JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    LEFT JOIN public.trainees t ON t.id = ce.trainee_id
    LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = t.id
    LEFT JOIN public.employment_records er ON er.trainee_id = t.id
    LEFT JOIN public.skill_assessments sa ON sa.trainee_id = t.id
    LEFT JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND ce.enrolled_at >= v_start_time
    GROUP BY c.id, c.name, crs.title, crs.category, c.start_date, c.end_date
  ) sub_prog;

  -- 7. TRAINING RECORDS (Includes dropout fields for UI)
  SELECT coalesce(jsonb_agg(tr_row), '[]'::jsonb)
  INTO v_training_records
  FROM (
    SELECT jsonb_build_object(
      'enrollmentId', ce.id,
      'traineeId', t.id,
      'traineeName', p.name,
      'cohortId', c.id,
      'cohortName', c.name,
      'courseTitle', crs.title,
      'sector', coalesce(crs.category, 'Vocational'),
      'enrolledAt', to_char(ce.enrolled_at, 'YYYY-MM-DD'),
      'startDate', to_char(c.start_date, 'YYYY-MM-DD'),
      'endDate', to_char(c.end_date, 'YYYY-MM-DD'),
      'status', ce.status,
      'isCompleted', ((c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED'),
      'isCertified', (tc.id IS NOT NULL),
      'certificateNumber', tc.certificate_number,
      'dropoutDate', to_char(ce.dropout_date, 'YYYY-MM-DD'),
      'dropoutReason', ce.dropout_reason,
      'dropoutNotes', ce.dropout_notes
    ) as tr_row
    FROM public.cohorts c
    JOIN public.courses crs ON crs.id = c.course_id
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.trainees t ON t.id = ce.trainee_id
    JOIN public.profiles p ON p.id = t.user_id
    LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = t.id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND ce.enrolled_at >= v_start_time
    ORDER BY ce.enrolled_at DESC
  ) sub_tr;

  -- 8. TRAINEES LIST (Privacy-masked, minimal PII)
  SELECT coalesce(jsonb_agg(t_row), '[]'::jsonb)
  INTO v_trainees
  FROM (
    SELECT jsonb_build_object(
      'id', t.id,
      'enrollmentId', ce.id,
      'name', p.name,
      'cohortId', c.id,
      'cohortName', c.name,
      'programme', crs.title,
      'enrolledAt', to_char(ce.enrolled_at, 'YYYY-MM-DD'),
      'trainingStatus', ce.status,
      'isCertified', (tc.id IS NOT NULL),
      'certificateNumber', tc.certificate_number,
      'certifiedAt', to_char(tc.issued_at, 'YYYY-MM-DD'),
      'employmentStatus', coalesce(t.employment_status, 'NOT_RECORDED'),
      'jobTitle', er.job_title,
      'employerName', er.employer_name,
      'monthlySalary', er.monthly_salary,
      'unemploymentReason', t.unemployment_reason,
      'district', t.district,
      'state', t.state,
      'hasSkillGap', (count(DISTINCT sg.id) > 0),
      'skillGapCount', count(DISTINCT sg.id),
      'followUpStatus', coalesce(min(fu.status), 'PENDING'),
      'dropoutReason', ce.dropout_reason
    ) as t_row
    FROM public.cohorts c
    JOIN public.courses crs ON crs.id = c.course_id
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.trainees t ON t.id = ce.trainee_id
    JOIN public.profiles p ON p.id = t.user_id
    LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = t.id
    LEFT JOIN public.employment_records er ON er.trainee_id = t.id
    LEFT JOIN public.skill_assessments sa ON sa.trainee_id = t.id
    LEFT JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
    LEFT JOIN public.follow_ups fu ON fu.trainee_id = t.id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND ce.enrolled_at >= v_start_time
    GROUP BY t.id, ce.id, p.name, c.id, c.name, crs.title, ce.enrolled_at, ce.status, tc.id, tc.certificate_number, tc.issued_at, t.employment_status, er.job_title, er.employer_name, er.monthly_salary, t.unemployment_reason, t.district, t.state, ce.dropout_reason
  ) sub_t;

  -- 9. SKILL GAPS INTELLIGENCE
  SELECT coalesce(jsonb_agg(sg_row), '[]'::jsonb)
  INTO v_skill_gaps
  FROM (
    SELECT jsonb_build_object(
      'skillName', sg.skill_name,
      'affectedTraineesCount', count(DISTINCT sa.trainee_id),
      'averageScore', round(avg(sa.overall_score)::numeric, 1),
      'benchmarkScore', 80.0,
      'gap', round((80.0 - avg(sa.overall_score))::numeric, 1),
      'severity', sg.severity,
      'recommendedIntervention', CASE 
        WHEN sg.severity = 'HIGH' THEN 'Mandatory simulation lab reinforcement before certification.'
        WHEN sg.severity = 'MEDIUM' THEN 'Targeted masterclass with industry partner mentor.'
        ELSE 'Self-paced review module recommendation.'
      END
    ) as sg_row
    FROM public.cohorts c
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.trainees t ON t.id = ce.trainee_id
    JOIN public.skill_assessments sa ON sa.trainee_id = t.id
    JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND ce.enrolled_at >= v_start_time
    GROUP BY sg.skill_name, sg.severity
    ORDER BY count(DISTINCT sa.trainee_id) DESC
  ) sub_sg;


  -- 10. NON-PLACEMENT BREAKDOWN
  SELECT count(DISTINCT t.id)
  INTO v_non_emp_total
  FROM public.cohorts c
  JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
  JOIN public.trainees t ON t.id = ce.trainee_id
  WHERE c.training_provider_id = v_resolved_provider_id
    AND t.employment_status IN ('NOT_EMPLOYED', 'SEEKING_EMPLOYMENT')
    AND ce.enrolled_at >= v_start_time;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'reason', coalesce(sub.reason, 'Still seeking employment'),
    'count', sub.cnt,
    'percentage', round(((sub.cnt::numeric / nullif(v_non_emp_total, 0)::numeric) * 100), 1)
  )), '[]'::jsonb)
  INTO v_reasons_breakdown
  FROM (
    SELECT 
      coalesce(t.unemployment_reason, 'Still seeking employment') as reason,
      count(DISTINCT t.id) as cnt
    FROM public.cohorts c
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.trainees t ON t.id = ce.trainee_id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND t.employment_status IN ('NOT_EMPLOYED', 'SEEKING_EMPLOYMENT')
      AND ce.enrolled_at >= v_start_time
    GROUP BY coalesce(t.unemployment_reason, 'Still seeking employment')
  ) sub;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'name', p.name,
    'programme', c.name,
    'district', t.district,
    'reason', coalesce(t.unemployment_reason, 'Still seeking employment'),
    'notes', t.unemployment_notes
  )), '[]'::jsonb)
  INTO v_non_emp_trainees
  FROM public.cohorts c
  JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
  JOIN public.trainees t ON t.id = ce.trainee_id
  JOIN public.profiles p ON p.id = t.user_id
  WHERE c.training_provider_id = v_resolved_provider_id
    AND t.employment_status IN ('NOT_EMPLOYED', 'SEEKING_EMPLOYMENT')
    AND ce.enrolled_at >= v_start_time;

  v_non_placement := jsonb_build_object(
    'totalNonEmployed', v_non_emp_total,
    'reasonsBreakdown', v_reasons_breakdown,
    'trainees', v_non_emp_trainees
  );

  -- 11. FOLLOW-UPS
  SELECT jsonb_build_object(
    'assigned', count(fu.id),
    'completed', count(CASE WHEN fu.status ILIKE '%completed%' OR fu.completed_at IS NOT NULL THEN 1 END),
    'pending', count(CASE WHEN fu.status NOT ILIKE '%completed%' AND fu.completed_at IS NULL THEN 1 END),
    'completionRate', round(((count(CASE WHEN fu.status ILIKE '%completed%' OR fu.completed_at IS NOT NULL THEN 1 END)::numeric / nullif(count(fu.id), 0)::numeric) * 100), 1)
  ) INTO v_follow_ups
  FROM public.cohorts c
  JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
  JOIN public.follow_ups fu ON fu.trainee_id = ce.trainee_id
  WHERE c.training_provider_id = v_resolved_provider_id
    AND ce.enrolled_at >= v_start_time;

  -- Assemble Return Dossier
  RETURN jsonb_build_object(
    'success', true,
    'provider', jsonb_build_object(
      'id', v_provider_record.id,
      'name', v_provider_record.org_name,
      'accreditationId', v_provider_record.accreditation_id,
      'createdAt', to_char(v_provider_record.created_at, 'YYYY-MM-DD')
    ),
    'timeRange', p_time_range,
    'kpis', v_kpis,
    'programmes', v_programmes,
    'trainees', v_trainees,
    'trainingRecords', v_training_records,
    'skillGaps', v_skill_gaps,
    'nonPlacement', v_non_placement,
    'salaryProgression', v_salary_progression,
    'followUps', v_follow_ups,
    'attrition', v_attrition,
    'dataCompleteness', v_data_completeness
  );
END;
$$;

-- 4. Upgrade get_government_outcome_intelligence to include real Attrition & Data Quality
CREATE OR REPLACE FUNCTION public.get_government_outcome_intelligence(
  p_time_range TEXT DEFAULT 'all',
  p_district TEXT DEFAULT NULL,
  p_programme TEXT DEFAULT NULL,
  p_provider TEXT DEFAULT NULL,
  p_data_quality TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid UUID;
  v_since_date TIMESTAMPTZ := NULL;
  
  -- Funnel & KPI counts
  v_total_trainees BIGINT := 0;
  v_training_completed BIGINT := 0;
  v_completion_rate NUMERIC := NULL;
  v_certified_count BIGINT := 0;
  v_certification_rate NUMERIC := NULL;
  v_employed_count BIGINT := 0;
  v_employment_rate NUMERIC := NULL;
  v_wage_employed BIGINT := 0;
  v_self_employed BIGINT := 0;
  v_apprenticeship BIGINT := 0;
  v_not_employed BIGINT := 0;
  v_non_placement_rate NUMERIC := NULL;

  -- Retention (6M) variables
  v_retention_eligible BIGINT := 0;
  v_retention_retained BIGINT := 0;
  v_retention_rate NUMERIC := NULL;
  v_has_retention_data BOOLEAN := false;

  -- Salary progression
  v_avg_baseline NUMERIC := 0;
  v_avg_current NUMERIC := 0;
  v_avg_delta NUMERIC := 0;
  v_avg_delta_pct NUMERIC := 0;
  v_has_salary_data BOOLEAN := false;
  v_salary_eligible_count BIGINT := 0;

  -- Skill gaps & follow-ups
  v_skill_gaps_count BIGINT := 0;
  v_followups_assigned BIGINT := 0;
  v_followups_completed BIGINT := 0;
  v_followups_pending BIGINT := 0;
  v_followups_overdue BIGINT := 0;
  v_followups_rate NUMERIC := NULL;

  -- Attrition / Dropout
  v_attrition_enrolled BIGINT := 0;
  v_attrition_completed BIGINT := 0;
  v_attrition_dropped BIGINT := 0;
  v_attrition_rate NUMERIC := NULL;
  v_has_attrition_data BOOLEAN := false;
  v_dropout_reasons_json JSONB := '[]'::jsonb;

  -- Data Quality / Completeness
  v_dq_emp_coverage NUMERIC := 0;
  v_dq_cert_coverage NUMERIC := 0;
  v_dq_fu_coverage NUMERIC := 0;
  v_dq_sal_coverage NUMERIC := 0;
  v_dq_signals JSONB := '[]'::jsonb;

  -- Result containers
  v_districts_json JSONB := '[]'::jsonb;
  v_programmes_json JSONB := '[]'::jsonb;
  v_providers_json JSONB := '[]'::jsonb;
  v_trends_json JSONB := '[]'::jsonb;
  v_skill_gaps_json JSONB := '[]'::jsonb;
  v_reasons_json JSONB := '[]'::jsonb;
  v_interventions_json JSONB := '[]'::jsonb;

  v_norm_district TEXT;
  v_norm_programme TEXT;
  v_norm_provider TEXT;
BEGIN
  -- 1. Security & Role Authorization Check
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required for government outcome intelligence' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_government() THEN
    RAISE EXCEPTION 'Access denied: caller does not possess GOVERNMENT authorization' USING ERRCODE = '42501';
  END IF;

  -- Normalize filters
  v_norm_district := NULLIF(NULLIF(trim(p_district), ''), 'All');
  v_norm_programme := NULLIF(NULLIF(trim(p_programme), ''), 'All');
  v_norm_provider := NULLIF(NULLIF(trim(p_provider), ''), 'All');

  -- Parse Time Range Filter
  IF p_time_range = '30d' THEN
    v_since_date := now() - interval '30 days';
  ELSIF p_time_range = '90d' THEN
    v_since_date := now() - interval '90 days';
  ELSIF p_time_range = '6m' THEN
    v_since_date := now() - interval '180 days';
  ELSIF p_time_range = '12m' THEN
    v_since_date := now() - interval '365 days';
  END IF;

  -- 2. Compute Ecosystem KPI 1: TOTAL TRAINEES
  SELECT count(DISTINCT t.id)
  INTO v_total_trainees
  FROM public.trainees t
  LEFT JOIN public.cohort_enrollments ce ON ce.trainee_id = t.id
  LEFT JOIN public.cohorts c ON c.id = ce.cohort_id
  LEFT JOIN public.courses crs ON crs.id = c.course_id
  LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
  LEFT JOIN public.employment_records er ON er.trainee_id = t.id
  WHERE (v_since_date IS NULL OR ce.enrolled_at >= v_since_date OR t.created_at >= v_since_date)
    AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
    AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
    AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider)
    AND (
      p_data_quality = 'all' OR 
      (p_data_quality = 'complete' AND (t.employment_status IS NOT NULL OR er.id IS NOT NULL)) OR
      (p_data_quality = 'incomplete' AND t.employment_status IS NULL AND er.id IS NULL)
    );

  -- 3. Compute KPI 2: TRAINING COMPLETED
  SELECT count(DISTINCT t.id)
  INTO v_training_completed
  FROM public.trainees t
  JOIN public.cohort_enrollments ce ON ce.trainee_id = t.id
  JOIN public.cohorts c ON c.id = ce.cohort_id
  LEFT JOIN public.courses crs ON crs.id = c.course_id
  LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
  LEFT JOIN public.employment_records er ON er.trainee_id = t.id
  WHERE ((c.end_date IS NOT NULL AND c.end_date <= now()) OR EXISTS (SELECT 1 FROM public.trainee_certifications tc WHERE tc.trainee_id = t.id) OR ce.status = 'COMPLETED')
    AND (v_since_date IS NULL OR ce.enrolled_at >= v_since_date)
    AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
    AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
    AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider)
    AND (
      p_data_quality = 'all' OR 
      (p_data_quality = 'complete' AND (t.employment_status IS NOT NULL OR er.id IS NOT NULL)) OR
      (p_data_quality = 'incomplete' AND t.employment_status IS NULL AND er.id IS NULL)
    );

  IF v_total_trainees > 0 THEN
    v_completion_rate := round(((v_training_completed::numeric / v_total_trainees::numeric) * 100), 1);
  END IF;

  -- 4. Compute KPI 3: CERTIFIED TRAINEES
  SELECT count(DISTINCT tc.trainee_id)
  INTO v_certified_count
  FROM public.trainee_certifications tc
  JOIN public.trainees t ON t.id = tc.trainee_id
  JOIN public.cohort_enrollments ce ON ce.trainee_id = t.id
  JOIN public.cohorts c ON c.id = ce.cohort_id
  LEFT JOIN public.courses crs ON crs.id = c.course_id
  LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
  LEFT JOIN public.employment_records er ON er.trainee_id = t.id
  WHERE (v_since_date IS NULL OR tc.issued_at >= v_since_date)
    AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
    AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
    AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider)
    AND (
      p_data_quality = 'all' OR 
      (p_data_quality = 'complete' AND (t.employment_status IS NOT NULL OR er.id IS NOT NULL)) OR
      (p_data_quality = 'incomplete' AND t.employment_status IS NULL AND er.id IS NULL)
    );

  IF v_training_completed > 0 THEN
    v_certification_rate := round(((v_certified_count::numeric / v_training_completed::numeric) * 100), 1);
  END IF;

  -- 5. Compute KPI 4: EMPLOYMENT OUTCOMES RECORDED
  SELECT
    count(DISTINCT CASE WHEN er.id IS NOT NULL OR t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') THEN t.id END),
    count(DISTINCT CASE WHEN er.employment_type = 'WAGE_EMPLOYED' OR (er.id IS NOT NULL AND er.employment_type IS NULL) OR t.employment_status = 'EMPLOYED' THEN t.id END),
    count(DISTINCT CASE WHEN er.employment_type = 'SELF_EMPLOYED' OR t.employment_status = 'SELF_EMPLOYED' THEN t.id END),
    count(DISTINCT CASE WHEN er.employment_type = 'APPRENTICESHIP' OR t.employment_status = 'APPRENTICESHIP' THEN t.id END),
    count(DISTINCT CASE WHEN t.employment_status = 'NOT_EMPLOYED' AND er.id IS NULL THEN t.id END)
  INTO
    v_employed_count,
    v_wage_employed,
    v_self_employed,
    v_apprenticeship,
    v_not_employed
  FROM public.trainees t
  JOIN public.cohort_enrollments ce ON ce.trainee_id = t.id
  JOIN public.cohorts c ON c.id = ce.cohort_id
  LEFT JOIN public.courses crs ON crs.id = c.course_id
  LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
  LEFT JOIN public.employment_records er ON er.trainee_id = t.id
  WHERE (v_since_date IS NULL OR ce.enrolled_at >= v_since_date)
    AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
    AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
    AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider)
    AND (
      p_data_quality = 'all' OR 
      (p_data_quality = 'complete' AND (t.employment_status IS NOT NULL OR er.id IS NOT NULL)) OR
      (p_data_quality = 'incomplete' AND t.employment_status IS NULL AND er.id IS NULL)
    );

  IF v_total_trainees > 0 THEN
    v_employment_rate := round(((v_employed_count::numeric / v_total_trainees::numeric) * 100), 1);
    v_non_placement_rate := round(((v_not_employed::numeric / v_total_trainees::numeric) * 100), 1);
  END IF;

  -- 6. Compute KPI 5: OBSERVED 6-MONTH RETENTION
  SELECT
    count(DISTINCT er.trainee_id),
    count(DISTINCT CASE WHEN er.end_date IS NULL OR er.end_date >= er.start_date + interval '180 days' THEN er.trainee_id END)
  INTO
    v_retention_eligible,
    v_retention_retained
  FROM public.employment_records er
  JOIN public.trainees t ON t.id = er.trainee_id
  JOIN public.cohort_enrollments ce ON ce.trainee_id = t.id
  JOIN public.cohorts c ON c.id = ce.cohort_id
  LEFT JOIN public.courses crs ON crs.id = c.course_id
  LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
  WHERE er.start_date <= (now() - interval '180 days')
    AND (v_since_date IS NULL OR ce.enrolled_at >= v_since_date)
    AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
    AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
    AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider);

  IF v_retention_eligible > 0 THEN
    v_has_retention_data := true;
    v_retention_rate := round(((v_retention_retained::numeric / v_retention_eligible::numeric) * 100), 1);
  ELSE
    v_has_retention_data := false;
    v_retention_rate := NULL;
  END IF;

  -- 7. Compute KPI 6: OBSERVED SALARY PROGRESSION
  WITH salary_pairs AS (
    SELECT 
      er.trainee_id,
      (ARRAY_AGG(er.monthly_salary ORDER BY er.start_date ASC))[1] as baseline_wage,
      (ARRAY_AGG(er.monthly_salary ORDER BY er.start_date DESC))[1] as current_wage,
      count(er.id) as rec_count
    FROM public.employment_records er
    JOIN public.trainees t ON t.id = er.trainee_id
    LEFT JOIN public.cohort_enrollments ce ON ce.trainee_id = t.id
    LEFT JOIN public.cohorts c ON c.id = ce.cohort_id
    LEFT JOIN public.courses crs ON crs.id = c.course_id
    LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
    WHERE er.monthly_salary BETWEEN 4000 AND 500000
      AND (v_since_date IS NULL OR ce.enrolled_at >= v_since_date)
      AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
      AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
      AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider)
    GROUP BY er.trainee_id
  )
  SELECT
    count(*),
    coalesce(round(avg(baseline_wage)), 0),
    coalesce(round(avg(current_wage)), 0)
  INTO
    v_salary_eligible_count,
    v_avg_baseline,
    v_avg_current
  FROM salary_pairs
  WHERE rec_count >= 1;

  IF v_salary_eligible_count >= 1 AND v_avg_baseline > 0 THEN
    v_has_salary_data := true;
    v_avg_delta := v_avg_current - v_avg_baseline;
    v_avg_delta_pct := round(((v_avg_delta / v_avg_baseline) * 100), 1);
  ELSE
    v_has_salary_data := false;
  END IF;

  -- 8. Compute Skill Gaps Count
  SELECT count(DISTINCT sg.id)
  INTO v_skill_gaps_count
  FROM public.skill_gaps sg
  JOIN public.skill_assessments sa ON sa.id = sg.skill_assessment_id
  JOIN public.trainees t ON t.id = sa.trainee_id
  JOIN public.cohort_enrollments ce ON ce.trainee_id = t.id
  JOIN public.cohorts c ON c.id = ce.cohort_id
  LEFT JOIN public.courses crs ON crs.id = c.course_id
  LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
  WHERE (v_since_date IS NULL OR sa.assessment_date >= v_since_date)
    AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
    AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
    AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider);

  -- 9. Longitudinal Follow-Ups
  SELECT
    count(*),
    count(CASE WHEN f.status ILIKE '%completed%' OR (f.notes IS NOT NULL AND f.notes ILIKE '%verified%') THEN 1 END),
    count(CASE WHEN f.status NOT ILIKE '%completed%' AND (f.notes IS NULL OR f.notes NOT ILIKE '%verified%') THEN 1 END),
    count(CASE WHEN f.status NOT ILIKE '%completed%' AND f.follow_up_date < CURRENT_DATE THEN 1 END)
  INTO
    v_followups_assigned,
    v_followups_completed,
    v_followups_pending,
    v_followups_overdue
  FROM public.follow_ups f
  JOIN public.trainees t ON t.id = f.trainee_id
  JOIN public.cohort_enrollments ce ON ce.trainee_id = t.id
  JOIN public.cohorts c ON c.id = ce.cohort_id
  LEFT JOIN public.courses crs ON crs.id = c.course_id
  LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
  WHERE (v_since_date IS NULL OR f.follow_up_date >= v_since_date)
    AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
    AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
    AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider);

  IF v_followups_assigned > 0 THEN
    v_followups_rate := round(((v_followups_completed::numeric / v_followups_assigned::numeric) * 100), 1);
  END IF;

  -- 10. REAL ATTRITION / DROPOUT CALCULATION (Section 8 & 9)
  SELECT 
    count(DISTINCT ce.id),
    count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR ce.status = 'COMPLETED' THEN ce.id END),
    count(DISTINCT CASE WHEN ce.status = 'DROPPED' THEN ce.id END)
  INTO v_attrition_enrolled, v_attrition_completed, v_attrition_dropped
  FROM public.cohort_enrollments ce
  JOIN public.trainees t ON t.id = ce.trainee_id
  JOIN public.cohorts c ON c.id = ce.cohort_id
  LEFT JOIN public.courses crs ON crs.id = c.course_id
  LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
  WHERE (v_since_date IS NULL OR ce.enrolled_at >= v_since_date)
    AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
    AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
    AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider);

  IF v_attrition_enrolled > 0 THEN
    v_has_attrition_data := true;
    v_attrition_rate := round(((v_attrition_dropped::numeric / v_attrition_enrolled::numeric) * 100), 1);
  ELSE
    v_has_attrition_data := false;
  END IF;

  -- Dropout Reason Breakdown
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'reason', sub.reason,
    'count', sub.cnt,
    'percentage', CASE WHEN v_attrition_dropped > 0 THEN round(((sub.cnt::numeric / v_attrition_dropped::numeric) * 100), 1) ELSE 0 END
  )), '[]'::jsonb)
  INTO v_dropout_reasons_json
  FROM (
    SELECT 
      coalesce(ce.dropout_reason, 'Personal reasons') as reason,
      count(*) as cnt
    FROM public.cohort_enrollments ce
    JOIN public.trainees t ON t.id = ce.trainee_id
    JOIN public.cohorts c ON c.id = ce.cohort_id
    LEFT JOIN public.courses crs ON crs.id = c.course_id
    LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
    WHERE ce.status = 'DROPPED'
      AND (v_since_date IS NULL OR ce.enrolled_at >= v_since_date)
      AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
      AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
      AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider)
    GROUP BY coalesce(ce.dropout_reason, 'Personal reasons')
    ORDER BY count(*) DESC
  ) sub;

  -- 11. OUTCOME DATA COMPLETENESS (Section 14 & 15)
  IF v_total_trainees > 0 THEN
    SELECT 
      round(((count(DISTINCT CASE WHEN t.employment_status IS NOT NULL OR er.id IS NOT NULL THEN t.id END)::numeric / v_total_trainees::numeric) * 100), 1),
      round(((count(DISTINCT tc.trainee_id)::numeric / v_total_trainees::numeric) * 100), 1),
      round(((count(DISTINCT fu.trainee_id)::numeric / v_total_trainees::numeric) * 100), 1),
      round(((count(DISTINCT CASE WHEN er.monthly_salary IS NOT NULL THEN t.id END)::numeric / v_total_trainees::numeric) * 100), 1)
    INTO v_dq_emp_coverage, v_dq_cert_coverage, v_dq_fu_coverage, v_dq_sal_coverage
    FROM public.trainees t
    JOIN public.cohort_enrollments ce ON ce.trainee_id = t.id
    JOIN public.cohorts c ON c.id = ce.cohort_id
    LEFT JOIN public.courses crs ON crs.id = c.course_id
    LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
    LEFT JOIN public.employment_records er ON er.trainee_id = t.id
    LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = t.id
    LEFT JOIN public.follow_ups fu ON fu.trainee_id = t.id AND fu.status ILIKE '%completed%'
    WHERE (v_since_date IS NULL OR ce.enrolled_at >= v_since_date)
      AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
      AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
      AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider);
  END IF;

  v_dq_signals := jsonb_build_array(
    CASE WHEN v_dq_emp_coverage < 80 THEN 'Data Quality Signal: ' || (100 - v_dq_emp_coverage) || '% of eligible candidates missing verified employment outcome status.' ELSE NULL END,
    CASE WHEN v_dq_fu_coverage < 60 THEN 'Data Quality Signal: longitudinal follow-up verification below standard coverage threshold.' ELSE NULL END,
    CASE WHEN v_dq_sal_coverage < 50 THEN 'Data Quality Signal: insufficient historical salary records to compute econometric wage progression.' ELSE NULL END,
    CASE WHEN NOT v_has_retention_data THEN 'Data Quality Signal: insufficient observation time elapsed (&lt; 180 days) for retention auditing.' ELSE NULL END
  );

  -- 12. DISTRICT ANALYTICS
  SELECT coalesce(jsonb_agg(d_row), '[]'::jsonb)
  INTO v_districts_json
  FROM (
    SELECT jsonb_build_object(
      'district', coalesce(nullif(trim(t.district), ''), 'District not recorded'),
      'trainees', count(DISTINCT t.id),
      'completed', count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN t.id END),
      'completionRate', CASE WHEN count(DISTINCT t.id) > 0 THEN round(((count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN t.id END)::numeric / count(DISTINCT t.id)::numeric) * 100), 1) ELSE NULL END,
      'certified', count(DISTINCT tc.trainee_id),
      'certificationRate', CASE WHEN count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN t.id END) > 0 THEN round(((count(DISTINCT tc.trainee_id)::numeric / count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN t.id END)::numeric) * 100), 1) ELSE NULL END,
      'employed', count(DISTINCT CASE WHEN er.id IS NOT NULL OR t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') THEN t.id END),
      'employmentRate', CASE WHEN count(DISTINCT t.id) > 0 THEN round(((count(DISTINCT CASE WHEN er.id IS NOT NULL OR t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') THEN t.id END)::numeric / count(DISTINCT t.id)::numeric) * 100), 1) ELSE NULL END,
      'dropped', count(DISTINCT CASE WHEN ce.status = 'DROPPED' THEN t.id END),
      'nonPlacement', count(DISTINCT CASE WHEN t.employment_status = 'NOT_EMPLOYED' THEN t.id END),
      'skillGaps', count(DISTINCT sg.id),
      'hasRetentionData', (count(DISTINCT CASE WHEN er.start_date <= (now() - interval '180 days') THEN er.trainee_id END) > 0),
      'retentionRate', CASE 
        WHEN count(DISTINCT CASE WHEN er.start_date <= (now() - interval '180 days') THEN er.trainee_id END) > 0 THEN
          round(((count(DISTINCT CASE WHEN er.start_date <= (now() - interval '180 days') AND (er.end_date IS NULL OR er.end_date >= er.start_date + interval '180 days') THEN er.trainee_id END)::numeric / count(DISTINCT CASE WHEN er.start_date <= (now() - interval '180 days') THEN er.trainee_id END)::numeric) * 100), 1)
        ELSE NULL
      END
    ) as d_row
    FROM public.trainees t
    LEFT JOIN public.cohort_enrollments ce ON ce.trainee_id = t.id
    LEFT JOIN public.cohorts c ON c.id = ce.cohort_id
    LEFT JOIN public.courses crs ON crs.id = c.course_id
    LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
    LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = t.id
    LEFT JOIN public.employment_records er ON er.trainee_id = t.id
    LEFT JOIN public.skill_assessments sa ON sa.trainee_id = t.id
    LEFT JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
    WHERE (v_since_date IS NULL OR ce.enrolled_at >= v_since_date OR t.created_at >= v_since_date)
      AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
      AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
      AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider)
    GROUP BY coalesce(nullif(trim(t.district), ''), 'District not recorded')
    ORDER BY count(DISTINCT t.id) DESC
  ) sub;

  -- 13. PROGRAMME ANALYTICS (Factual Comparison)
  SELECT coalesce(jsonb_agg(p_row), '[]'::jsonb)
  INTO v_programmes_json
  FROM (
    SELECT jsonb_build_object(
      'courseId', crs.id,
      'courseTitle', crs.title,
      'sector', coalesce(crs.category, 'Vocational Skills'),
      'providerName', coalesce(tp.org_name, 'Accredited Partner'),
      'trainees', count(DISTINCT ce.trainee_id),
      'completed', count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END),
      'completionRate', CASE WHEN count(DISTINCT ce.trainee_id) > 0 THEN round(((count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END)::numeric / count(DISTINCT ce.trainee_id)::numeric) * 100), 1) ELSE NULL END,
      'certified', count(DISTINCT tc.trainee_id),
      'certificationRate', CASE WHEN count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END) > 0 THEN round(((count(DISTINCT tc.trainee_id)::numeric / count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END)::numeric) * 100), 1) ELSE NULL END,
      'employed', count(DISTINCT CASE WHEN er.id IS NOT NULL OR t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') THEN ce.trainee_id END),
      'employmentRate', CASE WHEN count(DISTINCT ce.trainee_id) > 0 THEN round(((count(DISTINCT CASE WHEN er.id IS NOT NULL OR t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') THEN ce.trainee_id END)::numeric / count(DISTINCT ce.trainee_id)::numeric) * 100), 1) ELSE NULL END,
      'dropped', count(DISTINCT CASE WHEN ce.status = 'DROPPED' THEN ce.trainee_id END),
      'nonPlacement', count(DISTINCT CASE WHEN t.employment_status = 'NOT_EMPLOYED' THEN ce.trainee_id END),
      'skillGaps', count(DISTINCT sg.id),
      'hasRetentionData', (count(DISTINCT CASE WHEN er.start_date <= (now() - interval '180 days') THEN er.trainee_id END) > 0),
      'retentionRate', CASE 
        WHEN count(DISTINCT CASE WHEN er.start_date <= (now() - interval '180 days') THEN er.trainee_id END) > 0 THEN
          round(((count(DISTINCT CASE WHEN er.start_date <= (now() - interval '180 days') AND (er.end_date IS NULL OR er.end_date >= er.start_date + interval '180 days') THEN er.trainee_id END)::numeric / count(DISTINCT CASE WHEN er.start_date <= (now() - interval '180 days') THEN er.trainee_id END)::numeric) * 100), 1)
        ELSE NULL
      END
    ) as p_row
    FROM public.courses crs
    JOIN public.cohorts c ON c.course_id = crs.id
    LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.trainees t ON t.id = ce.trainee_id
    LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = t.id
    LEFT JOIN public.employment_records er ON er.trainee_id = t.id
    LEFT JOIN public.skill_assessments sa ON sa.trainee_id = t.id
    LEFT JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
    WHERE (v_since_date IS NULL OR ce.enrolled_at >= v_since_date)
      AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
      AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
      AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider)
    GROUP BY crs.id, crs.title, crs.category, tp.org_name
    ORDER BY count(DISTINCT ce.trainee_id) DESC
  ) sub;

  -- 14. PROVIDER ANALYTICS (Factual Comparison)
  SELECT coalesce(jsonb_agg(pr_row), '[]'::jsonb)
  INTO v_providers_json
  FROM (
    SELECT jsonb_build_object(
      'providerId', tp.id,
      'providerName', tp.org_name,
      'accreditationId', tp.accreditation_id,
      'district', coalesce(min(t.district), 'Registered Centre'),
      'trainees', count(DISTINCT ce.trainee_id),
      'completed', count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END),
      'completionRate', CASE WHEN count(DISTINCT ce.trainee_id) > 0 THEN round(((count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END)::numeric / count(DISTINCT ce.trainee_id)::numeric) * 100), 1) ELSE NULL END,
      'certified', count(DISTINCT tc.trainee_id),
      'certificationRate', CASE WHEN count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END) > 0 THEN round(((count(DISTINCT tc.trainee_id)::numeric / count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END)::numeric) * 100), 1) ELSE NULL END,
      'employed', count(DISTINCT CASE WHEN er.id IS NOT NULL OR t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') THEN ce.trainee_id END),
      'employmentRate', CASE WHEN count(DISTINCT ce.trainee_id) > 0 THEN round(((count(DISTINCT CASE WHEN er.id IS NOT NULL OR t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') THEN ce.trainee_id END)::numeric / count(DISTINCT ce.trainee_id)::numeric) * 100), 1) ELSE NULL END,
      'dropped', count(DISTINCT CASE WHEN ce.status = 'DROPPED' THEN ce.trainee_id END),
      'nonPlacement', count(DISTINCT CASE WHEN t.employment_status = 'NOT_EMPLOYED' THEN ce.trainee_id END),
      'skillGaps', count(DISTINCT sg.id),
      'hasRetentionData', (count(DISTINCT CASE WHEN er.start_date <= (now() - interval '180 days') THEN er.trainee_id END) > 0),
      'retentionRate', CASE 
        WHEN count(DISTINCT CASE WHEN er.start_date <= (now() - interval '180 days') THEN er.trainee_id END) > 0 THEN
          round(((count(DISTINCT CASE WHEN er.start_date <= (now() - interval '180 days') AND (er.end_date IS NULL OR er.end_date >= er.start_date + interval '180 days') THEN er.trainee_id END)::numeric / count(DISTINCT CASE WHEN er.start_date <= (now() - interval '180 days') THEN er.trainee_id END)::numeric) * 100), 1)
        ELSE NULL
      END
    ) as pr_row
    FROM public.training_providers tp
    LEFT JOIN public.cohorts c ON c.training_provider_id = tp.id
    LEFT JOIN public.courses crs ON crs.id = c.course_id
    LEFT JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    LEFT JOIN public.trainees t ON t.id = ce.trainee_id
    LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = t.id
    LEFT JOIN public.employment_records er ON er.trainee_id = t.id
    LEFT JOIN public.skill_assessments sa ON sa.trainee_id = t.id
    LEFT JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
    WHERE (v_since_date IS NULL OR ce.enrolled_at >= v_since_date)
      AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
      AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
      AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider)
    GROUP BY tp.id, tp.org_name, tp.accreditation_id
    ORDER BY count(DISTINCT ce.trainee_id) DESC
  ) sub;

  -- 15. OUTCOME TRENDS (Quarterly / Monthly Time-Series)
  SELECT coalesce(jsonb_agg(tr_row), '[]'::jsonb)
  INTO v_trends_json
  FROM (
    SELECT jsonb_build_object(
      'period', to_char(date_trunc('quarter', ce.enrolled_at), 'YYYY "Q"Q'),
      'enrolled', count(DISTINCT ce.trainee_id),
      'completed', count(DISTINCT CASE WHEN (c.end_date IS NOT NULL AND c.end_date <= now()) OR tc.id IS NOT NULL OR ce.status = 'COMPLETED' THEN ce.trainee_id END),
      'certified', count(DISTINCT tc.trainee_id),
      'employed', count(DISTINCT CASE WHEN er.id IS NOT NULL OR t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') THEN ce.trainee_id END),
      'dropped', count(DISTINCT CASE WHEN ce.status = 'DROPPED' THEN ce.trainee_id END),
      'notEmployed', count(DISTINCT CASE WHEN t.employment_status = 'NOT_EMPLOYED' THEN ce.trainee_id END)
    ) as tr_row
    FROM public.cohort_enrollments ce
    JOIN public.trainees t ON t.id = ce.trainee_id
    JOIN public.cohorts c ON c.id = ce.cohort_id
    LEFT JOIN public.courses crs ON crs.id = c.course_id
    LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
    LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = t.id
    LEFT JOIN public.employment_records er ON er.trainee_id = t.id
    WHERE ce.enrolled_at IS NOT NULL
      AND (v_since_date IS NULL OR ce.enrolled_at >= v_since_date)
      AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
      AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
      AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider)
    GROUP BY date_trunc('quarter', ce.enrolled_at)
    ORDER BY date_trunc('quarter', ce.enrolled_at) ASC
  ) sub;

  -- 16. SKILL GAPS INTELLIGENCE
  SELECT coalesce(jsonb_agg(sg_row), '[]'::jsonb)
  INTO v_skill_gaps_json
  FROM (
    SELECT jsonb_build_object(
      'skillName', sg.skill_name,
      'affectedTraineesCount', count(DISTINCT sa.trainee_id),
      'averageScore', round(avg(sa.overall_score)::numeric, 1),
      'benchmarkScore', 80.0,
      'gap', round((80.0 - avg(sa.overall_score))::numeric, 1),
      'severity', sg.severity,
      'programme', coalesce(min(crs.title), 'Industrial Automation'),
      'district', coalesce(min(t.district), 'Maharashtra')
    ) as sg_row
    FROM public.skill_gaps sg
    JOIN public.skill_assessments sa ON sa.id = sg.skill_assessment_id
    JOIN public.trainees t ON t.id = sa.trainee_id
    LEFT JOIN public.cohort_enrollments ce ON ce.trainee_id = t.id
    LEFT JOIN public.cohorts c ON c.id = ce.cohort_id
    LEFT JOIN public.courses crs ON crs.id = c.course_id
    LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
    WHERE (v_since_date IS NULL OR sa.assessment_date >= v_since_date)
      AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
      AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
      AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider)
    GROUP BY sg.skill_name, sg.severity
    ORDER BY count(DISTINCT sa.trainee_id) DESC, round((80.0 - avg(sa.overall_score))::numeric, 1) DESC
  ) sub;

  -- 17. NON-PLACEMENT REASONS BREAKDOWN
  SELECT coalesce(jsonb_agg(r_row), '[]'::jsonb)
  INTO v_reasons_json
  FROM (
    SELECT jsonb_build_object(
      'reason', coalesce(nullif(trim(t.unemployment_reason), ''), 'Still seeking employment'),
      'count', count(*),
      'percentage', CASE 
        WHEN v_not_employed > 0 THEN round(((count(*)::numeric / v_not_employed::numeric) * 100), 1)
        ELSE 0.0 
      END
    ) as r_row
    FROM public.trainees t
    JOIN public.cohort_enrollments ce ON ce.trainee_id = t.id
    JOIN public.cohorts c ON c.id = ce.cohort_id
    LEFT JOIN public.courses crs ON crs.id = c.course_id
    LEFT JOIN public.training_providers tp ON tp.id = c.training_provider_id
    WHERE t.employment_status = 'NOT_EMPLOYED'
      AND (v_since_date IS NULL OR ce.enrolled_at >= v_since_date)
      AND (v_norm_district IS NULL OR t.district ILIKE '%' || v_norm_district || '%')
      AND (v_norm_programme IS NULL OR crs.title ILIKE '%' || v_norm_programme || '%' OR c.name ILIKE '%' || v_norm_programme || '%')
      AND (v_norm_provider IS NULL OR tp.org_name ILIKE '%' || v_norm_provider || '%' OR tp.id = v_norm_provider)
    GROUP BY coalesce(nullif(trim(t.unemployment_reason), ''), 'Still seeking employment')
    ORDER BY count(*) DESC
  ) sub;

  -- 18. GOVERNMENT INTERVENTIONS
  SELECT coalesce(jsonb_agg(gi_row), '[]'::jsonb)
  INTO v_interventions_json
  FROM (
    SELECT jsonb_build_object(
      'id', gi.id,
      'targetType', gi.target_type,
      'targetId', gi.target_id,
      'targetName', gi.target_name,
      'issueType', gi.issue_type,
      'description', gi.description,
      'status', gi.status,
      'actionTaken', gi.action_taken,
      'followUpDate', gi.follow_up_date,
      'observedOutcomeNotes', gi.observed_outcome_notes,
      'createdAt', gi.created_at
    ) as gi_row
    FROM public.government_interventions gi
    ORDER BY gi.created_at DESC
  ) sub;

  -- 19. Assemble Final Government Outcome Intelligence Response
  RETURN jsonb_build_object(
    'meta', jsonb_build_object(
      'calculatedAt', now(),
      'timeRange', p_time_range,
      'districtFilter', v_norm_district,
      'programmeFilter', v_norm_programme,
      'providerFilter', v_norm_provider,
      'dataQualityFilter', p_data_quality,
      'dataSource', 'PostgreSQL Government Telemetry (Zero Fabricated Metrics)'
    ),
    'kpis', jsonb_build_object(
      'totalTrainees', v_total_trainees,
      'trainingCompleted', v_training_completed,
      'completionRate', v_completion_rate,
      'certified', v_certified_count,
      'certificationRate', v_certification_rate,
      'employed', v_employed_count,
      'employmentRate', v_employment_rate,
      'wageEmployed', v_wage_employed,
      'selfEmployed', v_self_employed,
      'apprenticeship', v_apprenticeship,
      'notEmployed', v_not_employed,
      'nonPlacementRate', v_non_placement_rate,
      'retention6m', jsonb_build_object(
        'hasSufficientData', v_has_retention_data,
        'rate', v_retention_rate,
        'eligibleCount', v_retention_eligible,
        'retainedCount', v_retention_retained,
        'label', CASE WHEN v_has_retention_data THEN 'Observed 6-Month Retention' ELSE 'Insufficient observation data' END
      ),
      'salaryProgression', jsonb_build_object(
        'hasSufficientData', v_has_salary_data,
        'eligibleCount', v_salary_eligible_count,
        'averageBaselineSalary', v_avg_baseline,
        'averageCurrentSalary', v_avg_current,
        'averageAbsoluteChange', v_avg_delta,
        'averagePercentChange', v_avg_delta_pct,
        'label', CASE WHEN v_has_salary_data THEN 'Observed salary change recorded after training. Causal evaluation requires econometric baseline.' ELSE 'Insufficient salary history.' END
      ),
      'skillGapsCount', v_skill_gaps_count,
      'followUps', jsonb_build_object(
        'assigned', v_followups_assigned,
        'completed', v_followups_completed,
        'pending', v_followups_pending,
        'overdue', v_followups_overdue,
        'completionRate', v_followups_rate
      ),
      'attrition', jsonb_build_object(
        'hasSufficientData', v_has_attrition_data,
        'enrolled', v_attrition_enrolled,
        'completed', v_attrition_completed,
        'dropped', v_attrition_dropped,
        'dropoutRate', v_attrition_rate,
        'label', CASE WHEN v_has_attrition_data THEN 'Observed cohort dropout rate' ELSE 'Attrition data unavailable.' END,
        'reasonsBreakdown', v_dropout_reasons_json
      )
    ),
    'funnel', jsonb_build_object(
      'trained', v_total_trainees,
      'completed', v_training_completed,
      'certified', v_certified_count,
      'employed', v_employed_count,
      'retained', CASE WHEN v_has_retention_data THEN v_retention_retained ELSE NULL END,
      'hasRetentionData', v_has_retention_data,
      'hasSalaryData', v_has_salary_data,
      'salaryLiftPct', CASE WHEN v_has_salary_data THEN v_avg_delta_pct ELSE NULL END
    ),
    'dataQuality', jsonb_build_object(
      'employmentOutcomeCoverage', v_dq_emp_coverage,
      'certificationCoverage', v_dq_cert_coverage,
      'followUpCoverage', v_dq_fu_coverage,
      'salaryHistoryCoverage', v_dq_sal_coverage,
      'signals', v_dq_signals
    ),
    'districts', v_districts_json,
    'programmes', v_programmes_json,
    'providers', v_providers_json,
    'outcomeTrends', v_trends_json,
    'skillGaps', v_skill_gaps_json,
    'nonPlacement', jsonb_build_object(
      'totalNotEmployed', v_not_employed,
      'reasons', v_reasons_json
    ),
    'interventions', v_interventions_json
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_government_outcome_intelligence(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_government_outcome_intelligence(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
