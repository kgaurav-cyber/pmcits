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
      ALTER TABLE ai_analysis 
      ADD COLUMN IF NOT EXISTS ai_recommendation TEXT;
    `);
    console.log('ai_recommendation column added to ai_analysis successfully.');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    await client.end();
  }
}
run();
