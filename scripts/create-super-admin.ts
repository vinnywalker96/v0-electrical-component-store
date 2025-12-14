import { createClient } from "../lib/supabase/server"

async function createSuperAdmin() {
  const supabase = await createClient()

  const email = "vinnywalker@gmail.com"
  const password = "@Thingo11"
  const firstName = "Vinny"
  const lastName = "Walker"

  console.log(`Attempting to create super admin user: ${email}`)

  // Create user in Supabase Auth
  const { data: userResponse, error: userError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Automatically confirm the email
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  })

  if (userError) {
    if (userError.message.includes("already exists")) {
      console.warn(`User ${email} already exists in Supabase Auth. Proceeding to update profile.`)
      // If user exists, try to fetch them to get their ID
      const { data: existingUser, error: fetchError } = await supabase.auth.admin.getUserByEmail(email)
      if (fetchError || !existingUser) {
        console.error("Failed to fetch existing user:", fetchError?.message || "User not found.")
        return
      }
      userResponse.user = existingUser.user
    } else {
      console.error("Error creating user:", userError.message)
      return
    }
  }

  const userId = userResponse.user?.id
  if (!userId) {
    console.error("User ID not found after creation or fetch.")
    return
  }

  // Insert/Update profile with super_admin role
  console.log(`Attempting to create/update profile for user ID: ${userId}`)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        name: `${firstName} ${lastName}`.trim(),
        role: "super_admin",
      },
      { onConflict: "id" }, // If a profile with this ID already exists, update it
    )
    .select()

  if (profileError) {
    console.error("Error creating/updating profile:", profileError.message)
  } else {
    console.log(`Super admin user ${email} created/updated successfully with role: super_admin.`)
    console.log("Profile data:", profile)
  }
}

createSuperAdmin()
