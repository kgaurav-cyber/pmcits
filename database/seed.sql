-- Police Medical Claims Intelligence & Transparency System (PMCITS)
-- Database Master Seed Data

-- =========================================================================
-- 1. Seed Empanelled Hospitals
-- =========================================================================

INSERT INTO hospitals (id, name, address, is_empanelled, cghs_recognized) VALUES
('a0000000-0000-0000-0000-000000000001', 'City General Hospital', '12 Ring Road, South District', true, true),
('a0000000-0000-0000-0000-000000000002', 'Metro Heart & Cancer Institute', '45 Sector-C, West District', true, true),
('a0000000-0000-0000-0000-000000000003', 'Police Line Memorial Hospital', 'Police Headquarters Rd, Central District', true, false),
('a0000000-0000-0000-0000-000000000004', 'St. Judes Trauma Center', '78 Highway Bypass, East District', true, true),
('a0000000-0000-0000-0000-000000000005', 'Apollo Specialty Clinic', '90 Mall Road, North District', false, true);

-- =========================================================================
-- 2. Seed Registered Doctors
-- =========================================================================

INSERT INTO doctors (id, name, registration_number, specialization, hospital_id) VALUES
('d0000000-0000-0000-0000-000000000001', 'Dr. Arvind Kumar', 'MC-12093', 'Cardiology', 'a0000000-0000-0000-0000-000000000002'),
('d0000000-0000-0000-0000-000000000002', 'Dr. Meera Sen', 'MC-45920', 'General Surgery', 'a0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000003', 'Dr. Rajesh Patel', 'MC-88711', 'Orthopedics', 'a0000000-0000-0000-0000-000000000004'),
('d0000000-0000-0000-0000-000000000004', 'Dr. Sunita Rao', 'MC-00293', 'Internal Medicine', 'a0000000-0000-0000-0000-000000000003'),
('d0000000-0000-0000-0000-000000000005', 'Dr. Joseph Dsouza', 'MC-77622', 'Pediatrics', 'a0000000-0000-0000-0000-000000000001');

-- =========================================================================
-- 3. Seed CGHS Procedure Tariff Rates
-- =========================================================================

INSERT INTO cghs_rates (treatment_code, description, max_reimbursable_amount) VALUES
-- Room Rent & Ward Charges
('RoomRent_Gen', 'General Ward Room Rent per day (includes nursing and food)', 1000.00),
('RoomRent_Semi', 'Semi-Private Ward Room Rent per day', 2000.00),
('RoomRent_Priv', 'Private Ward Room Rent per day', 3000.00),
('ICU_NoVent', 'ICU room rent per day (without ventilator)', 4000.00),
('ICU_Vent', 'ICU room rent per day (with ventilator support)', 5000.00),

-- Consultations
('OPD_Consult_Gen', 'OPD General Physician Consultation visit', 150.00),
('OPD_Consult_Spec', 'OPD Specialist Doctor Consultation visit', 250.00),
('IPD_Visit', 'IPD Routine daily doctor ward visit', 300.00),

-- Common Procedures & Surgeries
('Appen_Surg_Open', 'Open Appendectomy Surgery Package', 18000.00),
('Appen_Surg_Lap', 'Laparoscopic Appendectomy Surgery Package', 25000.00),
('Hernia_Uni', 'Unilateral Inguinal Hernioplasty Package', 15000.00),
('Hernia_Lap', 'Laparoscopic Hernioplasty Package', 22000.00),
('Cardio_Angio', 'Coronary Angiography Diagnostic Procedure', 12000.00),
('Cardio_Angio_Plasty', 'Coronary Angioplasty Surgery (Single Stent)', 65000.00),
('Cataract_IOL', 'Cataract Extraction with Intraocular Lens (IOL) implant', 10000.00),

-- Diagnostics & Labs
('Lab_CBC', 'Complete Blood Count (CBC) test', 135.00),
('Lab_LFT', 'Liver Function Test (LFT) panel', 225.00),
('Lab_KFT', 'Kidney Function Test (KFT) panel', 225.00),
('Lab_Lipid', 'Lipid Profile lipid chemistry panel', 200.00),
('Diag_XRay_Chest', 'Chest X-Ray PA View (Single film)', 150.00),
('Diag_USG_Abdomen', 'Ultrasound scan of Whole Abdomen', 550.00),
('Diag_CT_Brain', 'CT Scan Brain (Without contrast)', 1200.00),
('Diag_MRI_Spine', 'MRI Lumbar/Cervical Spine (Without contrast)', 2500.00);
