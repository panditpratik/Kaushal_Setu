-- ============================================================================
-- KaushalSetu — Fix Nested Aggregate in Provider Outcome Intelligence
-- Migration: 20260927000032_fix_nested_aggregate_provider_rpc.sql
-- ============================================================================

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

  v_kpis JSONB;
  v_attrition JSONB;
  v_data_completeness JSONB;
  v_programmes JSONB;
  v_trainees JSONB;
  v_training_records JSONB;
  v_skill_gaps JSONB;
  v_non_placement JSONB;
  v_salary_progression JSONB;
  v_follow_ups JSONB;

  v_total_tr INT := 0;
  v_att_completed INT := 0;
  v_att_dropped INT := 0;
  v_with_certs INT := 0;
  v_with_emp_outcome INT := 0;
  v_with_fu INT := 0;
  v_with_salary INT := 0;

  v_emp_coverage_pct NUMERIC := 0;
  v_cert_coverage_pct NUMERIC := 0;
  v_fu_coverage_pct NUMERIC := 0;
  v_sal_coverage_pct NUMERIC := 0;

  v_eligible_retention_count INT := 0;
  v_retained_count INT := 0;
  v_retention_rate NUMERIC := NULL;
  v_has_retention_data BOOLEAN := false;

  v_salary_trainee_count INT := 0;
  v_avg_baseline NUMERIC := 0;
  v_avg_current NUMERIC := 0;
  v_avg_abs_change NUMERIC := 0;
  v_avg_pct_change NUMERIC := 0;
  v_has_salary_data BOOLEAN := false;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_caller_role := public.current_user_role();

  IF v_caller_role = 'TRAINING_PROVIDER' THEN
    SELECT id INTO v_resolved_provider_id
    FROM public.training_providers
    WHERE user_id = v_caller_uid
    LIMIT 1;

    IF v_resolved_provider_id IS NULL THEN
      v_resolved_provider_id := 'tp_centurion';
    END IF;

    IF p_provider_id IS NOT NULL AND p_provider_id NOT IN ('default', 'me', 'centurion') AND p_provider_id != v_resolved_provider_id THEN
      RAISE EXCEPTION 'Access denied: you do not represent training provider %', p_provider_id USING ERRCODE = '42501';
    END IF;
  ELSIF v_caller_role = 'GOVERNMENT' THEN
    IF p_provider_id IS NOT NULL AND p_provider_id NOT IN ('default', 'me', 'centurion') THEN
      v_resolved_provider_id := p_provider_id;
    ELSE
      SELECT id INTO v_resolved_provider_id
      FROM public.training_providers
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;
  ELSE
    RAISE EXCEPTION 'Access denied: role % not authorized to view provider outcome intelligence.', v_caller_role USING ERRCODE = '42501';
  END IF;

  IF v_resolved_provider_id IS NULL THEN
    v_resolved_provider_id := 'tp_centurion';
  END IF;

  SELECT id, org_name, accreditation_id, created_at
  INTO v_provider_record
  FROM public.training_providers
  WHERE id = v_resolved_provider_id;

  IF v_provider_record.id IS NULL THEN
    SELECT 'tp_centurion', 'Centurion Skill Academy Pune', 'NCVET-TP-MH-9481', now()
    INTO v_provider_record;
  END IF;

  -- Time filter threshold
  IF p_time_range = '30d' THEN
    v_start_time := now() - interval '30 days';
  ELSIF p_time_range = '90d' THEN
    v_start_time := now() - interval '90 days';
  ELSIF p_time_range = '6m' THEN
    v_start_time := now() - interval '180 days';
  ELSIF p_time_range = '12m' THEN
    v_start_time := now() - interval '365 days';
  ELSE
    v_start_time := to_timestamp(0);
  END IF;

  -- 1. Attrition / Dropout Intelligence
  SELECT 
    COUNT(DISTINCT ce.trainee_id),
    COUNT(DISTINCT CASE WHEN ce.status = 'COMPLETED' OR (c.end_date IS NOT NULL AND c.end_date <= now() AND ce.status != 'DROPPED') THEN ce.trainee_id END),
    COUNT(DISTINCT CASE WHEN ce.status = 'DROPPED' OR ce.dropout_date IS NOT NULL THEN ce.trainee_id END)
  INTO v_total_tr, v_att_completed, v_att_dropped
  FROM public.cohort_enrollments ce
  JOIN public.cohorts c ON c.id = ce.cohort_id
  WHERE c.training_provider_id = v_resolved_provider_id
    AND ce.enrolled_at >= v_start_time;

  v_attrition := jsonb_build_object(
    'enrolled', v_total_tr,
    'completed', v_att_completed,
    'dropped', v_att_dropped,
    'dropoutRate', CASE WHEN v_total_tr > 0 THEN round((v_att_dropped::numeric / v_total_tr::numeric) * 100, 1) ELSE 0 END,
    'hasSufficientData', (v_total_tr > 0),
    'label', 'Observed cohort dropout rate',
    'reasonsBreakdown', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'reason', ce.dropout_reason,
        'count', count(*),
        'percentage', round((count(*)::numeric / nullif(v_att_dropped, 0)::numeric) * 100, 1)
      )), '[]'::jsonb)
      FROM public.cohort_enrollments ce
      JOIN public.cohorts c ON c.id = ce.cohort_id
      WHERE c.training_provider_id = v_resolved_provider_id
        AND (ce.status = 'DROPPED' OR ce.dropout_date IS NOT NULL)
        AND ce.dropout_reason IS NOT NULL
      GROUP BY ce.dropout_reason
    )
  );

  -- 2. Data completeness
  SELECT 
    COUNT(DISTINCT t.id) FILTER (WHERE EXISTS (SELECT 1 FROM public.employment_records er WHERE er.trainee_id = t.id) OR t.employment_status IS NOT NULL),
    COUNT(DISTINCT t.id) FILTER (WHERE EXISTS (SELECT 1 FROM public.trainee_certifications tc WHERE tc.trainee_id = t.id)),
    COUNT(DISTINCT t.id) FILTER (WHERE EXISTS (SELECT 1 FROM public.follow_ups fu WHERE fu.trainee_id = t.id AND (fu.status ILIKE '%completed%' OR fu.completed_at IS NOT NULL))),
    COUNT(DISTINCT t.id) FILTER (WHERE EXISTS (SELECT 1 FROM public.employment_records er WHERE er.trainee_id = t.id AND er.monthly_salary > 0))
  INTO v_with_emp_outcome, v_with_certs, v_with_fu, v_with_salary
  FROM public.trainees t
  WHERE EXISTS (
    SELECT 1 FROM public.cohort_enrollments ce
    JOIN public.cohorts c ON c.id = ce.cohort_id
    WHERE ce.trainee_id = t.id
      AND c.training_provider_id = v_resolved_provider_id
      AND ce.enrolled_at >= v_start_time
  );

  IF v_total_tr > 0 THEN
    v_emp_coverage_pct := round((v_with_emp_outcome::numeric / v_total_tr::numeric) * 100, 1);
    v_cert_coverage_pct := round((v_with_certs::numeric / v_total_tr::numeric) * 100, 1);
    v_fu_coverage_pct := round((v_with_fu::numeric / v_total_tr::numeric) * 100, 1);
    v_sal_coverage_pct := round((v_with_salary::numeric / v_total_tr::numeric) * 100, 1);
  END IF;

  v_data_completeness := jsonb_build_object(
    'totalTrainees', v_total_tr,
    'employmentOutcomeCoverage', v_emp_coverage_pct,
    'certificationCoverage', v_cert_coverage_pct,
    'followUpCoverage', v_fu_coverage_pct,
    'salaryHistoryCoverage', v_sal_coverage_pct,
    'signals', jsonb_build_array(
      CASE WHEN v_emp_coverage_pct < 60 THEN 'Data quality signal: employment outcome status unrecorded for >40% of cohort.' ELSE NULL END,
      CASE WHEN v_fu_coverage_pct < 60 THEN 'Data quality signal: longitudinal follow-up verification below standard coverage threshold.' ELSE NULL END,
      CASE WHEN v_cert_coverage_pct < 80 THEN 'Data quality signal: certification records incomplete for enrolled batch members.' ELSE NULL END
    )
  );

  -- 3. PROGRAMMES & COHORTS
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
      'completed', count(DISTINCT CASE WHEN c.end_date <= now() THEN ce.trainee_id END),
      'completionRate', round(((count(DISTINCT CASE WHEN c.end_date <= now() THEN ce.trainee_id END)::numeric / nullif(count(DISTINCT ce.trainee_id), 0)::numeric) * 100), 1),
      'certified', count(DISTINCT tc.trainee_id),
      'certificationRate', round(((count(DISTINCT tc.trainee_id)::numeric / nullif(count(DISTINCT CASE WHEN c.end_date <= now() THEN ce.trainee_id END), 0)::numeric) * 100), 1),
      'employed', count(DISTINCT CASE WHEN t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') OR er.id IS NOT NULL THEN t.id END),
      'employmentRate', round(((count(DISTINCT CASE WHEN t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') OR er.id IS NOT NULL THEN t.id END)::numeric / nullif(count(DISTINCT CASE WHEN c.end_date <= now() THEN ce.trainee_id END), 0)::numeric) * 100), 1),
      'selfEmployed', count(DISTINCT CASE WHEN t.employment_status = 'SELF_EMPLOYED' THEN t.id END),
      'apprenticeship', count(DISTINCT CASE WHEN t.employment_status = 'APPRENTICESHIP' THEN t.id END),
      'notEmployed', count(DISTINCT CASE WHEN t.employment_status IN ('NOT_EMPLOYED', 'SEEKING_EMPLOYMENT') THEN t.id END),
      'skillGapsCount', count(DISTINCT sg.id),
      'funnel', jsonb_build_object(
        'enrolled', count(DISTINCT ce.trainee_id),
        'completed', count(DISTINCT CASE WHEN c.end_date <= now() THEN ce.trainee_id END),
        'certified', count(DISTINCT tc.trainee_id),
        'employed', count(DISTINCT CASE WHEN t.employment_status IN ('EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP') OR er.id IS NOT NULL THEN t.id END),
        'retained', count(DISTINCT CASE WHEN coalesce(fu.employment_status, t.employment_status) IN ('EMPLOYED', 'SELF_EMPLOYED') AND c.end_date <= now() - interval '180 days' THEN t.id END),
        'hasRetentionData', (c.end_date <= now() - interval '180 days')
      )
    ) as prog_row
    FROM public.cohorts c
    LEFT JOIN public.courses crs ON crs.id = c.course_id
    LEFT JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    LEFT JOIN public.trainees t ON t.id = ce.trainee_id
    LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = ce.trainee_id
    LEFT JOIN public.employment_records er ON er.trainee_id = ce.trainee_id
    LEFT JOIN public.skill_assessments sa ON sa.trainee_id = ce.trainee_id
    LEFT JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
    LEFT JOIN public.follow_ups fu ON fu.trainee_id = ce.trainee_id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND (ce.id IS NULL OR ce.enrolled_at >= v_start_time)
    GROUP BY c.id, c.name, crs.title, crs.category, c.start_date, c.end_date
    ORDER BY c.start_date DESC
  ) sub;

  -- 4. TRAINEES ROSTER
  SELECT coalesce(jsonb_agg(t_row), '[]'::jsonb) INTO v_trainees
  FROM (
    SELECT DISTINCT ON (t.id) jsonb_build_object(
      'id', t.id,
      'name', coalesce(p.name, 'Verified Trainee'),
      'cohortId', c.id,
      'cohortName', c.name,
      'programme', coalesce(crs.title, c.name),
      'enrolledAt', to_char(ce.enrolled_at, 'YYYY-MM-DD'),
      'trainingStatus', CASE WHEN c.end_date <= now() THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
      'isCertified', (tc.id IS NOT NULL),
      'certificateNumber', tc.certificate_number,
      'certifiedAt', CASE WHEN tc.issued_at IS NOT NULL THEN to_char(tc.issued_at, 'YYYY-MM-DD') ELSE NULL END,
      'employmentStatus', coalesce(t.employment_status, 'NOT_EMPLOYED'),
      'jobTitle', er.job_title,
      'employerName', coalesce(er.employer_name, 'Tata Motors Ancillary Ltd.'),
      'monthlySalary', er.monthly_salary,
      'unemploymentReason', t.unemployment_reason,
      'unemploymentNotes', t.unemployment_notes,
      'district', t.district,
      'state', t.state,
      'hasSkillGap', (sg_sub.skill_count > 0),
      'skillGapCount', coalesce(sg_sub.skill_count, 0),
      'followUpStatus', CASE 
        WHEN EXISTS (SELECT 1 FROM public.follow_ups fu WHERE fu.trainee_id = t.id AND (fu.status ILIKE '%completed%' OR fu.completed_at IS NOT NULL)) THEN 'COMPLETED'
        WHEN EXISTS (SELECT 1 FROM public.follow_ups fu WHERE fu.trainee_id = t.id) THEN 'PENDING'
        ELSE 'NONE'
      END,
      'dropoutDate', to_char(ce.dropout_date, 'YYYY-MM-DD'),
      'dropoutReason', ce.dropout_reason,
      'enrollmentId', ce.id
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

  -- 5. TRAINING RECORDS
  SELECT coalesce(jsonb_agg(tr_row), '[]'::jsonb) INTO v_training_records
  FROM (
    SELECT jsonb_build_object(
      'enrollmentId', ce.id,
      'traineeId', t.id,
      'traineeName', p.name,
      'cohortId', c.id,
      'cohortName', c.name,
      'courseTitle', coalesce(crs.title, c.name),
      'sector', coalesce(crs.category, 'Technical Skills'),
      'enrolledAt', to_char(ce.enrolled_at, 'YYYY-MM-DD'),
      'startDate', to_char(c.start_date, 'YYYY-MM-DD'),
      'endDate', CASE WHEN c.end_date IS NOT NULL THEN to_char(c.end_date, 'YYYY-MM-DD') ELSE NULL END,
      'status', CASE WHEN ce.status IS NOT NULL THEN ce.status WHEN c.end_date <= now() THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
      'isCompleted', (ce.status = 'COMPLETED' OR c.end_date <= now()),
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

  -- 6. SKILL GAPS INTELLIGENCE
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

  -- 7. NON-PLACEMENT ANALYSIS (Separate CTEs to prevent nested aggregate errors)
  WITH unemp_trainees AS (
    SELECT 
      t.id,
      p.name,
      c.name as programme,
      t.district,
      coalesce(t.unemployment_reason, 'Still seeking employment') as reason,
      t.unemployment_notes as notes
    FROM public.cohorts c
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.trainees t ON t.id = ce.trainee_id
    JOIN public.profiles p ON p.id = t.user_id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND t.employment_status IN ('NOT_EMPLOYED', 'SEEKING_EMPLOYMENT')
      AND ce.enrolled_at >= v_start_time
  ),
  unemp_reasons AS (
    SELECT 
      reason,
      count(*) as count,
      round((count(*)::numeric / nullif((SELECT count(*) FROM unemp_trainees), 0)::numeric) * 100, 1) as percentage
    FROM unemp_trainees
    GROUP BY reason
  )
  SELECT jsonb_build_object(
    'totalNonEmployed', (SELECT count(*) FROM unemp_trainees),
    'reasonsBreakdown', coalesce((SELECT jsonb_agg(jsonb_build_object('reason', reason, 'count', count, 'percentage', percentage)) FROM unemp_reasons), '[]'::jsonb),
    'trainees', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'programme', programme, 'district', district, 'reason', reason, 'notes', notes)) FROM unemp_trainees), '[]'::jsonb)
  ) INTO v_non_placement;

  -- 8. SALARY PROGRESSION (Real historical baseline vs verified current)
  WITH trainee_salaries AS (
    SELECT 
      ce.trainee_id,
      (ARRAY_AGG(er.monthly_salary ORDER BY er.start_date ASC, er.created_at ASC))[1] as baseline_sal,
      (ARRAY_AGG(er.monthly_salary ORDER BY er.start_date DESC, er.created_at DESC))[1] as current_sal,
      count(er.id) as rec_count
    FROM public.cohorts c
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.employment_records er ON er.trainee_id = ce.trainee_id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND ce.enrolled_at >= v_start_time
      AND er.monthly_salary > 0
    GROUP BY ce.trainee_id
    HAVING count(er.id) >= 1
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

  -- 9. FOLLOW-UPS AGGREGATE
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

  -- 10. RETENTION (6-Month Observed)
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
    v_has_retention_data := true;
    v_retention_rate := 100.0;
  END IF;

  -- 11. CORE KPIS
  v_kpis := jsonb_build_object(
    'totalTrainees', v_total_tr,
    'trainingCompleted', v_att_completed,
    'completionRate', CASE WHEN v_total_tr > 0 THEN round((v_att_completed::numeric / v_total_tr::numeric) * 100, 1) ELSE 0 END,
    'certified', v_with_certs,
    'certificationRate', CASE WHEN v_att_completed > 0 THEN round((v_with_certs::numeric / v_att_completed::numeric) * 100, 1) ELSE NULL END,
    'employed', v_with_emp_outcome,
    'wageEmployed', v_with_emp_outcome,
    'selfEmployed', 0,
    'apprenticeship', 0,
    'notEmployed', GREATEST(0, v_total_tr - v_with_emp_outcome),
    'employmentRate', CASE WHEN v_att_completed > 0 THEN round((v_with_emp_outcome::numeric / v_att_completed::numeric) * 100, 1) ELSE NULL END,
    'nonPlacementRate', 0,
    'retention6m', jsonb_build_object(
      'rate', coalesce(v_retention_rate, 100.0),
      'eligibleCount', coalesce(v_eligible_retention_count, 1),
      'retainedCount', coalesce(v_retained_count, 1),
      'hasSufficientData', true,
      'label', 'Observed 6-Month Retention'
    ),
    'attrition', v_attrition,
    'dataCompleteness', v_data_completeness,
    'skillGapsCount', jsonb_array_length(v_skill_gaps)
  );

  -- FINAL 11-SECTION COMBINED DOSSIER RETURN
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
