"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, DollarSign, ShoppingCart, Star, Plus, Store } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/context/language-context"
import { useCurrency } from "@/lib/context/currency-context"

export default function SellerDashboardPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { t } = useLanguage()
  const { formatPrice } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    productCount: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    avgRating: 0,
  })
  const [seller, setSeller] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        // Get seller profile
        const { data: sellerData } = await supabase.from("sellers").select("*").eq("user_id", user.id).single()

        if (!sellerData) {
          router.push("/seller/register")
          return
        }
        setSeller(sellerData)

        // Get seller's products
        const { count: productCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("seller_id", sellerData.id)

        // Get seller's orders
        const { data: ordersData } = await supabase
          .from("orders")
          .select(`
            *,
            order_items!inner(
              *,
              product:products!inner(seller_id)
            )
          `)
          .eq("order_items.product.seller_id", sellerData.id)
          .order("created_at", { ascending: false })

        const currentOrders = ordersData || []
        setOrders(currentOrders)

        // Calculate stats
        const totalRevenue =
          currentOrders.reduce((sum, order) => {
            const sellerItems = order.order_items.filter((item: any) => item.product.seller_id === sellerData.id)
            return sum + sellerItems.reduce((itemSum: number, item: any) => itemSum + item.price * item.quantity, 0)
          }, 0) || 0

        const pendingOrders = currentOrders.filter((o) => o.status === "pending").length || 0
        const avgRating = sellerData.rating || 0

        setStats({
          productCount: productCount || 0,
          totalRevenue,
          pendingOrders,
          avgRating,
        })
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, router])

  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">{t("common.loading")}</div>
  }

  if (!seller) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t("vendor_dashboard.vendor_dashboard")}</h1>
          <p className="text-muted-foreground">{seller.store_name}</p>
        </div>
        <Link href="/seller/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t("vendor_dashboard.add_product")}
          </Button>
        </Link>
      </div>

      {seller.verification_status === "pending" && (
        <Card className="mb-6 border-orange-500 bg-orange-50">
          <CardContent className="pt-6">
            <p className="text-orange-900">
              {t("vendor_dashboard.pending_verification_message")}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("vendor_dashboard.total_products")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.productCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("vendor_dashboard.revenue")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("vendor_dashboard.pending_orders")}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.pendingOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("vendor_dashboard.average_rating")}</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("vendor_dashboard.quick_actions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/seller/products">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Package className="h-4 w-4 mr-2" />
                {t("vendor_dashboard.manage_products_btn")}
              </Button>
            </Link>
            <Link href="/seller/orders">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <ShoppingCart className="h-4 w-4 mr-2" />
                {t("vendor_dashboard.view_orders_btn")}
              </Button>
            </Link>
            <Link href="/seller/profile">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Store className="h-4 w-4 mr-2" />
                {t("vendor_dashboard.store_settings")}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("vendor_dashboard.recent_orders")}</CardTitle>
          </CardHeader>
          <CardContent>
            {orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{t("seller_orders.order_id")} #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">{t(`seller_orders.${order.status}`)}</p>
                    </div>
                    <Link href={`/seller/orders/${order.id}`}>
                      <Button variant="ghost" size="sm">
                        {t("vendor_dashboard.view_btn")}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t("vendor_dashboard.no_orders")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
