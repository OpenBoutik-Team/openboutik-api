import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mariadb from 'mariadb';

async function run() {
  const rawUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/openboutik_db';
  console.log('Connecting to database...');
  
  const parsed = new URL(rawUrl);
  const pool = mariadb.createPool({
    host: parsed.hostname,
    port: Number(parsed.port) || 3306,
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.replace(/^\//, ''),
    connectionLimit: 1,
    multipleStatements: true,
  });

  const conn = await pool.getConnection();
  console.log('Connected! Reading migration SQL...');

  const sqlPath = path.join(process.cwd(), 'prisma/migrations/20261019200000_add_phase5_saas_subdomains_dunning_storebuilder/migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Strip comment lines and split into individual statements separated by semicolon
  const cleanSql = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleanSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Executing ${statements.length} migration statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await conn.query(stmt);
      console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully.`);
    } catch (err: any) {
      // Ignore if column/table already exists or duplicate index/foreign key
      if (err.errno === 1060 || err.errno === 1050 || err.errno === 1061 || err.errno === 1826) {
        console.log(`ℹ️ Statement ${i + 1}/${statements.length} already applied (${err.message}). Skipping.`);
      } else {
        console.error(`❌ Error on statement ${i + 1}: ${err.message}`);
        console.error(`Statement: ${stmt}`);
        throw err;
      }
    }
  }

  conn.release();
  await pool.end();
  console.log('🎉 Phase 5 DB migration applied successfully!');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
