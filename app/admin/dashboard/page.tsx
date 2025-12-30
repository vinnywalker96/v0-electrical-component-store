"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Order } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, ShoppingCart, Users, TrendingUp, LogOut, Settings, CreditCard, UserCog } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // Import Select components
import { AdminSalesTable } from "@/components/admin-sales-table" // Import AdminSalesTable

interface DashboardStats {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  unpaidOrders: number
  totalUsers: number
}

// Helper function to get date ranges
const getDateRange = (period: "day" | "week" | "month" | "year") => {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  switch (period) {
    case "day":
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "week":
      startDate.setDate(now.getDate() - now.getDay()); // Start of the current week (Sunday)
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(startDate.getDate() + 6); // End of the current week (Saturday)
      endDate.setHours(23, 59, 59, 999);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
  }
  return { startDate, endDate };
};

export default function AdminDashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    unpaidOrders: 0,
    totalUsers: 0,
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState<"day" | "week" | "month" | "year">("month"); // New state for filter
  const [activeTab, setActiveTab] = useState<"overview" | "sales">("overview"); // New state for tabs

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Check if super admin
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
          setIsSuperAdmin(profile?.role === "super_admin")
        }

        // Get products count (not affected by time filter)
        const { count: productsCount } = await supabase.from("products").select("*", { count: "exact", head: true })

        // Get users count (not affected by time filter)
        const { count: usersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true })

        // Get orders for the filtered period
        const { startDate, endDate } = getDateRange(filterPeriod);
        let ordersQuery = supabase
          .from("orders")
          .select("*")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        const { data: filteredOrdersData, error: ordersError } = await ordersQuery.order("created_at", { ascending: false });

        if (ordersError) throw ordersError;

        const totalRevenue = (filteredOrdersData || [])
          .filter((o) => o.payment_status === "paid")
          .reduce((sum, order) => sum + order.total_amount, 0)
        const pendingOrders = (filteredOrdersData || []).filter((o) => o.status === "pending").length
        const unpaidOrders = (filteredOrdersData || []).filter((o) => o.payment_status === "unpaid").length

        setStats({
          totalProducts: productsCount || 0,
          totalOrders: filteredOrdersData?.length || 0,
          totalRevenue,
          pendingOrders,
          unpaidOrders,
          totalUsers: usersCount || 0,
        })

        // Fetch recent orders (last 10, unfiltered by time for this specific section)
        const { data: recentOrdersData } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10)
        setRecentOrders(recentOrdersData || [])

      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [filterPeriod]) // Remove supabase from dependencies

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  if (loading) {
    return <div className="text-center py-12">Loading admin dashboard...</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex gap-4 mb-4">
              <Button
                variant={activeTab === "overview" ? "default" : "outline"}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </Button>
              <Button
                variant={activeTab === "sales" ? "default" : "outline"}
                onClick={() => setActiveTab("sales")}
              >
                Sales Report
              </Button>
            </div>
            {activeTab === "overview" ? (
              <>
                <h1 className="text-4xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-slate-600 mt-1">Manage products, orders, and inventory</p>
              </>
            ) : (
              <h1 className="text-4xl font-bold text-foreground">Sales Report</h1>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={filterPeriod} onValueChange={(value) => setFilterPeriod(value as "day" | "week" | "month" | "year")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeTab === "overview" && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                  <Package className="w-10 h-10 text-blue-600" />
                  <div>
                    <p className="text-sm text-slate-600">Products</p>
                    <p className="text-2xl font-bold">{stats.totalProducts}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                  <ShoppingCart className="w-10 h-10 text-green-600" />
                  <div>
                    <p className="text-sm text-slate-600">Orders</p>
                    <p className="text-2xl font-bold">{stats.totalOrders}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                  <TrendingUp className="w-10 h-10 text-orange-600" />
                  <div>
                    <p className="text-sm text-slate-600">Revenue</p>
                    <p className="text-2xl font-bold">R{stats.totalRevenue.toFixed(0)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                  <Settings className="w-10 h-10 text-yellow-600" />
                  <div>
                    <p className="text-sm text-slate-600">Pending</p>
                    <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                  <CreditCard className="w-10 h-10 text-red-600" />
                  <div>
                    <p className="text-sm text-slate-600">Unpaid</p>
                    <p className="text-2xl font-bold">{stats.unpaidOrders}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                  <Users className="w-10 h-10 text-purple-600" />
                  <div>
                    <p className="text-sm text-slate-600">Users</p>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Link href="/admin/products">
                <Button className="w-full h-16 text-lg justify-start gap-4">
                  <Package size={24} />
                  Manage Products
                </Button>
              </Link>
              <Link href="/admin/orders">
                <Button className="w-full h-16 text-lg justify-start gap-4">
                  <ShoppingCart size={24} />
                  View Orders
                </Button>
              </Link>
              <Link href="/admin/banking-details">
                <Button className="w-full h-16 text-lg justify-start gap-4 bg-transparent" variant="outline">
                  <CreditCard size={24} />
                  Banking Details
                </Button>
              </Link>
              {isSuperAdmin && (
                <Link href="/admin/users">
                  <Button className="w-full h-16 text-lg justify-start gap-4 bg-transparent" variant="outline">
                    <UserCog size={24} />
                    Manage Users
                  </Button>
                </Link>
              )}
            </div>

            {/* Admin Actions */}
            {isSuperAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Link href="/admin/orders/new">
                  <Button className="w-full h-12 justify-start gap-2 bg-green-600 hover:bg-green-700">
                    <ShoppingCart size={18} />
                    Create Order
                  </Button>
                </Link>
                <Link href="/admin/users/new">
                  <Button className="w-full h-12 justify-start gap-2 bg-blue-600 hover:bg-blue-700">
                    <UserCog size={18} />
                    Create User
                  </Button>
                </Link>
                <Link href="/admin/vendors/new">
                  <Button className="w-full h-12 justify-start gap-2 bg-purple-600 hover:bg-purple-700">
                    <Settings size={18} />
                    Create Vendor
                  </Button>
                </Link>
              </div>
            )}

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
                              <Link href={`/admin/orders/${order.id}`}>
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
          </>
        )}

        {activeTab === "sales" && (
          <AdminSalesTable filterPeriod={filterPeriod} />
        )}
      </div>
    </main>
  )
}
