import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from "@supabase/ssr"

// Security headers
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
}

export async function proxy(request: NextRequest) {
  // Create Supabase client for session management
  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Handle authentication and authorization
  if (user) {
    // Get user role
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    const role = profile?.role

    // Vendor routes - only for vendors
    if (request.nextUrl.pathname.startsWith("/vendor") && role !== "vendor") {
      return NextResponse.redirect(new URL("/", request.url))
    }

    // Admin routes - only for admins and super_admins
    if (request.nextUrl.pathname.startsWith("/admin")) {
      if (role !== "admin" && role !== "super_admin") {
        return NextResponse.redirect(new URL("/", request.url))
      }
    }
  } else {
    // Not authenticated - redirect protected routes to login
    if (
      request.nextUrl.pathname.startsWith("/protected") ||
      request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname.startsWith("/vendor")
    ) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
  }

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    supabaseResponse.headers.set(key, value)
  })

  // Add Content Security Policy
  supabaseResponse.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel-analytics.com *.googletagmanager.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' *.supabase.co *.vercel-analytics.com;"
  )

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}