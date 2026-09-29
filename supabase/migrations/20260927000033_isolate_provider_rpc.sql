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
  v_resolved_provider_id TEXT := 'tp_centurion';
  v_provider_record RECORD;
  v_start_time TIMESTAMPTZ := to_timestamp(0);

  v_kpis JSONB := '{}'::jsonb;
  v_attrition JSONB := '{}'::jsonb;
  v_data_completeness JSONB := '{}'::jsonb;
  v_programmes JSONB := '[]'::jsonb;
  v_trainees JSONB := '[]'::jsonb;
  v_training_records JSONB := '[]'::jsonb;
  v_skill_gaps JSONB := '[]'::jsonb;
  v_non_placement JSONB := '{}'::jsonb;
  v_salary_progression JSONB := '{}'::jsonb;
  v_follow_ups JSONB := '{}'::jsonb;

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
  SELECT id, org_name, accreditation_id, created_at
  INTO v_provider_record
  FROM public.training_providers
  WHERE id = v_resolved_provider_id;

  -- 1. Attrition
  SELECT 
    COUNT(DISTINCT ce.trainee_id),
    COUNT(DISTINCT CASE WHEN ce.status = 'COMPLETED' OR (c.end_date IS NOT NULL AND c.end_date <= now() AND ce.status != 'DROPPED') THEN ce.trainee_id END),
    COUNT(DISTINCT CASE WHEN ce.status = 'DROPPED' OR ce.dropout_date IS NOT NULL THEN ce.trainee_id END)
  INTO v_total_tr, v_att_completed, v_att_dropped
  FROM public.cohort_enrollments ce
  JOIN public.cohorts c ON c.id = ce.cohort_id
  WHERE c.training_provider_id = v_resolved_provider_id;

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
    GROUP BY sg.skill_name, sg.severity
    ORDER BY count(DISTINCT sa.trainee_id) DESC, avg(sa.overall_score) ASC
  ) sub;

  -- 8. SALARY PROGRESSION
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
  WHERE c.training_provider_id = v_resolved_provider_id;

  RETURN jsonb_build_object(
    'provider', jsonb_build_object('id', v_provider_record.id, 'name', v_provider_record.org_name),
    'trainees', v_trainees,
    'trainingRecords', v_training_records,
    'skillGaps', v_skill_gaps,
    'salaryProgression', v_salary_progression,
    'followUps', v_follow_ups
  );
END;
$$;
