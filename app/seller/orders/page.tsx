"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, ArrowLeft } from "lucide-react"
import { useLanguage } from "@/lib/context/language-context"
import { useCurrency } from "@/lib/context/currency-context"

export default function SellerOrdersPage() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()
  const { formatPrice } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [seller, setSeller] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
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

      // Get orders containing seller's products
      const { data: ordersData } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_items!inner(
            *,
            product:products!inner(seller_id, name)
          )
        `,
        )
        .eq("order_items.product.seller_id", sellerData.id)
        .order("created_at", { ascending: false })

      setOrders(ordersData || [])
      setLoading(false)
    }

    fetchData()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {t("common.loading")}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/seller/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
        <ArrowLeft size={20} />
        {t("seller_orders.back_to_dashboard")}
      </Link>

      <h1 className="text-3xl font-bold mb-2">{t("seller_orders.title")}</h1>
      <p className="text-muted-foreground mb-8">{t("seller_orders.subtitle")}</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("seller_orders.order_list")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!orders || orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("seller_orders.no_orders")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">{t("seller_orders.order_id")}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t("seller_orders.date")}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t("seller_orders.items")}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t("seller_orders.status")}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t("seller_orders.payment")}</th>
                    <th className="text-right py-3 px-4 font-semibold">{t("seller_orders.total")}</th>
                    <th className="text-center py-3 px-4 font-semibold">{t("seller_orders.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    // Calculate seller's items and total
                    const sellerItems = order.order_items.filter((item: any) => item.product.seller_id === seller.id)
                    const sellerTotal = sellerItems.reduce(
                      (sum: number, item: any) => sum + item.unit_price * item.quantity,
                      0,
                    )

                    return (
                      <tr key={order.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-sm">{order.id.slice(0, 8)}</td>
                        <td className="py-3 px-4">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          {t("seller_orders.item_count", { count: sellerItems.length.toString() })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 capitalize">
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs capitalize ${order.payment_status === "paid"
                              ? "bg-green-100 text-green-800"
                              : "bg-orange-100 text-orange-800"
                              }`}
                          >
                            {order.payment_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">{formatPrice(sellerTotal)}</td>
                        <td className="py-3 px-4 text-center">
                          <Link href={`/seller/orders/${order.id}`}>
                            <Button variant="outline" size="sm">
                              {t("seller_orders.view")}
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
