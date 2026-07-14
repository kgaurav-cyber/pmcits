# Police Medical Claims Intelligence & Transparency System (PMCITS)
# 01. Project Analysis

## 1. Project Vision & Objectives

The Police Medical Claims Intelligence & Transparency System (PMCITS) is an AI-assisted, highly transparent medical reimbursement platform designed specifically for police department personnel. It replaces manual, paper-heavy workflows with a streamlined, digital-first process. 

Key objectives include:
*   **Online Submission:** Enable employees to submit medical claims, upload scanned bills, and track reimbursement status in real-time.
*   **AI-Assisted Verification:** Use optical character recognition (OCR) and LLM analysis to parse bills, check for missing documents, detect duplicate invoices, and compute potential fraud/risk scores.
*   **Transparent Workflow:** Implement a multi-stage human approval pipeline (Medical Officer, Accounts Officer, DDO, Treasury) with immutable audit trails.
*   **SLA Compliance & Dashboard:** Track SLA compliance, identify bottlenecks, and generate analytical reports for administrators.

---

## 2. Technical Stack Analysis

The PRD specifies a modern, full-stack, TypeScript-based architecture. Here is an analysis of how the stack components interact:

| Layer | Technology | Role & Interaction |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router) + TypeScript | Builds a highly interactive, responsive web portal. Uses React Server Components (RSC) for page loading and client components for dynamic forms/workflow management. |
| **Styling** | Tailwind CSS + shadcn/ui | Tailored UI system matching the requested theme (White background `#FFFFFF`, Background `#F8FAFC`, Primary `#2563EB`, Accent `#60A5FA`). |
| **State & Fetching**| TanStack Query (React Query) | Manages server state cache, loading indicators, dynamic tables, and auto-refreshing workflow updates. |
| **Validation** | Zod | Enforces schema validation on both client-side forms and API request payloads (e.g., file metadata, claim forms). |
| **Backend** | Express + TypeScript | A REST API layer that handles business logic, workflow transitions, AI model orchestration, and audit logging. |
| **Database** | Supabase PostgreSQL | Stores profiles, claims, approvals, logs, and master lists. Utilizes Row Level Security (RLS) for data isolation. |
| **Storage** | Supabase Storage | Hosts PDFs and images of medical bills, discharge summaries, and identity proofs, secured using pre-signed, expiry-limited URLs. |
| **Authentication** | Supabase Auth | Provides secure login, JWT issuance, and user session management. |

---

## 3. Analysis of PRD: Missing Requirements

A review of the condensed PRD reveals several enterprise requirements that need clarification or explicit architectural design:

1.  **Treatment Limits & CGHS/Government Rates:** 
    *   *Missing:* Medical claims in government setups are typically subject to Central Government Health Scheme (CGHS) or state-specific reimbursement limits. The PRD does not specify if the system should enforce these limits.
    *   *Resolution Plan:* Introduce a `cghs_rates` table to map treatments to maximum allowed amounts, enabling the backend to calculate the eligible amount vs. the requested amount.
2.  **Dependents Management:**
    *   *Missing:* Police personnel usually submit claims not only for themselves but also for registered dependents (spouse, children, parents).
    *   *Resolution Plan:* Add an `employee_dependents` table. The claim form must allow selecting the patient (Self or Dependent).
3.  **Claim Types (OPD vs. IPD):**
    *   *Missing:* Outpatient Department (OPD) claims and Inpatient Department (IPD) claims have different document and validation requirements. IPD requires admission/discharge cards, while OPD requires prescriptions and pharmacy bills.
    *   *Resolution Plan:* Support a `claim_type` enum (OPD/IPD) and configure AI/validation rules accordingly.
4.  **AI Engine & LLM Choice:**
    *   *Missing:* The PRD specifies OCR extraction and risk scoring but does not identify the model provider.
    *   *Resolution Plan:* Integrate Google Gemini API (e.g., `gemini-2.5-pro` or `gemini-2.5-flash`) due to its strong multimodal parsing, OCR capability, and reasoning speed.
5.  **SLA Definition & Escalation:**
    *   *Missing:* Reports must show "SLA breaches", but the specific limits for each approval stage are not defined.
    *   *Resolution Plan:* Standardize default SLAs per stage (e.g., Medical Officer: 5 days, Accounts Officer: 7 days, DDO: 3 days, Treasury: 5 days) and log target resolution dates.

---

## 4. Key System Assumptions

To proceed with planning, we document the following assumptions:

*   **Assumption 1 (Hierarchical Scope):** Police employees belong to a specific Unit/District (e.g., "District A"). Approving officers (Medical Officer, Accounts Officer, DDO) operate at the District level and can only view/approve claims submitted by employees in their District. Treasury and Administrators operate at a state/central level.
*   **Assumption 2 (AI Role as an Advisor):** The AI module parses documentation and flags issues (duplicates, mismatches, missing docs) by generating an `ai_analysis` record, but **never** transitions a claim state automatically. Humans retain complete decision-making authority.
*   **Assumption 3 (File Storage Security):** All uploaded medical documents are classified as Sensitive Personal Data. Files will be stored in a private Supabase storage bucket, and accessible only via temporary pre-signed URLs generated on the server for authorized roles.
*   **Assumption 4 (Auth & User Provisioning):** Initial users (especially department heads and officers) will be provisioned by the Administrator, after which employees can log in and update their profiles.
