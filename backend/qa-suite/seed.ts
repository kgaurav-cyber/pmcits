import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DISTRICTS = ['Kurnool', 'Guntur', 'Vijayawada', 'Visakhapatnam', 'Tirupati'];
const RANKS = ['Constable', 'Head Constable', 'ASI', 'SI', 'Inspector', 'DSP'];

async function seedData() {
  console.log("Starting data generation...");
  try {
    // 1. Create Hospitals
    console.log("Seeding Hospitals...");
    const hospitals = Array.from({ length: 15 }).map((_, i) => ({
      name: `City General Hospital ${i + 1}`,
      address: `Road ${i + 1}, Medical District`,
      is_empanelled: true,
      cghs_recognized: i % 2 === 0
    }));
    
    const { data: insertedHospitals, error: hospErr } = await supabaseAdmin
      .from('hospitals')
      .upsert(hospitals, { onConflict: 'name' })
      .select('id');
      
    if (hospErr) throw hospErr;
    console.log(`Created 15 hospitals.`);

    // 2. Create Doctors
    console.log("Seeding Doctors...");
    const doctors = insertedHospitals.map((h, i) => ({
      name: `Dr. Specialist ${i + 1}`,
      registration_number: `REG2024${i + 1000}`,
      specialization: 'General Medicine',
      hospital_id: h.id
    }));
    
    // We can just fetch doctors if we want to avoid duplicates but let's try upsert if it fails
    const { data: insertedDoctors, error: docErr } = await supabaseAdmin
      .from('doctors')
      .upsert(doctors, { onConflict: 'registration_number' })
      .select('id');

    if (docErr) throw docErr;
    console.log(`Created 15 doctors.`);

    // Helper to create users
    async function createUser(email: string, role: string, district: string, name: string) {
      let attempts = 0;
      while (attempts < 3) {
        attempts++;
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: 'Password123!',
          email_confirm: true,
          user_metadata: { role, district, full_name: name }
        });
        if (authErr) {
          if (authErr.message.includes('already registered') || authErr.message.includes('already exists') || authErr.message.includes('Database error saving new user')) {
            const existing = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
            if (existing.data) return existing.data.id;
          }
          if (authErr.name === 'AuthRetryableFetchError' || authErr.status === 429) {
            console.log(`Rate limited, retrying ${email} in 2s...`);
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          throw authErr;
        }
        await new Promise(r => setTimeout(r, 300)); // small delay to prevent rate limit
        return authUser.user.id;
      }
      throw new Error(`Failed to create user ${email} after 3 attempts`);
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
      const moId = await createUser(`mo_${district.toLowerCase()}@police.gov.in`, 'Medical Officer', district, `Dr. ${district} MO`);
      const aoId = await createUser(`ao_${district.toLowerCase()}@police.gov.in`, 'Accounts Officer', district, `${district} AO`);
      const ddoId = await createUser(`ddo_${district.toLowerCase()}@police.gov.in`, 'DDO', district, `${district} DDO`);
      
      officers['Medical Officer'].push(moId);
      officers['Accounts Officer'].push(aoId);
      officers['DDO'].push(ddoId);
    }
    
    // Treasury is central, maybe 3 officers
    for (let i = 0; i < 3; i++) {
      const trId = await createUser(`treasury${i+1}@police.gov.in`, 'Treasury', 'Headquarters', `Treasury Officer ${i+1}`);
      officers['Treasury'].push(trId);
    }
    console.log(`Created officers.`);

    // 4. Create 100 Employees
    console.log("Seeding 100 Employees...");
    const employeeIds = [];
    for (let i = 1; i <= 100; i++) {
      const district = DISTRICTS[i % DISTRICTS.length];
      const rank = RANKS[i % RANKS.length];
      
      const empId = await createUser(`emp${i}@police.gov.in`, 'Employee', district, `Employee ${i}`);
      
      // Upsert employee detail
      await supabaseAdmin.from('employees').upsert({
        id: empId,
        gpf_cps_number: `GPF${10000 + i}`,
        rank: rank,
        designation: 'Officer',
        bank_account_no: `1234567890${i}`,
        bank_ifsc: `SBIN0001234`,
        mobile: `98765432${(i % 100).toString().padStart(2, '0')}`,
        police_unit: `${district} SP Office`,
        employee_id: `EMP${202400 + i}`
      });
      employeeIds.push(empId);
    }
    console.log(`Created 100 employees.`);

    // 5. Generate 500 Claims
    console.log("Seeding 500 Claims...");
    
    const workflowInfo = await supabaseAdmin.from('workflow_master').select('*').eq('active', true).single();
    const workflowId = workflowInfo.data?.id;

    if (!workflowId) {
      console.warn("No active workflow master found. Ensure migrations have run.");
      return;
    }

    const { data: stages } = await supabaseAdmin.from('workflow_stage').select('*').eq('workflow_id', workflowId);

    const statuses = ['Paid', 'Returned for Correction', 'Closed', 'Under Medical Review', 'Accounts Review', 'DDO Approval', 'Treasury Processing'];
    const claimPayloads = [];

    for (let i = 1; i <= 500; i++) {
      const empId = employeeIds[i % employeeIds.length];
      const hospitalId = insertedHospitals[i % insertedHospitals.length].id;
      const docId = insertedDoctors[i % insertedDoctors.length].id;
      const status = statuses[i % statuses.length];
      
      let stageCode = 'Paid';
      if (status === 'Under Medical Review') stageCode = 'Medical Officer Review';
      else if (status === 'Accounts Review') stageCode = 'Accounts Review';
      else if (status === 'DDO Approval') stageCode = 'DDO Approval';
      else if (status === 'Treasury Processing') stageCode = 'Treasury Processing';
      else if (status === 'Returned for Correction') stageCode = 'Returned';
      else if (status === 'Closed') stageCode = 'Closed';

      const assignedTo = stageCode === 'Paid' || stageCode === 'Closed' ? null : empId; // Simplification for the seed, normally would be the assigned officer

      claimPayloads.push({
        claim_number: `CLM-2024-${1000 + i}`,
        employee_id: empId,
        patient_type: i % 2 === 0 ? 'Self' : 'Dependent',
        claim_type: i % 3 === 0 ? 'Outpatient' : 'Inpatient',
        status: status,
        hospital_id: hospitalId,
        doctor_id: docId,
        admission_date: '2023-10-01',
        discharge_date: '2023-10-05',
        total_amount_claimed: 5000 + (i * 100),
        total_amount_eligible: 4500 + (i * 100),
        total_amount_approved: 4500 + (i * 100),
        claim_stage: stageCode,
        assigned_to: assignedTo,
        workflow_id: workflowId,
        ai_status: 'Completed',
        risk_score: 'Low'
      });
    }

    const chunk = 100;
    for (let j = 0; j < claimPayloads.length; j += chunk) {
      await supabaseAdmin.from('claims').insert(claimPayloads.slice(j, j + chunk));
    }

    console.log("Successfully seeded 500 claims.");
    console.log("Seeding complete.");

  } catch (e: any) {
    console.error("Seed failed:", JSON.stringify(e));
  }
}

seedData();
