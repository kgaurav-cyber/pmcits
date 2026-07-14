-- =========================================================================
-- Enterprise Medical Claim Workflow Migration
-- =========================================================================

-- 1. Rename legacy tables to avoid conflicts
ALTER TABLE IF EXISTS workflow_history RENAME TO legacy_workflow_history;
ALTER TABLE IF EXISTS ai_analysis RENAME TO legacy_ai_analysis;
ALTER TABLE IF EXISTS payments RENAME TO legacy_payments;

-- 2. Alter 'claims' table to add new workflow columns
ALTER TABLE claims 
  ADD COLUMN IF NOT EXISTS ai_status VARCHAR(50) DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS risk_score VARCHAR(20),
  ADD COLUMN IF NOT EXISTS document_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS medical_status VARCHAR(50) DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS accounts_status VARCHAR(50) DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS ddo_status VARCHAR(50) DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS treasury_status VARCHAR(50) DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS eligible_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS approved_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS sanction_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sanction_date DATE,
  ADD COLUMN IF NOT EXISTS utr_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS claim_stage VARCHAR(50) DEFAULT 'Draft';

-- 3. Create new 'claim_stage_history' table
CREATE TABLE IF NOT EXISTS claim_stage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  stage VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  remarks TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role VARCHAR(50),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Create new 'claim_ai_analysis' table
CREATE TABLE IF NOT EXISTS claim_ai_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  ocr_result JSONB DEFAULT '{}'::jsonb,
  risk_score VARCHAR(20) DEFAULT 'Low',
  document_score NUMERIC(5,2),
  duplicate_bill BOOLEAN DEFAULT FALSE,
  missing_documents JSONB DEFAULT '[]'::jsonb,
  amount_mismatch BOOLEAN DEFAULT FALSE,
  summary TEXT,
  recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Create new 'payments' table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL UNIQUE REFERENCES claims(id) ON DELETE CASCADE,
  bank_name VARCHAR(150),
  account_number VARCHAR(100),
  payment_reference VARCHAR(100),
  utr VARCHAR(100),
  payment_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'Pending',
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Add Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_claim_stage_history_claim ON claim_stage_history(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_ai_analysis_claim ON claim_ai_analysis(claim_id);
CREATE INDEX IF NOT EXISTS idx_payments_new_claim ON payments(claim_id);
