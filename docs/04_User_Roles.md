# Police Medical Claims Intelligence & Transparency System (PMCITS)
# 04. User Roles & Permissions Matrix

This document outlines the user roles, their functional scopes, access levels, and actions they can perform during the medical claims workflow lifecycle.

---

## 1. Role Definitions

| Role | Domain & Scope | Primary Responsibilities |
| :--- | :--- | :--- |
| **Employee** | Personal / Family | Drafts, submits, tracks, and fixes returned medical claims for self and dependents. |
| **Medical Officer** | Clinical Validation | Reviews clinical necessity, checks diagnoses, validates prescriptions and medical certificates. |
| **Accounts Officer** | Financial Audit | Checks receipts, invoices, and bill items against CGHS rate tariff charts. |
| **DDO** | Sanctioning Authority | Reviews the clinical and financial approvals, performs final sanction of the reimbursement. |
| **Treasury** | Payment Disbursement | Processes bank transfers, updates payment reference numbers, and sets claims to Paid status. |
| **Administrator** | System Management | Oversees system config, audits logs, manages master databases, and provisions user roles. |

---

## 2. Permissions Matrix

| Functional Capability | Employee | Medical Officer | Accounts Officer | DDO | Treasury | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Create & Save Claims (Draft) | **Yes** | No | No | No | No | No |
| Edit Own Draft / Returned Claims | **Yes** | No | No | No | No | No |
| Upload & Manage Documents | **Yes** | No | No | No | No | No |
| View Own Claims & History | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |
| View Claims in District Queue | No | **Yes** | **Yes** | **Yes** | No | No |
| Medical Evaluation & Approval | No | **Yes** | No | No | No | No |
| Financial Verification & Auditing | No | No | **Yes** | No | No | No |
| DDO Final Sanction | No | No | No | **Yes** | No | No |
| Treasury Payment Processing | No | No | No | No | **Yes** | No |
| View Risk Scores & AI Feedback | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |
| Configure Empanelled Hospitals | No | No | No | No | No | **Yes** |
| Edit CGHS Tariff Rates Master | No | No | No | No | No | **Yes** |
| View Comprehensive Audit Logs | No | No | No | No | No | **Yes** |

---

## 3. Workflow State Transitions by Role

The table below explains which roles can execute actions on claims in a given state:

```text
Draft ──(Submit: Employee)──> Submitted ──(Medical Approval: MO)──> Under Accounts Review
                                                                             │
  ┌──────────────────────────────────────────────────────────────────────────┘
  ▼
Under Accounts Review ──(Financial Approval: AO)──> Approved by DDO
                                                           │
  ┌────────────────────────────────────────────────────────┘
  ▼
Approved by DDO ──(Sanction: DDO)──> Treasury Processing ──(Disburse: Treasury)──> Paid ──> Closed
```

1.  **Draft**
    *   *Action:* Submit Claim
    *   *Allowed Role:* **Employee**
    *   *Resulting State:* `Submitted`
2.  **Submitted (Under Medical Review)**
    *   *Action:* Medical Approval (clinical items verified)
        *   *Allowed Role:* **Medical Officer**
        *   *Resulting State:* `Under Accounts Review`
    *   *Action:* Return for Correction (medical info incomplete)
        *   *Allowed Role:* **Medical Officer**
        *   *Resulting State:* `Returned for Correction`
3.  **Under Accounts Review**
    *   *Action:* Accounts Verification (invoice items checked against CGHS)
        *   *Allowed Role:* **Accounts Officer**
        *   *Resulting State:* `Approved by DDO`
    *   *Action:* Return for Correction (invoice issues/mismatches)
        *   *Allowed Role:* **Accounts Officer**
        *   *Resulting State:* `Returned for Correction`
4.  **Approved by DDO (Sanction Stage)**
    *   *Action:* Final Sanction Approval
        *   *Allowed Role:* **DDO**
        *   *Resulting State:* `Treasury Processing`
    *   *Action:* Return for Correction
        *   *Allowed Role:* **DDO**
        *   *Resulting State:* `Returned for Correction`
5.  **Treasury Processing**
    *   *Action:* Complete Payment (record Transaction ID / Date)
        *   *Allowed Role:* **Treasury**
        *   *Resulting State:* `Paid`
6.  **Paid / Closed**
    *   *Action:* Archive / Close Claim (Read-Only)
        *   *Allowed Role:* System Auto-archive or **Administrator**
        *   *Resulting State:* `Closed`
7.  **Returned for Correction**
    *   *Action:* Edit & Resubmit Claim
        *   *Allowed Role:* **Employee**
        *   *Resulting State:* `Submitted`
