const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  try {
    console.log('Querying pg_stat_activity...');
    const activity = await client.query(`
      SELECT query, state, age(clock_timestamp(), query_start) 
      FROM pg_stat_activity 
      WHERE state != 'idle' LIMIT 10;
    `);
    console.log('Active queries:', activity.rows);

    console.log('Querying error views/schemas...');
    const schemaRes = await client.query(`
      SELECT schema_name FROM information_schema.schemata;
    `);
    console.log('Available schemas:', schemaRes.rows.map(r => r.schema_name));
    
  } catch (err) {
    console.error('Error querying logs:', err);
  } finally {
    await client.end();
  }
}
run();
