-- ============================================================================
-- KaushalSetu — Row Level Security (RLS) Policies Migration for Supabase
-- Migration: 20260926000001_rls_policies.sql
-- Description: Enables RLS on all 21 tables, defines zero-recursion PL/pgSQL
--              security definer helper functions, and applies granular role policies.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Standard Supabase Auth Environment Setup (Roles & Grants)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Standard schema privileges for Supabase roles on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- Ensure auth.uid() and auth.role() exist for local non-Supabase standalone environments only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    CREATE SCHEMA IF NOT EXISTS auth;
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS UUID
      LANGUAGE sql STABLE
      AS $f$
        SELECT coalesce(
          nullif(current_setting('request.jwt.claim.sub', true), ''),
          (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
        )::uuid;
      $f$;
      CREATE OR REPLACE FUNCTION auth.role()
      RETURNS TEXT
      LANGUAGE sql STABLE
      AS $f$
        SELECT coalesce(
          nullif(current_setting('request.jwt.claim.role', true), ''),
          (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
          'anon'
        )::text;
      $f$;
    $func$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. Security Definer Helper Functions (Guaranteed Zero-Recursion via PL/pgSQL)
-- ----------------------------------------------------------------------------

-- 1.1 Returns the application role of the current authenticated user
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role;
END;
$$;

-- 1.2 Returns the trainee record ID associated with the current user (if trainee)
CREATE OR REPLACE FUNCTION public.current_trainee_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
BEGIN
  SELECT id INTO v_id FROM public.trainees WHERE user_id = auth.uid();
  RETURN v_id;
END;
$$;

-- 1.3 Returns the employer record ID associated with the current user (if employer)
CREATE OR REPLACE FUNCTION public.current_employer_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
BEGIN
  SELECT id INTO v_id FROM public.employers WHERE user_id = auth.uid();
  RETURN v_id;
END;
$$;

-- 1.4 Returns the training provider ID associated with the current user (if provider)
CREATE OR REPLACE FUNCTION public.current_provider_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
BEGIN
  SELECT id INTO v_id FROM public.training_providers WHERE user_id = auth.uid();
  RETURN v_id;
END;
$$;

-- 1.5 Returns true if current user has the GOVERNMENT role
CREATE OR REPLACE FUNCTION public.is_government()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_gov BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'GOVERNMENT'::public.user_role
  ) INTO v_is_gov;
  RETURN coalesce(v_is_gov, false);
END;
$$;

-- 1.6 Returns true if given trainee is enrolled in any cohort of the current provider
CREATE OR REPLACE FUNCTION public.is_trainee_of_provider(p_trainee_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  IF p_trainee_id IS NULL THEN
    RETURN false;
  END IF;
  SELECT EXISTS (
    SELECT 1 
    FROM public.cohort_enrollments ce
    JOIN public.cohorts c ON c.id = ce.cohort_id
    JOIN public.training_providers tp ON tp.id = c.training_provider_id
    WHERE ce.trainee_id = p_trainee_id
      AND tp.user_id = auth.uid()
  ) INTO v_result;
  RETURN coalesce(v_result, false);
END;
$$;

-- 1.7 Returns true if given trainee is employed by the current employer
CREATE OR REPLACE FUNCTION public.is_candidate_of_employer(p_trainee_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  IF p_trainee_id IS NULL THEN
    RETURN false;
  END IF;
  SELECT EXISTS (
    SELECT 1 
    FROM public.employment_records er
    JOIN public.employers emp ON emp.id = er.employer_id
    WHERE er.trainee_id = p_trainee_id
      AND emp.user_id = auth.uid()
  ) INTO v_result;
  RETURN coalesce(v_result, false);
END;
$$;

-- 1.8 Returns true if trainee is enrolled with the specified provider
CREATE OR REPLACE FUNCTION public.is_trainee_enrolled_with_provider(p_provider_id TEXT, p_trainee_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  IF p_provider_id IS NULL OR p_trainee_id IS NULL THEN
    RETURN false;
  END IF;
  SELECT EXISTS (
    SELECT 1 
    FROM public.cohort_enrollments ce
    JOIN public.cohorts c ON c.id = ce.cohort_id
    WHERE c.training_provider_id = p_provider_id
      AND ce.trainee_id = p_trainee_id
  ) INTO v_result;
  RETURN coalesce(v_result, false);
END;
$$;

-- 1.9 Returns true if trainee is employed by the specified employer
CREATE OR REPLACE FUNCTION public.is_trainee_employed_by(p_employer_id TEXT, p_trainee_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  IF p_employer_id IS NULL OR p_trainee_id IS NULL THEN
    RETURN false;
  END IF;
  SELECT EXISTS (
    SELECT 1 
    FROM public.employment_records er
    WHERE er.employer_id = p_employer_id
      AND er.trainee_id = p_trainee_id
  ) INTO v_result;
  RETURN coalesce(v_result, false);
END;
$$;

-- 1.10 Returns true if current provider manages this cohort
CREATE OR REPLACE FUNCTION public.can_provider_manage_cohort(p_cohort_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.cohorts c
    JOIN public.training_providers tp ON tp.id = c.training_provider_id
    WHERE c.id = p_cohort_id AND tp.user_id = auth.uid()
  ) INTO v_result;
  RETURN coalesce(v_result, false);
END;
$$;

-- 1.11 Returns true if current trainee is enrolled in this cohort
CREATE OR REPLACE FUNCTION public.can_trainee_access_cohort(p_cohort_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.cohort_enrollments ce
    JOIN public.trainees t ON t.id = ce.trainee_id
    WHERE ce.cohort_id = p_cohort_id AND t.user_id = auth.uid()
  ) INTO v_result;
  RETURN coalesce(v_result, false);
END;
$$;

-- 1.12 Returns true if current employer employs an enrolled candidate in this cohort
CREATE OR REPLACE FUNCTION public.can_employer_access_cohort(p_cohort_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.cohort_enrollments ce
    JOIN public.employment_records er ON er.trainee_id = ce.trainee_id
    JOIN public.employers emp ON emp.id = er.employer_id
    WHERE ce.cohort_id = p_cohort_id AND emp.user_id = auth.uid()
  ) INTO v_result;
  RETURN coalesce(v_result, false);
END;
$$;

-- 1.13 Helper for skill gap access without cross-table RLS recursion
CREATE OR REPLACE FUNCTION public.can_access_skill_gap(p_gap_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainee_id TEXT;
  v_trainee_user_id UUID;
BEGIN
  SELECT sa.trainee_id, t.user_id INTO v_trainee_id, v_trainee_user_id
  FROM public.skill_gaps sg
  JOIN public.skill_assessments sa ON sa.id = sg.skill_assessment_id
  JOIN public.trainees t ON t.id = sa.trainee_id
  WHERE sg.id = p_gap_id;

  IF v_trainee_user_id = auth.uid() THEN
    RETURN true;
  END IF;

  IF public.is_trainee_of_provider(v_trainee_id) THEN
    RETURN true;
  END IF;

  IF public.is_candidate_of_employer(v_trainee_id) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 1.14 Helper for intervention access without cross-table RLS recursion
CREATE OR REPLACE FUNCTION public.can_access_intervention(p_intervention_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_skill_gap_id TEXT;
BEGIN
  SELECT skill_gap_id INTO v_skill_gap_id
  FROM public.interventions
  WHERE id = p_intervention_id;

  RETURN public.can_access_skill_gap(v_skill_gap_id);
END;
$$;

-- 1.15 Helper for outcome access without cross-table RLS recursion
CREATE OR REPLACE FUNCTION public.can_access_outcome(p_intervention_id TEXT, p_employer_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_employer_id IS NOT NULL AND p_employer_id = public.current_employer_id() THEN
    RETURN true;
  END IF;

  RETURN public.can_access_intervention(p_intervention_id);
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Enable Row Level Security on All 21 Tables
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainee_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. Granular Table-by-Table Policies
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_government());

DROP POLICY IF EXISTS profiles_insert_policy ON public.profiles;
CREATE POLICY profiles_insert_policy ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_government())
  WITH CHECK (
    -- User cannot change their own role; government can update
    (id = auth.uid() AND role = public.current_user_role())
    OR public.is_government()
  );

DROP POLICY IF EXISTS profiles_delete_policy ON public.profiles;
CREATE POLICY profiles_delete_policy ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_government());

-- ============================================================================
-- 2. TRAINING PROVIDERS
-- ============================================================================
DROP POLICY IF EXISTS training_providers_select_policy ON public.training_providers;
CREATE POLICY training_providers_select_policy ON public.training_providers
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_government()
    OR public.is_trainee_enrolled_with_provider(id, public.current_trainee_id())
  );

DROP POLICY IF EXISTS training_providers_update_policy ON public.training_providers;
CREATE POLICY training_providers_update_policy ON public.training_providers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_government())
  WITH CHECK (user_id = auth.uid() OR public.is_government());

DROP POLICY IF EXISTS training_providers_insert_policy ON public.training_providers;
CREATE POLICY training_providers_insert_policy ON public.training_providers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_government());

DROP POLICY IF EXISTS training_providers_delete_policy ON public.training_providers;
CREATE POLICY training_providers_delete_policy ON public.training_providers
  FOR DELETE TO authenticated
  USING (public.is_government());

-- ============================================================================
-- 3. EMPLOYERS
-- ============================================================================
DROP POLICY IF EXISTS employers_select_policy ON public.employers;
CREATE POLICY employers_select_policy ON public.employers
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_government()
    OR public.is_trainee_employed_by(id, public.current_trainee_id())
  );

DROP POLICY IF EXISTS employers_update_policy ON public.employers;
CREATE POLICY employers_update_policy ON public.employers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_government())
  WITH CHECK (user_id = auth.uid() OR public.is_government());

DROP POLICY IF EXISTS employers_insert_policy ON public.employers;
CREATE POLICY employers_insert_policy ON public.employers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_government());

DROP POLICY IF EXISTS employers_delete_policy ON public.employers;
CREATE POLICY employers_delete_policy ON public.employers
  FOR DELETE TO authenticated
  USING (public.is_government());

-- ============================================================================
-- 4. GOVERNMENT USERS
-- ============================================================================
DROP POLICY IF EXISTS government_users_select_policy ON public.government_users;
CREATE POLICY government_users_select_policy ON public.government_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_government());

DROP POLICY IF EXISTS government_users_all_policy ON public.government_users;
CREATE POLICY government_users_all_policy ON public.government_users
  FOR ALL TO authenticated
  USING (public.is_government())
  WITH CHECK (public.is_government());

-- ============================================================================
-- 5. TRAINEES
-- ============================================================================
DROP POLICY IF EXISTS trainees_select_policy ON public.trainees;
CREATE POLICY trainees_select_policy ON public.trainees
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_trainee_of_provider(id)
    OR public.is_candidate_of_employer(id)
    OR public.is_government()
  );

DROP POLICY IF EXISTS trainees_insert_policy ON public.trainees;
CREATE POLICY trainees_insert_policy ON public.trainees
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_government());

DROP POLICY IF EXISTS trainees_update_policy ON public.trainees;
CREATE POLICY trainees_update_policy ON public.trainees
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_government())
  WITH CHECK (user_id = auth.uid() OR public.is_government());

DROP POLICY IF EXISTS trainees_delete_policy ON public.trainees;
CREATE POLICY trainees_delete_policy ON public.trainees
  FOR DELETE TO authenticated
  USING (public.is_government());

-- ============================================================================
-- 6. COHORTS
-- ============================================================================
DROP POLICY IF EXISTS cohorts_select_policy ON public.cohorts;
CREATE POLICY cohorts_select_policy ON public.cohorts
  FOR SELECT TO authenticated
  USING (
    training_provider_id = public.current_provider_id()
    OR public.is_government()
    OR public.can_trainee_access_cohort(id)
    OR public.can_employer_access_cohort(id)
  );

DROP POLICY IF EXISTS cohorts_write_policy ON public.cohorts;
CREATE POLICY cohorts_write_policy ON public.cohorts
  FOR ALL TO authenticated
  USING (training_provider_id = public.current_provider_id() OR public.is_government())
  WITH CHECK (training_provider_id = public.current_provider_id() OR public.is_government());

-- ============================================================================
-- 7. COHORT ENROLLMENTS
-- ============================================================================
DROP POLICY IF EXISTS cohort_enrollments_select_policy ON public.cohort_enrollments;
CREATE POLICY cohort_enrollments_select_policy ON public.cohort_enrollments
  FOR SELECT TO authenticated
  USING (
    trainee_id = public.current_trainee_id()
    OR public.is_trainee_of_provider(trainee_id)
    OR public.is_candidate_of_employer(trainee_id)
    OR public.is_government()
  );

DROP POLICY IF EXISTS cohort_enrollments_write_policy ON public.cohort_enrollments;
CREATE POLICY cohort_enrollments_write_policy ON public.cohort_enrollments
  FOR ALL TO authenticated
  USING (
    public.can_provider_manage_cohort(cohort_id)
    OR public.is_government()
  )
  WITH CHECK (
    public.can_provider_manage_cohort(cohort_id)
    OR public.is_government()
  );

-- ============================================================================
-- 8. COURSES (Public Catalog)
-- ============================================================================
DROP POLICY IF EXISTS courses_select_policy ON public.courses;
CREATE POLICY courses_select_policy ON public.courses
  FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS courses_write_policy ON public.courses;
CREATE POLICY courses_write_policy ON public.courses
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('TRAINING_PROVIDER', 'GOVERNMENT'))
  WITH CHECK (public.current_user_role() IN ('TRAINING_PROVIDER', 'GOVERNMENT'));

-- ============================================================================
-- 9. CERTIFICATIONS (Public Catalog)
-- ============================================================================
DROP POLICY IF EXISTS certifications_select_policy ON public.certifications;
CREATE POLICY certifications_select_policy ON public.certifications
  FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS certifications_write_policy ON public.certifications;
CREATE POLICY certifications_write_policy ON public.certifications
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('TRAINING_PROVIDER', 'GOVERNMENT'))
  WITH CHECK (public.current_user_role() IN ('TRAINING_PROVIDER', 'GOVERNMENT'));

-- ============================================================================
-- 10. TRAINEE CERTIFICATIONS
-- ============================================================================
DROP POLICY IF EXISTS trainee_certifications_select_policy ON public.trainee_certifications;
CREATE POLICY trainee_certifications_select_policy ON public.trainee_certifications
  FOR SELECT TO authenticated
  USING (
    trainee_id = public.current_trainee_id()
    OR public.is_trainee_of_provider(trainee_id)
    OR public.is_candidate_of_employer(trainee_id)
    OR public.is_government()
  );

DROP POLICY IF EXISTS trainee_certifications_write_policy ON public.trainee_certifications;
CREATE POLICY trainee_certifications_write_policy ON public.trainee_certifications
  FOR ALL TO authenticated
  USING (
    public.is_trainee_of_provider(trainee_id)
    OR public.is_government()
  )
  WITH CHECK (
    public.is_trainee_of_provider(trainee_id)
    OR public.is_government()
  );

-- ============================================================================
-- 11. SKILL ASSESSMENTS
-- ============================================================================
DROP POLICY IF EXISTS skill_assessments_select_policy ON public.skill_assessments;
CREATE POLICY skill_assessments_select_policy ON public.skill_assessments
  FOR SELECT TO authenticated
  USING (
    trainee_id = public.current_trainee_id()
    OR public.is_trainee_of_provider(trainee_id)
    OR public.is_candidate_of_employer(trainee_id)
    OR public.is_government()
  );

DROP POLICY IF EXISTS skill_assessments_write_policy ON public.skill_assessments;
CREATE POLICY skill_assessments_write_policy ON public.skill_assessments
  FOR ALL TO authenticated
  USING (
    public.is_trainee_of_provider(trainee_id)
    OR public.is_government()
    OR (trainee_id = public.current_trainee_id() AND assessor_type = 'Self Reported Outcome')
  )
  WITH CHECK (
    public.is_trainee_of_provider(trainee_id)
    OR public.is_government()
    OR (trainee_id = public.current_trainee_id() AND assessor_type = 'Self Reported Outcome')
  );

-- ============================================================================
-- 12. SKILL GAPS
-- ============================================================================
DROP POLICY IF EXISTS skill_gaps_select_policy ON public.skill_gaps;
CREATE POLICY skill_gaps_select_policy ON public.skill_gaps
  FOR SELECT TO authenticated
  USING (
    public.is_government()
    OR public.can_access_skill_gap(id)
  );

DROP POLICY IF EXISTS skill_gaps_write_policy ON public.skill_gaps;
CREATE POLICY skill_gaps_write_policy ON public.skill_gaps
  FOR ALL TO authenticated
  USING (
    public.is_government()
    OR public.can_access_skill_gap(id)
  )
  WITH CHECK (
    public.is_government()
    OR public.can_access_skill_gap(id)
  );

-- ============================================================================
-- 13. INTERVENTIONS
-- ============================================================================
DROP POLICY IF EXISTS interventions_select_policy ON public.interventions;
CREATE POLICY interventions_select_policy ON public.interventions
  FOR SELECT TO authenticated
  USING (
    public.is_government()
    OR public.can_access_intervention(id)
  );

DROP POLICY IF EXISTS interventions_write_policy ON public.interventions;
CREATE POLICY interventions_write_policy ON public.interventions
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'TRAINING_PROVIDER' OR public.is_government())
  WITH CHECK (public.current_user_role() = 'TRAINING_PROVIDER' OR public.is_government());

-- ============================================================================
-- 14. OUTCOMES
-- ============================================================================
DROP POLICY IF EXISTS outcomes_select_policy ON public.outcomes;
CREATE POLICY outcomes_select_policy ON public.outcomes
  FOR SELECT TO authenticated
  USING (
    public.is_government()
    OR public.can_access_outcome(intervention_id, employer_id)
  );

DROP POLICY IF EXISTS outcomes_insert_policy ON public.outcomes;
CREATE POLICY outcomes_insert_policy ON public.outcomes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_government()
    OR public.can_access_intervention(intervention_id)
  );

DROP POLICY IF EXISTS outcomes_update_policy ON public.outcomes;
CREATE POLICY outcomes_update_policy ON public.outcomes
  FOR UPDATE TO authenticated
  USING (
    employer_id = public.current_employer_id()
    OR public.is_government()
    OR public.can_access_intervention(intervention_id)
  )
  WITH CHECK (
    employer_id = public.current_employer_id()
    OR public.is_government()
    OR public.can_access_intervention(intervention_id)
  );

-- ============================================================================
-- 15. INSIGHTS
-- ============================================================================
DROP POLICY IF EXISTS insights_select_policy ON public.insights;
CREATE POLICY insights_select_policy ON public.insights
  FOR SELECT TO authenticated
  USING (
    public.is_government()
    OR public.current_user_role() IN ('TRAINING_PROVIDER', 'EMPLOYER')
  );

DROP POLICY IF EXISTS insights_write_policy ON public.insights;
CREATE POLICY insights_write_policy ON public.insights
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('TRAINING_PROVIDER', 'GOVERNMENT'))
  WITH CHECK (public.current_user_role() IN ('TRAINING_PROVIDER', 'GOVERNMENT'));

-- ============================================================================
-- 16. EMPLOYMENT RECORDS
-- ============================================================================
DROP POLICY IF EXISTS employment_records_select_policy ON public.employment_records;
CREATE POLICY employment_records_select_policy ON public.employment_records
  FOR SELECT TO authenticated
  USING (
    trainee_id = public.current_trainee_id()
    OR employer_id = public.current_employer_id()
    OR public.is_trainee_of_provider(trainee_id)
    OR public.is_government()
  );

DROP POLICY IF EXISTS employment_records_insert_policy ON public.employment_records;
CREATE POLICY employment_records_insert_policy ON public.employment_records
  FOR INSERT TO authenticated
  WITH CHECK (
    employer_id = public.current_employer_id()
    OR trainee_id = public.current_trainee_id()
    OR public.is_government()
  );

DROP POLICY IF EXISTS employment_records_update_policy ON public.employment_records;
CREATE POLICY employment_records_update_policy ON public.employment_records
  FOR UPDATE TO authenticated
  USING (
    employer_id = public.current_employer_id()
    OR public.is_government()
  )
  WITH CHECK (
    employer_id = public.current_employer_id()
    OR public.is_government()
  );

DROP POLICY IF EXISTS employment_records_delete_policy ON public.employment_records;
CREATE POLICY employment_records_delete_policy ON public.employment_records
  FOR DELETE TO authenticated
  USING (
    employer_id = public.current_employer_id()
    OR public.is_government()
  );

-- ============================================================================
-- 17. VERIFICATIONS
-- ============================================================================
DROP POLICY IF EXISTS verifications_select_policy ON public.verifications;
CREATE POLICY verifications_select_policy ON public.verifications
  FOR SELECT TO authenticated
  USING (
    trainee_id = public.current_trainee_id()
    OR public.is_government()
  );

DROP POLICY IF EXISTS verifications_write_policy ON public.verifications;
CREATE POLICY verifications_write_policy ON public.verifications
  FOR ALL TO authenticated
  USING (public.is_government())
  WITH CHECK (public.is_government());

-- ============================================================================
-- 18. FOLLOW UPS
-- ============================================================================
DROP POLICY IF EXISTS follow_ups_select_policy ON public.follow_ups;
CREATE POLICY follow_ups_select_policy ON public.follow_ups
  FOR SELECT TO authenticated
  USING (
    trainee_id = public.current_trainee_id()
    OR public.is_trainee_of_provider(trainee_id)
    OR public.is_government()
  );

DROP POLICY IF EXISTS follow_ups_insert_policy ON public.follow_ups;
CREATE POLICY follow_ups_insert_policy ON public.follow_ups
  FOR INSERT TO authenticated
  WITH CHECK (
    trainee_id = public.current_trainee_id()
    OR public.is_trainee_of_provider(trainee_id)
    OR public.is_government()
  );

DROP POLICY IF EXISTS follow_ups_update_policy ON public.follow_ups;
CREATE POLICY follow_ups_update_policy ON public.follow_ups
  FOR UPDATE TO authenticated
  USING (
    trainee_id = public.current_trainee_id()
    OR public.is_trainee_of_provider(trainee_id)
    OR public.is_government()
  )
  WITH CHECK (
    trainee_id = public.current_trainee_id()
    OR public.is_trainee_of_provider(trainee_id)
    OR public.is_government()
  );

DROP POLICY IF EXISTS follow_ups_delete_policy ON public.follow_ups;
CREATE POLICY follow_ups_delete_policy ON public.follow_ups
  FOR DELETE TO authenticated
  USING (public.is_government());

-- ============================================================================
-- 19. EMPLOYER FEEDBACK
-- ============================================================================
DROP POLICY IF EXISTS employer_feedback_select_policy ON public.employer_feedback;
CREATE POLICY employer_feedback_select_policy ON public.employer_feedback
  FOR SELECT TO authenticated
  USING (
    employer_id = public.current_employer_id()
    OR public.is_trainee_of_provider(trainee_id)
    OR public.is_government()
  );

DROP POLICY IF EXISTS employer_feedback_insert_policy ON public.employer_feedback;
CREATE POLICY employer_feedback_insert_policy ON public.employer_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    employer_id = public.current_employer_id()
    OR public.is_government()
  );

DROP POLICY IF EXISTS employer_feedback_update_policy ON public.employer_feedback;
CREATE POLICY employer_feedback_update_policy ON public.employer_feedback
  FOR UPDATE TO authenticated
  USING (employer_id = public.current_employer_id() OR public.is_government())
  WITH CHECK (employer_id = public.current_employer_id() OR public.is_government());

DROP POLICY IF EXISTS employer_feedback_delete_policy ON public.employer_feedback;
CREATE POLICY employer_feedback_delete_policy ON public.employer_feedback
  FOR DELETE TO authenticated
  USING (public.is_government());

-- ============================================================================
-- 20. AUDIT LOGS (Append-only immutable security)
-- ============================================================================
DROP POLICY IF EXISTS audit_logs_select_policy ON public.audit_logs;
CREATE POLICY audit_logs_select_policy ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_government());

DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
CREATE POLICY audit_logs_insert_policy ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    (actor_id = auth.uid()::text AND actor_role = public.current_user_role()::text)
    OR public.is_government()
  );

-- Strictly disallow updates and deletions on audit logs (immutable)
DROP POLICY IF EXISTS audit_logs_no_update ON public.audit_logs;
CREATE POLICY audit_logs_no_update ON public.audit_logs
  FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS audit_logs_no_delete ON public.audit_logs;
CREATE POLICY audit_logs_no_delete ON public.audit_logs
  FOR DELETE TO authenticated
  USING (false);

-- ============================================================================
-- 21. NOTIFICATIONS (Strict user isolation)
-- ============================================================================
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
CREATE POLICY notifications_select_policy ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_update_policy ON public.notifications;
CREATE POLICY notifications_update_policy ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_government()
    OR public.is_trainee_of_provider((SELECT id FROM public.trainees WHERE user_id = notifications.user_id))
    OR public.is_candidate_of_employer((SELECT id FROM public.trainees WHERE user_id = notifications.user_id))
  );

DROP POLICY IF EXISTS notifications_delete_policy ON public.notifications;
CREATE POLICY notifications_delete_policy ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
