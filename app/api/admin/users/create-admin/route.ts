import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { logAuditAction } from "@/lib/audit-service";
import { AdminUserCreationSchema } from "@/lib/schemas"; // Import Zod schema

// Helper function to check current user's role
async function getCurrentUserRole(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const currentUserRole = await getCurrentUserRole(supabase);

    // Only super_admin can create new admin users
    if (!currentUserRole || currentUserRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsedBody = AdminUserCreationSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.errors }, { status: 400 });
    }

    const { email, password, first_name, last_name, phone } = parsedBody.data;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
          phone: phone || null,
          // Initially assign 'admin' role in the user metadata, which will be picked up by a trigger
          // and inserted into the profiles table with the correct role.
          role: "admin",
        },
      },
    });

    if (authError) {
      // If user already exists, it will return an error here.
      if (authError.message === 'User already registered') {
        return NextResponse.json({ error: "User with this email already exists." }, { status: 409 });
      }
      console.error("[v0] Supabase auth signup error:", authError);
      return NextResponse.json({ error: authError.message || "Failed to create user" }, { status: 500 });
    }

    // Log the audit action
    if (authData.user && authData.user.id) {
        const { data: adminUser } = await supabase.auth.getUser();
        if (adminUser?.user?.id) {
            await logAuditAction({
                user_id: adminUser.user.id, // The super_admin who performed the action
                action: 'admin_user_created',
                table_name: 'auth.users', // Auditing the auth.users table
                record_id: authData.user.id, // The ID of the new admin user
                new_value: { email: authData.user.email, role: 'admin' },
                ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            });
        }
    }

    return NextResponse.json({ success: true, message: "Admin user created successfully", userId: authData.user?.id });

  } catch (error: any) {
    console.error("[v0] Error creating admin user:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
