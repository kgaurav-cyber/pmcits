-- Police Medical Claims Intelligence & Transparency System (PMCITS)
-- Database Triggers Configuration

-- =========================================================================
-- 1. Trigger: Create Profile automatically on Auth Signup
-- =========================================================================

-- Trigger matches Supabase default signup event
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- =========================================================================
-- 2. Trigger: Inject Claim Number on Creation
-- =========================================================================

CREATE OR REPLACE FUNCTION inject_claim_number()
RETURNS TRIGGER AS $$
BEGIN
  IF new.claim_number IS NULL OR new.claim_number = '' THEN
    new.claim_number := generate_claim_number();
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER before_claim_insert
  BEFORE INSERT ON claims
  FOR EACH ROW EXECUTE FUNCTION inject_claim_number();

-- =========================================================================
-- 3. Trigger: Log Claim Status transitions to History
-- =========================================================================

CREATE OR REPLACE TRIGGER after_claim_status_update
  AFTER UPDATE OF status ON claims
  FOR EACH ROW
  WHEN (old.status IS DISTINCT FROM new.status)
  EXECUTE FUNCTION handle_claim_status_change();

-- =========================================================================
-- 4. Triggers: Automatically update updated_at fields
-- =========================================================================

-- Profiles
CREATE OR REPLACE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_update_timestamps();

-- Employees
CREATE OR REPLACE TRIGGER update_employees_timestamp
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION handle_update_timestamps();

-- Employee Dependents
CREATE OR REPLACE TRIGGER update_dependents_timestamp
  BEFORE UPDATE ON employee_dependents
  FOR EACH ROW EXECUTE FUNCTION handle_update_timestamps();

-- Hospitals
CREATE OR REPLACE TRIGGER update_hospitals_timestamp
  BEFORE UPDATE ON hospitals
  FOR EACH ROW EXECUTE FUNCTION handle_update_timestamps();

-- Doctors
CREATE OR REPLACE TRIGGER update_doctors_timestamp
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION handle_update_timestamps();

-- CGHS Rates
CREATE OR REPLACE TRIGGER update_rates_timestamp
  BEFORE UPDATE ON cghs_rates
  FOR EACH ROW EXECUTE FUNCTION handle_update_timestamps();

-- Claims (Standard update stamp)
CREATE OR REPLACE TRIGGER update_claims_timestamp
  BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION handle_update_timestamps();
