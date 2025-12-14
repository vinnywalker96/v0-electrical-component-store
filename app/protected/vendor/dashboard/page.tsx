"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Order, Product } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, ShoppingCart, TrendingUp, LogOut, Settings } from "lucide-react"

interface DashboardStats {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
}

export default function VendorAdminDashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        // Get products count for this vendor
        const { count: productsCount } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", user.id)

        // Get orders for this vendor's products
        // This is a simplified approach; a more robust solution might involve RLS or a custom function
        const { data: vendorProducts, error: productsError } = await supabase
          .from("products")
          .select("id")
          .eq("seller_id", user.id)
        
        if (productsError) throw productsError

        const productIds = vendorProducts?.map(p => p.id) || []

        let ordersData: Order[] = [];
        if (productIds.length > 0) {
          const { data: orderItems, error: orderItemsError } = await supabase
            .from("order_items")
            .select("order_id")
            .in("product_id", productIds)
          
          if (orderItemsError) throw orderItemsError

          const uniqueOrderIds = [...new Set(orderItems?.map(oi => oi.order_id))]

          if (uniqueOrderIds.length > 0) {
            const { data: orders, error: ordersError } = await supabase
              .from("orders")
              .select("*")
              .in("id", uniqueOrderIds)
              .order("created_at", { ascending: false })
              .limit(10)
            
            if (ordersError) throw ordersError
            ordersData = orders || [];
          }
        }

        const totalRevenue = (ordersData || [])
          .filter((o) => o.payment_status === "paid")
          .reduce((sum, order) => sum + order.total_amount, 0)
        const pendingOrders = (ordersData || []).filter((o) => o.status === "pending").length

        setStats({
          totalProducts: productsCount || 0,
          totalOrders: ordersData?.length || 0,
          totalRevenue,
          pendingOrders,
        })

        setRecentOrders(ordersData || [])
      } catch (error) {
        console.error("Error fetching vendor stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/vendor_admin/login"
  }

  if (loading) {
    return <div className="text-center py-12">Loading vendor dashboard...</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Vendor Dashboard</h1>
            <p className="text-slate-600 mt-1">Manage your products and sales</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex gap-2 bg-transparent">
            <LogOut size={20} />
            Logout
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <Package className="w-10 h-10 text-blue-600" />
              <div>
                <p className="text-sm text-slate-600">My Products</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <ShoppingCart className="w-10 h-10 text-green-600" />
              <div>
                <p className="text-sm text-slate-600">My Orders</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <TrendingUp className="w-10 h-10 text-orange-600" />
              <div>
                <p className="text-sm text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold">R{stats.totalRevenue.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <Settings className="w-10 h-10 text-yellow-600" />
              <div>
                <p className="text-sm text-slate-600">Pending Orders</p>
                <p className="text-2xl font-bold">{stats.pendingOrders}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Link href="/protected/vendor/products">
            <Button className="w-full h-16 text-lg justify-start gap-4">
              <Package size={24} />
              Manage My Products
            </Button>
          </Link>
          <Link href="/protected/vendor/orders">
            <Button className="w-full h-16 text-lg justify-start gap-4">
              <ShoppingCart size={24} />
              View My Orders
            </Button>
          </Link>
          <Link href="/protected/vendor/profile">
            <Button className="w-full h-16 text-lg justify-start gap-4 bg-transparent" variant="outline">
              <UserCog size={24} />
              My Profile
            </Button>
          </Link>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-slate-600">No orders yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Payment</th>
                      <th className="text-right py-3 px-4 font-semibold">Amount</th>
                      <th className="text-center py-3 px-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-sm">{order.id.slice(0, 8)}</td>
                        <td className="py-3 px-4">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm capitalize">
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm capitalize ${
                              order.payment_status === "paid"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {order.payment_status || "unpaid"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">R{order.total_amount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          <Link href={`/protected/vendor/orders/${order.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
