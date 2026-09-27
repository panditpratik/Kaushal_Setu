-- ============================================================================
-- KaushalSetu — Auth Profile Bootstrap & User Creation Trigger Migration
-- Migration: 20260927000004_auth_profile_bootstrap.sql
-- ============================================================================

-- 1. Function to handle new user insertion from Supabase GoTrue Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_full_name TEXT;
BEGIN
  -- Strict role whitelisting: only TRAINEE or TRAINING_PROVIDER allowed from self-registration
  IF NEW.raw_user_meta_data->>'requested_role' = 'TRAINING_PROVIDER' THEN
    v_role := 'TRAINING_PROVIDER'::public.user_role;
  ELSE
    v_role := 'TRAINEE'::public.user_role;
  END IF;

  v_full_name := coalesce(
    nullif(NEW.raw_user_meta_data->>'full_name', ''),
    nullif(NEW.raw_user_meta_data->>'name', ''),
    split_part(NEW.email, '@', 1)
  );

  -- Insert into public.profiles
  INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
  VALUES (NEW.id, v_full_name, NEW.email, v_role, now(), now())
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        updated_at = now()
    WHERE public.profiles.role = EXCLUDED.role;

  -- Create corresponding role record if missing
  IF v_role = 'TRAINEE' THEN
    INSERT INTO public.trainees (user_id, dob, created_at)
    VALUES (NEW.id, now() - interval '20 years', now())
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_role = 'TRAINING_PROVIDER' THEN
    INSERT INTO public.training_providers (user_id, org_name, accreditation_id, created_at)
    VALUES (NEW.id, v_full_name, 'ACC_' || substr(replace(NEW.id::text, '-', ''), 1, 8), now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never abort auth.users insertion on profile error
  RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Callable RPC for on-demand profile bootstrap (used during OAuth/Magic Link callbacks)
CREATE OR REPLACE FUNCTION public.bootstrap_user_profile(
  p_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'TRAINEE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_email TEXT;
  v_existing_profile RECORD;
  v_target_role public.user_role;
  v_display_name TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to bootstrap profile' USING ERRCODE = '42501';
  END IF;

  -- 1. If profile already exists, return it immediately without altering role
  SELECT id, name, email, role INTO v_existing_profile
  FROM public.profiles
  WHERE id = v_uid;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_existing_profile.id,
      'name', v_existing_profile.name,
      'email', v_existing_profile.email,
      'role', v_existing_profile.role::text,
      'status', 'EXISTING'
    );
  END IF;

  -- 2. Resolve email from auth.users
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_uid;

  -- 3. Strict whitelist for self-bootstrapped role: only TRAINEE or TRAINING_PROVIDER
  IF p_role = 'TRAINING_PROVIDER' THEN
    v_target_role := 'TRAINING_PROVIDER'::public.user_role;
  ELSE
    v_target_role := 'TRAINEE'::public.user_role;
  END IF;

  v_display_name := coalesce(
    nullif(trim(p_name), ''),
    split_part(coalesce(v_email, 'user'), '@', 1),
    'Authorized User'
  );

  -- 4. Insert profile
  INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
  VALUES (v_uid, v_display_name, coalesce(v_email, v_uid::text || '@kaushalsetu.local'), v_target_role, now(), now())
  RETURNING id, name, email, role INTO v_existing_profile;

  -- 5. Insert domain record
  IF v_target_role = 'TRAINEE' THEN
    INSERT INTO public.trainees (user_id, dob, created_at)
    VALUES (v_uid, now() - interval '20 years', now())
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_target_role = 'TRAINING_PROVIDER' THEN
    INSERT INTO public.training_providers (user_id, org_name, accreditation_id, created_at)
    VALUES (v_uid, v_display_name, 'ACC_' || substr(replace(v_uid::text, '-', ''), 1, 8), now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'id', v_existing_profile.id,
    'name', v_existing_profile.name,
    'email', v_existing_profile.email,
    'role', v_existing_profile.role::text,
    'status', 'CREATED'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_user_profile(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_user_profile(TEXT, TEXT) TO authenticated;
