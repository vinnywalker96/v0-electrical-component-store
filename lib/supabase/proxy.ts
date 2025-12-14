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
      .select("role, account_status, role_requested")
      .eq("id", user.id)
      .single()

    if (profileError || !profileData) {
      if (profileError && profileError.code === "PGRST116") {
        console.log("No profile found for user, creating one...")

        const { data: newUser, error: newUserError } = await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          first_name: user.user_metadata.first_name,
          last_name: user.user_metadata.last_name,
          role: "customer",
          account_status: "approved", // Default for direct sign-ups not requesting special roles
        })

        if (newUserError) {
          console.error("Error creating profile in middleware:", newUserError)
        } else {
          console.log("Profile created successfully for user:", user.id)
        }
      } else {
        console.error("Error fetching profile in middleware:", profileError)
      }
    } else {
      const userRole = profileData.role
      const accountStatus = profileData.account_status

      if (accountStatus === "pending") {
        // Redirect pending accounts to an awaiting approval page
        return NextResponse.redirect(new URL("/auth/login?message=awaiting-approval", request.url))
      }
      
      // Role-based protection for /admin routes
      if (request.nextUrl.pathname.startsWith("/admin") && !["super_admin", "admin"].includes(userRole)) {
        return NextResponse.redirect(new URL("/auth/login?message=unauthorized", request.url))
      }

      // Role-based protection for /protected/vendor routes
      if (request.nextUrl.pathname.startsWith("/protected/vendor") && !["vendor_admin", "super_admin"].includes(userRole)) {
        return NextResponse.redirect(new URL("/auth/login?message=unauthorized", request.url))
      }
    }

  } else if (!user && request.nextUrl.pathname.startsWith("/protected")) {
    // User is not authenticated but trying to access protected route
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  return supabaseResponse
}
