import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { Package, ShoppingCart, UserCog, Settings } from "lucide-react"

export default async function VendorAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/vendor_admin/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "vendor_admin" && profile?.role !== "super_admin") {
    redirect("/vendor_admin/login?message=unauthorized")
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-100 p-6 border-r border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Vendor Admin</h2>
        <nav className="space-y-2">
          <Link href="/protected/vendor/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200">
            <UserCog className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/protected/vendor/products" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200">
            <Package className="w-5 h-5" />
            My Products
          </Link>
          <Link href="/protected/vendor/orders" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200">
            <ShoppingCart className="w-5 h-5" />
            My Orders
          </Link>
          <Link href="/protected/vendor/profile" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200">
            <UserCog className="w-5 h-5" />
            Profile
          </Link>
          <Link href="/protected/vendor/settings" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200">
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>
      </aside>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
