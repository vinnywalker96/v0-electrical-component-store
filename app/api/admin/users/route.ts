import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is super_admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", currentUser.id).single()

    if (profile?.role !== "super_admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { email } = await request.json()

    // Get the user by email
    const {
      data: { users },
      error: userError,
    } = await supabase.auth.admin.listUsers()

    if (userError) {
      return Response.json({ error: userError.message }, { status: 400 })
    }

    const targetUser = users.find((u) => u.email === email)

    if (!targetUser) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    // Update profile role to admin
    const { error: updateError } = await supabase.from("profiles").update({ role: "admin" }).eq("id", targetUser.id)

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 400 })
    }

    return Response.json({ success: true, message: "Admin role assigned successfully" })
  } catch (error) {
    console.error("[v0] Error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
