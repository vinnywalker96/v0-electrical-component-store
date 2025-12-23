"use client"

import React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  TrendingUp,
  LogOut,
  UserIcon,
  MapPin,
  MessageSquare,
  CreditCard,
  UserCog,
  Store,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavItem {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  highlight?: boolean
}

interface DashboardLayoutProps {
  children: React.ReactNode
  role: "customer" | "vendor" | "admin" | "super_admin"
  title: string
  subtitle?: string
}

export function DashboardLayout({ children, role, title, subtitle }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [isSeller, setIsSeller] = React.useState(false)

  React.useEffect(() => {
    const checkSellerStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { data: sellerData } = await supabase
            .from("sellers")
            .select("id")
            .eq("user_id", user.id)
            .single()
          setIsSeller(!!sellerData)
        }
      } catch (error) {
        // User is not a seller
        setIsSeller(false)
      }
    }
    if (role === "customer") {
      checkSellerStatus()
    }
  }, [role])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/")
  }

  const getNavItems = (): NavItem[] => {
    if (!role) {
      return [
        { href: "/protected/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/protected/orders", icon: Package, label: "Orders" },
        { href: "/protected/settings", icon: Settings, label: "Settings" },
        { href: "/protected/profile", icon: UserIcon, label: "Profile" },
      ]
    }

    switch (role) {
      case "customer":
        const customerItems: NavItem[] = [
          { href: "/protected/dashboard", icon: LayoutDashboard, label: "Dashboard" },
          { href: "/protected/orders", icon: Package, label: "Orders" },
          { href: "/protected/settings", icon: Settings, label: "Settings" },
          { href: "/protected/profile", icon: UserIcon, label: "Profile" },
          { href: "/protected/addresses", icon: MapPin, label: "Addresses" },
          { href: "/chat", icon: MessageSquare, label: "Messages" },
        ]
        // Add "Apply to be Vendor" only if user is not already a seller
        if (!isSeller) {
          customerItems.push({ href: "/seller/register", icon: Store, label: "Apply to be Vendor", highlight: true })
        }
        return customerItems
      case "vendor":
        const vendorItems: NavItem[] = [
          { href: "/vendor/dashboard", icon: LayoutDashboard, label: "Dashboard" },
          { href: "/seller/orders", icon: ShoppingCart, label: "Orders" },
          { href: "/seller/products", icon: Package, label: "Products" },
          { href: "/vendor/commissions", icon: TrendingUp, label: "Commissions" },
          { href: "/protected/settings", icon: Settings, label: "Settings" },
          { href: "/protected/profile", icon: UserIcon, label: "Profile" },
        ]
        return vendorItems
      case "admin":
      case "super_admin":
        const adminItems: NavItem[] = [
          { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
          { href: "/admin/orders", icon: ShoppingCart, label: "Orders" },
          { href: "/protected/settings", icon: Settings, label: "Settings" },
          { href: "/admin/products", icon: Package, label: "Products" },
          { href: "/admin/users", icon: Users, label: "Users" },
          { href: "/admin/banking-details", icon: CreditCard, label: "Banking Details" },
        ]
        if (role === "super_admin") {
          adminItems.push({ href: "/admin/users?tab=admins", icon: UserCog, label: "Manage Admins" })
        }
        return adminItems
      default:
        return [
          { href: "/protected/dashboard", icon: LayoutDashboard, label: "Dashboard" },
          { href: "/protected/orders", icon: Package, label: "Orders" },
          { href: "/protected/settings", icon: Settings, label: "Settings" },
        ]
    }
  }

  const navItems = React.useMemo(() => {
    const items = getNavItems()
    return items
  }, [role, isSeller])



  return (
    <div className="flex min-h-screen bg-slate-50 relative w-full">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 fixed left-0 top-0 h-screen overflow-y-auto z-50 shadow-sm" style={{ display: 'block' }}>
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-8">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">⚡</div>
            <span>KG Components</span>
          </Link>



          <nav className="space-y-1">
            {navItems && navItems.length > 0 ? (
              navItems.map((item: NavItem, index: number) => {
                const Icon = item.icon
                // Improved active state detection
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/protected/dashboard" &&
                    item.href !== "/vendor/dashboard" &&
                    item.href !== "/admin/dashboard" &&
                    pathname?.startsWith(item.href.split("?")[0]))
                const isHighlighted = item.highlight
                // Use label + index as key to ensure uniqueness
                const uniqueKey = `${item.href}-${item.label}-${index}`
                return (
                  <Link
                    key={uniqueKey}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : isHighlighted
                          ? "bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium border border-blue-200"
                          : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                )
              })
}
          </nav>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-slate-700 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-slate-600 mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

