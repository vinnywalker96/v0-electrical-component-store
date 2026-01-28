"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Order } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, ShoppingCart, Users, TrendingUp, LogOut, Settings, CreditCard, UserCog } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // Import Select components
import { AdminSalesTable } from "@/components/admin-sales-table" // Import AdminSalesTable
import { useLanguage } from "@/lib/context/language-context"

import { UserManagementButton } from "@/components/user-management-button";

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
  const router = useRouter()
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
  const { t } = useLanguage()

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

        // Get users count from the API endpoint (which uses createAdminClient and bypasses RLS)
        const usersApiResponse = await fetch("/api/admin/users");
        if (!usersApiResponse.ok) {
          throw new Error("Failed to fetch total users from API.");
        }
        const usersFromApi = await usersApiResponse.json();
        const usersCount = usersFromApi.length;

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
  }, [filterPeriod, supabase])

  async function handleLogout() {
    // Sign out globally to terminate all sessions
    await supabase.auth.signOut({ scope: 'global' })
    router.push("/auth/login")
  }

  if (loading) {
    return <div className="text-center py-12">{t("admin_dashboard.loading")}</div>
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
                {t("admin_dashboard.overview")}
              </Button>
              <Button
                variant={activeTab === "sales" ? "default" : "outline"}
                onClick={() => setActiveTab("sales")}
              >
                {t("admin_dashboard.sales_report")}
              </Button>
            </div>
            {activeTab === "overview" ? (
              <>
                <h1 className="text-4xl font-bold text-foreground">{t("admin_dashboard.title")}</h1>
                <p className="text-slate-600 mt-1">{t("admin_dashboard.subtitle")}</p>
              </>
            ) : (
              <h1 className="text-4xl font-bold text-foreground">{t("admin_dashboard.sales_report")}</h1>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={filterPeriod} onValueChange={(value) => setFilterPeriod(value as "day" | "week" | "month" | "year")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("admin_dashboard.filter_period")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">{t("admin_dashboard.periods.today")}</SelectItem>
                <SelectItem value="week">{t("admin_dashboard.periods.week")}</SelectItem>
                <SelectItem value="month">{t("admin_dashboard.periods.month")}</SelectItem>
                <SelectItem value="year">{t("admin_dashboard.periods.year")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeTab === "overview" && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 md:pt-6 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
                  <Package className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
                  <div>
                    <p className="text-xs md:text-sm text-slate-600">{t("admin_dashboard.stats.products")}</p>
                    <p className="text-xl md:text-2xl font-bold">{stats.totalProducts}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:pt-6 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
                  <ShoppingCart className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
                  <div>
                    <p className="text-xs md:text-sm text-slate-600">{t("admin_dashboard.stats.orders")}</p>
                    <p className="text-xl md:text-2xl font-bold">{stats.totalOrders}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:pt-6 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
                  <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-orange-600" />
                  <div>
                    <p className="text-xs md:text-sm text-slate-600">{t("admin_dashboard.stats.revenue")}</p>
                    <p className="text-xl md:text-2xl font-bold">R{stats.totalRevenue.toFixed(0)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:pt-6 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
                  <Settings className="w-8 h-8 md:w-10 md:h-10 text-yellow-600" />
                  <div>
                    <p className="text-xs md:text-sm text-slate-600">{t("admin_dashboard.stats.pending")}</p>
                    <p className="text-xl md:text-2xl font-bold">{stats.pendingOrders}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:pt-6 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
                  <CreditCard className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
                  <div>
                    <p className="text-xs md:text-sm text-slate-600">{t("admin_dashboard.stats.unpaid")}</p>
                    <p className="text-xl md:text-2xl font-bold">{stats.unpaidOrders}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:pt-6 flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
                  <Users className="w-8 h-8 md:w-10 md:h-10 text-purple-600" />
                  <div>
                    <p className="text-xs md:text-sm text-slate-600">{t("admin_dashboard.stats.users")}</p>
                    <p className="text-xl md:text-2xl font-bold">{stats.totalUsers}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Link href="/admin/products">
                <Button className="w-full h-16 text-lg justify-start gap-4">
                  <Package size={24} />
                  {t("admin_dashboard.quick_links.manage_products")}
                </Button>
              </Link>
              <Link href="/admin/orders">
                <Button className="w-full h-16 text-lg justify-start gap-4">
                  <ShoppingCart size={24} />
                  {t("admin_dashboard.quick_links.view_orders")}
                </Button>
              </Link>
              <Link href="/admin/banking-details">
                <Button className="w-full h-16 text-lg justify-start gap-4 bg-transparent" variant="outline">
                  <CreditCard size={24} />
                  {t("admin_dashboard.quick_links.banking_details")}
                </Button>
              </Link>
              {isSuperAdmin && (
                <>
                  <Link href="/admin/settings">
                    <Button className="w-full h-16 text-lg justify-start gap-4" variant="outline">
                      <Settings size={24} />
                      {t("admin_dashboard.quick_links.admin_settings")}
                    </Button>
                  </Link>
                  <UserManagementButton />
                </>
              )}
            </div>

            {/* Admin Actions */}
            {isSuperAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Link href="/admin/orders/new">
                  <Button className="w-full h-12 justify-start gap-2 bg-green-600 hover:bg-green-700">
                    <ShoppingCart size={18} />
                    {t("admin_dashboard.actions.create_order")}
                  </Button>
                </Link>
                <Link href="/admin/users/new">
                  <Button className="w-full h-12 justify-start gap-2 bg-blue-600 hover:bg-blue-700">
                    <UserCog size={18} />
                    {t("admin_dashboard.actions.create_user")}
                  </Button>
                </Link>
                <Link href="/admin/vendors/new">
                  <Button className="w-full h-12 justify-start gap-2 bg-purple-600 hover:bg-purple-700">
                    <Settings size={18} />
                    {t("admin_dashboard.actions.create_vendor")}
                  </Button>
                </Link>
              </div>
            )}

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin_dashboard.recent_orders")}</CardTitle>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <p className="text-slate-600">{t("admin_dashboard.no_orders")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold">{t("admin_dashboard.table.order_id")}</th>
                          <th className="text-left py-3 px-4 font-semibold">{t("admin_dashboard.table.date")}</th>
                          <th className="text-left py-3 px-4 font-semibold">{t("admin_dashboard.table.status")}</th>
                          <th className="text-left py-3 px-4 font-semibold">{t("admin_dashboard.table.payment")}</th>
                          <th className="text-right py-3 px-4 font-semibold">{t("admin_dashboard.table.amount")}</th>
                          <th className="text-center py-3 px-4 font-semibold">{t("admin_dashboard.table.action")}</th>
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
                                className={`px-3 py-1 rounded-full text-sm capitalize ${order.payment_status === "paid"
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
                                  {t("admin_dashboard.table.view")}
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
