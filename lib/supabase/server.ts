import { createServerClient as createServerClientSSR } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("Missing environment variable NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!supabaseAnonKey) {
    throw new Error("Missing environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  return createServerClientSSR(supabaseUrl, supabaseAnonKey, {
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
}

// Export as createServerClient for the new API routes
export const createServerClient = createClient
