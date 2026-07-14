-- Police Medical Claims Intelligence & Transparency System (PMCITS)
-- Database Schema Definition (PostgreSQL / Supabase)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. Custom Types & Enums
-- =========================================================================

CREATE TYPE user_role AS ENUM (
  'Employee', 
  'Medical Officer', 
  'Accounts Officer', 
  'DDO', 
  'Treasury', 
  'Administrator'
);

CREATE TYPE claim_status AS ENUM (
  'Draft', 
  'Submitted', 
  'Under Medical Review', 
  'Under Accounts Review', 
  'Approved by DDO', 
  'Treasury Processing', 
  'Paid', 
  'Closed', 
  'Returned for Correction'
);

CREATE TYPE claim_type AS ENUM (
  'OPD', 
  'IPD'
);

CREATE TYPE risk_level AS ENUM (
  'Low', 
  'Medium', 
  'High'
);

CREATE TYPE doc_category AS ENUM (
  'Discharge Summary', 
  'Medical Certificate', 
  'Prescription', 
  'Invoice Receipt', 
  'Referral Letter', 
  'Identity Proof', 
  'Other'
);

-- =========================================================================
-- 2. Core Tables (Auth & Profiles)
-- =========================================================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'Employee',
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  district VARCHAR(100) NOT NULL,
  phone VARCHAR(15),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Employees Details
CREATE TABLE employees (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) UNIQUE,
  gpf_cps_number VARCHAR(50) NOT NULL UNIQUE,
  rank VARCHAR(100) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  police_unit VARCHAR(150),
  mobile VARCHAR(15),
  bank_account_no VARCHAR(30) NOT NULL,
  bank_ifsc VARCHAR(15) NOT NULL,
  joining_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Employee Dependents
CREATE TABLE employee_dependents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  relationship VARCHAR(50) NOT NULL, -- e.g. Spouse, Son, Daughter, Father, Mother
  date_of_birth DATE NOT NULL,
  govt_id_proof VARCHAR(100) NOT NULL, -- Aadhaar / PAN / Voter ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT chk_relationship CHECK (relationship IN ('Spouse', 'Son', 'Daughter', 'Father', 'Mother'))
);

-- =========================================================================
-- 3. Master Data Tables (Admin Controlled)
-- =========================================================================

-- Empanelled Hospitals
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  address TEXT,
  is_empanelled BOOLEAN DEFAULT TRUE NOT NULL,
  cghs_recognized BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Registered Doctors
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100) NOT NULL UNIQUE,
  specialization VARCHAR(150),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- CGHS Treatment & Procedure Rates
CREATE TABLE cghs_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  max_reimbursable_amount NUMERIC(12, 2) NOT NULL CONSTRAINT positive_rate CHECK (max_reimbursable_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =========================================================================
-- 4. Claims System Tables
-- =========================================================================

-- Claims table
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_number VARCHAR(50) NOT NULL UNIQUE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  patient_type VARCHAR(20) NOT NULL,
  dependent_id UUID REFERENCES employee_dependents(id) ON DELETE SET NULL,
  claim_type claim_type NOT NULL,
  status claim_status NOT NULL DEFAULT 'Draft',
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  admission_date DATE,
  discharge_date DATE,
  diagnosis TEXT,
  total_amount_claimed NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CONSTRAINT positive_claimed CHECK (total_amount_claimed >= 0),
  total_amount_eligible NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CONSTRAINT positive_eligible CHECK (total_amount_eligible >= 0),
  total_amount_approved NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CONSTRAINT positive_approved CHECK (total_amount_approved >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Validation constraints
  CONSTRAINT chk_patient_type CHECK (patient_type IN ('Self', 'Dependent')),
  CONSTRAINT chk_patient_dependent CHECK (
    (patient_type = 'Self' AND dependent_id IS NULL) OR
    (patient_type = 'Dependent' AND dependent_id IS NOT NULL)
  ),
  CONSTRAINT chk_admission_discharge CHECK (
    admission_date IS NULL OR 
    discharge_date IS NULL OR 
    admission_date <= discharge_date
  )
);

-- Individual Bill Invoices linked to a Claim
CREATE TABLE claim_bill_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  bill_number VARCHAR(100) NOT NULL,
  bill_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL, -- Room Rent, Medicines, Consultation, Labs, etc.
  cghs_code VARCHAR(50) REFERENCES cghs_rates(treatment_code) ON DELETE SET NULL,
  amount_claimed NUMERIC(12, 2) NOT NULL CONSTRAINT positive_bill_claimed CHECK (amount_claimed >= 0),
  amount_eligible NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CONSTRAINT positive_bill_eligible CHECK (amount_eligible >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Documents attached to a Claim
CREATE TABLE claim_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  category doc_category NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL, -- Storage relative path
  file_hash VARCHAR(64), -- SHA-256 binary hash
  composite_key VARCHAR(255), -- For OCR duplicates check (Hospital + Date + InvNo + Total)
  ocr_status VARCHAR(20) DEFAULT 'Pending' NOT NULL, -- Pending, Processed, Failed
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  CONSTRAINT chk_ocr_status CHECK (ocr_status IN ('Pending', 'Processed', 'Failed'))
);

-- =========================================================================
-- 5. Workflow & AI Audits
-- =========================================================================

-- Workflow Progress & Transition History
CREATE TABLE workflow_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  from_status claim_status,
  to_status claim_status NOT NULL,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  comments TEXT,
  sla_target_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- AI Verification Analysis
CREATE TABLE ai_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL UNIQUE REFERENCES claims(id) ON DELETE CASCADE,
  risk_score risk_level DEFAULT 'Low' NOT NULL,
  duplicate_detected BOOLEAN DEFAULT FALSE NOT NULL,
  mismatch_detected BOOLEAN DEFAULT FALSE NOT NULL,
  missing_documents JSONB DEFAULT '[]'::jsonb NOT NULL, -- List of missing doc types
  analysis_summary TEXT,
  details JSONB DEFAULT '{}'::jsonb NOT NULL, -- Detailed OCR outputs, keys
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Final Disbursed Payments Table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL UNIQUE REFERENCES claims(id) ON DELETE CASCADE,
  disbursed_amount NUMERIC(12, 2) NOT NULL CONSTRAINT positive_disbursed CHECK (disbursed_amount >= 0),
  payment_reference_number VARCHAR(100) NOT NULL UNIQUE,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  treasury_officer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- System Notifications (For live dashboard updates)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Immutable Security Audit Logs (System actions logs)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  action VARCHAR(100) NOT NULL, -- e.g. 'LOGIN', 'CLAIM_SUBMIT', 'ROLE_CHANGE'
  entity_table VARCHAR(50),
  entity_id UUID,
  old_values JSONB DEFAULT '{}'::jsonb NOT NULL,
  new_values JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =========================================================================
-- 6. Indexes for Performance Optimization
-- =========================================================================

-- Profiles & Employees
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_district ON profiles(district);

-- Dependents
CREATE INDEX idx_dependents_employee ON employee_dependents(employee_id);

-- Doctors
CREATE INDEX idx_doctors_hospital ON doctors(hospital_id);

-- Claims
CREATE INDEX idx_claims_employee ON claims(employee_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_claim_number ON claims(claim_number);

-- Bill Items
CREATE INDEX idx_bill_items_claim ON claim_bill_items(claim_id);
CREATE INDEX idx_bill_items_cghs_code ON claim_bill_items(cghs_code);

-- Claim Documents
CREATE INDEX idx_documents_claim ON claim_documents(claim_id);
CREATE INDEX idx_documents_hash ON claim_documents(file_hash);
CREATE INDEX idx_documents_composite_key ON claim_documents(composite_key);

-- Workflow History
CREATE INDEX idx_workflow_claim ON workflow_history(claim_id);
CREATE INDEX idx_workflow_performed_by ON workflow_history(performed_by);

-- Payments
CREATE INDEX idx_payments_claim ON payments(claim_id);

-- Notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read);

-- Audit Logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
