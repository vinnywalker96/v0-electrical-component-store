import { createServerClient as createServerClientSSR } from "@supabase/ssr"
import { createClient as createServiceClient } from "@supabase/supabase-js" // Import for admin client
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('--- Supabase Server Client Init ---');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '*****' : 'NOT SET'); // Masking for security
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '*****' : 'NOT SET'); // Masking for security
  console.log('-----------------------------------');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are not set. Cannot create server client.');
    throw new Error('Supabase environment variables are missing.');
  }

  const supabase = createServerClientSSR(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Ignored
        }
      },
    },
  })

  console.log('--- Supabase Client Object ---');
  console.log('supabase:', supabase ? 'Initialized' : 'Not Initialized');
  console.log('supabase.auth:', supabase?.auth ? 'Auth object present' : 'Auth object MISSING');
  console.log('----------------------------');

  return supabase;
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('--- Supabase Admin Client Init ---');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '*****' : 'NOT SET'); // Masking for security
  console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '*****' : 'NOT SET'); // Masking for security
  console.log('-----------------------------------');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase admin environment variables are not set. Cannot create admin client.');
    throw new Error('Supabase admin environment variables are missing.');
  }

  const adminSupabase = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false, // Service role key should not persist sessions
    },
  });

  console.log('--- Supabase Admin Client Object ---');
  console.log('adminSupabase:', adminSupabase ? 'Initialized' : 'Not Initialized');
  console.log('adminSupabase.auth:', adminSupabase?.auth ? 'Auth object present' : 'Auth object MISSING');
  console.log('-----------------------------------');

  return adminSupabase;
}

// Export as createServerClient for the new API routes
export const createServerClient = createClient
