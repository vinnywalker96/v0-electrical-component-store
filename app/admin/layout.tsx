"use client"

import type React from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { adminNavItems } from "@/lib/nav-items.tsx"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout navItems={adminNavItems}>{children}</DashboardLayout>
}
