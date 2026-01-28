"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { getAdminNavItems } from "@/lib/nav-items"
import { useLanguage } from "@/lib/context/language-context"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        redirect("/auth/login")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

      if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
        redirect("/")
        return
      }

      setIsAuthorized(true)
    }

    checkAccess()
  }, [supabase])

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t("admin_dashboard.verifying_admin_access")}</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout navItems={getAdminNavItems(t)} hideNavbar hideFooter>
      {children}
    </DashboardLayout>
  )
}
