import { createClient } from "@supabase/supabase-js"

async function testConnection() {
  console.log("[v0] Testing database connection...\n")

  // Use KG_COMP environment variables
  const supabaseUrl = process.env.KG_COMP_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_KG_COMP_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.KG_COMP_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing environment variables!")
    console.log("Required: KG_COMP_SUPABASE_URL, NEXT_PUBLIC_KG_COMP_SUPABASE_ANON_KEY")
    process.exit(1)
  }

  console.log("✓ Environment variables loaded")
  console.log(`✓ Supabase URL: ${supabaseUrl}\n`)

  // Test with anon key
  console.log("Testing connection with anon key...")
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: tablesData, error: tablesError } = await supabase.from("profiles").select("*").limit(1)

  if (tablesError) {
    console.error("❌ Connection failed with anon key:", tablesError.message)
  } else {
    console.log("✓ Connected with anon key successfully")
  }

  // Test with service role key
  if (serviceRoleKey) {
    console.log("\nTesting connection with service role key...")
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: adminData, error: adminError } = await adminClient
      .from("profiles")
      .select("id, email, role")
      .eq("email", "vinnywalker96@gmail.com")
      .single()

    if (adminError) {
      if (adminError.code === "PGRST116") {
        console.log("⚠️  Profile not found for vinnywalker96@gmail.com")
        console.log("   User needs to sign up first or profile needs to be created")
      } else {
        console.error("❌ Error:", adminError.message)
      }
    } else {
      console.log("✓ Connected with service role key successfully")
      console.log("\nProfile found:")
      console.log("  Email:", adminData.email)
      console.log("  Role:", adminData.role)
      console.log("  ID:", adminData.id)

      if (adminData.role === "super_admin") {
        console.log("\n✅ Super admin is properly configured!")
      } else {
        console.log("\n⚠️  User exists but role is not super_admin")
        console.log("   Current role:", adminData.role)
      }
    }
  } else {
    console.log("\n⚠️  Service role key not available, skipping admin checks")
  }

  console.log("\n✅ Connection test complete!")
}

testConnection().catch((error) => {
  console.error("❌ Test failed:", error)
  process.exit(1)
})
