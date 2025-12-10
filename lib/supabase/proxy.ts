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
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profileData) {
      console.error("Error fetching profile in middleware:", profileError)
      // If a user is authenticated but their profile can't be found, log the error but don't redirect to login.
      // This scenario should ideally not happen if profile creation on signup is robust.
    } else {
      const userRole = profileData.role

      // Role-based protection for /admin routes
      if (request.nextUrl.pathname.startsWith("/admin") && !["admin", "super_admin"].includes(userRole)) {
        return NextResponse.redirect(new URL("/auth/login?message=unauthorized", request.url))
      }

      // Role-based protection for /protected/vendor routes
      if (request.nextUrl.pathname.startsWith("/protected/vendor") && !["vendor", "admin", "super_admin"].includes(userRole)) {
        return NextResponse.redirect(new URL("/auth/login?message=unauthorized", request.url))
      }
    }

  } else if (!user && request.nextUrl.pathname.startsWith("/protected")) {
    // User is not authenticated but trying to access protected route
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  return supabaseResponse
}
