"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Order, Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { ArrowLeft } from "lucide-react"

interface VendorOrder extends Order {
  order_items: Array<{ product: Product | null }>
}

export default function VendorOrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchVendorOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("User not authenticated.")
        return
      }

      const { data: vendorProducts, error: productsError } = await supabase
        .from("products")
        .select("id")
        .eq("seller_id", user.id)
      
      if (productsError) throw productsError

      const productIds = vendorProducts?.map(p => p.id) || []

      if (productIds.length === 0) {
        setOrders([])
        setLoading(false)
        return
      }

      const { data: orderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select("order_id, product:products(id, name, seller_id)")
        .in("product_id", productIds)
      
      if (orderItemsError) throw orderItemsError

      const uniqueOrderIds = [...new Set(orderItems?.map(oi => oi.order_id))]

      if (uniqueOrderIds.length === 0) {
        setOrders([])
        setLoading(false)
        return
      }

      const { data: fetchedOrders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .in("id", uniqueOrderIds)
        .order("created_at", { ascending: false })
      
      if (ordersError) throw ordersError

      // Attach relevant order items for display
      const ordersWithItems = fetchedOrders?.map(order => ({
        ...order,
        order_items: orderItems?.filter(oi => oi.order_id === order.id) || []
      })) as VendorOrder[] || [];

      setOrders(ordersWithItems)
    } catch (err: any) {
      console.error("Error fetching vendor orders:", err)
      setError(err.message)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    fetchVendorOrders()
  }, [fetchVendorOrders])

  if (loading) {
    return <div className="text-center py-12">Loading orders...</div>
  }

  if (error) {
    return <div className="text-center py-12 text-destructive">Error: {error}</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/protected/vendor/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <p className="text-foreground">No orders found for your products.</p>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <CardTitle>Order ID: {order.id.slice(0, 8)}</CardTitle>
                  <p className="text-sm text-muted-foreground">Placed on: {format(new Date(order.created_at), "PPP")}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    <span className="font-semibold">Total Amount:</span> R{order.total_amount.toFixed(2)}
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span>{" "}
                    <span className={`capitalize font-semibold ${order.status === "completed" ? "text-green-600" : order.status === "pending" ? "text-orange-600" : "text-red-600"}`}>
                      {order.status}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold">Payment Status:</span>{" "}
                    <span className={`capitalize font-semibold ${order.payment_status === "paid" ? "text-green-600" : "text-red-600"}`}>
                      {order.payment_status}
                    </span>
                  </p>
                  
                  <div>
                    <h3 className="font-semibold mt-4 mb-2">Products in this Order:</h3>
                    <ul className="list-disc pl-5">
                      {order.order_items.map((item, index) => (
                        <li key={index}>
                          {item.product?.name} (Seller ID: {item.product?.seller_id})
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Link href={`/protected/vendor/orders/${order.id}`}>
                      <Button variant="outline" size="sm">
                        View Order Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}