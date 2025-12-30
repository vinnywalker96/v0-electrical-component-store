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
    const { error: updateProfileError } = await supabase.from("profiles").update({ role: "admin" }).eq("id", targetUser.id)

    if (updateProfileError) {
      return Response.json({ error: updateProfileError.message }, { status: 400 })
    }

    // Ensure a seller entry exists for the new admin
    const { data: existingSeller } = await supabase.from("sellers").select("id").eq("user_id", targetUser.id).single()

    if (existingSeller) {
      // Update existing seller entry to approved
      await supabase
        .from("sellers")
        .update({ verification_status: "approved" })
        .eq("user_id", targetUser.id)
    } else {
      // Create a new seller entry for the admin
      await supabase.from("sellers").insert({
        user_id: targetUser.id,
        store_name: `${targetUser.email?.split("@")[0]}'s Admin Store`,
        store_description: "Default store for admin user",
        verification_status: "approved",
      })
    }

    return Response.json({ success: true, message: "Admin role assigned successfully and seller profile ensured" })
  } catch (error) {
    console.error("[v0] Error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
