-- ============================================================================
-- KaushalSetu — Comprehensive Production-Safe Development Seed Data
-- File: supabase/seed.sql
-- Description: Deterministic stakeholder journey test data adhering to Supabase
--              Auth standards (auth.users -> profiles -> domain entities).
-- Password for all seed users: Password@123
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 0. CLEAN SLATE FOR DETERMINISTIC SEEDING
-- ----------------------------------------------------------------------------
TRUNCATE TABLE 
  public.audit_logs,
  public.notifications,
  public.employer_feedback,
  public.follow_ups,
  public.verifications,
  public.insights,
  public.outcomes,
  public.employment_records,
  public.interventions,
  public.skill_gaps,
  public.skill_assessments,
  public.trainee_certifications,
  public.cohort_enrollments,
  public.cohorts,
  public.certifications,
  public.courses,
  public.trainees,
  public.employers,
  public.training_providers,
  public.government_users,
  public.profiles
CASCADE;

DELETE FROM auth.users WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888'
) OR email IN (
  'gov@msde.gov.in',
  'provider@centurion.example.com',
  'other.tp@example.com',
  'employer@tata.example.com',
  'hr@bharatforge.example.com',
  'other.emp@example.com',
  'trainee@kaushalsetu.gov.in',
  'other.trainee@example.com',
  'anita.patil@example.com'
);

-- ----------------------------------------------------------------------------
-- 1. SEED AUTHENTICATED USERS (Supabase GoTrue auth.users)
-- ----------------------------------------------------------------------------
-- Standard bcrypt hash for 'Password@123'
-- Generated using pgcrypto gen_salt('bf', 10)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_sso_user,
  created_at,
  updated_at
) VALUES
  -- 1.1 Government User (Dr. Ramesh Deshmukh)
  (
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'gov@msde.gov.in',
    crypt('Password@123', gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Dr. Ramesh Deshmukh"}'::jsonb,
    false,
    now(),
    now()
  ),
  -- 1.2 Training Provider User (Centurion Skill Academy)
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'provider@centurion.example.com',
    crypt('Password@123', gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Centurion Skill Academy"}'::jsonb,
    false,
    now(),
    now()
  ),
  -- 1.3 Secondary Provider User (Marathwada Skill Hub)
  (
    '77777777-7777-7777-7777-777777777777',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'other.tp@example.com',
    crypt('Password@123', gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Marathwada Skill Hub"}'::jsonb,
    false,
    now(),
    now()
  ),
  -- 1.4 Primary Employer User (Vikram Rajput / Tata Motors)
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'employer@tata.example.com',
    crypt('Password@123', gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Vikram Rajput (HR Operations)"}'::jsonb,
    false,
    now(),
    now()
  ),
  -- 1.5 Secondary Employer User (Sunita Mehra / Bharat Forge)
  (
    '66666666-6666-6666-6666-666666666666',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'hr@bharatforge.example.com',
    crypt('Password@123', gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Sunita Mehra (Talent Lead)"}'::jsonb,
    false,
    now(),
    now()
  ),
  -- 1.6 Primary Trainee User (Priya Sharma)
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'trainee@kaushalsetu.gov.in',
    crypt('Password@123', gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Priya Sharma"}'::jsonb,
    false,
    now(),
    now()
  ),
  -- 1.7 Secondary Trainee User (Rahul Verma)
  (
    '55555555-5555-5555-5555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'other.trainee@example.com',
    crypt('Password@123', gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Rahul Verma"}'::jsonb,
    false,
    now(),
    now()
  ),
  -- 1.8 Tertiary Trainee User (Anita Patil)
  (
    '88888888-8888-8888-8888-888888888888',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'anita.patil@example.com',
    crypt('Password@123', gen_salt('bf', 10)),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Anita Patil"}'::jsonb,
    false,
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Ensure required string fields for GoTrue scanner are not NULL
UPDATE auth.users 
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888'
);

-- Insert corresponding auth.identities records for GoTrue password login
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT 
  id,
  id,
  json_build_object('sub', id::text, 'email', email)::jsonb,
  'email',
  id::text,
  now(),
  now(),
  now()
FROM auth.users
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888'
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. PUBLIC PROFILES (1-to-1 with auth.users)
-- ----------------------------------------------------------------------------
INSERT INTO public.profiles (id, name, email, role, created_at) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Dr. Ramesh Deshmukh', 'gov@msde.gov.in', 'GOVERNMENT', now()),
  ('33333333-3333-3333-3333-333333333333', 'Centurion Skill Academy', 'provider@centurion.example.com', 'TRAINING_PROVIDER', now()),
  ('77777777-7777-7777-7777-777777777777', 'Marathwada Skill Hub', 'other.tp@example.com', 'TRAINING_PROVIDER', now()),
  ('22222222-2222-2222-2222-222222222222', 'Vikram Rajput (HR Operations)', 'employer@tata.example.com', 'EMPLOYER', now()),
  ('66666666-6666-6666-6666-666666666666', 'Sunita Mehra (Talent Lead)', 'hr@bharatforge.example.com', 'EMPLOYER', now()),
  ('11111111-1111-1111-1111-111111111111', 'Priya Sharma', 'trainee@kaushalsetu.gov.in', 'TRAINEE', now()),
  ('55555555-5555-5555-5555-555555555555', 'Rahul Verma', 'other.trainee@example.com', 'TRAINEE', now()),
  ('88888888-8888-8888-8888-888888888888', 'Anita Patil', 'anita.patil@example.com', 'TRAINEE', now())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;

-- ----------------------------------------------------------------------------
-- 3. ROLE DOMAIN ENTITIES
-- ----------------------------------------------------------------------------
INSERT INTO public.government_users (id, user_id, department, region, created_at) VALUES
  ('gov_1', '44444444-4444-4444-4444-444444444444', 'Directorate of Vocational Education and Training', 'Maharashtra (Western Zone)', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.training_providers (id, user_id, org_name, accreditation_id, created_at) VALUES
  ('tp_centurion', '33333333-3333-3333-3333-333333333333', 'Centurion Skill Academy Pune', 'NCVET-TP-MH-9481', now()),
  ('tp_other', '77777777-7777-7777-7777-777777777777', 'Marathwada Skill Hub Aurangabad', 'NCVET-TP-MH-8812', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.employers (id, user_id, company_name, sector, created_at) VALUES
  ('emp_tata', '22222222-2222-2222-2222-222222222222', 'Tata Motors Ancillary Ltd.', 'Automotive & Industrial Manufacturing', now()),
  ('emp_other', '66666666-6666-6666-6666-666666666666', 'Bharat Forge Precision Hub', 'Heavy Industrial Forging', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.trainees (id, user_id, dob, gender, aadhaar_linked, epfo_id, created_at) VALUES
  ('tr_priya', '11111111-1111-1111-1111-111111111111', '2001-04-15', 'Female', true, 'MH/PUN/0088219/000/0192', now()),
  ('tr_rahul', '55555555-5555-5555-5555-555555555555', '1999-11-20', 'Male', true, 'MH/NSK/0045129/000/0811', now()),
  ('tr_anita', '88888888-8888-8888-8888-888888888888', '2002-08-05', 'Female', true, 'MH/AUR/0091823/000/0419', now())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. EDUCATIONAL CATALOG (Courses & Certifications)
-- ----------------------------------------------------------------------------
INSERT INTO public.courses (id, title, category, created_at) VALUES
  ('crs_elec', 'Industrial Electrician & Automation Diagnostics', 'Electrical & Power Systems', now()),
  ('crs_auto', 'CNC Machining & Precision Tooling 4.0', 'Automotive & Heavy Forging', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.certifications (id, course_id, name, issuing_body, created_at) VALUES
  ('crt_elec', 'crs_elec', 'NCVET Level 4 Industrial Automation Electrician', 'National Council for Vocational Education and Training', now()),
  ('crt_auto', 'crs_auto', 'NCVET Level 4 Precision CNC Specialist', 'National Council for Vocational Education and Training', now())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. COHORTS & ENROLLMENTS
-- ----------------------------------------------------------------------------
INSERT INTO public.cohorts (id, training_provider_id, name, start_date, end_date, created_at) VALUES
  ('coh_centurion_1', 'tp_centurion', 'Centurion Pune Batch #14', now() - interval '90 days', now() + interval '30 days', now()),
  ('coh_marathwada_1', 'tp_other', 'Marathwada Precision Batch #08', now() - interval '60 days', now() + interval '60 days', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cohort_enrollments (id, cohort_id, trainee_id, enrolled_at) VALUES
  ('enr_priya', 'coh_centurion_1', 'tr_priya', now() - interval '90 days'),
  ('enr_anita', 'coh_centurion_1', 'tr_anita', now() - interval '90 days'),
  ('enr_rahul', 'coh_marathwada_1', 'tr_rahul', now() - interval '60 days')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. TRAINEE CERTIFICATIONS
-- ----------------------------------------------------------------------------
INSERT INTO public.trainee_certifications (id, trainee_id, certification_id, certificate_number, issued_at) VALUES
  ('tc_priya', 'tr_priya', 'crt_elec', 'NCVET/2026/09122', now() - interval '30 days'),
  ('tc_anita', 'tr_anita', 'crt_elec', 'NCVET/2026/09123', now() - interval '25 days')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. ASSESSMENTS, SKILL GAPS & INTERVENTIONS
-- ----------------------------------------------------------------------------
INSERT INTO public.skill_assessments (id, trainee_id, assessment_date, overall_score, assessor_type, created_at) VALUES
  ('sa_priya', 'tr_priya', now() - interval '80 days', 86.5, 'NCVET Certified Assessor', now()),
  ('sa_rahul', 'tr_rahul', now() - interval '50 days', 78.0, 'Batch Baseline Evaluation', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.skill_gaps (id, skill_assessment_id, skill_name, severity, created_at) VALUES
  ('sg_priya', 'sa_priya', 'PLC Troubleshooting & Panel Wiring', 'HIGH', now()),
  ('sg_rahul', 'sa_rahul', 'Precision Tool Calibration & Offsets', 'MEDIUM', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.interventions (id, skill_gap_id, type, provider_name, status, start_date, end_date, created_at) VALUES
  ('int_priya', 'sg_priya', 'Bridge Practical Lab - Automation Diagnostics', 'Centurion Skill Academy Pune', 'COMPLETED', now() - interval '75 days', now() - interval '65 days', now()),
  ('int_rahul', 'sg_rahul', 'CNC Simulator Practice Lab', 'Marathwada Skill Hub', 'ACTIVE', now() - interval '40 days', NULL, now())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. EMPLOYMENT RECORDS & OUTCOMES
-- ----------------------------------------------------------------------------
INSERT INTO public.employment_records (id, trainee_id, employer_id, job_title, start_date, monthly_salary, created_at) VALUES
  ('er_priya', 'tr_priya', 'emp_tata', 'Industrial Automation Electrician', now() - interval '60 days', 21500, now()),
  ('er_anita', 'tr_anita', 'emp_other', 'Quality Control Analyst', now() - interval '45 days', 19800, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.outcomes (
  id,
  intervention_id,
  outcome_type,
  wage_lift_percent,
  employer_id,
  validation_status,
  retention_3m,
  retention_6m,
  retention_12m,
  recorded_at
) VALUES
  ('out_priya', 'int_priya', 'EMPLOYED', 23.5, 'emp_tata', 'VERIFIED', 'verified', 'verified', 'pending', now() - interval '60 days'),
  ('out_anita', 'int_priya', 'EMPLOYED', 18.2, 'emp_other', 'PENDING', 'pending', 'pending', 'pending', now() - interval '40 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.insights (id, outcome_id, text, confidence_score, generated_at) VALUES
  ('ins_priya', 'out_priya', 'High retention velocity driven by hands-on PLC troubleshooting mastery.', 96.2, now())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. VERIFICATIONS, FOLLOW-UPS & FEEDBACK
-- ----------------------------------------------------------------------------
INSERT INTO public.verifications (id, trainee_id, type, status, verified_at, created_at) VALUES
  ('vf_priya_aadhaar', 'tr_priya', 'AADHAAR', 'VERIFIED', now() - interval '85 days', now()),
  ('vf_priya_epfo', 'tr_priya', 'EPFO', 'VERIFIED', now() - interval '55 days', now()),
  ('vf_rahul_aadhaar', 'tr_rahul', 'AADHAAR', 'VERIFIED', now() - interval '58 days', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.follow_ups (id, trainee_id, follow_up_date, status, notes, created_at) VALUES
  ('flw_priya_1', 'tr_priya', now() - interval '30 days', 'Post-Placement Check Done', '60-day milestone confirmed. Trainee adapted to high-voltage shift.', now()),
  ('flw_rahul_1', 'tr_rahul', now() - interval '10 days', 'Assessment Requested', 'Requested Level 5 CNC tooling evaluation.', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.employer_feedback (id, trainee_id, employer_id, rating, feedback_text, submitted_at) VALUES
  ('ef_priya_1', 'tr_priya', 'emp_tata', 4, '[PLC Wiring Standards] Candidate exhibits strong safety compliance.', now() - interval '20 days')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 10. SYSTEM NOTIFICATIONS & AUDIT LOGS
-- ----------------------------------------------------------------------------
INSERT INTO public.notifications (id, user_id, title, message, read, created_at) VALUES
  ('notif_priya_welcome', '11111111-1111-1111-1111-111111111111', 'Welcome to KaushalSetu', 'Your trainee profile and verification records are active.', false, now()),
  ('notif_tata_welcome', '22222222-2222-2222-2222-222222222222', 'Candidate Verification Portal Ready', 'Candidates employed by Tata Motors Ancillary Ltd. are ready for milestone verification.', false, now()),
  ('notif_centurion_welcome', '33333333-3333-3333-3333-333333333333', 'Academy Portal Online', 'Centurion Pune Batch #14 is active.', false, now()),
  ('notif_gov_welcome', '44444444-4444-4444-4444-444444444444', 'State Skill Grid Monitoring Active', 'DVET Maharashtra oversight grid is active with live telemetry.', false, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.audit_logs (id, actor_id, actor_role, action, entity, entity_id, metadata, timestamp) VALUES
  ('log_seed_init', '44444444-4444-4444-4444-444444444444', 'GOVERNMENT', 'DATABASE_SEEDED', 'System', 'ROOT', '{"environment": "development", "seed": "KaushalSetu Longitudinal Pipeline"}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;
