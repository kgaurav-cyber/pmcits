# Police Medical Claims Intelligence & Transparency System (PMCITS)
# Frontend Application Guide

This folder houses the Next.js App Router + TypeScript + Tailwind CSS client portal for the PMCITS project.

---

## 1. Directory Structure

The frontend application uses the React Context API for authentication alongside TanStack Query for server state management.

```text
frontend/src/
├── app/
│   ├── layout.tsx             # Instantiates QueryClientProvider & AuthProvider shells
│   ├── globals.css            # Imports Tailwind CSS directives & color variables
│   ├── page.tsx               # Entry check redirecting to dashboard or login
│   ├── login/
│   │   └── page.tsx           # Officer sign-in card layout
│   ├── dashboard/
│   │   └── page.tsx           # Role-based workspace displaying filtered claims queues
│   ├── claims/
│   │   ├── new/
│   │   │   └── page.tsx       # Claim submission wizard with bill items grid
│   │   └── [id]/
│   │       └── page.tsx       # Splitscreen detailing invoices, AI widgets, and timeline
│   ├── reports/
│   │   └── page.tsx           # Spend charts (Recharts) and SLA timelines
│   ├── notifications/
│   │   └── page.tsx           # Displays push notifications and inbox read flags
│   └── profile/
│       └── page.tsx           # Reviews CPS/GPF numbers, bank codes, and passwords
├── components/
│   └── Sidebar.tsx            # Navigation sidebar displaying user role metrics
├── context/
│   └── AuthContext.tsx        # Coordinates login requests and sets fetch Bearer tokens
└── hooks/
    └── useClaims.ts           # Exports claims query cache hooks (TanStack Query)
```

---

## 2. Installation & Quick Start

### Prerequisites
*   Node.js (v18+)
*   npm
*   Running backend server on `http://localhost:5000` (or custom address)

### Installation
1.  Navigate to the `frontend/` folder.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure variables:
    *   Create a `.env.local` file inside `frontend/`.
    *   Add: `NEXT_PUBLIC_API_URL=http://localhost:5000` (pointing to your running Express backend).
4.  Run in Development Mode:
    ```bash
    npm run dev
    ```
    *Open [http://localhost:3000](http://localhost:3000) in your browser.*
5.  Build static bundle:
    ```bash
    npm run build
    ```

---

## 3. UI Colors Configured

Styles are mapped inside `tailwind.config.js` and `globals.css`:
*   **Slate Background:** `#F8FAFC`
*   **Primary Action Blue:** `#2563EB`
*   **Accent Sky Blue:** `#60A5FA`
*   **Pure Card White:** `#FFFFFF`
*   **Rounded Container Layouts:** `rounded-2xl` / `rounded-xl`
