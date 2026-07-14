const https = require("https");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  content.split("\n").forEach(line => {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) return;
    const idx = clean.indexOf("=");
    if (idx > 0) {
      env[clean.slice(0, idx).trim()] = clean.slice(idx + 1).trim();
    }
  });
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const users = [
  { email: "admin@police.gov.in", password: "Password123", full_name: "System Administrator", role: "Administrator", district: "Central District", gpf: "GPF-ADMIN-001", rank: "SP", designation: "System Administrator", bank: "000000000001", ifsc: "SBIN0000001" },
  { email: "employee@police.gov.in", password: "Password123", full_name: "Rajesh Kumar", role: "Employee", district: "Central District", gpf: "GPF-2024001", rank: "Constable", designation: "General Duty", bank: "111111111111", ifsc: "SBIN0001024" },
  { email: "doctor@police.gov.in", password: "Password123", full_name: "Dr. Priya Sharma", role: "Medical Officer", district: "Central District", gpf: "GPF-2024002", rank: "Inspector", designation: "Chief Medical Officer", bank: "222222222222", ifsc: "SBIN0001025" },
  { email: "accounts@police.gov.in", password: "Password123", full_name: "Anita Verma", role: "Accounts Officer", district: "Central District", gpf: "GPF-2024003", rank: "Sub Inspector", designation: "Accounts Head", bank: "333333333333", ifsc: "SBIN0001026" },
  { email: "ddo@police.gov.in", password: "Password123", full_name: "SP Suresh Nair", role: "DDO", district: "Central District", gpf: "GPF-2024004", rank: "SP", designation: "Drawing Officer", bank: "444444444444", ifsc: "SBIN0001027" },
  { email: "treasury@police.gov.in", password: "Password123", full_name: "Treasury Officer Singh", role: "Treasury", district: "Central District", gpf: "GPF-2024005", rank: "Sub Inspector", designation: "Treasury Controller", bank: "555555555555", ifsc: "SBIN0001028" }
];

function apiRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL);
    const data = JSON.stringify(body);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: urlPath,
      method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        "Authorization": "Bearer " + SERVICE_KEY,
        "apikey": SERVICE_KEY
      }
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", chunk => raw += chunk);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function seedUsers() {
  console.log("Seeding users into Supabase Auth...\n");
  for (const u of users) {
    process.stdout.write("Creating " + u.email + " (" + u.role + ")... ");
    const createRes = await apiRequest("POST", "/auth/v1/admin/users", {
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, role: u.role, district: u.district, first_login_required: false, is_disabled: false }
    });
    if (createRes.status !== 200 && createRes.status !== 201) {
      const msg = createRes.body && createRes.body.message ? createRes.body.message : JSON.stringify(createRes.body);
      if (msg.includes("already been registered") || msg.includes("already exists")) {
        console.log("SKIP (already exists)");
      } else {
        console.log("FAILED (" + createRes.status + "): " + msg);
      }
      continue;
    }
    const userId = createRes.body && createRes.body.id;
    if (!userId) { console.log("FAILED (no user ID)"); continue; }

    const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    try {
      await client.query(
        "INSERT INTO profiles (id, role, full_name, email, district) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET role=$2, full_name=$3, district=$5",
        [userId, u.role, u.full_name, u.email, u.district]
      );
      await client.query(
        "INSERT INTO employees (id, gpf_cps_number, rank, designation, bank_account_no, bank_ifsc) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET gpf_cps_number=$2, rank=$3, designation=$4",
        [userId, u.gpf, u.rank, u.designation, u.bank, u.ifsc]
      );
      console.log("OK - ID: " + userId);
    } catch (dbErr) {
      console.log("AUTH OK, DB ERROR: " + dbErr.message);
    } finally {
      await client.end();
    }
  }
  console.log("\nLogin credentials (all use password: Password123):");
  console.log("=========================================================");
  users.forEach(u => console.log("  " + u.role.padEnd(18) + " " + u.email));
  console.log("=========================================================");
}

seedUsers().catch(console.error);
