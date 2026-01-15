// Script to create super admin user programmatically
// Run with: pnpm tsx scripts/create-super-admin.ts

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.KG_COMP_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.KG_COMP_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createSuperAdmin() {
  const email = "vinnywalker96@gmail.com"
  const password = "SuperAdmin123!" // Change this to a secure password

  console.log("Creating super admin user...")

  // Check if user exists
  const { data: existingUser } = await supabase.auth.admin.listUsers()
  const userExists = existingUser?.users?.find((u) => u.email === email)

  let userId: string

  if (userExists) {
    console.log("User already exists:", email)
    userId = userExists.id
  } else {
    // Create user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "Marlvin Kwenda",
        role: "super_admin",
      },
    })

    if (createError) {
      console.error("Error creating user:", createError)
      process.exit(1)
    }

    console.log("User created successfully:", email)
    userId = newUser.user!.id
  }

  // Create or update profile with super_admin role
  const { error: profileError } = await supabase.from("user_profiles").upsert(
    {
      id: userId,
      email,
      role: "super_admin",
      full_name: "Marlvin Kwenda",
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    },
  )

  if (profileError) {
    console.error("Error creating profile:", profileError)
    process.exit(1)
  }

  console.log("✅ Super admin profile created/updated successfully!")
  console.log("Email:", email)
  console.log("Role: super_admin")
  console.log("\nYou can now log in at: /auth/admin/login")

  // Verify
  const { data: profile } = await supabase.from("user_profiles").select("*").eq("email", email).single()

  console.log("\nProfile verification:", profile)
}

createSuperAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unexpected error:", error)
    process.exit(1)
  })
