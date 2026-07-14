# Police Medical Claims Intelligence & Transparency System (PMCITS)
# 08. AI Module Implementation Plan

This document explains the AI verification system powered by Google Gemini API and background analysis workers.

---

## 1. AI Analysis & Processing Pipeline

To provide a seamless experience, AI analysis is divided into two phases: **Interactive Extraction (On Upload)** and **Security Audit (On Submission)**.

```text
                  Phase 1: Upload (Interactive)
Employee Uploads Bill ──────> Call Gemini API ──────> Extract Bill Details (JSON)
                                                               │
                                                               ▼
                                                     Auto-Fill Form Table

                  Phase 2: Submit (Security Audit)
Employee Submits Claim ───> Trigger Global Scans ───> Duplicate Check (DB Hash scan)
                                                               │
                                                               ▼
                                                      Missing Docs Detector
                                                               │
                                                               ▼
                                                      Risk Score Calculation
                                                               │
                                                               ▼
                                                    Write to 'ai_analysis' DB
```

---

## 2. Phase 1: OCR Extraction Schema
When an employee uploads a medical document, the backend sends the file stream to Google Gemini along with a system prompt enforcing a strict JSON return schema.

### Gemini API Prompt
```text
System Prompt:
You are an expert medical billing auditor. Analyze the attached medical invoice image or PDF.
Extract all billing details into the JSON schema specified. 
Ensure dates are formatted as YYYY-MM-DD. 
If values are illegible, return null. 
Do not include any Markdown wrapper, comments, or extra text.

Response JSON Schema:
{
  "invoice_number": "string | null",
  "invoice_date": "string (YYYY-MM-DD) | null",
  "hospital_name": "string | null",
  "total_amount": "number | null",
  "line_items": [
    {
      "description": "string",
      "quantity": "number",
      "unit_price": "number",
      "total_price": "number"
    }
  ]
}
```

---

## 3. Phase 2: Security & Validation Algorithms

Upon clicking **Submit Claim**, the backend runs the following validation functions:

### A. Duplicate Bill Detection Algorithm
1.  For each file uploaded in the claim, the server computes a SHA-256 hash of the file contents.
2.  In addition, the server generates a composite key from the extracted OCR data: 
    `Key = SHA-256(CleanString(HospitalName) + CleanString(BillNumber) + BillDate + CleanString(TotalAmount))`
3.  The database is queried:
    ```sql
    SELECT claim_id FROM claim_documents 
    WHERE file_hash = :new_file_hash 
       OR composite_key = :new_composite_key;
    ```
4.  If a match is found from any other employee or previous claim, a duplicate warning flag is raised, listing the target duplicate claim ID in the analysis dashboard.

### B. Mismatch Detection Algorithm
1.  **Bill Items Check:** Sum the `amount_claimed` of all rows in the user-inputted itemization table. Compare this sum with the overall `total_amount_claimed` field.
2.  **OCR Verification Check:** Compare the user-inputted total amount with the extracted total amount from Gemini's OCR analysis.
3.  **Tolerance Check:** If any variance exceeds a 1.00 currency unit tolerance, the claim is flagged with an `Amount Mismatch` error.

### C. Missing Document Detection
The server reviews the claim metadata and ensures mandatory uploads exist based on the `claim_type`:
*   **For IPD Claims:** Requires `Discharge Summary`, `Invoice Receipt`, and `Identity Proof`.
*   **For OPD Claims:** Requires `Prescription` and `Invoice Receipt`.
If any required document is missing from the list, the system flags the specific missing document category.

---

## 4. Risk Scoring Engine

The overall Risk Score is computed based on weighted penalties. The final categorization maps to a `Low`, `Medium`, or `High` label.

| Risk Rule | Category | Risk Penalty Weight | Risk Level Trigger |
| :--- | :--- | :---: | :---: |
| SHA-256 Hash Duplicate Match | Fraud Protection | 100 points | High Risk |
| OCR Invoice Composite Key Duplicate | Fraud Protection | 90 points | High Risk |
| Missing Mandatory Document | Compliance | 40 points | Medium Risk |
| Hospital is NOT Empanelled | Compliance | 50 points | Medium Risk |
| Doctor NOT Registered in Master DB | Verification | 30 points | Medium/Low Risk |
| Bill Total Mismatch > 5% | Audit | 30 points | Medium Risk |

### Scoring Matrix
*   **0 - 10 Points:** **Low Risk** (No critical issues. Form inputs match OCR, hospital is empanelled, documents present).
*   **11 - 50 Points:** **Medium Risk** (Minor mismatches, missing optional items, or non-empanelled hospital).
*   **51+ Points:** **High Risk** (Duplicate bills detected, or severe mismatches, or missing critical documents like Discharge Summary).
*   *Note:* The AI analysis dashboard renders this score in a prominent warning widget to alert auditing officers.
