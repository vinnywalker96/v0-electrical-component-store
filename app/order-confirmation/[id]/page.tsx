"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Order, OrderItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import { useCurrency } from "@/lib/context/currency-context"
import { useLanguage } from "@/lib/context/language-context"

export default function OrderConfirmationPage() {
  const params = useParams()
  const orderId = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const { formatPrice } = useCurrency()
  const { t } = useLanguage()

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const supabase = createClient()

        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single()

        if (orderError) throw orderError

        const { data: itemsData, error: itemsError } = await supabase
          .from("order_items")
          .select("*, product:products(*)")
          .eq("order_id", orderId)

        if (itemsError) throw itemsError

        setOrder(orderData)
        setOrderItems(itemsData || [])
      } catch (error) {
        console.error("[v0] Error fetching order:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  if (loading) {
    return <div className="text-center py-12">{t("order_confirmation_page.loading_order_details")}</div>
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600">{t("order_confirmation_page.order_not_found")}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Success Message */}
        <div className="text-center mb-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-foreground mb-2">{t("order_confirmation_page.order_confirmed")}</h1>
          <p className="text-lg text-slate-600">{t("order_confirmation_page.thank_you_for_purchase")}</p>
        </div>

        {/* Order Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("order_confirmation_page.order_information")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{t("order_confirmation_page.order_number")}</p>
                  <p className="font-mono font-semibold">{order.id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">{t("order_confirmation_page.order_date")}</p>
                  <p className="font-semibold">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">{t("order_confirmation_page.status")}</p>
                  <p className="font-semibold capitalize px-3 py-1 bg-blue-100 text-blue-800 rounded inline-block">
                    {order.status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">{t("order_confirmation_page.payment_method")}</p>
                  <p className="font-semibold capitalize">{order.payment_method.replace(/_/g, " ")}</p>
                </div>
              </div>

              <div>
                                  <p className="text-sm text-slate-600 mb-1">{t("order_confirmation_page.shipping_address")}</p>                <p className="font-semibold">{order.shipping_address}</p>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>{t("order_confirmation_page.order_items")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between pb-3 border-b last:border-0">
                    <div>
                      <p className="font-semibold">{item.product?.name}</p>
                      <p className="text-sm text-slate-600">{t("order_confirmation_page.qty")} {item.quantity}</p>
                    </div>
                    <p className="font-semibold">{formatPrice(item.unit_price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{t("order_confirmation_page.subtotal")}</span>
                  <span>{formatPrice(order.total_amount - order.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{t("order_confirmation_page.tax")}</span>
                  <span>{formatPrice(order.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>{t("order_confirmation_page.total")}</span>
                  <span className="text-blue-600">{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <p className="text-sm text-slate-700 mb-4">
                {t("order_confirmation_page.confirmation_email_sent")}
              </p>
              <div className="flex gap-4">
                <Link href="/protected/orders">
                  <Button variant="outline">{t("order_confirmation_page.view_all_orders")}</Button>
                </Link>
                <Link href="/shop">
                  <Button>{t("order_confirmation_page.continue_shopping")}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
