import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1
});
const db = drizzle(pool);

async function runMigrations() {
  console.log('Running migrations...');
  
  // Ensure vector extension exists
  console.log('Creating vector extension if it does not exist...');
  await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
  
  // Note: when bundled/run in production, the path to the migrations folder 
  // needs to be accessible. We will copy it to the root of the app.
  const migrationsFolder = process.env.NODE_ENV === 'production' 
    ? path.join(process.cwd(), 'drizzle')
    : path.join(__dirname, 'drizzle');
    
  await migrate(db, { migrationsFolder });
  
  console.log('Migrations complete!');
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
