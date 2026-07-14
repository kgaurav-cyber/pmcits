# Police Medical Claims Intelligence & Transparency System (PMCITS)
# 10. Implementation Checklist

Use this checklist to track development progress. It matches the recommended build order.

---

## Phase 1: Project Setup
- [ ] Create root directories: `/frontend`, `/backend`, `/database`
- [ ] Initialize Git repository and add a comprehensive `.gitignore`
- [ ] Initialize Supabase project (via dashboard or Supabase CLI)
- [ ] Create `.env` files:
  - [ ] `/backend/.env` (Port, Supabase URL, Service Role Key, Gemini API Key)
  - [ ] `/frontend/.env.local` (Supabase URL, Anon Key, Backend API URL)
- [ ] Initialize Express backend:
  - [ ] Run `npm init` and configure TypeScript, `tsconfig.json`, `ts-node`
  - [ ] Install base dependencies: `express`, `cors`, `@supabase/supabase-js`, `dotenv`, `zod`, `helmet`, `morgan`
- [ ] Initialize Next.js frontend:
  - [ ] Run `npx create-next-app` with TypeScript, Tailwind, and App Router
  - [ ] Initialize shadcn/ui: `npx shadcn-ui@latest init`
  - [ ] Install dependencies: `lucide-react`, `recharts`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`

---

## Phase 2: Database Schema & Setup
- [ ] Write SQL schema setup script `/database/schema.sql`:
  - [ ] Enums: role classifications, claim statuses, claim types, risk levels, and doc categories
  - [ ] Tables: `profiles`, `employees`, `employee_dependents`, `hospitals`, `doctors`, `cghs_rates`, `claims`, `claim_documents`, `claim_bill_items`, `workflow_history`, `payments`, `notifications`, `audit_logs`, `ai_analysis`
  - [ ] Define Indexes on: `claims(employee_id)`, `profiles(district)`, `claim_documents(file_hash)`
- [ ] Write `/database/seed_data.sql`:
  - [ ] Seed base hospital registry
  - [ ] Seed verified doctors
  - [ ] Seed CGHS reimbursement tariff records
- [ ] Write `/database/rls_policies.sql`:
  - [ ] Enable RLS on all tables
  - [ ] Add SELECT, UPDATE, INSERT policies limiting access by Owner ID or District matches
- [ ] Execute database scripts on Supabase and verify tables configuration

---

## Phase 3: Backend Services & APIs
- [ ] **Authentication & Middleware:**
  - [ ] Set up `auth.middleware.ts` to verify Supabase JWTs
  - [ ] Set up `rbac.middleware.ts` to validate role permission rules
  - [ ] Create profile syncing endpoint `GET /api/auth/profile`
- [ ] **Claims Engine:**
  - [ ] Implement `POST /api/claims` (save draft claims)
  - [ ] Implement `GET /api/claims` (queue search with district and role parameters)
  - [ ] Implement `GET /api/claims/:id` (returns claim, bills, history, AI results)
- [ ] **Storage integration:**
  - [ ] Implement `POST /api/claims/:id/documents` (generate pre-signed upload URLs)
  - [ ] Implement `GET /api/claims/:id/documents/:docId/view` (generate pre-signed read URLs)
- [ ] **Workflow Engine:**
  - [ ] Write status modification check service matching the state machine
  - [ ] Implement `POST /api/claims/:id/approve`
  - [ ] Implement `POST /api/claims/:id/return`
  - [ ] Implement `POST /api/claims/:id/pay` (disbursal processing)
- [ ] **Immutable Audit Trails:**
  - [ ] Implement database write hooks to log status updates and master data modifications in `audit_logs`

---

## Phase 4: Frontend Development
- [ ] **Auth Gateway:**
  - [ ] Design `/login` layout featuring smooth gradients and custom illustrations
  - [ ] Setup Auth context to store active tokens
- [ ] **Dynamic Dashboard Layout:**
  - [ ] Construct sidebar navigation
  - [ ] Code Dashboard stats widgets (totals, pending review cards)
  - [ ] Develop Work Queues matching roles (e.g. Medical Officer sees Submitted queue for their district)
- [ ] **Claim Wizard Form:**
  - [ ] Multi-step claimant selection and hospital finder
  - [ ] Dynamic invoice details grid with inline calculations
- [ ] **Splitscreen Review Workspace:**
  - [ ] Left screen: Audit panel, mismatch alerts, and action forms
  - [ ] Right screen: Tabbed Document Previewer supporting PDF zoom
- [ ] **Timeline Tracker:**
  - [ ] Visual vertical step history mapping stages and comments
- [ ] **Analytical Reports:**
  - [ ] SLA average processing times charts (Recharts bar chart)
  - [ ] Monthly reimbursement expenditures tracker (Recharts area chart)

---

## Phase 5: AI Verification Engine
- [ ] Initialize Gemini API client on backend
- [ ] **OCR Engine:**
  - [ ] Build parser converting images/PDF bills to clean JSON data structure
  - [ ] Integrate OCR trigger to auto-populate frontend billing items tables on upload
- [ ] **Duplicate Scanners:**
  - [ ] Build SHA-256 binary hash checker
  - [ ] Build invoice key checker (Hospital + Bill Number + Total)
- [ ] **Auditors:**
  - [ ] Build line item sums checker
  - [ ] Build checklist checker verifying mandatory files exist (discharge sheet, certificate)
- [ ] **Risk Score Generator:**
  - [ ] Program points accumulator setting Low, Medium, High risk bands
  - [ ] Renders results dynamically on AI Insight Widget

---

## Phase 6: Notifications & Delivery
- [ ] Set up mock emailing service (or connect to Resend API)
- [ ] Send automated emails on: Submission, Return for Correction, and Treasury Disbursement
- [ ] Setup Real-time In-app notifications using Supabase Database Webhook/Realtime triggers

---

## Phase 7: Testing & Verification
- [ ] Write Unit Tests for:
  - [ ] Workflow Engine State transitions (verify invalid steps fail)
  - [ ] Risk scoring calculations (verify weights are applied correctly)
- [ ] Write API Integration Tests (using Mocha/Jest and Supertest):
  - [ ] Request token verification
  - [ ] Claim submit and queue filtering
- [ ] Conduct end-to-end user path testing:
  1. Employee uploads bills, verifies auto-filled items, and submits claim.
  2. Medical Officer views claim in district queue, reads PDF documents, and approves.
  3. Accounts Officer reviews items, checks CGHS limits, audits risk score, and approves.
  4. DDO sanctions final amount.
  5. Treasury records transaction ID and disburses funds.

---

## Phase 8: Deployment & Launch
- [ ] Database: Run migration on production Supabase database instance and seed master lists
- [ ] Backend: Deploy Express app to Render or Fly.io; check CORS and environment variables config
- [ ] Frontend: Deploy Next.js to Vercel; connect production API endpoints
