import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user has seller profile (except for register page)
  const { data: profile } = await supabase.from("user_profiles").select("role").eq("user_id", user.id).single()

  // Allow access to register page if not a seller yet
  // For other pages, user must be a seller

  return <>{children}</>
}
