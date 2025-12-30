"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAppDispatch } from "@/lib/store/hooks"
import { setVendorData } from "@/lib/store/slices/vendorSlice"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, LayoutDashboard, Settings, Package, DollarSign, ShoppingCart, TrendingUp } from "lucide-react"
import { useCurrency } from "@/lib/context/currency-context"
import { useLanguage } from "@/lib/context/language-context"

export default function VendorDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const dispatch = useAppDispatch()
  const [loading, setLoading] = useState(true)
  const [seller, setSeller] = useState<any>(null)
  const { formatPrice } = useCurrency()
  const { t } = useLanguage()
  const [stats, setStats] = useState({
    productCount: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    totalCommission: 0,
  })

  const fetchVendorData = useCallback(async () => {
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
  }, [dispatch, router, supabase, setSeller, setStats])

  useEffect(() => {
    fetchVendorData()
  }, [fetchVendorData])

  if (loading) {
    return <div className="text-center py-12">{t("vendor_dashboard.loading_vendor_dashboard")}</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">{t("vendor_dashboard.vendor_dashboard")}</h1>
          <p className="text-slate-600 mt-1">{seller?.store_name}</p>
        </div>
        <Link href="/seller/products/new">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("vendor_dashboard.add_product")}
                      </Button>        </Link>
      </div>

      {!seller?.is_verified && (
        <Card className="mb-6 border-orange-500 bg-orange-50">
          <CardContent className="pt-6">
            <p className="text-orange-900">
              {t("vendor_dashboard.pending_verification_message")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("vendor_dashboard.products")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.productCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("vendor_dashboard.revenue")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                            <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("vendor_dashboard.pending_orders")}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("vendor_dashboard.commission")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                            <div className="text-2xl font-bold">{formatPrice(stats.totalCommission)}</div>            <p className="text-xs text-muted-foreground mt-1">
              {t("vendor_dashboard.pending_commission")} {formatPrice(seller?.pending_commission || 0)}
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
                {t("vendor_dashboard.manage_products")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{t("vendor_dashboard.add_edit_remove_products")}</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/seller/orders">
          <Card className="hover:bg-slate-50 cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {t("vendor_dashboard.view_orders")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{t("vendor_dashboard.track_manage_customer_orders")}</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/vendor/commissions">
          <Card className="hover:bg-slate-50 cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t("vendor_dashboard.commission_history")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{t("vendor_dashboard.view_earnings_payouts")}</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
