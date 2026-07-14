# Police Medical Claims Intelligence & Transparency System (PMCITS)
# Backend Server Guide

This folder contains the Node.js + Express + TypeScript backend server for the PMCITS project.

---

## 1. Directory Structure

The backend follows the Repository Pattern combined with a Service Layer:

```text
backend/src/
├── index.ts                  # Bootstraps Express, mounts routers, and starts the server
├── config/
│   ├── supabase.ts           # Initializes Supabase connection bypassing client RLS
│   └── swagger.ts            # Swagger documentation configuration
├── controllers/
│   └── claim.controller.ts   # Parses inputs and coordinates claim actions responses
├── routes/
│   └── claim.routes.ts       # Exposes claim endpoints and binds RBAC rules
├── services/
│   └── claim.service.ts      # Implements the core claims business logic transitions
├── repositories/
│   └── claim.repository.ts   # Interacts directly with Supabase Postgres tables
├── middleware/
│   ├── auth.middleware.ts    # Decodes and verifies Supabase JWT access tokens
│   ├── rbac.middleware.ts    # Enforces roles permission access controls
│   └── error.middleware.ts   # Catches runtime failures and formats error JSONs
├── validators/
│   └── claim.validator.ts    # Declares Zod schemas validating API payloads
├── auth/
│   ├── auth.service.ts       # Integrates user registrations with Supabase Auth
│   ├── auth.controller.ts    # Registers register/login endpoints request handlers
│   └── auth.routes.ts        # Binds auth routing paths
├── ai/
│   └── ai.service.ts         # Handles OCR and risk scoring validations
├── notifications/
│   ├── notification.service.ts # Dispatches in-app notification records
│   └── notification.routes.ts  # Exposes notification query and read endpoints
├── reports/
│   ├── reports.service.ts    # Aggregates analytics, workloads, and budgets
│   └── reports.routes.ts     # Exposes reports graphs data endpoints
└── utils/
    └── logger.ts             # Global audit and systems console logger
```

---

## 2. Installation & Quick Start

### Prerequisites
*   Node.js (v18+)
*   npm

### Installation
1.  Navigate to the `backend/` folder.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure variables:
    *   Duplicate `.env.example` to `.env`.
    *   Provide your Supabase URL, Service Role Secret Key, and Gemini API Key.
4.  Run in Development Mode:
    ```bash
    npm run dev
    ```
5.  Build production build:
    ```bash
    npm run build
    ```
6.  Start compiled JavaScript:
    ```bash
    npm start
    ```

---

## 3. Key Endpoint Mappings

*   **API Documentation (Swagger UI):** `http://localhost:5000/api-docs`
*   **Health Status Probe:** `GET http://localhost:5000/health`
*   **Auth Routes:** `/api/auth/register`, `/api/auth/login`
*   **Claims Workflow Routes:**
    *   `POST /api/claims` (Submit Claim)
    *   `GET /api/claims` (Queue Review list)
    *   `GET /api/claims/:id` (Claim Details)
    *   `POST /api/claims/:id/approve` (Approve stage)
    *   `POST /api/claims/:id/return` (Return to Employee)
    *   `POST /api/claims/:id/documents` (Get pre-signed upload URL)
*   **Notifications Routes:** `GET /api/notifications`, `PATCH /api/notifications/:id/read`
*   **Reports & Stats Routes:** `/api/reports/dashboard-stats`, `/api/reports/sla-compliance`
