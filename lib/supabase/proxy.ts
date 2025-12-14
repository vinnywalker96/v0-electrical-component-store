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
      // The error code for "No rows found" is PGRST116. If we see this, it means the user is authenticated
      // but doesn't have a profile. We should create one for them.
      if (profileError && profileError.code === "PGRST116") {
        console.log("No profile found for user, creating one...")

        const { data: newUser, error: newUserError } = await supabase.from("profiles").insert({
          id: user.id,
          email: user.email,
          first_name: user.user_metadata.first_name,
          last_name: user.user_metadata.last_name,
          name: `${user.user_metadata.first_name} ${user.user_metadata.last_name}`.trim() || user.email,
          role: "customer",
        })

        if (newUserError) {
          console.error("Error creating profile in middleware:", newUserError)
        } else {
          console.log("Profile created successfully for user:", user.id)
          // Profile is created, but we don't have the role yet in this path.
          // We can let the request continue and on the next request the profile will be found.
          // Or we can assume 'customer' role and proceed. For now, we'll let it proceed.
        }
      } else {
        console.error("Error fetching profile in middleware:", profileError)
        // If a user is authenticated but their profile can't be found, log the error but don't redirect to login.
        // This scenario should ideally not happen if profile creation on signup is robust.
      }
    } else {
      const userRole = profileData.role

      // Role-based protection for /admin routes
      if (request.nextUrl.pathname.startsWith("/admin") && userRole !== "super_admin") {
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
