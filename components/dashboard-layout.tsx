"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { SidebarNav } from "@/components/sidebar-nav"
import { useRouter } from "next/navigation"
import type { UserProfile } from "@/lib/types"
import { useLanguage } from "@/lib/context/language-context"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

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
    // Sign out globally to terminate all sessions
    await supabase.auth.signOut({ scope: 'global' })
    router.push("/auth/login")
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      {/* Mobile Toggle Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={toggleSidebar} className="bg-white shadow-md">
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <SidebarNav
        navItems={navItems}
        userProfile={profile}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-64 ml-0'}`}>
        <main className="p-4 md:p-8 pt-16 md:pt-8">{children}</main>
      </div>
    </div>
  )
}
