"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAppDispatch } from "@/lib/store/hooks"
import { setVendorData } from "@/lib/store/slices/vendorSlice"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, DollarSign, ShoppingCart, TrendingUp, Plus, LayoutDashboard, Settings } from "lucide-react"

export default function VendorDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const dispatch = useAppDispatch()
  const [loading, setLoading] = useState(true)
  const [seller, setSeller] = useState<any>(null)
  const [stats, setStats] = useState({
    productCount: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    totalCommission: 0,
  })

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/vendor/login")
          return
        }

        // Get seller profile
        const { data: sellerData } = await supabase.from("sellers").select("*").eq("user_id", user.id).single()

        if (!sellerData) {
          router.push("/seller/register")
          return
        }

        setSeller(sellerData)

        // Update Redux store with vendor data
        dispatch(
          setVendorData({
            sellerId: sellerData.id,
            storeName: sellerData.store_name,
            commissionRate: sellerData.commission_rate || 15,
            totalCommissionEarned: sellerData.total_commission_earned || 0,
            pendingCommission: sellerData.pending_commission || 0,
            totalSales: sellerData.total_sales || 0,
            isVerified: sellerData.is_verified || false,
          }),
        )

        // Get products count
        const { count: productCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("seller_id", sellerData.id)

        // Get orders
        const { data: orders } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("seller_id", sellerData.id)

        const totalRevenue =
          orders?.reduce((sum, order) => (order.payment_status === "paid" ? sum + order.total_amount : sum), 0) || 0
        const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0

        // Calculate total commission from order items
        const totalCommission =
          orders?.reduce((sum, order) => {
            const orderCommission = order.order_items?.reduce(
              (itemSum: number, item: any) => itemSum + (item.commission_amount || 0),
              0,
            )
            return sum + orderCommission
          }, 0) || 0

        setStats({
          productCount: productCount || 0,
          totalRevenue,
          pendingOrders,
          totalCommission,
        })
      } catch (error) {
        console.error("[v0] Error fetching vendor data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchVendorData()
  }, [])

  if (loading) {
    return <div className="text-center py-12">Loading vendor dashboard...</div>
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 fixed h-screen">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-8">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">⚡</div>
            <span>KG Compponents</span>
          </Link>

          <nav className="space-y-1">
            <Link
              href="/vendor/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary font-medium"
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </Link>
            <Link
              href="/seller/products"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700"
            >
              <Package className="w-5 h-5" />
              Products
            </Link>
            <Link
              href="/seller/orders"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700"
            >
              <ShoppingCart className="w-5 h-5" />
              Orders
            </Link>
            <Link
              href="/vendor/commissions"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700"
            >
              <TrendingUp className="w-5 h-5" />
              Commissions
            </Link>
            <Link
              href="/protected/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700"
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </nav>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Vendor Dashboard</h1>
              <p className="text-slate-600 mt-1">{seller?.store_name}</p>
            </div>
            <Link href="/seller/products/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </Link>
          </div>

          {!seller?.is_verified && (
            <Card className="mb-6 border-orange-500 bg-orange-50">
              <CardContent className="pt-6">
                <p className="text-orange-900">
                  Your vendor account is pending verification. Products won't be visible until approved by admin.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.productCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R{stats.totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commission (15%)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R{stats.totalCommission.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pending: R{(seller?.pending_commission || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/seller/products">
              <Card className="hover:bg-slate-50 cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Manage Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">Add, edit, or remove your products</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/seller/orders">
              <Card className="hover:bg-slate-50 cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    View Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">Track and manage customer orders</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/vendor/commissions">
              <Card className="hover:bg-slate-50 cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Commission History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">View your earnings and payouts</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
