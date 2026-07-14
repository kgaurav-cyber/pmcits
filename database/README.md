# Police Medical Claims Intelligence & Transparency System (PMCITS)
# Database Management Guide

This directory houses the database schema, security rules, seed files, and trigger scripts for the PMCITS Supabase PostgreSQL instance.

---

## 1. Database Files Overview

| SQL File | Purpose | Description |
| :--- | :--- | :--- |
| **[schema.sql](file:///c:/Users/lenovo/Desktop/AI-Learning/pmcits/database/schema.sql)** | Structural Blueprint | Declares enums, tables, unique constraints, foreign keys, and performant query indexes. |
| **[functions.sql](file:///c:/Users/lenovo/Desktop/AI-Learning/pmcits/database/functions.sql)** | Stored Procedures | Houses workflow calculations, SLA helpers, profile syncs, and auto-counters functions. |
| **[triggers.sql](file:///c:/Users/lenovo/Desktop/AI-Learning/pmcits/database/triggers.sql)** | Automated Actions | Binds functions to events (e.g., auto-generating claim numbers, synchronizing auth details, updating times). |
| **[policies.sql](file:///c:/Users/lenovo/Desktop/AI-Learning/pmcits/database/policies.sql)** | Row Level Security | Controls table access at database level, enforcing district-level boundaries for reviewing officers. |
| **[storage.sql](file:///c:/Users/lenovo/Desktop/AI-Learning/pmcits/database/storage.sql)** | Storage & File RLS | Configures the private file bucket and sets folder-path permissions rules. |
| **[seed.sql](file:///c:/Users/lenovo/Desktop/AI-Learning/pmcits/database/seed.sql)** | Master Database Seed | Inserts tariff limits (CGHS), empanelled clinical hospitals, and registered medical doctors. |

---

## 2. Execution Setup Order

To launch the backend database, run the SQL scripts in the following order using your Supabase SQL Editor:

1.  **`schema.sql`** (Creates base structures, tables, and indexes).
2.  **`functions.sql`** (Compiles PL/pgSQL database logic functions).
3.  **`triggers.sql`** (Binds triggers to tables).
4.  **`policies.sql`** (Activates RLS security boundaries).
5.  **`storage.sql`** (Configures private object buckets and permissions).
6.  **`seed.sql`** (Populates hospitals, doctors registry, and CGHS codes).

---

## 3. Row Level Security (RLS) Framework

Data security is managed at the database level by PostgreSQL RLS. Review the following design elements:

*   **District Isolation:** Reviewers (Medical Officers, Accounts Officers, DDOs) can only read or modify claims for employees within the same **district**.
    ```sql
    (SELECT district FROM profiles WHERE id = claims.employee_id) = get_current_user_district()
    ```
*   **Draft Protections:** Employees can modify claim fields or add/remove invoice rows *only* if the claim status is in `Draft` or `Returned for Correction`.
*   **Audit Sealing:** System-generated `audit_logs` are restricted for SELECT actions to **Administrators** only. INSERT actions are system-only.

---

## 4. File Storage Structure

All uploaded files are saved in the private bucket `claim-documents` with folder-scoped naming layouts:
`claims/{employee_id}/{claim_id}/{file_name}`

Storage RLS policies verify:
1.  **Read Access:** Only the claimant, district-matching reviewing officers, or state admins can obtain signed read URLs.
2.  **Write Access:** Allowed only if the uploading user matches the `{employee_id}` path parameter.
3.  **Delete Access:** Denied if the claim has progressed beyond the `Draft` or `Returned for Correction` workflow stage.
