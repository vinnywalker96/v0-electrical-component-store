import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
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

    // Protected routes - all authenticated users
    if (request.nextUrl.pathname.startsWith("/protected")) {
      // Allow access
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

  return supabaseResponse
}
