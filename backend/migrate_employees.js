const { Client } = require("pg");
const fs = require("fs");
const env = {};
fs.readFileSync(".env","utf8").split("\n").forEach(l=>{const c=l.trim();if(!c||c.startsWith("#"))return;const i=c.indexOf("=");if(i>0)env[c.slice(0,i).trim()]=c.slice(i+1).trim();});
const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  await client.connect();
  const alters = [
    "ALTER TABLE employees ADD COLUMN IF NOT EXISTS mobile VARCHAR(15)",
    "ALTER TABLE employees ADD COLUMN IF NOT EXISTS police_unit VARCHAR(150)",
    "ALTER TABLE employees ADD COLUMN IF NOT EXISTS joining_date DATE",
    "ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_id VARCHAR(30)"
  ];
  for (const sql of alters) {
    try { await client.query(sql); console.log("OK:", sql.substring(0,70)); }
    catch(e) { console.log("SKIP:", e.message.substring(0,60)); }
  }
  const r = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='employees' ORDER BY ordinal_position");
  console.log("\nColumns:", r.rows.map(x=>x.column_name).join(", "));
  await client.end();
}
run().catch(e=>{ console.error(e.message); process.exit(1); });
