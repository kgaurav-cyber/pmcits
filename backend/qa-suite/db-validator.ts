import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function validateDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  const report: any = {
    missing_foreign_keys: [],
    missing_indexes: [],
    orphaned_records: []
  };

  try {
    // 1. Check for missing indexes on common foreign keys
    const fkQuery = `
      SELECT
        tc.table_name, kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY';
    `;
    const fks = await client.query(fkQuery);
    
    for (const fk of fks.rows) {
      // Check if there is an index on this fk column
      const idxQuery = `
        SELECT 1
        FROM pg_class t,
             pg_class i,
             pg_index ix,
             pg_attribute a
        WHERE t.oid = ix.indrelid
          AND i.oid = ix.indexrelid
          AND a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
          AND t.relkind = 'r'
          AND t.relname = $1
          AND a.attname = $2
      `;
      const idx = await client.query(idxQuery, [fk.table_name, fk.column_name]);
      if (idx.rows.length === 0) {
        report.missing_indexes.push(`${fk.table_name}.${fk.column_name}`);
      }
    }

    // 2. Check for orphaned records in claims -> employees
    const orphanedClaims = await client.query(`
      SELECT id FROM claims WHERE employee_id NOT IN (SELECT id FROM employees)
    `);
    if ((orphanedClaims.rowCount || 0) > 0) {
      report.orphaned_records.push(`${orphanedClaims.rowCount} claims with missing employees`);
    }

    // 3. Output Report
    console.log("Database Validation Report:");
    console.log(JSON.stringify(report, null, 2));

    // Optional Auto-fix missing indexes
    if (report.missing_indexes.length > 0) {
      console.log("Auto-fixing missing indexes...");
      for (const missing of report.missing_indexes) {
        const [table, col] = missing.split('.');
        try {
          await client.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${table}_${col} ON ${table} (${col})`);
          console.log(`Created index on ${table}(${col})`);
        } catch (e: any) {
          console.log(`Could not create index on ${table}(${col}): ${e.message}`);
        }
      }
    }

  } catch (error) {
    console.error("Validation failed", error);
  } finally {
    await client.end();
  }
}

validateDatabase();
