-- Police Medical Claims Intelligence & Transparency System (PMCITS)
-- Database Functions (Stored Procedures)

-- =========================================================================
-- 1. Automatic Claim Number Generator
-- =========================================================================
CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS VARCHAR AS $$
DECLARE
  date_prefix VARCHAR(8);
  today_count INT;
  new_claim_no VARCHAR(50);
BEGIN
  -- Format: CLM-YYYYMMDD-XXXX
  date_prefix := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  -- Count how many claims have been created today
  SELECT COUNT(*) INTO today_count
  FROM claims
  WHERE claim_number LIKE 'CLM-' || date_prefix || '-%';
  
  -- Increment and pad with leading zeros (e.g. 0001, 0002)
  today_count := today_count + 1;
  new_claim_no := 'CLM-' || date_prefix || '-' || lpad(today_count::TEXT, 4, '0');
  
  RETURN new_claim_no;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 2. SLA target date calculator
-- =========================================================================
CREATE OR REPLACE FUNCTION calculate_sla_target(target_status claim_status)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  sla_days INT;
BEGIN
  -- Define stage SLAs in days
  CASE target_status
    WHEN 'Submitted' THEN sla_days := 5;            -- 5 Days for Medical Officer Review
    WHEN 'Under Accounts Review' THEN sla_days := 7; -- 7 Days for Accounts Officer Audit
    WHEN 'Approved by DDO' THEN sla_days := 3;       -- 3 Days for DDO Sanction
    WHEN 'Treasury Processing' THEN sla_days := 5;   -- 5 Days for Treasury Transfer
    ELSE sla_days := NULL;
  END CASE;

  IF sla_days IS NOT NULL THEN
    RETURN CURRENT_TIMESTAMP + (sla_days || ' days')::INTERVAL;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 3. Trigger Function: Sync Supabase Auth User with Profiles
-- =========================================================================
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  parsed_role user_role;
  parsed_district VARCHAR(100);
  parsed_full_name VARCHAR(255);
BEGIN
  -- Parse metadata parameters from auth.users raw_user_meta_data
  -- Fallback default properties to allow testing inserts
  BEGIN
    parsed_role := COALESCE((new.raw_user_meta_data->>'role')::user_role, 'Employee'::user_role);
  EXCEPTION WHEN OTHERS THEN
    parsed_role := 'Employee'::user_role;
  END;
  
  parsed_district := COALESCE(new.raw_user_meta_data->>'district', 'Central District');
  parsed_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  INSERT INTO public.profiles (id, role, full_name, email, district, phone)
  VALUES (
    new.id,
    parsed_role,
    parsed_full_name,
    new.email,
    parsed_district,
    new.phone_change
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    district = EXCLUDED.district;
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Never block user creation even if profile insert fails
  RAISE WARNING 'handle_new_auth_user failed for %: %', new.email, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 4. Trigger Function: Log Workflow Transitions & Manage Timers
-- =========================================================================
CREATE OR REPLACE FUNCTION handle_claim_status_change()
RETURNS TRIGGER AS $$
DECLARE
  current_modifier_id UUID;
BEGIN
  -- Capture user executing the update from Supabase context
  -- Fallback to system user if running in raw SQL script
  BEGIN
    current_modifier_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    current_modifier_id := NULL;
  END;

  -- Create workflow history entry
  INSERT INTO workflow_history (
    claim_id,
    from_status,
    to_status,
    performed_by,
    comments,
    sla_target_date
  ) VALUES (
    new.id,
    old.status,
    new.status,
    current_modifier_id,
    NULL, -- Specific comments will be written via workflow routes explicitly
    calculate_sla_target(new.status)
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 5. Trigger Function: Handle Update Timestamps
-- =========================================================================
CREATE OR REPLACE FUNCTION handle_update_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  new.updated_at := CURRENT_TIMESTAMP;
  RETURN new;
END;
$$ LANGUAGE plpgsql;
