import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function dumpSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  const query = `
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;
  
  const res = await client.query(query);
  
  const schema: any = {};
  for (const row of res.rows) {
    if (!schema[row.table_name]) {
      schema[row.table_name] = [];
    }
    schema[row.table_name].push(`${row.column_name} (${row.data_type})`);
  }
  
  console.log(JSON.stringify(schema, null, 2));
  
  await client.end();
}

dumpSchema();
