import { createClient } from "@supabase/supabase-js"

// Use the correct environment variables
const supabaseUrl = process.env.KG_COMP_SUPABASE_URL || process.env.NEXT_PUBLIC_KG_COMP_SUPABASE_URL
const supabaseServiceKey = process.env.KG_COMP_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:")
  console.error("   - KG_COMP_SUPABASE_URL (or NEXT_PUBLIC_KG_COMP_SUPABASE_URL)")
  console.error("   - KG_COMP_SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function setupSuperAdmin() {
  console.log("🚀 Starting super admin setup...\n")

  const email = "vinnywalker96@gmail.com"
  const password = "SuperAdmin123!" // Change this to a secure password

  try {
    // Test database connection
    console.log("📡 Testing database connection...")
    const { data: testData, error: testError } = await supabase.from("profiles").select("count").limit(1)

    if (testError) {
      console.error("❌ Database connection failed:", testError.message)
      process.exit(1)
    }
    console.log("✅ Database connection successful\n")

    // Check if user exists in auth.users
    console.log(`🔍 Checking if ${email} exists...`)
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error("❌ Error listing users:", listError.message)
      process.exit(1)
    }

    const existingUser = existingUsers.users.find((u) => u.email === email)
    let userId: string

    if (existingUser) {
      console.log(`✅ User already exists with ID: ${existingUser.id}\n`)
      userId = existingUser.id
    } else {
      // Create the user in auth.users
      console.log(`📝 Creating new user: ${email}`)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: "super_admin",
        },
      })

      if (createError) {
        console.error("❌ Error creating user:", createError.message)
        process.exit(1)
      }

      userId = newUser.user.id
      console.log(`✅ User created with ID: ${userId}\n`)
    }

    // Check if profile exists
    console.log("🔍 Checking profile...")
    const { data: existingProfile } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (existingProfile) {
      // Update existing profile
      console.log("📝 Updating existing profile to super_admin...")
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          role: "super_admin",
          email: email,
          full_name: "Super Admin",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (updateError) {
        console.error("❌ Error updating profile:", updateError.message)
        process.exit(1)
      }
      console.log("✅ Profile updated to super_admin\n")
    } else {
      // Create new profile
      console.log("📝 Creating new profile with super_admin role...")
      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        email: email,
        role: "super_admin",
        full_name: "Super Admin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error("❌ Error creating profile:", insertError.message)
        process.exit(1)
      }
      console.log("✅ Profile created with super_admin role\n")
    }

    // Verify the setup
    console.log("🔍 Verifying super admin setup...")
    const { data: verifyProfile, error: verifyError } = await supabase
      .from("profiles")
      .select("id, email, role, full_name")
      .eq("id", userId)
      .single()

    if (verifyError) {
      console.error("❌ Error verifying profile:", verifyError.message)
      process.exit(1)
    }

    console.log("✅ Super admin setup complete!")
    console.log("\n📋 Profile Details:")
    console.log("   Email:", verifyProfile.email)
    console.log("   Role:", verifyProfile.role)
    console.log("   Full Name:", verifyProfile.full_name)
    console.log("   User ID:", verifyProfile.id)
    console.log("\n🔐 Login Credentials:")
    console.log("   Email:", email)
    console.log("   Password:", password)
    console.log("   Login URL: http://localhost:3000/auth/admin/login")
    console.log("\n✨ You can now log in as super admin!")
  } catch (error) {
    console.error("❌ Unexpected error:", error)
    process.exit(1)
  }
}

setupSuperAdmin()
