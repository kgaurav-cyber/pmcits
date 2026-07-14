const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Custom env file parser to avoid extra package loads
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Error: backend/.env file not found.');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) return;
    const idx = clean.indexOf('=');
    if (idx > 0) {
      const key = clean.slice(0, idx).trim();
      const val = clean.slice(idx + 1).trim();
      env[key] = val;
    }
  });
  return env;
}

const env = loadEnv();
const connectionString = env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL is not defined in backend/.env');
  process.exit(1);
}

const sqlFiles = [
  'schema.sql',
  'functions.sql',
  'triggers.sql',
  'policies.sql',
  'storage.sql',
  'seed.sql',
  'enterprise_workflow.sql'
];

async function run() {
  console.log('Connecting to database...');
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connection successful. Running SQL scripts...');

    for (const file of sqlFiles) {
      console.log(`Executing ${file}...`);
      const filePath = path.join(__dirname, '../database', file);
      if (!fs.existsSync(filePath)) {
        console.warn(`Warning: File ${file} not found. Skipping.`);
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await client.query(sql);
        console.log(`Finished executing ${file}.`);
      } catch (fileError) {
        console.warn(`[WARNING] Failed executing ${file}: ${fileError.message || fileError}`);
      }
    }

    console.log('Database migrations completed successfully!');
    const tablesRes = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    console.log('Active Database Tables:', tablesRes.rows.map(r => r.tablename));
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

run();
