# Police Medical Claims Intelligence & Transparency System (PMCITS)
# 05. Database Schema & RLS Plan

This document outlines the database schema designed for Supabase PostgreSQL. It includes table schemas, foreign key relationships, default constraints, and Row Level Security (RLS) guidelines.

---

## 1. Custom Enum Types
Before creating tables, custom enums are declared for workflow statuses, user roles, and document categories.
```sql
CREATE TYPE user_role AS ENUM ('Employee', 'Medical Officer', 'Accounts Officer', 'DDO', 'Treasury', 'Administrator');
CREATE TYPE claim_status AS ENUM ('Draft', 'Submitted', 'Under Medical Review', 'Under Accounts Review', 'Approved by DDO', 'Treasury Processing', 'Paid', 'Closed', 'Returned for Correction');
CREATE TYPE claim_type AS ENUM ('OPD', 'IPD');
CREATE TYPE risk_level AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE doc_category AS ENUM ('Discharge Summary', 'Medical Certificate', 'Prescription', 'Invoice Receipt', 'Referral Letter', 'Identity Proof', 'Other');
```

---

## 2. Table Specifications

### A. Core Profiles & Employees
#### Table: `profiles`
*Linked to Supabase Auth `auth.users` for access management.*
*   `id`: `UUID` (Primary Key, References `auth.users(id) ON DELETE CASCADE`)
*   `role`: `user_role` (NOT NULL, Default: `'Employee'`)
*   `full_name`: `VARCHAR(255)` (NOT NULL)
*   `email`: `VARCHAR(255)` (NOT NULL, UNIQUE)
*   `district`: `VARCHAR(100)` (NOT NULL) -- Used to enforce district-scoped review queues
*   `phone`: `VARCHAR(15)`
*   `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`)
*   `updated_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`)

#### Table: `employees`
*Detailed employee parameters.*
*   `id`: `UUID` (Primary Key, References `profiles(id) ON DELETE CASCADE`)
*   `gpf_cps_number`: `VARCHAR(50)` (NOT NULL, UNIQUE)
*   `rank`: `VARCHAR(100)` (NOT NULL)
*   `designation`: `VARCHAR(100)` (NOT NULL)
*   `bank_account_no`: `VARCHAR(30)` (NOT NULL)
*   `bank_ifsc`: `VARCHAR(15)` (NOT NULL)

#### Table: `employee_dependents`
*List of dependents for claims validation.*
*   `id`: `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `employee_id`: `UUID` (References `employees(id) ON DELETE CASCADE`)
*   `full_name`: `VARCHAR(255)` (NOT NULL)
*   `relationship`: `VARCHAR(50)` (NOT NULL) -- e.g., Spouse, Son, Daughter, Mother, Father
*   `date_of_birth`: `DATE` (NOT NULL)
*   `govt_id_proof`: `VARCHAR(100)` -- e.g., Aadhaar Number / Health Card ID
*   `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`)

---

### B. Master Catalogs (Admin Controlled)
#### Table: `hospitals`
*   `id`: `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `name`: `VARCHAR(255)` (NOT NULL, UNIQUE)
*   `address`: `TEXT`
*   `is_empanelled`: `BOOLEAN` (NOT NULL, Default: `TRUE`)
*   `cghs_recognized`: `BOOLEAN` (NOT NULL, Default: `TRUE`)
*   `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`)

#### Table: `doctors`
*   `id`: `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `name`: `VARCHAR(255)` (NOT NULL)
*   `registration_number`: `VARCHAR(100)` (NOT NULL, UNIQUE)
*   `specialization`: `VARCHAR(150)`
*   `hospital_id`: `UUID` (References `hospitals(id) ON DELETE SET NULL`)
*   `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`)

#### Table: `cghs_rates`
*Reference table for reimbursement limits.*
*   `id`: `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `treatment_code`: `VARCHAR(50)` (UNIQUE) -- e.g., RoomRent_Gen, ICU_01, Cardio_Angio
*   `description`: `TEXT` (NOT NULL)
*   `max_reimbursable_amount`: `NUMERIC(12, 2)` (NOT NULL)
*   `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`)

---

### C. Claims & Transactions
#### Table: `claims`
*   `id`: `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `claim_number`: `VARCHAR(50)` (UNIQUE, NOT NULL) -- Auto-generated format: CLM-YYYYMMDD-XXXX
*   `employee_id`: `UUID` (NOT NULL, References `employees(id) ON DELETE RESTRICT`)
*   `patient_type`: `VARCHAR(20)` (NOT NULL) -- 'Self' or 'Dependent'
*   `dependent_id`: `UUID` (References `employee_dependents(id) ON DELETE SET NULL`)
*   `claim_type`: `claim_type` (NOT NULL)
*   `status`: `claim_status` (NOT NULL, Default: `'Draft'`)
*   `hospital_id`: `UUID` (References `hospitals(id) ON DELETE RESTRICT`)
*   `doctor_id`: `UUID` (References `doctors(id) ON DELETE RESTRICT`)
*   `admission_date`: `DATE`
*   `discharge_date`: `DATE`
*   `diagnosis`: `TEXT`
*   `total_amount_claimed`: `NUMERIC(12, 2)` (NOT NULL, Default: `0.00`)
*   `total_amount_eligible`: `NUMERIC(12, 2)` (Default: `0.00`) -- Calculated by Accounts Officer
*   `total_amount_approved`: `NUMERIC(12, 2)` (Default: `0.00`) -- Sanctioned by DDO
*   `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`)
*   `updated_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`)

#### Table: `claim_documents`
*Links uploaded PDFs/Images in Supabase Storage.*
*   `id`: `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `claim_id`: `UUID` (NOT NULL, References `claims(id) ON DELETE CASCADE`)
*   `category`: `doc_category` (NOT NULL)
*   `file_name`: `VARCHAR(255)` (NOT NULL)
*   `storage_path`: `TEXT` (NOT NULL) -- Relative bucket location
*   `file_hash`: `VARCHAR(64)` -- SHA-256 hash to identify duplicates
*   `ocr_status`: `VARCHAR(20)` (Default: `'Pending'`) -- 'Pending', 'Processed', 'Failed'
*   `uploaded_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`)

#### Table: `claim_bill_items`
*Parsed/input individual bill details.*
*   `id`: `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `claim_id`: `UUID` (NOT NULL, References `claims(id) ON DELETE CASCADE`)
*   `bill_number`: `VARCHAR(100)` (NOT NULL)
*   `bill_date`: `DATE` (NOT NULL)
*   `category`: `VARCHAR(100)` (NOT NULL) -- Room Rent, Medicines, Consultation, Labs
*   `cghs_code`: `VARCHAR(50)` (References `cghs_rates(treatment_code)`)
*   `amount_claimed`: `NUMERIC(12, 2)` (NOT NULL)
*   `amount_eligible`: `NUMERIC(12, 2)` (NOT NULL, Default: `0.00`)
*   `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`)

---

### D. Workflow & AI Auditing
#### Table: `workflow_history`
*   `id`: `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `claim_id`: `UUID` (NOT NULL, References `claims(id) ON DELETE CASCADE`)
*   `from_status`: `claim_status`
*   `to_status`: `claim_status` (NOT NULL)
*   `performed_by`: `UUID` (References `profiles(id) ON DELETE SET NULL`)
*   `comments`: `TEXT` -- Mandatory on returns/rejections
*   `sla_target_date`: `TIMESTAMP WITH TIME ZONE`
*   `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`)

#### Table: `ai_analysis`
*AI audit findings storage.*
*   `id`: `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `claim_id`: `UUID` (NOT NULL, UNIQUE, References `claims(id) ON DELETE CASCADE`)
*   `risk_score`: `risk_level` (NOT NULL, Default: `'Low'`)
*   `duplicate_detected`: `BOOLEAN` (Default: `FALSE`)
*   `mismatch_detected`: `BOOLEAN` (Default: `FALSE`)
*   `missing_documents`: `JSONB` -- Array of document categories missing
*   `analysis_summary`: `TEXT`
*   `details`: `JSONB` -- Specific duplicate occurrences, extracted amounts, matching details
*   `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`)

#### Table: `payments`
*Financial execution records.*
*   `id`: `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `claim_id`: `UUID` (NOT NULL, UNIQUE, References `claims(id) ON DELETE CASCADE`)
*   `disbursed_amount`: `NUMERIC(12, 2)` (NOT NULL)
*   `payment_reference_number`: `VARCHAR(100)` (NOT NULL, UNIQUE)
*   `payment_date`: `TIMESTAMP WITH TIME ZONE` (NOT NULL)
*   `treasury_officer_id`: `UUID` (References `profiles(id) ON DELETE SET NULL`)
*   `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`)

#### Table: `audit_logs`
*Immutable security logging (system-level).*
*   `id`: `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `user_id`: `UUID` (References `profiles(id) ON DELETE SET NULL`)
*   `ip_address`: `VARCHAR(45)`
*   `action`: `VARCHAR(100)` (NOT NULL) -- e.g., 'LOGIN', 'CLAIM_CREATE', 'STATUS_CHANGE', 'BYPASS_AI'
*   `entity_table`: `VARCHAR(50)`
*   `entity_id`: `UUID`
*   `old_values`: `JSONB`
*   `new_values`: `JSONB`
*   `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`) -- Never modifiable

#### Table: `notifications`
*   `id`: `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `user_id`: `UUID` (NOT NULL, References `profiles(id) ON DELETE CASCADE`)
*   `title`: `VARCHAR(150)` (NOT NULL)
*   `message`: `TEXT` (NOT NULL)
*   `read`: `BOOLEAN` (Default: `FALSE`)
*   `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `CURRENT_TIMESTAMP`)

---

## 3. Supabase Row Level Security (RLS) Plan

RLS policies isolate data at the database level. Security filters apply to all queries.

```text
=============================================================================
Table                 Select (Read) Policy                 Insert/Update/Delete Policy
=============================================================================
profiles              Authenticated Users                  Self ID matches / Admin
employees             Authenticated Users                  Self ID matches / Admin
employee_dependents   Self ID matches / Reviewers          Self ID matches / Admin
hospitals             Authenticated Users                  Admin only
doctors               Authenticated Users                  Admin only
cghs_rates            Authenticated Users                  Admin only
claims                Owner OR reviewer in same district   Owner (if Draft/Returned)
claim_documents       Owner OR reviewer in same district   Owner (if Draft/Returned)
claim_bill_items      Owner OR reviewer in same district   Owner (if Draft/Returned)
workflow_history      Owner OR reviewer in same district   Reviewer only
ai_analysis           Owner OR reviewer in same district   System service only
payments              Owner OR reviewer in same district   Treasury only
notifications         Owner only                           System/Server only
audit_logs            Admin only                           System/Server only (Insert only)
=============================================================================
```

*Example SQL for RLS Policy on `claims`:*
```sql
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_claims_policy ON claims
FOR SELECT TO authenticated
USING (
  employee_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('Medical Officer', 'Accounts Officer', 'DDO')
    AND profiles.district = (SELECT district FROM profiles WHERE id = claims.employee_id)
  ) OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Treasury', 'Administrator')
  )
);
```
This policy ensures:
1. Employees can only view their own claims.
2. Reviewing officers (MO, AO, DDO) can view claims *only* if the claimant is from the **same district**.
3. Treasury and Administrators have state-wide read permissions.
