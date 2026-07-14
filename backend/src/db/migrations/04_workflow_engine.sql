-- Create workflow_master table
CREATE TABLE IF NOT EXISTS public.workflow_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflow_stage table
CREATE TABLE IF NOT EXISTS public.workflow_stage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflow_master(id) ON DELETE CASCADE,
    stage_order INTEGER NOT NULL,
    stage_code TEXT NOT NULL,
    stage_name TEXT NOT NULL,
    role TEXT NOT NULL,
    district_based BOOLEAN DEFAULT false,
    office_based BOOLEAN DEFAULT false,
    sla_days INTEGER DEFAULT 3,
    allow_return BOOLEAN DEFAULT false,
    allow_reject BOOLEAN DEFAULT false,
    allow_skip BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflow_transition table
CREATE TABLE IF NOT EXISTS public.workflow_transition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflow_master(id) ON DELETE CASCADE,
    from_stage TEXT NOT NULL,
    to_stage TEXT NOT NULL,
    action TEXT NOT NULL,
    role TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to claims table if they do not exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims' AND column_name='assigned_to') THEN
        ALTER TABLE public.claims ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims' AND column_name='workflow_id') THEN
        ALTER TABLE public.claims ADD COLUMN workflow_id UUID REFERENCES public.workflow_master(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims' AND column_name='current_stage_id') THEN
        ALTER TABLE public.claims ADD COLUMN current_stage_id UUID REFERENCES public.workflow_stage(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims' AND column_name='sla_due_date') THEN
        ALTER TABLE public.claims ADD COLUMN sla_due_date TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims' AND column_name='sla_breach_status') THEN
        ALTER TABLE public.claims ADD COLUMN sla_breach_status TEXT DEFAULT 'Within SLA';
    END IF;
END $$;

-- Seed default enterprise workflow
DO $$ 
DECLARE
    v_workflow_id UUID;
BEGIN
    -- Check if it already exists
    IF NOT EXISTS (SELECT 1 FROM public.workflow_master WHERE workflow_name = 'Enterprise Medical Claim Workflow') THEN
        -- Insert workflow master
        INSERT INTO public.workflow_master (workflow_name, description, active)
        VALUES ('Enterprise Medical Claim Workflow', 'Standard 5-stage medical claim processing workflow', true)
        RETURNING id INTO v_workflow_id;

        -- Insert workflow stages
        INSERT INTO public.workflow_stage (workflow_id, stage_order, stage_code, stage_name, role, district_based, sla_days, allow_return, allow_reject) VALUES
        (v_workflow_id, 1, 'Submitted', 'Submitted by Employee', 'Employee', false, 1, false, false),
        (v_workflow_id, 2, 'AI Verification', 'AI Document Verification', 'System', false, 1, false, false),
        (v_workflow_id, 3, 'Medical Officer Review', 'Medical Review', 'Medical Officer', true, 3, true, true),
        (v_workflow_id, 4, 'Accounts Review', 'Accounts Review', 'Accounts Officer', true, 2, true, true),
        (v_workflow_id, 5, 'DDO Approval', 'DDO Sanction', 'DDO', true, 2, true, true),
        (v_workflow_id, 6, 'Treasury Processing', 'Treasury Payment', 'Treasury', false, 3, true, false),
        (v_workflow_id, 7, 'Paid', 'Payment Completed', 'System', false, 0, false, false),
        (v_workflow_id, 8, 'Closed', 'Claim Closed', 'System', false, 0, false, false),
        (v_workflow_id, 9, 'Returned', 'Returned to Employee', 'Employee', false, 0, false, false),
        (v_workflow_id, 10, 'Exception', 'Exception Queue', 'Administrator', false, 1, false, false);

        -- Insert workflow transitions
        -- Medical Officer actions
        INSERT INTO public.workflow_transition (workflow_id, from_stage, to_stage, action, role) VALUES
        (v_workflow_id, 'Medical Officer Review', 'Accounts Review', 'approve', 'Medical Officer'),
        (v_workflow_id, 'Medical Officer Review', 'Returned', 'return', 'Medical Officer'),
        (v_workflow_id, 'Medical Officer Review', 'Closed', 'reject', 'Medical Officer');

        -- Accounts Officer actions
        INSERT INTO public.workflow_transition (workflow_id, from_stage, to_stage, action, role) VALUES
        (v_workflow_id, 'Accounts Review', 'DDO Approval', 'approve', 'Accounts Officer'),
        (v_workflow_id, 'Accounts Review', 'Medical Officer Review', 'return', 'Accounts Officer'),
        (v_workflow_id, 'Accounts Review', 'Returned', 'return_employee', 'Accounts Officer'),
        (v_workflow_id, 'Accounts Review', 'Closed', 'reject', 'Accounts Officer');

        -- DDO actions
        INSERT INTO public.workflow_transition (workflow_id, from_stage, to_stage, action, role) VALUES
        (v_workflow_id, 'DDO Approval', 'Treasury Processing', 'approve', 'DDO'),
        (v_workflow_id, 'DDO Approval', 'Accounts Review', 'return', 'DDO'),
        (v_workflow_id, 'DDO Approval', 'Closed', 'reject', 'DDO');

        -- Treasury actions
        INSERT INTO public.workflow_transition (workflow_id, from_stage, to_stage, action, role) VALUES
        (v_workflow_id, 'Treasury Processing', 'Paid', 'approve', 'Treasury'),
        (v_workflow_id, 'Treasury Processing', 'DDO Approval', 'return', 'Treasury');
        
        -- Admin overrides for testing
        INSERT INTO public.workflow_transition (workflow_id, from_stage, to_stage, action, role) VALUES
        (v_workflow_id, 'Medical Officer Review', 'Accounts Review', 'approve', 'Administrator'),
        (v_workflow_id, 'Accounts Review', 'DDO Approval', 'approve', 'Administrator'),
        (v_workflow_id, 'DDO Approval', 'Treasury Processing', 'approve', 'Administrator'),
        (v_workflow_id, 'Treasury Processing', 'Paid', 'approve', 'Administrator');
    END IF;
END $$;
