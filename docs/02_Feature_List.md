# Police Medical Claims Intelligence & Transparency System (PMCITS)
# 02. Feature List

This document lists the specific functional capabilities implemented in each module of the PMCITS platform.

---

## 1. Authentication & Profile Module
*   **Secure Authentication:** User login and logout managed via Supabase Auth.
*   **Role-Based Access Control (RBAC):** Restrict UI elements and API endpoints based on roles: `Employee`, `Medical Officer`, `Accounts Officer`, `DDO`, `Treasury`, and `Administrator`.
*   **User Profile Setup:** Employees can view and update their profile details (GPF/CPS number, designation, rank, division, district, contact info, bank details).
*   **Dependent Management:** Employees can add and manage dependent details (Name, Relationship, DOB, ID Proof) for claims validation.

## 2. Employee Portal
*   **Dashboard Overview:** Displays quick stats (Total Claims Submitted, Total Reimbursed, Pending Actions, Active Claims) and a claim status tracking card.
*   **Draft Claims:** Save claims in `Draft` status, allowing employees to gather documents and edit claim forms over multiple sessions before submission.
*   **Returned Claims Resolution:** View reason comments for claims that were returned for correction, modify the data or replace documents, and re-submit the claim.
*   **Reimbursement Calculator:** A utility tool that calculates estimated CGHS reimbursement amounts before official submission.

## 3. Claims Submission & Management
*   **Claim Creation Wizard:** Step-by-step form to input patient info (Self/Dependent), treatment details (Hospital, Doctor, Admission & Discharge dates, Diagnosis).
*   **Empanelled Hospital Lookup:** Autocomplete search input connecting to the master empanelled hospitals database.
*   **Bill Itemization Table:** Dynamic form fields to enter individual bill item details (Bill Number, Date, Category: Medicines/Room Rent/Consultation/Tests, Amount requested).
*   **Document Upload Pipeline:** Drag-and-drop file uploader for discharge summaries, bill receipts, prescriptions, and identity cards.

## 4. Workflow Engine
*   **Linear & Non-Linear State Transitions:** Moves claims through states: `Draft` → `Submitted` → `Under Medical Review` → `Under Accounts Review` → `Approved by DDO` → `Treasury Processing` → `Paid` → `Closed`.
*   **Return for Correction:** Medical and Accounts officers can "Return" claims to `Returned for Correction` status with a mandatory rejection comment, sending it back to the Employee.
*   **Role Actions Panel:** Action buttons (Approve, Return, Reject) that render dynamically for matching officers.
*   **Approval & Audit Logs:** Logs every transition, the action taken, timestamp, officer's user ID, and custom comments.

## 5. AI Assistant & OCR Engine
*   **Multi-Bill OCR Parsing:** Automatically extracts Bill Number, Date, Total Amount, and Hospital Name from uploaded bills.
*   **Form Auto-fill:** Populates the Bill Itemization table using parsed OCR text, reducing manual data entry for the employee.
*   **Mismatch Validator:** Compares the sum of the user's manual bill entries, the AI extracted bill totals, and the actual values printed on invoices, flagging discrepancies.
*   **Missing Document Checker:** Analyzes claim metadata (e.g., if IPD is selected) and alerts if mandatory documents (e.g., Discharge Summary) are missing.
*   **Duplicate Detection Engine:** Computes a unique fingerprint for each invoice (Bill Number + Date + Hospital Name + Total Amount) and scans previous submissions for duplicate submissions.
*   **Risk Scoring Widget:** Renders a summary card containing a risk classification (`Low`, `Medium`, `High`) and listing specific compliance triggers (e.g., "Non-empanelled hospital", "Discrepancy in billing totals").

## 6. Document Management & Secure Storage
*   **Secure Supabase Storage:** Private buckets with restricted RLS rules.
*   **Dynamic Pre-signed URLs:** Generates short-lived view links (e.g., valid for 15 minutes) for document previewing in the browser.
*   **In-app Document Previewer:** Side-by-side view panel showing the document next to the claim verification checklist for reviewing officers.

## 7. Notifications Module
*   **In-app Notifications:** Real-time push alerts within the application for status transitions (e.g., "Your Claim #1034 has been approved by DDO").
*   **Email Notifications:** Automated email summaries sent to employees upon submission, returns, and payment disbursement.
*   **Officer Digests:** Weekly digest emails to approving officers showing pending queues and approaching SLA targets.

## 8. Reports & Analytics
*   **SLA Compliance Monitor:** Graphs tracking the average processing time per approval stage and highlighting claims that breached their SLA deadlines.
*   **Financial Dashboards:** Monthly and annual expenditure totals, average claim amounts, and district/division-wise reimbursement breakdowns.
*   **Officer Workload Metrics:** Table indicating the volume of claims processed and currently pending for each active reviewer.

## 9. Master Data Management (Admin Panel)
*   **Hospital Master:** Add, view, edit, and deactivate empanelled hospitals (and specify if they are CGHS recognized).
*   **Doctor Registry:** Register verified doctors authorized to issue medical certificates for claims.
*   **CGHS Treatment Tariffs:** Manage maximum reimbursable rate structures for procedures, surgeries, and room rents.
