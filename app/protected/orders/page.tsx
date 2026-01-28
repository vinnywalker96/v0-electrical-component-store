"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Order, OrderItem } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useLanguage } from "@/lib/context/language-context"

interface OrderWithItems extends Order {
  items: OrderItem[]
}

export default function OrdersPage() {
  const supabase = createClient()
  const { t } = useLanguage()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data: ordersData } = await supabase
            .from("orders")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })

          const ordersWithItems = await Promise.all(
            (ordersData || []).map(async (order) => {
              const { data: itemsData } = await supabase
                .from("order_items")
                .select("*, product:products(*)")
                .eq("order_id", order.id)

              return {
                ...order,
                items: itemsData || [],
              }
            }),
          )

          setOrders(ordersWithItems)
        }
      } catch (error) {
        console.error("[v0] Error fetching orders:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [supabase])

  if (loading) {
    return <div className="text-center py-12">{t("common.loading")}</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/protected/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          {t("common.back")}
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">{t("navigation.orders")}</h1>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600 mb-4">{t("admin_dashboard.no_orders")}</p>
              <Link href="/shop">
                <Button>{t("user_dashboard.start_shopping")}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-mono text-lg">{t("seller_orders.order_hash")}{order.id.slice(0, 8)}</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm capitalize font-medium">
                      {t(`seller_orders.${order.status}`)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">{t("checkout.payment_method")}</p>
                      <p className="font-semibold capitalize">{order.payment_method.replace(/_/g, " ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600 mb-1">{t("orders.total")}</p>
                      <p className="font-bold text-lg text-blue-600">R{order.total_amount.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold text-slate-600 mb-3">{t("order_confirmation_page.order_items")} ({order.items.length})</p>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.product?.name || "Product"}</span>
                          <span className="text-slate-600">
                            x{item.quantity} @ R{item.unit_price.toFixed(2)} = R
                            {(item.quantity * item.unit_price).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Link href={`/order-confirmation/${order.id}`}>
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      {t("admin_dashboard.table.view")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
