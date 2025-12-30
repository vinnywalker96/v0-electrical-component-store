"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { SidebarNav } from "@/components/sidebar-nav"
import { UserCircle, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { NotificationIcon } from "./notification-icon"
import type { UserProfile } from "@/lib/types"
import { useLanguage } from "@/lib/context/language-context"

export function DashboardLayout({
  children,
  navItems,
}: {
  children: React.ReactNode
  navItems: { href: string; label: string; icon: React.ReactNode }[]
}) {
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const router = useRouter()
  const [mounted, setMounted] = useState(false) // Correctly initialize to false
  const { t } = useLanguage()

  // Ensure component is mounted on the client before rendering client-specific UI
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

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
        }
      }
    }

    fetchProfile()
  }, [supabase, setProfile])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SidebarNav navItems={navItems} />
      <div className="flex-1 flex flex-col ml-64">
        <header className="flex items-center justify-between p-4 bg-white border-b">
          <div>
            <Link href="/">
             
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationIcon />
            {profile?.role === "customer" && (
              <Link href="/cart">
                <ShoppingCart className="w-6 h-6" />
              </Link>
            )}
            {mounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 p-2 rounded-md bg-gray-100 hover:bg-gray-200">
                    <UserCircle className="w-6 h-6" />
                    <span className="text-sm font-medium">{profile?.first_name || "Profile"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t("dropdown.my_account")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/protected/dashboard">
                    <DropdownMenuItem>{t("dropdown.user_portal")}</DropdownMenuItem>
                  </Link>
                  {profile && (profile.role === "admin" || profile.role === "super_admin") && (
                    <Link href="/admin/dashboard">
                      <DropdownMenuItem>{t("dropdown.admin")}</DropdownMenuItem>
                    </Link>
                  )}
                  {profile && profile.role === "vendor" && (
                    <Link href="/seller/dashboard">
                      <DropdownMenuItem>{t("dropdown.vendor")}</DropdownMenuItem>
                    </Link>
                  )}
                  <Link href="/protected/profile">
                    <DropdownMenuItem>{t("dropdown.profile")}</DropdownMenuItem>
                  </Link>
                  <Link href="/protected/settings">
                    <DropdownMenuItem>{t("dropdown.settings")}</DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout}>{t("dropdown.logout")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
