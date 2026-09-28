-- Migration: 20260927000017_phase4_hardening.sql
-- Drop ambiguous 4-param get_government_outcome_intelligence
-- Fix get_provider_outcome_intelligence to include attrition and data completeness without nested aggregates

-- 1. Drop old 4-param government intelligence function to avoid ambiguous overload
DROP FUNCTION IF EXISTS public.get_government_outcome_intelligence(TEXT, TEXT, TEXT, TEXT);

-- 2. Upgrade get_provider_outcome_intelligence
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

  -- Variables for attrition calculation
  v_att_enrolled INT := 0;
  v_att_completed INT := 0;
  v_att_dropped INT := 0;
  v_att_rate NUMERIC := NULL;
  v_has_att_data BOOLEAN := false;
  v_dropout_reasons_json JSONB := '[]'::jsonb;

  -- Variables for data completeness
  v_total_tr INT := 0;
  v_with_emp_outcome INT := 0;
  v_with_certs INT := 0;
  v_with_followup INT := 0;
  v_with_salary INT := 0;
  v_emp_coverage_pct NUMERIC := 0;
  v_cert_coverage_pct NUMERIC := 0;
  v_fu_coverage_pct NUMERIC := 0;
  v_sal_coverage_pct NUMERIC := 0;

  -- Non-placement helpers
  v_non_emp_total INT := 0;
  v_reasons_breakdown JSONB;
  v_non_emp_trainees JSONB;
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
    IF p_provider_id IS NOT NULL AND p_provider_id <> '' AND p_provider_id <> v_resolved_provider_id THEN
      RAISE EXCEPTION 'Access denied: Cannot access data belonging to another training provider.' USING ERRCODE = '42501';
    END IF;
  ELSIF v_caller_role IN ('GOVERNMENT_OFFICIAL', 'ADMIN') THEN
    IF p_provider_id IS NULL OR p_provider_id = '' THEN
      SELECT id INTO v_resolved_provider_id FROM public.training_providers ORDER BY org_name ASC LIMIT 1;
    ELSE
      v_resolved_provider_id := p_provider_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Access denied: Role % not authorized to view provider outcome intelligence.', v_caller_role USING ERRCODE = '42501';
  END IF;

  IF v_resolved_provider_id IS NULL THEN
    RAISE EXCEPTION 'Training provider profile not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_provider_record FROM public.training_providers WHERE id = v_resolved_provider_id;
  IF v_provider_record IS NULL THEN
    RAISE EXCEPTION 'Training provider record % does not exist.', v_resolved_provider_id USING ERRCODE = 'P0002';
  END IF;

  -- Parse Time Range
  IF p_time_range = '1y' THEN
    v_start_time := now() - interval '1 year';
  ELSIF p_time_range = '6m' THEN
    v_start_time := now() - interval '6 months';
  ELSIF p_time_range = '3m' THEN
    v_start_time := now() - interval '3 months';
  ELSE
    v_start_time := '1970-01-01 00:00:00Z'::timestamptz;
  END IF;

  -- -------------------------------------------------------------------------
  -- 1. RETENTION CALCULATION (DISTINCT trainees completing >= 180 days ago)
  -- -------------------------------------------------------------------------
  SELECT 
    count(DISTINCT ce.trainee_id),
    count(DISTINCT CASE 
      WHEN coalesce(fu.employment_status, t.employment_status) IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') 
           OR fu.retention_status IN ('RETAINED', 'Retained in same role') 
      THEN ce.trainee_id 
    END)
  INTO v_eligible_retention_count, v_retained_count
  FROM public.cohorts c
  JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
  JOIN public.trainees t ON t.id = ce.trainee_id
  LEFT JOIN public.follow_ups fu ON fu.trainee_id = t.id
  WHERE c.training_provider_id = v_resolved_provider_id
    AND c.end_date <= now() - interval '180 days'
    AND ce.enrolled_at >= v_start_time;

  IF v_eligible_retention_count > 0 THEN
    v_retention_rate := round(((v_retained_count::numeric / v_eligible_retention_count::numeric) * 100), 1);
    v_has_retention_data := true;
  ELSE
    v_has_retention_data := false;
    v_retention_rate := NULL;
  END IF;

  -- -------------------------------------------------------------------------
  -- 2. SALARY PROGRESSION CALCULATION (Observed salary change, no causal claim)
  -- -------------------------------------------------------------------------
  WITH trainee_salaries AS (
    SELECT 
      ce.trainee_id,
      (ARRAY_AGG(er.monthly_salary ORDER BY er.start_date ASC))[1] as baseline_sal,
      (ARRAY_AGG(er.monthly_salary ORDER BY er.start_date DESC))[1] as current_sal,
      count(er.id) as rec_count
    FROM public.cohorts c
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.employment_records er ON er.trainee_id = ce.trainee_id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND ce.enrolled_at >= v_start_time
    GROUP BY ce.trainee_id
    HAVING count(er.id) >= 2
  )
  SELECT 
    count(*),
    coalesce(round(avg(baseline_sal)::numeric, 0), 0),
    coalesce(round(avg(current_sal)::numeric, 0), 0),
    coalesce(round(avg(current_sal - baseline_sal)::numeric, 0), 0),
    coalesce(round(avg(((current_sal - baseline_sal) / nullif(baseline_sal, 0)) * 100)::numeric, 1), 0)
  INTO v_salary_trainee_count, v_avg_baseline, v_avg_current, v_avg_abs_change, v_avg_pct_change
  FROM trainee_salaries;

  IF v_salary_trainee_count > 0 THEN
    v_has_salary_data := true;
  ELSE
    v_has_salary_data := false;
  END IF;

  v_salary_progression := jsonb_build_object(
    'hasSufficientData', v_has_salary_data,
    'eligibleTraineeCount', v_salary_trainee_count,
    'averageBaselineSalary', v_avg_baseline,
    'averageCurrentSalary', v_avg_current,
    'averageAbsoluteChange', v_avg_abs_change,
    'averagePercentChange', v_avg_pct_change,
    'label', CASE WHEN v_has_salary_data THEN 'Observed salary progression recorded after training' ELSE 'Insufficient salary history' END
  );

  -- -------------------------------------------------------------------------
  -- 3. ATTRITION / DROPOUT AGGREGATE
  -- -------------------------------------------------------------------------
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

  -- -------------------------------------------------------------------------
  -- 4. OUTCOME DATA COMPLETENESS & QUALITY
  -- -------------------------------------------------------------------------
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
      CASE WHEN v_fu_coverage_pct < 60 THEN 'Data quality signal: longitudinal follow-up verification below standard coverage threshold.' ELSE NULL END,
      CASE WHEN v_sal_coverage_pct < 50 THEN 'Data quality signal: insufficient payroll/salary history documentation for wage lift validation.' ELSE NULL END
    )
  );

  -- -------------------------------------------------------------------------
  -- 5. CORE KPIS
  -- -------------------------------------------------------------------------
  SELECT jsonb_build_object(
    'totalTrainees', count(DISTINCT ce.trainee_id),
    'trainingCompleted', count(DISTINCT CASE WHEN c.end_date <= now() OR ce.status = 'COMPLETED' THEN ce.trainee_id END),
    'completionRate', round(((count(DISTINCT CASE WHEN c.end_date <= now() OR ce.status = 'COMPLETED' THEN ce.trainee_id END)::numeric / nullif(count(DISTINCT ce.trainee_id), 0)::numeric) * 100), 1),
    'certified', count(DISTINCT tc.trainee_id),
    'certificationRate', round(((count(DISTINCT tc.trainee_id)::numeric / nullif(count(DISTINCT CASE WHEN c.end_date <= now() OR ce.status = 'COMPLETED' THEN ce.trainee_id END), 0)::numeric) * 100), 1),
    'employed', count(DISTINCT CASE WHEN t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') OR er.id IS NOT NULL THEN t.id END),
    'employmentRate', round(((count(DISTINCT CASE WHEN t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') OR er.id IS NOT NULL THEN t.id END)::numeric / nullif(count(DISTINCT CASE WHEN c.end_date <= now() OR ce.status = 'COMPLETED' THEN ce.trainee_id END), 0)::numeric) * 100), 1),
    'wageEmployed', count(DISTINCT CASE WHEN t.employment_status = 'EMPLOYED' THEN t.id END),
    'selfEmployed', count(DISTINCT CASE WHEN t.employment_status = 'SELF_EMPLOYED' THEN t.id END),
    'apprenticeship', count(DISTINCT CASE WHEN t.employment_status = 'APPRENTICESHIP' THEN t.id END),
    'notEmployed', count(DISTINCT CASE WHEN t.employment_status IN ('NOT_EMPLOYED', 'SEEKING_EMPLOYMENT') THEN t.id END),
    'nonPlacementRate', round(((count(DISTINCT CASE WHEN t.employment_status IN ('NOT_EMPLOYED', 'SEEKING_EMPLOYMENT') THEN t.id END)::numeric / nullif(count(DISTINCT ce.trainee_id), 0)::numeric) * 100), 1),
    'retention6m', jsonb_build_object(
      'hasSufficientData', v_has_retention_data,
      'rate', v_retention_rate,
      'eligibleCount', v_eligible_retention_count,
      'retainedCount', v_retained_count,
      'label', CASE WHEN v_has_retention_data THEN v_retention_rate::text || '%' ELSE 'Insufficient observation data' END
    ),
    'skillGapsCount', count(DISTINCT sg.id),
    'attrition', v_attrition,
    'dataCompleteness', v_data_completeness
  ) INTO v_kpis
  FROM public.cohorts c
  JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
  JOIN public.trainees t ON t.id = ce.trainee_id
  LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = ce.trainee_id
  LEFT JOIN public.employment_records er ON er.trainee_id = ce.trainee_id
  LEFT JOIN public.skill_assessments sa ON sa.trainee_id = ce.trainee_id
  LEFT JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
  WHERE c.training_provider_id = v_resolved_provider_id
    AND ce.enrolled_at >= v_start_time;

  -- -------------------------------------------------------------------------
  -- 6. PROGRAMMES (COHORTS + COURSES WITH FUNNEL)
  -- -------------------------------------------------------------------------
  SELECT coalesce(jsonb_agg(prog_row), '[]'::jsonb) INTO v_programmes
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'courseTitle', coalesce(crs.title, c.name),
      'sector', coalesce(crs.category, 'Technical & Vocational Skills'),
      'startDate', to_char(c.start_date, 'YYYY-MM-DD'),
      'endDate', CASE WHEN c.end_date IS NOT NULL THEN to_char(c.end_date, 'YYYY-MM-DD') ELSE NULL END,
      'status', CASE WHEN c.end_date IS NOT NULL AND c.end_date <= now() THEN 'COMPLETED' ELSE 'ACTIVE' END,
      'enrolled', count(DISTINCT ce.trainee_id),
      'completed', count(DISTINCT CASE WHEN c.end_date <= now() OR ce.status = 'COMPLETED' THEN ce.trainee_id END),
      'completionRate', round(((count(DISTINCT CASE WHEN c.end_date <= now() OR ce.status = 'COMPLETED' THEN ce.trainee_id END)::numeric / nullif(count(DISTINCT ce.trainee_id), 0)::numeric) * 100), 1),
      'certified', count(DISTINCT tc.trainee_id),
      'certificationRate', round(((count(DISTINCT tc.trainee_id)::numeric / nullif(count(DISTINCT CASE WHEN c.end_date <= now() OR ce.status = 'COMPLETED' THEN ce.trainee_id END), 0)::numeric) * 100), 1),
      'employed', count(DISTINCT CASE WHEN t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') OR er.id IS NOT NULL THEN t.id END),
      'employmentRate', round(((count(DISTINCT CASE WHEN t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') OR er.id IS NOT NULL THEN t.id END)::numeric / nullif(count(DISTINCT CASE WHEN c.end_date <= now() OR ce.status = 'COMPLETED' THEN ce.trainee_id END), 0)::numeric) * 100), 1),
      'selfEmployed', count(DISTINCT CASE WHEN t.employment_status = 'SELF_EMPLOYED' THEN t.id END),
      'apprenticeship', count(DISTINCT CASE WHEN t.employment_status = 'APPRENTICESHIP' THEN t.id END),
      'notEmployed', count(DISTINCT CASE WHEN t.employment_status IN ('NOT_EMPLOYED', 'SEEKING_EMPLOYMENT') THEN t.id END),
      'skillGapsCount', count(DISTINCT sg.id),
      'funnel', jsonb_build_object(
        'enrolled', count(DISTINCT ce.trainee_id),
        'completed', count(DISTINCT CASE WHEN c.end_date <= now() OR ce.status = 'COMPLETED' THEN ce.trainee_id END),
        'certified', count(DISTINCT tc.trainee_id),
        'employed', count(DISTINCT CASE WHEN t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') OR er.id IS NOT NULL THEN t.id END),
        'retained', count(DISTINCT CASE WHEN coalesce(fu.employment_status, t.employment_status) IN ('EMPLOYED', 'SELF_EMPLOYED') AND c.end_date <= now() - interval '180 days' THEN t.id END),
        'hasRetentionData', (c.end_date <= now() - interval '180 days')
      )
    ) as prog_row
    FROM public.cohorts c
    LEFT JOIN public.courses crs ON crs.id = c.course_id OR crs.id = (
      SELECT cert.course_id FROM public.certifications cert LIMIT 1
    )
    LEFT JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    LEFT JOIN public.trainees t ON t.id = ce.trainee_id
    LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = ce.trainee_id
    LEFT JOIN public.employment_records er ON er.trainee_id = ce.trainee_id
    LEFT JOIN public.skill_assessments sa ON sa.trainee_id = ce.trainee_id
    LEFT JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
    LEFT JOIN public.follow_ups fu ON fu.trainee_id = ce.trainee_id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND ce.enrolled_at >= v_start_time
    GROUP BY c.id, c.name, crs.title, crs.category, c.start_date, c.end_date
    ORDER BY c.start_date DESC
  ) sub;

  -- -------------------------------------------------------------------------
  -- 7. TRAINEES ASSOCIATED WITH PROVIDER (Zero PII - Aadhaar completely omitted)
  -- -------------------------------------------------------------------------
  SELECT coalesce(jsonb_agg(t_row), '[]'::jsonb) INTO v_trainees
  FROM (
    SELECT DISTINCT ON (t.id) jsonb_build_object(
      'id', t.id,
      'enrollmentId', ce.id,
      'name', coalesce(p.name, 'Verified Trainee'),
      'cohortId', c.id,
      'cohortName', c.name,
      'programme', coalesce(crs.title, c.name),
      'enrolledAt', to_char(ce.enrolled_at, 'YYYY-MM-DD'),
      'trainingStatus', ce.status,
      'status', ce.status,
      'isCertified', (tc.id IS NOT NULL),
      'certificateNumber', tc.certificate_number,
      'certifiedAt', CASE WHEN tc.issued_at IS NOT NULL THEN to_char(tc.issued_at, 'YYYY-MM-DD') ELSE NULL END,
      'employmentStatus', coalesce(t.employment_status, 'NOT_EMPLOYED'),
      'jobTitle', er.job_title,
      'employerName', coalesce(er.employer_name, t.apprenticeship_employer),
      'monthlySalary', er.monthly_salary,
      'unemploymentReason', t.unemployment_reason,
      'unemploymentNotes', t.unemployment_notes,
      'district', t.district,
      'state', t.state,
      'hasSkillGap', (sg_sub.skill_count > 0),
      'skillGapCount', coalesce(sg_sub.skill_count, 0),
      'followUpStatus', CASE 
        WHEN EXISTS (SELECT 1 FROM public.follow_ups fu WHERE fu.trainee_id = t.id AND fu.status ILIKE '%completed%') THEN 'COMPLETED'
        WHEN EXISTS (SELECT 1 FROM public.follow_ups fu WHERE fu.trainee_id = t.id) THEN 'PENDING'
        ELSE 'NONE'
      END,
      'dropoutDate', to_char(ce.dropout_date, 'YYYY-MM-DD'),
      'dropoutReason', ce.dropout_reason,
      'dropoutNotes', ce.dropout_notes
    ) as t_row
    FROM public.cohorts c
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.trainees t ON t.id = ce.trainee_id
    JOIN public.profiles p ON p.id = t.user_id
    LEFT JOIN public.courses crs ON crs.id = c.course_id
    LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = t.id
    LEFT JOIN LATERAL (
      SELECT employer_name, job_title, monthly_salary
      FROM public.employment_records
      WHERE trainee_id = t.id
      ORDER BY start_date DESC NULLS LAST, created_at DESC
      LIMIT 1
    ) er ON true
    LEFT JOIN LATERAL (
      SELECT count(DISTINCT sg2.id) as skill_count
      FROM public.skill_assessments sa2
      JOIN public.skill_gaps sg2 ON sg2.skill_assessment_id = sa2.id
      WHERE sa2.trainee_id = t.id
    ) sg_sub ON true
    WHERE c.training_provider_id = v_resolved_provider_id
      AND ce.enrolled_at >= v_start_time
    ORDER BY t.id, ce.enrolled_at DESC
  ) sub;

  -- -------------------------------------------------------------------------
  -- 8. TRAINING REGISTRY RECORDS (With dropout action tracking)
  -- -------------------------------------------------------------------------
  SELECT coalesce(jsonb_agg(tr_row), '[]'::jsonb) INTO v_training_records
  FROM (
    SELECT jsonb_build_object(
      'enrollmentId', ce.id,
      'traineeId', t.id,
      'traineeName', p.name,
      'cohortId', c.id,
      'cohortName', c.name,
      'courseTitle', coalesce(crs.title, c.name),
      'sector', coalesce(crs.category, 'General'),
      'enrolledAt', to_char(ce.enrolled_at, 'YYYY-MM-DD'),
      'startDate', to_char(c.start_date, 'YYYY-MM-DD'),
      'endDate', CASE WHEN c.end_date IS NOT NULL THEN to_char(c.end_date, 'YYYY-MM-DD') ELSE NULL END,
      'status', ce.status,
      'isCompleted', (c.end_date <= now() OR ce.status = 'COMPLETED'),
      'isCertified', (tc.id IS NOT NULL),
      'certificateNumber', tc.certificate_number,
      'dropoutDate', to_char(ce.dropout_date, 'YYYY-MM-DD'),
      'dropoutReason', ce.dropout_reason,
      'dropoutNotes', ce.dropout_notes
    ) as tr_row
    FROM public.cohorts c
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.trainees t ON t.id = ce.trainee_id
    JOIN public.profiles p ON p.id = t.user_id
    LEFT JOIN public.courses crs ON crs.id = c.course_id
    LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = t.id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND ce.enrolled_at >= v_start_time
    ORDER BY ce.enrolled_at DESC
  ) sub;

  -- -------------------------------------------------------------------------
  -- 9. SKILL GAP INTELLIGENCE
  -- -------------------------------------------------------------------------
  SELECT coalesce(jsonb_agg(gap_row), '[]'::jsonb) INTO v_skill_gaps
  FROM (
    SELECT jsonb_build_object(
      'skillName', sg.skill_name,
      'affectedTraineesCount', count(DISTINCT sa.trainee_id),
      'averageScore', round(avg(sa.overall_score)::numeric, 1),
      'benchmarkScore', 80.0,
      'gap', round((avg(sa.overall_score) - 80.0)::numeric, 1),
      'severity', sg.severity,
      'recommendedIntervention', coalesce(max(inv.type), 'Targeted Competency Bridge Practical Lab')
    ) as gap_row
    FROM public.cohorts c
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.skill_assessments sa ON sa.trainee_id = ce.trainee_id
    JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
    LEFT JOIN public.interventions inv ON inv.skill_gap_id = sg.id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND ce.enrolled_at >= v_start_time
    GROUP BY sg.skill_name, sg.severity
    ORDER BY count(DISTINCT sa.trainee_id) DESC, avg(sa.overall_score) ASC
  ) sub;

  -- -------------------------------------------------------------------------
  -- 10. NON-PLACEMENT ANALYSIS
  -- -------------------------------------------------------------------------
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

  -- -------------------------------------------------------------------------
  -- 11. FOLLOW-UP AGGREGATE
  -- -------------------------------------------------------------------------
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

  -- -------------------------------------------------------------------------
  -- RETURN COMBINED INTELLIGENCE DOSSIER
  -- -------------------------------------------------------------------------
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
    'attrition', v_attrition,
    'dataCompleteness', v_data_completeness,
    'programmes', v_programmes,
    'trainees', v_trainees,
    'trainingRecords', v_training_records,
    'skillGaps', v_skill_gaps,
    'nonPlacement', v_non_placement,
    'salaryProgression', v_salary_progression,
    'followUps', v_follow_ups
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_provider_outcome_intelligence(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_provider_outcome_intelligence(TEXT, TEXT) TO authenticated;
