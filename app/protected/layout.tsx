"use client"

import type React from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { customerNavItems } from "@/lib/nav-items"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout navItems={customerNavItems}>{children}</DashboardLayout>
}
