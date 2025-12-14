import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profileError || !profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: Only Super Admins can view pending users" }, { status: 403 })
  }

  let query = supabase.from("profiles").select("id, email, first_name, last_name, role, account_status, role_requested, created_at", { count: 'exact' })

  if (status) {
    query = query.eq("account_status", status)
  }

  const { data: users, error } = await query.order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { id, action } = await request.json()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profileError || !profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: Only Super Admins can manage user accounts" }, { status: 403 })
  }

  if (action === "approve") {
    // Check for super_admin limit if the requested role is super_admin
    const { data: userToApprove, error: fetchError } = await supabase
      .from("profiles")
      .select("role_requested")
      .eq("id", id)
      .single();

    if (fetchError || !userToApprove) {
      console.error("Error fetching user to approve:", fetchError);
      return NextResponse.json({ error: fetchError?.message || "User not found." }, { status: 500 });
    }

    if (userToApprove.role_requested === "super_admin") {
      const { count, error: countError } = await supabase
        .from("profiles")
        .select("id", { count: "exact" })
        .eq("role", "super_admin")
        .neq("id", id); // Exclude the user being approved from the count


      if (countError) {
        console.error("Error counting super_admins:", countError);
        return NextResponse.json({ error: countError.message }, { status: 500 });
      }

      if (count && count >= 2) {
        return NextResponse.json({ error: "Cannot approve, maximum of 2 super_admin users already exist." }, { status: 400 });
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ account_status: "approved", role: userToApprove.role_requested }) // Set actual role upon approval
      .eq("id", id)

    if (error) {
      console.error("Error approving user:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else if (action === "reject") {
    const { error } = await supabase
      .from("profiles")
      .update({ account_status: "rejected", role_requested: null }) // Clear requested role on rejection
      .eq("id", id)

    if (error) {
      console.error("Error rejecting user:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  return NextResponse.json({ message: `User ${action}ed successfully` })
}