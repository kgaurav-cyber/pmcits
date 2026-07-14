# Police Medical Claims Intelligence & Transparency System (PMCITS)
# 06. Backend Architecture Plan

This document outlines the design and structure of the Express + TypeScript backend server.

---

## 1. Project Organization

The backend is built around a controller-service-repository design pattern using TypeScript.

```text
backend/src/
├── index.ts                # Server initialization and middleware configuration
├── config/
│   ├── supabase.ts         # Supabase client setup (Service Role & Client connections)
│   └── gemini.ts           # Google Gemini API configuration
├── controllers/
│   ├── auth.controller.ts      # Profile linking and syncing logic
│   ├── claims.controller.ts    # Claim submission, detail fetching, and search
│   ├── workflow.controller.ts  # Workflow state transitions (approval, return, reject)
│   ├── document.controller.ts  # Secure upload signatures and download paths
│   └── admin.controller.ts     # Master data lists edits
├── middlewares/
│   ├── auth.middleware.ts      # JWT check and session context loader
│   ├── rbac.middleware.ts      # Role-based request validation filter
│   ├── audit.middleware.ts     # Automatic logger for status updates and actions
│   └── error.middleware.ts     # Centralized status error handler
└── services/
    ├── ai.service.ts           # Gemini OCR parsing and risk score calculation
    ├── notification.service.ts # In-app notification creation and emails
    └── audit.service.ts        # Writing records to the audit logs table
```

---

## 2. Global Middlewares Design

### A. Auth Middleware (`auth.middleware.ts`)
Decodes the standard Supabase Auth JSON Web Token (JWT) provided in the `Authorization: Bearer <token>` header. It loads the authenticated user's ID, role, and district location from the `profiles` table and attaches it to the Express request context:
```typescript
export interface RequestContext {
  userId: string;
  role: 'Employee' | 'Medical Officer' | 'Accounts Officer' | 'DDO' | 'Treasury' | 'Administrator';
  district: string;
}
```

### B. Role-Based Access Control Middleware (`rbac.middleware.ts`)
Restricts controller routes using decorator-like parameter filters.
*Example Usage:*
```typescript
import { requireRoles } from '../middlewares/rbac.middleware';

router.post('/claims/:id/approve', 
  requireRoles(['Medical Officer', 'Accounts Officer', 'DDO']), 
  WorkflowController.approveClaim
);
```

### C. Audit Logger Middleware (`audit.middleware.ts`)
Intercepts claims status changes and master data modifications to record the action, the invoking user's ID, their client IP address, and JSON objects tracking modified fields (before/after states). These writes go into the `audit_logs` table.

### D. Error Handler (`error.middleware.ts`)
Intercepts exceptions thrown anywhere in the server. Returns clean, structured JSON:
```json
{
  "success": false,
  "error": {
    "message": "Resource not found or access denied.",
    "code": "NOT_FOUND",
    "details": []
  }
}
```

---

## 3. Key Services Specification

### A. AI Orchestrator Service (`ai.service.ts`)
This service acts as the backend link to the Google Gemini API. It performs the following sequence when a claim document is uploaded:
1.  **OCR Retrieval:** Submits the billing document PDF/image to the Gemini API with structured schemas asking it to return invoice numbers, dates, billing items, and total prices.
2.  **Duplicate Scanning:** Computes a unique signature for invoices and queries the `claim_documents` and `claim_bill_items` tables for matching entries.
3.  **Risk Score Engine:** Checks the results of the extraction and sets a score (`Low`/`Medium`/`High`) along with reasoning metadata.
4.  **Database Commit:** Creates an entry in the `ai_analysis` table linking back to the claim record.

### B. Workflow Engine Service (`workflow.service.ts`)
Responsible for checking the validity of status changes. It maintains a state transition map:
```typescript
const VALID_TRANSITIONS: Record<claim_status, claim_status[]> = {
  'Draft': ['Submitted'],
  'Submitted': ['Under Accounts Review', 'Returned for Correction'],
  'Under Accounts Review': ['Approved by DDO', 'Returned for Correction'],
  'Approved by DDO': ['Treasury Processing', 'Returned for Correction'],
  'Treasury Processing': ['Paid'],
  'Paid': ['Closed'],
  'Returned for Correction': ['Submitted'],
  'Closed': []
};
```
Before any status modification commits, the service checks this map. If a transition is invalid (e.g. attempting to skip a review step), the update fails.

### C. Document Service (`document.service.ts`)
Instead of allowing direct file exposure, this service interacts with private Supabase Storage buckets:
1.  Provides pre-signed uploading URLs (e.g. POST signature) so clients can upload directly from the frontend to a specific location (e.g. `claims/{employee_id}/{claim_id}/{doc_id}.pdf`).
2.  Provides pre-signed temporary download URLs (e.g. valid for 15 minutes) for authorized officers reviewing claims.
