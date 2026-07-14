const { Client } = require("pg");
const fs = require("fs");

const env = {};
fs.readFileSync(".env","utf8").split("\n").forEach(l=>{const c=l.trim();if(!c||c.startsWith("#"))return;const i=c.indexOf("=");if(i>0)env[c.slice(0,i).trim()]=c.slice(i+1).trim();});

const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const users = [
  { email: "admin@police.gov.in",    full_name: "System Administrator",   role: "Administrator",    gpf: "GPF-ADMIN-001", rank: "SP",            designation: "System Administrator",   bank: "000000000001", ifsc: "SBIN0000001" },
  { email: "employee@police.gov.in", full_name: "Rajesh Kumar",           role: "Employee",         gpf: "GPF-2024001",   rank: "Constable",     designation: "General Duty",            bank: "111111111111", ifsc: "SBIN0001024" },
  { email: "doctor@police.gov.in",   full_name: "Dr. Priya Sharma",       role: "Medical Officer",  gpf: "GPF-2024002",   rank: "Inspector",     designation: "Chief Medical Officer",   bank: "222222222222", ifsc: "SBIN0001025" },
  { email: "accounts@police.gov.in", full_name: "Anita Verma",            role: "Accounts Officer", gpf: "GPF-2024003",   rank: "Sub Inspector", designation: "Accounts Head",           bank: "333333333333", ifsc: "SBIN0001026" },
  { email: "ddo@police.gov.in",      full_name: "SP Suresh Nair",         role: "DDO",              gpf: "GPF-2024004",   rank: "SP",            designation: "Drawing Officer",         bank: "444444444444", ifsc: "SBIN0001027" },
  { email: "treasury@police.gov.in", full_name: "Treasury Officer Singh", role: "Treasury",         gpf: "GPF-2024005",   rank: "Sub Inspector", designation: "Treasury Controller",    bank: "555555555555", ifsc: "SBIN0001028" },
];

async function run() {
  await client.connect();
  console.log("Connected.\n");

  for (const u of users) {
    process.stdout.write("Processing " + u.email + "... ");
    try {
      const meta = JSON.stringify({ full_name: u.full_name, role: u.role, district: "Central District", first_login_required: false, is_disabled: false });

      // Check if user already exists
      const existing = await client.query("SELECT id FROM auth.users WHERE email=$1", [u.email]);
      let uid;

      if (existing.rows.length > 0) {
        uid = existing.rows[0].id;
        // Update password and metadata
        await client.query("UPDATE auth.users SET encrypted_password=crypt('Password123', gen_salt('bf')), raw_user_meta_data=$2::jsonb, email_confirmed_at=NOW() WHERE id=$1", [uid, meta]);
        process.stdout.write("(updated) ");
      } else {
        // Insert new user
        const r = await client.query(
          "INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', $1, crypt('Password123', gen_salt('bf')), NOW(), $2::jsonb, 'authenticated', 'authenticated', NOW(), NOW(), '', '', '', '') RETURNING id",
          [u.email, meta]
        );
        uid = r.rows[0].id;
        process.stdout.write("(created) ");
      }

      // Upsert profile
      await client.query("INSERT INTO public.profiles (id, role, full_name, email, district) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET role=$2, full_name=$3, district=$5", [uid, u.role, u.full_name, u.email, "Central District"]);

      // Upsert employee
      await client.query("INSERT INTO public.employees (id, gpf_cps_number, rank, designation, bank_account_no, bank_ifsc) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET gpf_cps_number=$2, rank=$3, designation=$4", [uid, u.gpf, u.rank, u.designation, u.bank, u.ifsc]);

      console.log("OK [" + uid.substring(0,8) + "...]");
    } catch(e) {
      console.log("FAILED: " + e.message);
    }
  }

  console.log("\n=== Final Verification ===");
  const v = await client.query(
    "SELECT u.email, p.role, p.full_name, u.email_confirmed_at IS NOT NULL as confirmed FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id WHERE u.email LIKE '%@police.gov.in' ORDER BY u.created_at"
  );
  if (v.rows.length === 0) {
    console.log("  No users found in auth.users!");
  } else {
    v.rows.forEach(r => console.log("  " + (r.email||"").padEnd(34) + (r.role||"NO PROFILE").padEnd(22) + (r.confirmed ? "CONFIRMED" : "not confirmed")));
  }

  await client.end();
  console.log("\nDone. All passwords are: Password123");
}

run().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
