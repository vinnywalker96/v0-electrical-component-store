import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { Package, ShoppingCart, Users, UserCog, Clock, Banknote, FileText } from "lucide-react"

export default async function SystemAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/system_admin/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "super_admin") {
    redirect("/system_admin/login?message=unauthorized")
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-100 p-6 border-r border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">System Admin</h2>
        <nav className="space-y-2">
          <Link href="/admin/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200">
            <UserCog className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/admin/products" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200">
            <Package className="w-5 h-5" />
            Products
          </Link>
          <Link href="/admin/orders" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200">
            <ShoppingCart className="w-5 h-5" />
            Orders
          </Link>
          <Link href="/admin/banking-details" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200">
            <Banknote className="w-5 h-5" />
            Banking Details
          </Link>
          <Link href="/admin/users" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200">
            <Users className="w-5 h-5" />
            Admins & Users
          </Link>
          <Link href="/admin/users/pending" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200">
            <Clock className="w-5 h-5" />
            Pending Approvals
          </Link>
          <Link href="/admin/product-reports" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200">
            <FileText className="w-5 h-5" />
            Product Reports
          </Link>
        </nav>
      </aside>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
