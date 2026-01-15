import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' }) // Load environment variables from .env.local

async function getUserID() {
  let supabaseDbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL; // Use DATABASE_URL as fallback for Vercel

  if (!supabaseDbUrl) {
    console.warn('SUPABASE_DB_URL or DATABASE_URL environment variable is not set. Attempting to construct from NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Failed to construct Supabase DB URL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
      process.exit(1);
    }

    try {
      const url = new URL(supabaseUrl);
      const host = url.hostname;
      const projectRef = host.split('.')[0];

      supabaseDbUrl = `postgresql://postgres:${supabaseServiceRoleKey}@db.${projectRef}.supabase.co:5432/postgres`;
      console.log('Successfully constructed Supabase DB URL from NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    } catch (e) {
      console.error('Failed to parse NEXT_PUBLIC_SUPABASE_URL:', e);
      process.exit(1);
    }
  }

  const pool = new Pool({
    connectionString: supabaseDbUrl,
  });

  try {
    const query = `SELECT id FROM auth.users WHERE email = 'vinnywalker96@gmail.com';`;
    console.log(`Executing query: ${query}`);
    const { rows } = await pool.query(query);

    if (rows.length > 0) {
      console.log('User ID:', rows[0].id);
      return rows[0].id;
    } else {
      console.log('User not found with email vinnywalker96@gmail.com');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user ID:', error);
    return null;
  } finally {
    await pool.end();
  }
}

getUserID();
