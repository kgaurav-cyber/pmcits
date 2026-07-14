# Police Medical Claims Intelligence & Transparency System (PMCITS)
# 09. API Specification Plan

This document details the REST API endpoints provided by the Express backend.

---

## 1. Authentication & User Profile API

### GET `/api/auth/profile`
*   **Description:** Retrieves the profile and employee parameters of the logged-in user.
*   **Headers:** `Authorization: Bearer <JWT>`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": "u-12345",
        "role": "Employee",
        "full_name": "Rohan Sharma",
        "email": "rohan.sharma@police.gov.in",
        "district": "South District",
        "employee_details": {
          "gpf_cps_number": "GPF-889920",
          "rank": "Sub-Inspector",
          "designation": "Station In-Charge",
          "bank_account_no": "10009988772",
          "bank_ifsc": "SBIN0001234"
        }
      }
    }
    ```

### POST `/api/auth/dependents`
*   **Description:** Registers a family dependent for medical coverage.
*   **Request Body:**
    ```json
    {
      "full_name": "Kiran Sharma",
      "relationship": "Spouse",
      "date_of_birth": "1994-08-12",
      "govt_id_proof": "1234-5678-9012"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "success": true,
      "data": { "id": "d-99887", "full_name": "Kiran Sharma" }
    }
    ```

---

## 2. Claims Management API

### GET `/api/claims`
*   **Description:** Returns claims list. Employees see their own. Reviewers see their district queue.
*   **Query Params:** `status` (optional), `page` (default 1), `limit` (default 10)
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "c-55443",
          "claim_number": "CLM-20260701-004",
          "employee_name": "Rohan Sharma",
          "patient_name": "Self",
          "status": "Submitted",
          "total_amount_claimed": 45000.00,
          "risk_score": "Low",
          "created_at": "2026-07-01T12:00:00Z"
        }
      ],
      "pagination": { "page": 1, "totalPages": 1 }
    }
    ```

### POST `/api/claims`
*   **Description:** Registers a new claim in `Draft` state.
*   **Request Body:**
    ```json
    {
      "patient_type": "Self",
      "dependent_id": null,
      "claim_type": "IPD",
      "hospital_id": "h-9988",
      "doctor_id": "doc-4433",
      "admission_date": "2026-06-10",
      "discharge_date": "2026-06-15",
      "diagnosis": "Acute Appendicitis",
      "total_amount_claimed": 45000.00
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "success": true,
      "data": {
        "id": "c-55443",
        "claim_number": "CLM-20260701-004",
        "status": "Draft"
      }
    }
    ```

---

## 3. Document Processing API

### POST `/api/claims/:id/documents`
*   **Description:** Requests an authorization signature to upload a document file to Supabase Storage.
*   **Request Body:**
    ```json
    {
      "category": "Discharge Summary",
      "file_name": "discharge_report.pdf",
      "file_size": 2048576
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "document_id": "doc-887766",
        "upload_url": "https://supabase.co/storage/v1/object/claim_docs/claims/u-12345/c-55443/doc-887766.pdf",
        "token": "signature_token"
      }
    }
    ```

### GET `/api/claims/:id/documents/:docId/view`
*   **Description:** Generates a secure pre-signed download link to display the document in the frontend viewer.
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "url": "https://supabase.co/storage/v1/object/sign/claim_docs/claims/u-12345/c-55443/doc-887766.pdf?token=expiring_token_here"
      }
    }
    ```

---

## 4. Workflow Approval Engine API

### POST `/api/claims/:id/approve`
*   **Description:** Approves the claim and transitions it to the next review step.
*   **Allowed Roles:** `Medical Officer`, `Accounts Officer`, `DDO`
*   **Request Body (Accounts Officer example):**
    ```json
    {
      "comments": "Bills verified against CGHS tariff code RoomRent_Gen and Cardio_Angio. Eligible amount calculated.",
      "bill_adjustments": [
        { "bill_item_id": "bi-01", "amount_eligible": 15000.00 }
      ]
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Claim approved and forwarded to DDO.",
      "new_status": "Approved by DDO"
    }
    ```

### POST `/api/claims/:id/return`
*   **Description:** Sends a claim back to the Employee for modifications.
*   **Allowed Roles:** `Medical Officer`, `Accounts Officer`, `DDO`
*   **Request Body:**
    ```json
    {
      "comments": "Discharge summary is blurry. Please re-upload a clear copy."
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Claim returned to claimant for correction.",
      "new_status": "Returned for Correction"
    }
    ```

### POST `/api/claims/:id/pay`
*   **Description:** Records bank transaction references from the Treasury.
*   **Allowed Roles:** `Treasury`
*   **Request Body:**
    ```json
    {
      "disbursed_amount": 42000.00,
      "payment_reference_number": "TXN9988776655",
      "payment_date": "2026-07-01T14:30:00Z"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Payment recorded successfully. Claim Closed.",
      "new_status": "Paid"
    }
    ```
