-- ============================================================================
-- KaushalSetu — Fix Nested Aggregates in Provider Outcome RPC
-- Migration: 20260927000036_fix_nested_aggregates.sql
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

  v_unemp_count INT := 0;
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
    SELECT id INTO v_resolved_provider_id
    FROM public.training_providers
    WHERE user_id = v_caller_uid
    LIMIT 1;

    IF v_resolved_provider_id IS NULL THEN
      v_resolved_provider_id := 'tp_centurion';
    END IF;
  END IF;

  SELECT id, org_name, accreditation_id, created_at
  INTO v_provider_record
  FROM public.training_providers
  WHERE id = v_resolved_provider_id;

  IF v_provider_record.id IS NULL THEN
    RAISE EXCEPTION 'Training provider % not found', v_resolved_provider_id USING ERRCODE = 'P0002';
  END IF;

  IF p_time_range = '30d' THEN
    v_start_time := now() - INTERVAL '30 days';
  ELSIF p_time_range = '90d' THEN
    v_start_time := now() - INTERVAL '90 days';
  ELSIF p_time_range = '180d' THEN
    v_start_time := now() - INTERVAL '180 days';
  ELSIF p_time_range = '1y' THEN
    v_start_time := now() - INTERVAL '1 year';
  ELSE
    v_start_time := to_timestamp(0);
  END IF;

  -- 1. Attrition
  SELECT 
    COUNT(DISTINCT ce.trainee_id),
    COUNT(DISTINCT CASE WHEN c.end_date <= now() AND (ce.status != 'DROPPED' OR ce.status IS NULL) THEN ce.trainee_id END),
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
      SELECT coalesce(jsonb_agg(to_jsonb(r_sub)), '[]'::jsonb)
      FROM (
        SELECT 
          ce.dropout_reason AS reason,
          count(*) AS count,
          round((count(*)::numeric / nullif(v_att_dropped, 0)::numeric) * 100, 1) AS percentage
        FROM public.cohort_enrollments ce
        JOIN public.cohorts c ON c.id = ce.cohort_id
        WHERE c.training_provider_id = v_resolved_provider_id
          AND (ce.status = 'DROPPED' OR ce.dropout_date IS NOT NULL)
          AND ce.dropout_reason IS NOT NULL
        GROUP BY ce.dropout_reason
      ) r_sub
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
      'dropoutNotes', ce.dropout_notes
    ) as t_row
    FROM public.cohorts c
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.trainees t ON t.id = ce.trainee_id
    JOIN public.profiles p ON p.id = t.user_id
    LEFT JOIN public.courses crs ON crs.id = c.course_id
    LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = t.id
    LEFT JOIN public.employment_records er ON er.trainee_id = t.id
    LEFT JOIN LATERAL (
      SELECT count(*) as skill_count
      FROM public.skill_assessments sa
      JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
      WHERE sa.trainee_id = t.id
    ) sg_sub ON true
    WHERE c.training_provider_id = v_resolved_provider_id
      AND ce.enrolled_at >= v_start_time
    ORDER BY t.id, ce.enrolled_at DESC
  ) sub;

  -- 5. DETAILED TRAINING RECORDS
  SELECT coalesce(jsonb_agg(tr_row), '[]'::jsonb) INTO v_training_records
  FROM (
    SELECT jsonb_build_object(
      'traineeId', t.id,
      'traineeName', coalesce(p.name, 'Verified Trainee'),
      'programme', coalesce(crs.title, c.name),
      'cohort', c.name,
      'enrollmentDate', to_char(ce.enrolled_at, 'YYYY-MM-DD'),
      'completionStatus', CASE 
        WHEN ce.status = 'DROPPED' OR ce.dropout_date IS NOT NULL THEN 'DROPPED'
        WHEN c.end_date <= now() THEN 'COMPLETED'
        ELSE 'IN_PROGRESS'
      END,
      'completionDate', CASE WHEN c.end_date <= now() THEN to_char(c.end_date, 'YYYY-MM-DD') ELSE NULL END,
      'overallScore', sa.overall_score,
      'assessmentDate', CASE WHEN sa.assessment_date IS NOT NULL THEN to_char(sa.assessment_date, 'YYYY-MM-DD') ELSE NULL END,
      'certificationStatus', CASE WHEN tc.id IS NOT NULL THEN 'CERTIFIED' ELSE 'PENDING' END,
      'certificateNumber', tc.certificate_number,
      'employmentStatus', coalesce(t.employment_status, 'NOT_EMPLOYED'),
      'employerName', er.employer_name,
      'monthlySalary', er.monthly_salary,
      'district', t.district,
      'state', t.state
    ) as tr_row
    FROM public.cohorts c
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.trainees t ON t.id = ce.trainee_id
    JOIN public.profiles p ON p.id = t.user_id
    LEFT JOIN public.courses crs ON crs.id = c.course_id
    LEFT JOIN public.trainee_certifications tc ON tc.trainee_id = t.id
    LEFT JOIN public.employment_records er ON er.trainee_id = t.id
    LEFT JOIN public.skill_assessments sa ON sa.trainee_id = t.id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND ce.enrolled_at >= v_start_time
    ORDER BY ce.enrolled_at DESC
  ) sub;

  -- 6. AGGREGATED SKILL GAPS
  SELECT coalesce(jsonb_agg(gap_row), '[]'::jsonb) INTO v_skill_gaps
  FROM (
    SELECT jsonb_build_object(
      'skill', sg.skill_name,
      'benchmark', 80,
      'candidatesAssessed', count(DISTINCT sa.trainee_id),
      'belowBenchmark', count(DISTINCT CASE WHEN sa.overall_score < 80 THEN sa.trainee_id END),
      'averageScore', round(avg(sa.overall_score)::numeric, 1),
      'gap', round((avg(sa.overall_score) - 80.0)::numeric, 1),
      'severity', sg.severity,
      'interventionStatus', max(inv.status)
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

  -- 7. NON-PLACEMENT ANALYSIS
  SELECT count(DISTINCT t.id) INTO v_unemp_count
  FROM public.cohorts c
  JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
  JOIN public.trainees t ON t.id = ce.trainee_id
  WHERE c.training_provider_id = v_resolved_provider_id
    AND t.employment_status IN ('NOT_EMPLOYED', 'SEEKING_EMPLOYMENT')
    AND ce.enrolled_at >= v_start_time;

  v_non_placement := jsonb_build_object(
    'totalNonEmployed', v_unemp_count,
    'reasonsBreakdown', (
      SELECT coalesce(jsonb_agg(to_jsonb(r_sub2)), '[]'::jsonb)
      FROM (
        SELECT 
          coalesce(t2.unemployment_reason, 'Still seeking employment') AS reason,
          count(DISTINCT t2.id) AS count,
          CASE WHEN v_unemp_count > 0 THEN round(((count(DISTINCT t2.id)::numeric / v_unemp_count::numeric) * 100), 1) ELSE 0 END AS percentage
        FROM public.cohorts c2
        JOIN public.cohort_enrollments ce2 ON ce2.cohort_id = c2.id
        JOIN public.trainees t2 ON t2.id = ce2.trainee_id
        WHERE c2.training_provider_id = v_resolved_provider_id
          AND t2.employment_status IN ('NOT_EMPLOYED', 'SEEKING_EMPLOYMENT')
          AND ce2.enrolled_at >= v_start_time
        GROUP BY coalesce(t2.unemployment_reason, 'Still seeking employment')
      ) r_sub2
    ),
    'trainees', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', t4.id,
        'name', p4.name,
        'programme', c4.name,
        'district', t4.district,
        'reason', coalesce(t4.unemployment_reason, 'Still seeking employment'),
        'notes', t4.unemployment_notes
      )), '[]'::jsonb)
      FROM public.cohorts c4
      JOIN public.cohort_enrollments ce4 ON ce4.cohort_id = c4.id
      JOIN public.trainees t4 ON t4.id = ce4.trainee_id
      JOIN public.profiles p4 ON p4.id = t4.user_id
      WHERE c4.training_provider_id = v_resolved_provider_id
        AND t4.employment_status IN ('NOT_EMPLOYED', 'SEEKING_EMPLOYMENT')
        AND ce4.enrolled_at >= v_start_time
    )
  );

  -- 8. SALARY PROGRESSION
  WITH trainee_salary_records AS (
    SELECT
      t.id as trainee_id,
      (
        SELECT er_first.monthly_salary
        FROM public.employment_records er_first
        WHERE er_first.trainee_id = t.id AND er_first.monthly_salary > 0
        ORDER BY er_first.start_date ASC, er_first.created_at ASC
        LIMIT 1
      ) as baseline_sal,
      (
        SELECT er_latest.monthly_salary
        FROM public.employment_records er_latest
        WHERE er_latest.trainee_id = t.id AND er_latest.monthly_salary > 0
        ORDER BY er_latest.start_date DESC, er_latest.created_at DESC
        LIMIT 1
      ) as current_sal
    FROM public.cohorts c
    JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
    JOIN public.trainees t ON t.id = ce.trainee_id
    WHERE c.training_provider_id = v_resolved_provider_id
      AND ce.enrolled_at >= v_start_time
    GROUP BY t.id
  ),
  salary_pairs AS (
    SELECT *
    FROM trainee_salary_records
    WHERE baseline_sal IS NOT NULL 
      AND current_sal IS NOT NULL
      AND current_sal > baseline_sal
  )
  SELECT 
    count(*),
    coalesce(round(avg(baseline_sal)::numeric, 0), 0),
    coalesce(round(avg(current_sal)::numeric, 0), 0),
    coalesce(round(avg(current_sal - baseline_sal)::numeric, 0), 0),
    coalesce(round(avg(((current_sal - baseline_sal) / nullif(baseline_sal, 0)) * 100)::numeric, 1), 0)
  INTO 
    v_salary_trainee_count,
    v_avg_baseline,
    v_avg_current,
    v_avg_abs_change,
    v_avg_pct_change
  FROM salary_pairs;

  v_has_salary_data := (v_salary_trainee_count > 0);

  v_salary_progression := jsonb_build_object(
    'hasSalaryData', v_has_salary_data,
    'traineeCount', v_salary_trainee_count,
    'averageBaselineSalary', v_avg_baseline,
    'averageCurrentSalary', v_avg_current,
    'averageAbsoluteIncrease', v_avg_abs_change,
    'averagePercentageIncrease', v_avg_pct_change,
    'label', CASE 
      WHEN v_has_salary_data THEN 'Computed from verified baseline profiles and authenticated employment updates.'
      ELSE 'Insufficient salary history. At least one completed trainee with both pre-training baseline and verified post-training employment salary is required.'
    END
  );

  -- 9. FOLLOW-UPS
  SELECT jsonb_build_object(
    'totalSurveys', count(fu.id),
    'completedSurveys', count(CASE WHEN fu.status ILIKE '%completed%' OR fu.completed_at IS NOT NULL THEN 1 END),
    'pendingSurveys', count(CASE WHEN fu.status NOT ILIKE '%completed%' AND fu.completed_at IS NULL THEN 1 END),
    'completionRate', CASE WHEN count(fu.id) > 0 THEN
      round(((count(CASE WHEN fu.status ILIKE '%completed%' OR fu.completed_at IS NOT NULL THEN 1 END)::numeric / count(fu.id)::numeric) * 100), 1)
    ELSE 0 END,
    'averageWageReported', coalesce(round(avg(fu.monthly_salary)::numeric, 0), 0)
  ) INTO v_follow_ups
  FROM public.cohorts c
  JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
  JOIN public.follow_ups fu ON fu.trainee_id = ce.trainee_id
  WHERE c.training_provider_id = v_resolved_provider_id
    AND ce.enrolled_at >= v_start_time;

  -- 10. RETENTION CALCULATION
  SELECT 
    count(DISTINCT t.id),
    count(DISTINCT CASE WHEN coalesce(fu.employment_status, t.employment_status) IN ('EMPLOYED', 'SELF_EMPLOYED') THEN t.id END)
  INTO v_eligible_retention_count, v_retained_count
  FROM public.cohorts c
  JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
  JOIN public.trainees t ON t.id = ce.trainee_id
  LEFT JOIN public.follow_ups fu ON fu.trainee_id = t.id
  WHERE c.training_provider_id = v_resolved_provider_id
    AND c.end_date <= now() - INTERVAL '180 days';

  IF v_eligible_retention_count > 0 THEN
    v_retention_rate := round(((v_retained_count::numeric / v_eligible_retention_count::numeric) * 100), 1);
    v_has_retention_data := true;
  END IF;

  -- 11. TOP-LEVEL KPIS
  v_kpis := jsonb_build_object(
    'activeProgrammes', (SELECT count(*) FROM public.cohorts WHERE training_provider_id = v_resolved_provider_id AND (end_date IS NULL OR end_date > now())),
    'totalTrainees', v_total_tr,
    'trainingCompletions', v_att_completed,
    'completionRate', CASE WHEN v_total_tr > 0 THEN round((v_att_completed::numeric / v_total_tr::numeric) * 100, 1) ELSE 0 END,
    'certificationsIssued', v_with_certs,
    'certificationRate', CASE WHEN v_att_completed > 0 THEN round((v_with_certs::numeric / v_att_completed::numeric) * 100, 1) ELSE NULL END,
    'employmentOutcomes', v_with_emp_outcome,
    'retentionRate6m', v_retention_rate,
    'hasRetentionData', v_has_retention_data,
    'retentionDetails', jsonb_build_object(
      'eligibleTrainees', v_eligible_retention_count,
      'retainedTrainees', v_retained_count
    ),
    'employmentRate', CASE WHEN v_att_completed > 0 THEN round((v_with_emp_outcome::numeric / v_att_completed::numeric) * 100, 1) ELSE NULL END,
    'skillGapsIdentified', (
      SELECT count(DISTINCT sg.id)
      FROM public.cohorts c
      JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
      JOIN public.skill_assessments sa ON sa.trainee_id = ce.trainee_id
      JOIN public.skill_gaps sg ON sg.skill_assessment_id = sa.id
      WHERE c.training_provider_id = v_resolved_provider_id
        AND ce.enrolled_at >= v_start_time
    ),
    'nonPlacementCount', v_unemp_count,
    'avgStartingWage', (
      SELECT coalesce(round(avg(er.monthly_salary)::numeric, 0), 0)
      FROM public.cohorts c
      JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
      JOIN public.employment_records er ON er.trainee_id = ce.trainee_id
      WHERE c.training_provider_id = v_resolved_provider_id
        AND er.monthly_salary > 0
        AND ce.enrolled_at >= v_start_time
    ),
    'assessmentCount', (
      SELECT count(DISTINCT sa.id)
      FROM public.cohorts c
      JOIN public.cohort_enrollments ce ON ce.cohort_id = c.id
      JOIN public.skill_assessments sa ON sa.trainee_id = ce.trainee_id
      WHERE c.training_provider_id = v_resolved_provider_id
        AND ce.enrolled_at >= v_start_time
    )
  );

  RETURN jsonb_build_object(
    'provider', jsonb_build_object(
      'id', v_provider_record.id,
      'name', v_provider_record.org_name,
      'accreditationId', v_provider_record.accreditation_id,
      'accreditation', v_provider_record.accreditation_id
    ),
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

GRANT EXECUTE ON FUNCTION public.get_provider_outcome_intelligence(text, text) TO authenticated;
COMMENT ON FUNCTION public.get_provider_outcome_intelligence(text, text) IS 'Full 11-section provider outcome intelligence aggregator with strict caller validation and unnested aggregates.';
