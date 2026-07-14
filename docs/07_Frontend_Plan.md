# Police Medical Claims Intelligence & Transparency System (PMCITS)
# 07. Frontend Architecture Plan

This document details the frontend implementation plan using Next.js, Tailwind CSS, shadcn/ui, and TanStack Query.

---

## 1. Directory & Routing Layout

The frontend uses the Next.js App Router. Pages are organized by path-based directories.

```text
frontend/src/
├── app/
│   ├── layout.tsx             # Global HTML shell, Font loader, React Query provider
│   ├── page.tsx               # Entry point (auto-redirects to dashboard or login)
│   ├── login/
│   │   └── page.tsx           # Authentication page
│   ├── dashboard/
│   │   └── page.tsx           # Role-based dashboard (claims queues & metrics)
│   ├── claims/
│   │   ├── new/
│   │   │   └── page.tsx       # Claim wizard submission form
│   │   └── [id]/
│   │       └── page.tsx       # Side-by-side details view & workflow panel
│   ├── reports/
│   │   └── page.tsx           # Analytics and compliance statistics charts
│   └── admin/
│       └── page.tsx           # Admin master lists and CGHS rates dashboard
├── components/
│   ├── ui/                    # shadcn/ui base elements (Button, Card, Dialogue, Input)
│   ├── claims/
│   │   ├── ClaimFormWizard.tsx# Multistep claim application wizard
│   │   ├── BillItemsTable.tsx # Dynamic invoices item entry table
│   │   ├── AIInsightWidget.tsx# Risk, mismatch, and missing documents widget
│   │   └── TimelineViewer.tsx # Interactive approval step timeline indicator
│   └── shared/
│       ├── AppSidebar.tsx     # Persistent navigation panel
│       └── DocumentPreview.tsx# Side-by-side PDF/image visualizer
├── hooks/
│   ├── useClaims.ts           # Hooks to create, read, update claims
│   └── useMasterData.ts       # Hooks to fetch empanelled hospitals, doctors, CGHS
└── lib/
    ├── api.ts                 # Axios fetch client instances
    └── supabase.ts            # Client SDK access mapping
```

---

## 2. Design System & Theming

The user interface uses Tailwind CSS coupled with the shadcn/ui component kit. The color scheme matches the PRD requirements:

```css
/* frontend/src/app/globals.css */
@layer base {
  :root {
    --background: 210 40% 98%;      /* Slate Background: #F8FAFC */
    --card: 0 0% 100%;              /* White Cards: #FFFFFF */
    --card-foreground: 222.2 84% 4.9%;

    --primary: 221.2 83.2% 53.3%;   /* Royal Blue: #2563EB */
    --primary-foreground: 210 40% 98%;

    --accent: 213 93.9% 67.8%;      /* Sky Accent: #60A5FA */
    --accent-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 56.9%;

    --radius: 0.75rem;              /* Smooth rounded borders for card containers */
  }
}
```

### Micro-Animations
All interactive elements (buttons, sidebar navigation, form fields, and status badges) will utilize CSS transitions for hover, focus, and state modifications.
*   **Card Hover Effects:** Subtle scale adjustments (`hover:-translate-y-1 hover:shadow-lg transition-all duration-300`).
*   **Loading States:** Pulsing skeletons (`animate-pulse`) for charts and list queues.
*   **Workflow Updates:** Smooth slide-in notifications and animations for timeline nodes.

---

## 3. Core Pages Specifications

### A. Dashboard (`/dashboard`)
*   **Employee View:** Displays a summary card (total submitted, active, and paid claims), a search bar, and a table of their claims with progress indicators.
*   **Reviewer View (MO, AO, DDO, Treasury):** Renders a localized work queue table containing claims from their district waiting for their action. It highlights approaching SLA dates and risk levels flag warnings.

### B. Claim Submission Wizard (`/claims/new`)
A stepped form implemented with `React Hook Form` and `Zod` schema verification:
*   **Step 1: Patient Details:** Select claimant (Self or Dependents drop-down list).
*   **Step 2: Medical Details:** Search and choose Empanelled Hospital, treating Doctor, and enter dates of admission/discharge.
*   **Step 3: Invoices & Uploads:** Drop files into a drop-zone. The backend executes OCR automatically and populates a dynamic `BillItemsTable` with editable rows. The employee verifies and submits.

### C. Details View & Action Hub (`/claims/[id]`)
Designed as a split-pane layout to support review workflows:
*   **Left Pane (Claim details & AI audit findings):**
    *   Displays patient data, doctor certificates, and diagnostic text.
    *   Lists the billing rows entered vs. OCR extracted data.
    *   Embeds the **AI Verification Widget** detailing duplicate check alerts, document validations, and the Risk Badge.
    *   Provides workflow action controls (Approve, Return, Reject) with comment boxes for reviewers.
*   **Right Pane (Document Previewer):**
    *   Integrates a tabbed interface displaying uploaded bill receipts and discharge sheets in a responsive PDF/image viewer, allowing side-by-side invoice comparison.
