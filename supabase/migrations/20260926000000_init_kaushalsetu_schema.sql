-- ============================================================================
-- KaushalSetu — Initial PostgreSQL Schema Migration for Supabase
-- Migration: 20260926000000_init_kaushalsetu_schema.sql
-- Description: Creates all 6 enums and 21 application tables matching schema.prisma
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. Custom Enumerated Types
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'TRAINEE',
    'EMPLOYER',
    'TRAINING_PROVIDER',
    'GOVERNMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.gap_severity AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.intervention_status AS ENUM (
    'PLANNED',
    'ACTIVE',
    'COMPLETED',
    'DROPPED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.outcome_type AS ENUM (
    'EMPLOYED',
    'UNEMPLOYED',
    'UPSKILLED',
    'NO_CHANGE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.verification_type AS ENUM (
    'AADHAAR',
    'EPFO'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM (
    'PENDING',
    'VERIFIED',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Application Tables (21 Models from schema.prisma)
-- ----------------------------------------------------------------------------

-- Table 1: profiles (maps from Prisma User model; references auth.users(id))
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role public.user_role NOT NULL,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Table 2: training_providers (Prisma TrainingProvider)
CREATE TABLE IF NOT EXISTS public.training_providers (
  id TEXT PRIMARY KEY DEFAULT ('tp_' || replace(gen_random_uuid()::text, '-', '')),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_name TEXT NOT NULL,
  accreditation_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 3: employers (Prisma Employer)
CREATE TABLE IF NOT EXISTS public.employers (
  id TEXT PRIMARY KEY DEFAULT ('emp_' || replace(gen_random_uuid()::text, '-', '')),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 4: government_users (Prisma GovernmentUser)
CREATE TABLE IF NOT EXISTS public.government_users (
  id TEXT PRIMARY KEY DEFAULT ('gov_' || replace(gen_random_uuid()::text, '-', '')),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  region TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 5: trainees (Prisma Trainee)
CREATE TABLE IF NOT EXISTS public.trainees (
  id TEXT PRIMARY KEY DEFAULT ('tr_' || replace(gen_random_uuid()::text, '-', '')),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  dob TIMESTAMPTZ NOT NULL,
  gender TEXT,
  aadhaar_linked BOOLEAN NOT NULL DEFAULT false,
  epfo_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trainees_aadhaar_linked ON public.trainees(aadhaar_linked);

-- Table 6: cohorts (Prisma Cohort)
CREATE TABLE IF NOT EXISTS public.cohorts (
  id TEXT PRIMARY KEY DEFAULT ('ch_' || replace(gen_random_uuid()::text, '-', '')),
  training_provider_id TEXT NOT NULL REFERENCES public.training_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cohorts_training_provider_id ON public.cohorts(training_provider_id);

-- Table 7: cohort_enrollments (Prisma CohortEnrollment)
CREATE TABLE IF NOT EXISTS public.cohort_enrollments (
  id TEXT PRIMARY KEY DEFAULT ('enr_' || replace(gen_random_uuid()::text, '-', '')),
  cohort_id TEXT NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  trainee_id TEXT NOT NULL REFERENCES public.trainees(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_cohort_enrollment UNIQUE(cohort_id, trainee_id)
);
CREATE INDEX IF NOT EXISTS idx_cohort_enrollments_trainee_id ON public.cohort_enrollments(trainee_id);

-- Table 8: courses (Prisma Course)
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY DEFAULT ('crs_' || replace(gen_random_uuid()::text, '-', '')),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 9: certifications (Prisma Certification)
CREATE TABLE IF NOT EXISTS public.certifications (
  id TEXT PRIMARY KEY DEFAULT ('crt_' || replace(gen_random_uuid()::text, '-', '')),
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuing_body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_certifications_course_id ON public.certifications(course_id);

-- Table 10: trainee_certifications (Prisma TraineeCertification)
CREATE TABLE IF NOT EXISTS public.trainee_certifications (
  id TEXT PRIMARY KEY DEFAULT ('tc_' || replace(gen_random_uuid()::text, '-', '')),
  trainee_id TEXT NOT NULL REFERENCES public.trainees(id) ON DELETE CASCADE,
  certification_id TEXT NOT NULL REFERENCES public.certifications(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  certificate_number TEXT NOT NULL UNIQUE,
  CONSTRAINT uq_trainee_certification UNIQUE(trainee_id, certification_id)
);
CREATE INDEX IF NOT EXISTS idx_trainee_certifications_certification_id ON public.trainee_certifications(certification_id);

-- Table 11: skill_assessments (Prisma SkillAssessment)
CREATE TABLE IF NOT EXISTS public.skill_assessments (
  id TEXT PRIMARY KEY DEFAULT ('sa_' || replace(gen_random_uuid()::text, '-', '')),
  trainee_id TEXT NOT NULL REFERENCES public.trainees(id) ON DELETE CASCADE,
  assessment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  overall_score DOUBLE PRECISION NOT NULL,
  assessor_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_trainee_id ON public.skill_assessments(trainee_id);

-- Table 12: skill_gaps (Prisma SkillGap)
CREATE TABLE IF NOT EXISTS public.skill_gaps (
  id TEXT PRIMARY KEY DEFAULT ('sg_' || replace(gen_random_uuid()::text, '-', '')),
  skill_assessment_id TEXT NOT NULL REFERENCES public.skill_assessments(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  severity public.gap_severity NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_skill_gaps_skill_assessment_id ON public.skill_gaps(skill_assessment_id);

-- Table 13: interventions (Prisma Intervention)
CREATE TABLE IF NOT EXISTS public.interventions (
  id TEXT PRIMARY KEY DEFAULT ('int_' || replace(gen_random_uuid()::text, '-', '')),
  skill_gap_id TEXT NOT NULL REFERENCES public.skill_gaps(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  status public.intervention_status NOT NULL DEFAULT 'PLANNED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interventions_skill_gap_id ON public.interventions(skill_gap_id);

-- Table 14: outcomes (Prisma Outcome)
CREATE TABLE IF NOT EXISTS public.outcomes (
  id TEXT PRIMARY KEY DEFAULT ('out_' || replace(gen_random_uuid()::text, '-', '')),
  intervention_id TEXT NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  outcome_type public.outcome_type NOT NULL,
  wage_lift_percent DOUBLE PRECISION,
  employer_id TEXT REFERENCES public.employers(id) ON DELETE SET NULL,
  validation_status TEXT NOT NULL DEFAULT 'PENDING',
  validated_at TIMESTAMPTZ,
  validated_by TEXT,
  retention_3m TEXT NOT NULL DEFAULT 'pending',
  retention_6m TEXT NOT NULL DEFAULT 'pending',
  retention_12m TEXT NOT NULL DEFAULT 'pending',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outcomes_intervention_id ON public.outcomes(intervention_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_employer_id ON public.outcomes(employer_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_validation_status ON public.outcomes(validation_status);

-- Table 15: insights (Prisma Insight)
CREATE TABLE IF NOT EXISTS public.insights (
  id TEXT PRIMARY KEY DEFAULT ('ins_' || replace(gen_random_uuid()::text, '-', '')),
  outcome_id TEXT NOT NULL REFERENCES public.outcomes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  confidence_score DOUBLE PRECISION NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insights_outcome_id ON public.insights(outcome_id);

-- Table 16: employment_records (Prisma EmploymentRecord)
CREATE TABLE IF NOT EXISTS public.employment_records (
  id TEXT PRIMARY KEY DEFAULT ('emp_rec_' || replace(gen_random_uuid()::text, '-', '')),
  trainee_id TEXT NOT NULL REFERENCES public.trainees(id) ON DELETE CASCADE,
  employer_id TEXT NOT NULL REFERENCES public.employers(id) ON DELETE RESTRICT,
  job_title TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  monthly_salary DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employment_records_trainee_id ON public.employment_records(trainee_id);
CREATE INDEX IF NOT EXISTS idx_employment_records_employer_id ON public.employment_records(employer_id);

-- Table 17: verifications (Prisma Verification)
CREATE TABLE IF NOT EXISTS public.verifications (
  id TEXT PRIMARY KEY DEFAULT ('ver_' || replace(gen_random_uuid()::text, '-', '')),
  trainee_id TEXT NOT NULL REFERENCES public.trainees(id) ON DELETE CASCADE,
  type public.verification_type NOT NULL,
  status public.verification_status NOT NULL DEFAULT 'PENDING',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verifications_trainee_id ON public.verifications(trainee_id);
CREATE INDEX IF NOT EXISTS idx_verifications_type_status ON public.verifications(type, status);

-- Table 18: follow_ups (Prisma FollowUp)
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id TEXT PRIMARY KEY DEFAULT ('flw_' || replace(gen_random_uuid()::text, '-', '')),
  trainee_id TEXT NOT NULL REFERENCES public.trainees(id) ON DELETE CASCADE,
  follow_up_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_follow_ups_trainee_id ON public.follow_ups(trainee_id);

-- Table 19: employer_feedback (Prisma EmployerFeedback)
CREATE TABLE IF NOT EXISTS public.employer_feedback (
  id TEXT PRIMARY KEY DEFAULT ('ef_' || replace(gen_random_uuid()::text, '-', '')),
  trainee_id TEXT NOT NULL REFERENCES public.trainees(id) ON DELETE CASCADE,
  employer_id TEXT NOT NULL REFERENCES public.employers(id) ON DELETE RESTRICT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employer_feedback_trainee_id ON public.employer_feedback(trainee_id);
CREATE INDEX IF NOT EXISTS idx_employer_feedback_employer_id ON public.employer_feedback(employer_id);

-- Table 20: audit_logs (Prisma AuditLog)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('log_' || replace(gen_random_uuid()::text, '-', '')),
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_entity_id ON public.audit_logs(entity, entity_id);

-- Table 21: notifications (Prisma Notification)
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY DEFAULT ('notif_' || replace(gen_random_uuid()::text, '-', '')),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
