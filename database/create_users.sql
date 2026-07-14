-- ================================================================
-- STEP 1: Fix the trigger function to be resilient
-- ================================================================
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  parsed_role user_role;
  parsed_district VARCHAR(100);
  parsed_full_name VARCHAR(255);
BEGIN
  BEGIN
    parsed_role := COALESCE((new.raw_user_meta_data->>'role')::user_role, 'Employee'::user_role);
  EXCEPTION WHEN OTHERS THEN
    parsed_role := 'Employee'::user_role;
  END;
  parsed_district := COALESCE(new.raw_user_meta_data->>'district', 'Central District');
  parsed_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  INSERT INTO public.profiles (id, role, full_name, email, district)
  VALUES (new.id, parsed_role, parsed_full_name, new.email, parsed_district)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name, district = EXCLUDED.district;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_auth_user: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- STEP 2: Create all 6 users (admin, employee, doctor, accounts, ddo, treasury)
-- ================================================================

DO $$
DECLARE
  uid UUID;
  users_data JSONB := '[
    {"email":"admin@police.gov.in","full_name":"System Administrator","role":"Administrator","gpf":"GPF-ADMIN-001","rank":"SP","designation":"System Administrator","bank":"000000000001","ifsc":"SBIN0000001"},
    {"email":"employee@police.gov.in","full_name":"Rajesh Kumar","role":"Employee","gpf":"GPF-2024001","rank":"Constable","designation":"General Duty","bank":"111111111111","ifsc":"SBIN0001024"},
    {"email":"doctor@police.gov.in","full_name":"Dr. Priya Sharma","role":"Medical Officer","gpf":"GPF-2024002","rank":"Inspector","designation":"Chief Medical Officer","bank":"222222222222","ifsc":"SBIN0001025"},
    {"email":"accounts@police.gov.in","full_name":"Anita Verma","role":"Accounts Officer","gpf":"GPF-2024003","rank":"Sub Inspector","designation":"Accounts Head","bank":"333333333333","ifsc":"SBIN0001026"},
    {"email":"ddo@police.gov.in","full_name":"SP Suresh Nair","role":"DDO","gpf":"GPF-2024004","rank":"SP","designation":"Drawing Officer","bank":"444444444444","ifsc":"SBIN0001027"},
    {"email":"treasury@police.gov.in","full_name":"Treasury Officer Singh","role":"Treasury","gpf":"GPF-2024005","rank":"Sub Inspector","designation":"Treasury Controller","bank":"555555555555","ifsc":"SBIN0001028"}
  ]';
  u JSONB;
BEGIN
  FOR u IN SELECT jsonb_array_elements(users_data)
  LOOP
    -- Upsert into auth.users
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, raw_user_meta_data,
      role, aud, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      u->>'email',
      crypt('Password123', gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'full_name', u->>'full_name',
        'role', u->>'role',
        'district', 'Central District',
        'first_login_required', false,
        'is_disabled', false
      ),
      'authenticated', 'authenticated',
      NOW(), NOW(), '', '', '', ''
    )
    ON CONFLICT (email) DO UPDATE
      SET encrypted_password = crypt('Password123', gen_salt('bf')),
          raw_user_meta_data = EXCLUDED.raw_user_meta_data,
          email_confirmed_at = NOW();

    -- Get the user ID
    SELECT id INTO uid FROM auth.users WHERE email = u->>'email';

    -- Upsert profile
    INSERT INTO public.profiles (id, role, full_name, email, district)
    VALUES (uid, (u->>'role')::user_role, u->>'full_name', u->>'email', 'Central District')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name;

    -- Upsert employee record
    INSERT INTO public.employees (id, gpf_cps_number, rank, designation, bank_account_no, bank_ifsc)
    VALUES (uid, u->>'gpf', u->>'rank', u->>'designation', u->>'bank', u->>'ifsc')
    ON CONFLICT (id) DO UPDATE SET gpf_cps_number = EXCLUDED.gpf_cps_number;

    RAISE NOTICE 'Created: % (%)', u->>'email', u->>'role';
  END LOOP;
END $$;

-- ================================================================
-- STEP 3: Verify users created
-- ================================================================
SELECT 
  u.email,
  u.email_confirmed_at IS NOT NULL AS confirmed,
  p.role,
  p.full_name,
  p.district
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email LIKE '%@police.gov.in'
ORDER BY u.created_at;
