"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { adminNavItems, sellerNavItems, customerNavItems } from "@/lib/nav-items.tsx"
import type { UserProfile } from "@/lib/types"

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [navItems, setNavItems] = useState<any[]>([])

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          switch (profileData.role) {
            case "admin":
            case "super_admin":
              setNavItems(adminNavItems)
              break
            case "seller":
              setNavItems(sellerNavItems)
              break
            default:
              setNavItems(customerNavItems)
              break
          }
        }
      }
    }

    fetchProfile()
  }, [supabase, setProfile, setNavItems])

  if (!profile) {
    // You might want to show a loader here
    return <div>Loading...</div>
  }

  return <DashboardLayout navItems={navItems}>{children}</DashboardLayout>
}
