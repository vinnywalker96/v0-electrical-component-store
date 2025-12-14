import { createServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { logAuditAction } from "@/lib/audit-service"; // New import
import { SupabaseClient } from "@supabase/supabase-js"; // Import SupabaseClient type

// Helper function to check current user's role
async function getCurrentUserRole(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role;
}

// Helper function to get a target user's role
async function getTargetUserRole(supabase: SupabaseClient, userId: string) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
    return profile?.role;
}

// GET /api/admin/users - Fetch all user profiles
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const currentUserRole = await getCurrentUserRole(supabase);

    if (!currentUserRole || (currentUserRole !== "super_admin" && currentUserRole !== "admin")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, phone, role, created_at");

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(profiles);
  } catch (error) {
    console.error("[v0] Error fetching users:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/users - Update a user's role
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const currentUserRole = await getCurrentUserRole(supabase);

    if (!currentUserRole || (currentUserRole !== "super_admin" && currentUserRole !== "admin")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, newRole } = await request.json();

    if (!userId || !newRole || !["customer", "vendor", "admin", "super_admin"].includes(newRole)) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    // Prevent non-super_admin from promoting to or managing super_admin roles
    if (currentUserRole === "admin" && (newRole === "super_admin" || (await getTargetUserRole(supabase, userId)) === "super_admin")) {
        return Response.json({ error: "Admins cannot manage super_admin roles" }, { status: 403 });
    }

    // Prevent user from changing their own role
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser && currentUser.id === userId) {
        return Response.json({ error: "Cannot change your own role" }, { status: 403 });
    }

    // Get old role for audit logging
    const oldRole = await getTargetUserRole(supabase, userId);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    // Log the audit action
    if (currentUser) {
        await logAuditAction({
            user_id: currentUser.id,
            action: 'user_role_changed',
            table_name: 'profiles',
            record_id: userId,
            old_value: { role: oldRole },
            new_value: { role: newRole },
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        });
    }

    return Response.json({ success: true, message: `User role updated to ${newRole}` });
  } catch (error) {
    console.error("[v0] Error updating user role:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
