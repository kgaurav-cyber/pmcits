const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) return;
    const idx = clean.indexOf('=');
    if (idx > 0) env[clean.slice(0, idx).trim()] = clean.slice(idx + 1).trim();
  });
  return env;
}

const env = loadEnv();
const client = new Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE claims ALTER COLUMN hospital_id DROP NOT NULL;
      ALTER TABLE claims ALTER COLUMN doctor_id DROP NOT NULL;
    `);
    console.log('Columns altered successfully.');
  } catch (err) {
    console.error('Error altering columns:', err);
  } finally {
    await client.end();
  }
}
run();
