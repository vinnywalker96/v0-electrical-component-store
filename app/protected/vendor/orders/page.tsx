"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Order, OrderItem, Product, UserProfile } from "@/lib/types" // Import UserProfile
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

// Extend Order interface for nested order_items
interface VendorOrder extends Order {
  order_items: (OrderItem & { product: Product })[];
}

export default function VendorOrdersPage() {
  const supabase = createClient()
  const [vendorOrders, setVendorOrders] = useState<VendorOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentVendorId, setCurrentVendorId] = useState<string | null>(null)

  const fetchVendorOrders = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("User not authenticated.")
      }
      setCurrentVendorId(user.id)

      // Fetch orders where the vendor has products
      // RLS will ensure only relevant orders are returned
      const { data: orders, error: ordersError } = (await supabase
        .from("orders")
        .select(
          `
            *,
            order_items (
              *,
              product:products (
                id,
                name,
                seller_id // Include seller_id to filter by it on client
              )
            )
          `
        )
        .order("created_at", { ascending: false })) as { data: VendorOrder[] | null; error: any };

      if (ordersError) throw ordersError

      // Filter order_items to only include those from the current vendor
      const filteredOrders = (orders || []).map(order => ({
        ...order,
        order_items: order.order_items.filter((item: OrderItem & { product: Product | null }) => item.product?.seller_id === user.id)
      })).filter(order => order.order_items.length > 0) || []; // Only include orders that still have items after filtering

      setVendorOrders(filteredOrders as VendorOrder[])
    } catch (error: any) {
      console.error("[v0] Error fetching vendor orders:", error)
      setError(error.message || "Failed to fetch orders")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchVendorOrders()
  }, [fetchVendorOrders])

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-xl text-foreground">Loading orders...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/protected/vendor/products" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to My Products
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">My Orders</h1>

        <Card>
          <CardContent className="pt-6">
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

            {vendorOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 mb-4">No orders found for your products.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {vendorOrders.map((order) => (
                  <Card key={order.id} className="border-border">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Order #{order.id.substring(0, 8)}</h2>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            order.status === "processing" ? "bg-blue-100 text-blue-800" :
                            order.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                            order.status === "shipped" ? "bg-purple-100 text-purple-800" :
                            order.status === "delivered" ? "bg-green-100 text-green-800" :
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">Total: ${order.total_amount.toFixed(2)}</p>
                      <p className="text-sm text-slate-600 mb-4">Payment Status: {order.payment_status}</p>

                      <h3 className="text-lg font-semibold mb-2">Items from your shop:</h3>
                      <ul className="space-y-2">
                        {order.order_items.map((item) => (
                          <li key={item.id} className="text-sm flex justify-between items-center">
                            <span>
                              {item.product?.name} x {item.quantity}
                            </span>
                            <span>${(item.quantity * item.unit_price).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                      {/* You can add more order details here if needed, like shipping address for this order */}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
