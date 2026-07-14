# Recommended Build Order for Antigravity

## Phase 1 - Project Setup

1.  Create frontend/, backend/, database/
2.  Configure Git
3.  Configure Supabase
4.  Configure environment variables

## Phase 2 - Database

1.  Create schema
2.  Create relationships
3.  Seed master tables
4.  Configure RLS

## Phase 3 - Backend

1.  Authentication
2.  RBAC
3.  CRUD APIs
4.  File upload
5.  Workflow APIs
6.  Audit logging

## Phase 4 - Frontend

1.  Login
2.  Dashboard
3.  New Claim
4.  Claim Details
5.  Timeline
6.  Reports

## Phase 5 - AI

1.  OCR endpoint
2.  Auto-fill
3.  Missing document detection
4.  Duplicate detection
5.  Claim summary
6.  Risk score

## Phase 6 - Notifications

Email SMS In-app

## Phase 7 - Testing

Unit tests API tests UAT

## Phase 8 - Deployment

Frontend -\> Vercel Backend -\> Render Database -\> Supabase

## Antigravity Prompt Sequence

1.  Generate database only.
2.  Review.
3.  Generate backend using approved schema.
4.  Review.
5.  Generate frontend using backend APIs.
6.  Add AI.
7.  Add reports.
8.  Refactor.
