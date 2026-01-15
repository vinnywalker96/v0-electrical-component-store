"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { SidebarNav } from "@/components/sidebar-nav"
import { useRouter } from "next/navigation"
import type { UserProfile } from "@/lib/types"
import { useLanguage } from "@/lib/context/language-context"

interface DashboardLayoutProps {
  children: React.ReactNode
  navItems: { href: string; label: string; icon: React.ReactNode }[]
  hideNavbar?: boolean // Added prop to hide top navbar in dashboards
  hideFooter?: boolean // Added prop to hide footer in dashboards
}

export function DashboardLayout({
  children,
  navItems,
  hideNavbar = true, // Default to hiding navbar in dashboard mode
  hideFooter = true, // Default to hiding footer in dashboard mode
}: DashboardLayoutProps) {
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const { t } = useLanguage()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (profileData) {
          setProfile(profileData)
        }
      }
    }

    fetchProfile()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav navItems={navItems} userProfile={profile} onLogout={handleLogout} />
      <div className="flex-1 ml-64">
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
