-- Police Medical Claims Intelligence & Transparency System (PMCITS)
-- Onboarding & Security Database Schema Migrations

-- 1. Alter profiles table to add temporary password and account lockout fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temp_password_created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0 NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_login_required BOOLEAN DEFAULT TRUE NOT NULL;

-- 2. Create import_jobs table
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_users INT NOT NULL DEFAULT 0,
  successful_imports INT NOT NULL DEFAULT 0,
  failed_imports INT NOT NULL DEFAULT 0,
  duplicate_records INT NOT NULL DEFAULT 0,
  emails_sent INT NOT NULL DEFAULT 0,
  emails_failed INT NOT NULL DEFAULT 0,
  pdf_downloaded BOOLEAN DEFAULT FALSE NOT NULL,
  excel_downloaded BOOLEAN DEFAULT FALSE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Completed'
);

-- 3. Create import_failed_records table
CREATE TABLE IF NOT EXISTS public.import_failed_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  row_data JSONB NOT NULL,
  error_message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Create email_tracking table
CREATE TABLE IF NOT EXISTS public.email_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_address VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Queued', -- 'Queued', 'Sending', 'Delivered', 'Failed'
  error_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Re-register handle_new_auth_user trigger function to capture first_login_required state
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  parsed_role user_role;
  parsed_district VARCHAR(100);
  parsed_full_name VARCHAR(255);
  parsed_first_login BOOLEAN;
BEGIN
  BEGIN
    parsed_role := COALESCE((new.raw_user_meta_data->>'role')::user_role, 'Employee'::user_role);
  EXCEPTION WHEN OTHERS THEN
    parsed_role := 'Employee'::user_role;
  END;
  
  parsed_district := COALESCE(new.raw_user_meta_data->>'district', 'Central District');
  parsed_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  
  -- Read first login preference
  parsed_first_login := COALESCE((new.raw_user_meta_data->>'first_login_required')::BOOLEAN, TRUE);

  INSERT INTO public.profiles (
    id, role, full_name, email, district, phone,
    first_login_required, temp_password_created_at
  )
  VALUES (
    new.id,
    parsed_role,
    parsed_full_name,
    new.email,
    parsed_district,
    new.phone_change,
    parsed_first_login,
    CASE WHEN parsed_first_login THEN NOW() ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    district = EXCLUDED.district,
    first_login_required = EXCLUDED.first_login_required;
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_auth_user failed for %: %', new.email, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. create_new_auth_user function with token column defaults
CREATE OR REPLACE FUNCTION create_new_auth_user(
  p_email VARCHAR,
  p_password_hash VARCHAR,
  p_metadata JSONB
)
RETURNS UUID AS $$
DECLARE
  new_uid UUID;
BEGIN
  new_uid := gen_random_uuid();

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    aud,
    role,
    is_sso_user,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change,
    phone_change_token,
    reauthentication_token,
    email_change_token_current
  ) VALUES (
    new_uid,
    '00000000-0000-0000-0000-000000000000'::UUID,
    p_email,
    p_password_hash,
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::JSONB,
    p_metadata,
    FALSE,
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    FALSE,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  );

  RETURN new_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
