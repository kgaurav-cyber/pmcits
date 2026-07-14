import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';
const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const report = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: [] as string[]
};

async function testEndpoint(name: string, method: string, path: string, token: string, body?: any, expectedStatus: number = 200) {
  report.total++;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (res.status === expectedStatus) {
      report.passed++;
      console.log(`✅ [PASS] ${name} (${method} ${path})`);
    } else {
      const text = await res.text();
      report.failed++;
      report.failures.push(`[FAIL] ${name}: Expected ${expectedStatus} got ${res.status}. Response: ${text}`);
      console.log(`❌ [FAIL] ${name}`);
    }
  } catch (e: any) {
    report.failed++;
    report.failures.push(`[FAIL] ${name}: Error: ${e.message}`);
    console.log(`❌ [FAIL] ${name} - Exception`);
  }
}

async function runApiTests() {
  console.log("Fetching test users...");
  
  const empProfile = await supabaseAdmin.from('profiles').select('id, email').eq('role', 'Employee').limit(1).single();
  const adminProfile = await supabaseAdmin.from('profiles').select('id, email').eq('role', 'Administrator').limit(1).single();
  
  if (!empProfile.data || !adminProfile.data) {
    console.log("Cannot run tests without users.");
    return;
  }
  
  // Since we bypass UI, we must emulate JWT. We can use supabaseAdmin to generate a link, or just sign in with password.
  // We used Password123! in seed.
  const { data: empAuth, error: empErr } = await supabaseAdmin.auth.signInWithPassword({
    email: 'employee@police.gov.in',
    password: 'Password1234'
  });
  
  const empToken = empAuth?.session?.access_token;
  if (!empToken) {
    console.log("Could not authenticate test employee", empErr);
    return;
  }
  
  console.log("Starting API Test Suite...");

  await testEndpoint('Get Claims List', 'GET', '/claims', empToken);
  
  // Create a draft claim
  const draftBody = {
    patient_type: "Self",
    claim_type: "OPD",
    admission_date: "2023-10-01",
    discharge_date: "2023-10-05"
  };
  await testEndpoint('Create Draft Claim', 'POST', '/claims/draft', empToken, draftBody); 
  
  // 2. UNAUTHORIZED TEST
  await testEndpoint('Process Workflow (Unauthorized)', 'POST', '/claims/b7952eb0-8098-4d6b-b295-a22d7a935483/workflow', empToken, { action: 'approve' }, 403);
  
  
  console.log("\n=============================");
  console.log(`API Test Results: ${report.passed}/${report.total} Passed.`);
  if (report.failures.length > 0) {
    console.log("\nFailures:");
    report.failures.forEach(f => console.log(f));
  }
}

runApiTests();
