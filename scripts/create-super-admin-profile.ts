import { createClient } from "@supabase/supabase-js"

async function createSuperAdmin() {
  console.log("[v0] Setting up super admin...\n")

  const supabaseUrl = process.env.KG_COMP_SUPABASE_URL
  const serviceRoleKey = process.env.KG_COMP_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing required environment variables!")
    console.log("Required: KG_COMP_SUPABASE_URL, KG_COMP_SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  // Create admin client with service role key
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const email = "vinnywalker96@gmail.com"

  // Check if user exists in auth
  console.log("Checking if user exists in auth.users...")
  const {
    data: { users },
    error: listError,
  } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error("❌ Error listing users:", listError.message)
    process.exit(1)
  }

  const existingUser = users.find((u) => u.email === email)
  let userId: string

  if (existingUser) {
    console.log("✓ User exists in auth.users")
    userId = existingUser.id
  } else {
    console.log("Creating user in auth.users...")
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: "SuperAdmin123!",
      email_confirm: true,
      user_metadata: {
        role: "super_admin",
      },
    })

    if (createError) {
      console.error("❌ Error creating user:", createError.message)
      process.exit(1)
    }

    console.log("✓ User created in auth.users")
    userId = authData.user.id
  }

  // Check if profile exists
  console.log("\nChecking if profile exists...")
  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (profileError && profileError.code !== "PGRST116") {
    console.error("❌ Error checking profile:", profileError.message)
    process.exit(1)
  }

  if (profile) {
    console.log("✓ Profile exists, updating role...")
    const { error: updateError } = await supabase.from("profiles").update({ role: "super_admin" }).eq("id", userId)

    if (updateError) {
      console.error("❌ Error updating profile:", updateError.message)
      process.exit(1)
    }
    console.log("✓ Profile updated to super_admin")
  } else {
    console.log("Creating profile...")
    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      email,
      role: "super_admin",
      full_name: "Super Admin",
    })

    if (insertError) {
      console.error("❌ Error creating profile:", insertError.message)
      process.exit(1)
    }
    console.log("✓ Profile created with super_admin role")
  }

  console.log("\n✅ Super admin setup complete!")
  console.log("\nLogin credentials:")
  console.log("  Email: vinnywalker96@gmail.com")
  console.log("  Password: SuperAdmin123!")
  console.log("  URL: http://localhost:3000/auth/admin/login")
}

createSuperAdmin().catch((error) => {
  console.error("❌ Setup failed:", error)
  process.exit(1)
})
