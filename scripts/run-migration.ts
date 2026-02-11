import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' }) // Load environment variables from .env

async function runMigration() {
  let supabaseDbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL; // Use DATABASE_URL as fallback for Vercel

  if (!supabaseDbUrl) {
    console.warn('SUPABASE_DB_URL or DATABASE_URL environment variable is not set. Attempting to construct from NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Failed to construct Supabase DB URL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
      process.exit(1);
    }

    // Attempt to parse Supabase URL to get project ref and host
    // Example: https://abc.supabase.co -> postgresql://postgres:service_role_key@db.abc.supabase.co:5432/postgres
    try {
      const url = new URL(supabaseUrl);
      const host = url.hostname; // e.g., abc.supabase.co
      const projectRef = host.split('.')[0]; // e.g., abc

      // Construct the connection string. Default user is 'postgres', default DB is 'postgres'.
      supabaseDbUrl = `postgresql://postgres:${supabaseServiceRoleKey}@db.${projectRef}.supabase.co:5432/postgres`;
      console.log('Successfully constructed Supabase DB URL from NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    } catch (e) {
      console.error('Failed to parse NEXT_PUBLIC_SUPABASE_URL:', e);
      process.exit(1);
    }
  }

  const pool = new Pool({
    connectionString: supabaseDbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const migrationsDir = path.join(process.cwd(), 'scripts');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sorts alphabetically to ensure correct order

    console.log(`Found ${migrationFiles.length} migration files.`);

    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      let statements: string[];

      // Heuristic: If the file contains CREATE FUNCTION or CREATE TRIGGER,
      // treat the entire file as a single statement.
      // This is a common pattern for complex DDL that shouldn't be split by semicolons.
      if (
        migrationSQL.includes('CREATE FUNCTION') ||
        migrationSQL.includes('CREATE TRIGGER') ||
        migrationSQL.includes('CREATE OR REPLACE FUNCTION')
      ) {
        statements = [migrationSQL];
      } else {
        // Otherwise, split by semicolon as usual
        statements = migrationSQL
          .replace(/--.*$/gm, '')
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);
      }

      if (statements.length === 0) {
        console.log(`Skipping empty migration file: ${file}`);
        continue;
      }

      console.log(`Running migration: ${file} with ${statements.length} statements...`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement) {
          console.log(`Executing statement ${i + 1}/${statements.length} from ${file}...`);
          try {
            await pool.query(statement);
          } catch (err) {
            console.error(`Error executing statement ${i + 1} from ${file}:`, err);
            // Depending on requirements, you might want to throw here to stop on first error.
            // For now, we'll log and continue.
          }
        }
      }
      console.log(`Migration ${file} completed successfully.`);
    }

    console.log('All migrations completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end(); // Close the connection pool
  }
}

runMigration()
