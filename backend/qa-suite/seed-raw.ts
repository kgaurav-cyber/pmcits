import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const DISTRICTS = ['Kurnool', 'Guntur', 'Vijayawada', 'Visakhapatnam', 'Tirupati'];
const RANKS = ['Constable', 'Head Constable', 'ASI', 'SI', 'Inspector', 'DSP'];

async function seedDataRaw() {
  console.log("Starting RAW data generation...");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // 1. Create Hospitals
    console.log("Seeding Hospitals...");
    for (let i = 1; i <= 15; i++) {
      await client.query(`
        INSERT INTO hospitals (id, name, address, is_empanelled, cghs_recognized) 
        VALUES (gen_random_uuid(), $1, $2, $3, $4)
        ON CONFLICT (name) DO NOTHING
      `, [`City General Hospital ${i}`, `Road ${i}`, true, i % 2 === 0]);
    }
    
    const hospRes = await client.query('SELECT id FROM hospitals LIMIT 15');
    const hospitals = hospRes.rows;

    // 2. Create Doctors
    console.log("Seeding Doctors...");
    for (let i = 0; i < hospitals.length; i++) {
      await client.query(`
        INSERT INTO doctors (id, name, registration_number, specialization, hospital_id)
        VALUES (gen_random_uuid(), $1, $2, 'General Medicine', $3)
        ON CONFLICT (registration_number) DO NOTHING
      `, [`Dr. Specialist ${i + 1}`, `REG202410${i}`, hospitals[i].id]);
    }
    const docRes = await client.query('SELECT id FROM doctors LIMIT 15');
    const doctors = docRes.rows;

    // Helper to create users raw
    async function createRawUser(email: string, role: string, district: string, name: string) {
      const existingProfile = await client.query(`SELECT id FROM profiles WHERE email = $1`, [email]);
      if (existingProfile.rows.length > 0) return existingProfile.rows[0].id;

      // Insert into auth.users (simulate)
      // NOTE: For Supabase, if auth schema is accessible:
      const userIdRes = await client.query(`
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role)
        VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', $1, 'hashed_password_mock', now(), '{"provider":"email","providers":["email"]}', $2, now(), now(), 'authenticated', 'authenticated')
        RETURNING id
      `, [email, JSON.stringify({ role, district, full_name: name })]);
      
      const userId = userIdRes.rows[0].id;
      return userId;
    }

    // 3. Create Officers
    console.log("Seeding Officers...");
    const officers: Record<string, string[]> = {
      'Medical Officer': [],
      'Accounts Officer': [],
      'DDO': [],
      'Treasury': []
    };

    for (const district of DISTRICTS) {
      officers['Medical Officer'].push(await createRawUser(`mo_${district.toLowerCase()}@police.gov.in`, 'Medical Officer', district, `Dr. ${district} MO`));
      officers['Accounts Officer'].push(await createRawUser(`ao_${district.toLowerCase()}@police.gov.in`, 'Accounts Officer', district, `${district} AO`));
      officers['DDO'].push(await createRawUser(`ddo_${district.toLowerCase()}@police.gov.in`, 'DDO', district, `${district} DDO`));
    }
    
    for (let i = 0; i < 3; i++) {
      officers['Treasury'].push(await createRawUser(`treasury${i+1}@police.gov.in`, 'Treasury', 'Headquarters', `Treasury Officer ${i+1}`));
    }

    // 4. Create 100 Employees
    console.log("Seeding 100 Employees...");
    const employeeIds = [];
    for (let i = 1; i <= 100; i++) {
      const district = DISTRICTS[i % DISTRICTS.length];
      const rank = RANKS[i % RANKS.length];
      
      const empId = await createRawUser(`emp${i}@police.gov.in`, 'Employee', district, `Employee ${i}`);
      
      await client.query(`
        INSERT INTO employees (id, gpf_cps_number, rank, designation, bank_account_no, bank_ifsc, mobile, police_unit, employee_id)
        VALUES ($1, $2, $3, 'Officer', $4, 'SBIN0001234', $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [empId, `GPF${10000 + i}`, rank, `1234567890${i}`, `98765432${(i % 100).toString().padStart(2, '0')}`, `${district} SP Office`, `EMP${202400 + i}`]);
      
      employeeIds.push(empId);
    }

    // 5. Generate 500 Claims
    console.log("Seeding 500 Claims...");
    
    const wfRes = await client.query(`SELECT id FROM workflow_master WHERE active = true LIMIT 1`);
    if (wfRes.rows.length === 0) {
      console.warn("No active workflow master found. Ensure migrations have run.");
      return;
    }
    const workflowId = wfRes.rows[0].id;

    const statuses = ['Paid', 'Returned for Correction', 'Closed', 'Under Medical Review', 'Accounts Review', 'DDO Approval', 'Treasury Processing'];
    
    for (let i = 1; i <= 500; i++) {
      const empId = employeeIds[i % employeeIds.length];
      const hospitalId = hospitals[i % hospitals.length].id;
      const docId = doctors[i % doctors.length].id;
      const status = statuses[i % statuses.length];
      
      let stageCode = 'Paid';
      if (status === 'Under Medical Review') stageCode = 'Medical Officer Review';
      else if (status === 'Accounts Review') stageCode = 'Accounts Review';
      else if (status === 'DDO Approval') stageCode = 'DDO Approval';
      else if (status === 'Treasury Processing') stageCode = 'Treasury Processing';
      else if (status === 'Returned for Correction') stageCode = 'Returned';
      else if (status === 'Closed') stageCode = 'Closed';

      await client.query(`
        INSERT INTO claims (id, claim_number, employee_id, patient_type, claim_type, status, hospital_id, doctor_id, admission_date, discharge_date, total_amount_claimed, total_amount_eligible, total_amount_approved, claim_stage, workflow_id, ai_status, risk_score)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, '2023-10-01', '2023-10-05', $8, $9, $10, $11, $12, 'Completed', 'Low')
        ON CONFLICT DO NOTHING
      `, [
        `CLM-2024-${5000 + i}`,
        empId,
        i % 2 === 0 ? 'Self' : 'Dependent',
        i % 3 === 0 ? 'OPD' : 'IPD',
        status,
        hospitalId,
        docId,
        5000 + (i * 100),
        4500 + (i * 100),
        4500 + (i * 100),
        stageCode,
        workflowId
      ]);
    }

    console.log("Successfully seeded 500 claims.");

  } catch (e: any) {
    console.error("Seed failed:", e.message);
  } finally {
    await client.end();
  }
}

seedDataRaw();
