"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Order } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input" // Import Input for the URL field
import { useToast } from "@/components/ui/use-toast" // Import useToast
import { Package, ShoppingCart, Users, TrendingUp, LogOut, Settings, CreditCard, UserCog, Webhook } from "lucide-react" // Add Webhook icon

interface DashboardStats {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  unpaidOrders: number
  totalUsers: number
}

export default function SystemAdminDashboardPage() {
  const supabase = createClient()
  const { toast } = useToast() // Initialize useToast
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
  const [scrapeUrl, setScrapeUrl] = useState("") // State for scrape URL input
  const [isScraping, setIsScraping] = useState(false) // State for scraping loading

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

        // Get products count
        const { count: productsCount } = await supabase.from("products").select("*", { count: "exact", head: true })

        // Get orders
        const { data: ordersData } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10)

        // Get users count
        const { count: usersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true })

        const totalRevenue = (ordersData || [])
          .filter((o) => o.payment_status === "paid")
          .reduce((sum, order) => sum + order.total_amount, 0)
        const pendingOrders = (ordersData || []).filter((o) => o.status === "pending").length
        const unpaidOrders = (ordersData || []).filter((o) => o.payment_status === "unpaid").length

        setStats({
          totalProducts: productsCount || 0,
          totalOrders: ordersData?.length || 0,
          totalRevenue,
          pendingOrders,
          unpaidOrders,
          totalUsers: usersCount || 0,
        })

        setRecentOrders(ordersData || [])
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/system_admin/login"
  }

  const handleScrapeProduct = async () => {
    if (!scrapeUrl) {
      toast({
        title: "Error",
        description: "Please enter a Mantech product URL.",
        variant: "destructive",
      })
      return
    }

    setIsScraping(true)
    try {
      const response = await fetch("/api/admin/scrape-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: scrapeUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to scrape product")
      }

      toast({
        title: "Success",
        description: "Product scraped and added successfully! It will appear in products list after approval.",
      })
      setScrapeUrl("") // Clear input
      fetchStats() // Refresh stats to update product count
    } catch (err: any) {
      console.error("Error scraping product:", err)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsScraping(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading admin dashboard...</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">System Admin Dashboard</h1>
            <p className="text-slate-600 mt-1">Manage products, orders, and inventory</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex gap-2 bg-transparent">
            <LogOut size={20} />
            Logout
          </Button>
        </div>

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

        {/* Scrape Products */}
        {isSuperAdmin && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-6 h-6" />
                Scrape Mantech Product
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4">
              <Input
                placeholder="Enter Mantech product URL (e.g., https://www.mantech.co.za/product-name)"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                disabled={isScraping}
                className="flex-1"
              />
              <Button onClick={handleScrapeProduct} disabled={isScraping}>
                {isScraping ? "Scraping..." : "Scrape Product"}
              </Button>
            </CardContent>
          </Card>
        )}

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
                Manage Admins
              </Button>
            </Link>
          )}
          {isSuperAdmin && (
            <Link href="/admin/users/pending">
              <Button className="w-full h-16 text-lg justify-start gap-4 bg-transparent" variant="outline">
                <Users size={24} />
                Pending User Accounts
              </Button>
            </Link>
          )}
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
      </div>
    </main>
  )
}
