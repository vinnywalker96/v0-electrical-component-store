"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Package, Truck, CheckCircle, MapPin, Clock } from "lucide-react"

const ORDER_STATUSES = [
  { key: "pending", label: "Order Placed", icon: Package },
  { key: "processing", label: "Processing", icon: Clock },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
]

import { useCurrency } from "@/lib/context/currency-context"

export default function TrackOrderPage() {
  const params = useParams()
  const orderId = params.id as string
  const [order, setOrder] = useState<any>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { formatPrice } = useCurrency()

  const fetchOrder = useCallback(async () => {
    try {
      const { data: orderData } = await supabase.from("orders").select("*").eq("id", orderId).single()

      const { data: itemsData } = await supabase
        .from("order_items")
        .select("*, product:products(*, seller:sellers(store_name))")
        .eq("order_id", orderId)

      setOrder(orderData)
      setOrderItems(itemsData || [])
    } catch (error) {
      console.error("Error fetching order:", error)
    } finally {
      setLoading(false)
    }
  }, [orderId, supabase])

  useEffect(() => {
    fetchOrder()

    // Subscribe to real-time updates
    const channel = supabase
      .channel("order-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder(payload.new)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId, fetchOrder, supabase])

  if (loading) {
    return <div className="text-center py-12">Loading tracking information...</div>
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <Link href="/shop" className="text-primary hover:underline">
          Back to Shop
        </Link>
      </div>
    )
  }

  const currentStatusIndex = ORDER_STATUSES.findIndex((s) => s.key === order.status)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        href="/protected/orders"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
      <p className="text-muted-foreground mb-8">Order #{orderId.slice(0, 8)}</p>

      {/* Order Status Timeline */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="flex justify-between items-center">
              {ORDER_STATUSES.map((status, index) => {
                const Icon = status.icon
                const isCompleted = index <= currentStatusIndex
                const isCurrent = index === currentStatusIndex

                return (
                  <div key={status.key} className="flex-1 relative">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <p
                        className={`text-sm font-medium text-center ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {status.label}
                      </p>
                    </div>
                    {index < ORDER_STATUSES.length - 1 && (
                      <div
                        className={`absolute top-6 left-[50%] w-full h-0.5 ${index < currentStatusIndex ? "bg-primary" : "bg-muted"
                          }`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Latest Update</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Your order is currently <span className="font-semibold capitalize">{order.status}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(order.updated_at).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Order Details */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p className="font-semibold">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Status</p>
              <p className="font-semibold capitalize">{order.payment_status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-semibold capitalize">{order.payment_method?.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-semibold">{formatPrice(order.total_amount || 0)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Delivery Address</p>
            <div className="flex items-start gap-2 p-3 bg-muted rounded">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-sm">{order.shipping_address}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items in this order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orderItems.map((item) => (
              <div key={item.id} className="flex justify-between items-start pb-4 border-b last:border-0">
                <div className="flex-1">
                  <p className="font-semibold">{item.product?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Sold by: {item.product?.seller?.store_name || "KG Compponents"}
                  </p>
                  <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                </div>
                <p className="font-semibold">{formatPrice(item.unit_price * item.quantity)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {order.status === "delivered" && (
        <Card className="mt-6 bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="font-semibold text-green-900">Order Delivered Successfully!</p>
            </div>
            <p className="text-sm text-green-800">
              Thank you for shopping with KG Compponents. We hope to serve you again soon!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
