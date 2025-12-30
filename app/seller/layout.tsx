"use client"

import type React from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { sellerNavItems } from "@/lib/nav-items.tsx"

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout navItems={sellerNavItems}>{children}</DashboardLayout>
}
