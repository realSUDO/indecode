import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5434/indecode',
});

async function run() {
  const metaDir = path.join(process.cwd(), 'drizzle');
  const journalPath = path.join(metaDir, 'meta/_journal.json');
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    );
  `);

  for (const entry of journal.entries) {
    if (entry.idx === 5) continue; // Skip 0005 because it hasn't been applied!

    const sqlPath = path.join(metaDir, `${entry.tag}.sql`);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Calculate sha256 hash of the content (Drizzle uses this)
    const hash = crypto.createHash('sha256').update(sqlContent).digest('hex');

    console.log(`Inserting migration: ${entry.tag} with hash: ${hash}`);
    
    // We try to insert, if it fails due to unique constraint, we ignore
    await pool.query(`
      INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
      VALUES ($1, $2)
    `, [hash, Date.now()]);
  }

  console.log('Done marking old migrations as applied!');
  process.exit(0);
}

run();
