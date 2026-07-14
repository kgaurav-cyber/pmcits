# Police Medical Claims Intelligence & Transparency System (PMCITS)

## Enterprise PRD (Condensed)

## 1. Vision

Build an AI-assisted, transparent medical reimbursement platform for
police personnel that digitizes the complete workflow from claim
submission to payment while preserving human approval.

## 2. Objectives

-   Online submission
-   Transparent tracking
-   AI-assisted document verification
-   Faster approvals
-   Audit trail
-   Fraud detection assistance
-   Dashboard & reports

## 3. Users

Employee, Medical Officer, Accounts Officer, DDO, Treasury,
Administrator.

## 4. Workflow

Draft → Submit → AI Verification → Returned for correction (if needed)
OR Medical Review → Accounts → DDO → Treasury → Paid → Closed.

## 5. Core Modules

-   Authentication
-   Employee Portal
-   Claims
-   Documents
-   AI Assistant
-   Workflow Engine
-   Notifications
-   Reports
-   Audit Logs
-   Master Data

## 6. AI Features

-   OCR extraction
-   Auto-fill form
-   Missing document detection
-   Duplicate bill detection
-   Amount mismatch detection
-   Claim summary
-   Pending reason explanation
-   Risk score (Low/Medium/High) AI never approves claims.

## 7. Technology

Frontend: Next.js + TypeScript + Tailwind + shadcn/ui Backend: Express +
TypeScript Database: Supabase PostgreSQL Storage: Supabase Storage Auth:
Supabase Auth Validation: Zod State: TanStack Query

## 8. UI Theme

White background (#FFFFFF) Background (#F8FAFC) Primary (#2563EB) Accent
(#60A5FA) Rounded cards, subtle shadows, accessible typography.

## 9. Main Database

profiles, roles, employees, hospitals, doctors, claims, claim_documents,
claim_bill_items, approvals, workflow_history, payments, notifications,
audit_logs, ai_analysis.

## 10. Security

RBAC, Row Level Security, audit logs, immutable status history,
encrypted storage references, environment variables only.

## 11. Reports

Pending claims, SLA breaches, payment status, monthly reimbursement,
district-wise analytics, officer workload.
