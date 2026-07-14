-- Police Medical Claims Intelligence & Transparency System (PMCITS)
-- Database Row Level Security (RLS) Policies Configuration

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE cghs_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- Helper Functions for Policy Context
-- =========================================================================

-- Get role of current user
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Get district of current user
CREATE OR REPLACE FUNCTION get_current_user_district()
RETURNS VARCHAR AS $$
  SELECT district FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- =========================================================================
-- 1. Policies: profiles
-- =========================================================================

CREATE POLICY select_profiles ON profiles
  FOR SELECT TO authenticated
  USING (true); -- Authenticated users can search profiles for collaboration/workflow

CREATE POLICY update_profiles ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR get_current_user_role() = 'Administrator');

-- =========================================================================
-- 2. Policies: employees
-- =========================================================================

CREATE POLICY select_employees ON employees
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY insert_update_employees ON employees
  FOR ALL TO authenticated
  USING (id = auth.uid() OR get_current_user_role() = 'Administrator');

-- =========================================================================
-- 3. Policies: employee_dependents
-- =========================================================================

CREATE POLICY select_dependents ON employee_dependents
  FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid() OR 
    get_current_user_role() IN ('Medical Officer', 'Accounts Officer', 'DDO', 'Treasury', 'Administrator')
  );

CREATE POLICY manage_dependents ON employee_dependents
  FOR ALL TO authenticated
  USING (employee_id = auth.uid() OR get_current_user_role() = 'Administrator');

-- =========================================================================
-- 4. Policies: hospitals, doctors, cghs_rates
-- =========================================================================

CREATE POLICY select_catalogs ON hospitals FOR SELECT TO authenticated USING (true);
CREATE POLICY select_doctors ON doctors FOR SELECT TO authenticated USING (true);
CREATE POLICY select_rates ON cghs_rates FOR SELECT TO authenticated USING (true);

CREATE POLICY manage_hospitals ON hospitals FOR ALL TO authenticated USING (get_current_user_role() = 'Administrator');
CREATE POLICY manage_doctors ON doctors FOR ALL TO authenticated USING (get_current_user_role() = 'Administrator');
CREATE POLICY manage_rates ON cghs_rates FOR ALL TO authenticated USING (get_current_user_role() = 'Administrator');

-- =========================================================================
-- 5. Policies: claims
-- =========================================================================

-- Read claims: Owner can read, District officers can read, Treasury/Admins can read all
CREATE POLICY select_claims ON claims
  FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid() OR
    (
      get_current_user_role() IN ('Medical Officer', 'Accounts Officer', 'DDO') AND
      (SELECT district FROM profiles WHERE id = claims.employee_id) = get_current_user_district()
    ) OR
    get_current_user_role() IN ('Treasury', 'Administrator')
  );

-- Insert claims: Employees only
CREATE POLICY insert_claims ON claims
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = auth.uid() AND
    get_current_user_role() = 'Employee'
  );

-- Update claims:
-- 1. Employees can update claim only if it is in 'Draft' or 'Returned for Correction' status
-- 2. Reviewing officers can update to input approved values
CREATE POLICY update_claims ON claims
  FOR UPDATE TO authenticated
  USING (
    (employee_id = auth.uid() AND status IN ('Draft', 'Returned for Correction')) OR
    (
      get_current_user_role() IN ('Medical Officer', 'Accounts Officer', 'DDO') AND
      (SELECT district FROM profiles WHERE id = claims.employee_id) = get_current_user_district()
    ) OR
    get_current_user_role() IN ('Treasury', 'Administrator')
  );

-- =========================================================================
-- 6. Policies: claim_bill_items & claim_documents
-- =========================================================================

-- Bill Items
CREATE POLICY select_bill_items ON claim_bill_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM claims WHERE id = claim_bill_items.claim_id)
  );

CREATE POLICY manage_bill_items ON claim_bill_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM claims 
      WHERE id = claim_bill_items.claim_id 
        AND (employee_id = auth.uid() AND status IN ('Draft', 'Returned for Correction'))
    ) OR
    get_current_user_role() IN ('Accounts Officer', 'Administrator')
  );

-- Documents
CREATE POLICY select_documents ON claim_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM claims WHERE id = claim_documents.claim_id)
  );

CREATE POLICY manage_documents ON claim_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM claims 
      WHERE id = claim_documents.claim_id 
        AND (employee_id = auth.uid() AND status IN ('Draft', 'Returned for Correction'))
    ) OR
    get_current_user_role() = 'Administrator'
  );

-- =========================================================================
-- 7. Policies: workflow_history, ai_analysis, payments, notifications, audit_logs
-- =========================================================================

-- Workflow history
CREATE POLICY select_workflow_history ON workflow_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM claims WHERE id = workflow_history.claim_id)
  );

CREATE POLICY insert_workflow_history ON workflow_history
  FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() IN ('Medical Officer', 'Accounts Officer', 'DDO', 'Treasury', 'Administrator')
  );

-- AI analysis (Only readable by users who can read the claim, writeable only by admin/service role)
CREATE POLICY select_ai_analysis ON ai_analysis
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM claims WHERE id = ai_analysis.claim_id)
  );

CREATE POLICY write_ai_analysis ON ai_analysis
  FOR ALL TO authenticated
  USING (get_current_user_role() = 'Administrator');

-- Payments (Readable by user/reviewers, writeable only by Treasury)
CREATE POLICY select_payments ON payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM claims WHERE id = payments.claim_id)
  );

CREATE POLICY insert_payments ON payments
  FOR INSERT TO authenticated
  WITH CHECK (get_current_user_role() = 'Treasury');

-- Notifications
CREATE POLICY manage_notifications ON notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Audit logs (Admins only)
CREATE POLICY admin_audit_logs ON audit_logs
  FOR ALL TO authenticated
  USING (get_current_user_role() = 'Administrator');
