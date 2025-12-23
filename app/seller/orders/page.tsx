import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"

export default async function SellerOrdersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get seller profile
  const { data: seller } = await supabase.from("sellers").select("*").eq("user_id", user.id).single()

  if (!seller) redirect("/seller/register")

  // Get orders containing seller's products
  const { data: orders } = await supabase
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
    .eq("order_items.product.seller_id", seller.id)
    .order("created_at", { ascending: false })

  return (
    <DashboardLayout role="vendor">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!orders || orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Items</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Payment</th>
                    <th className="text-right py-3 px-4 font-semibold">Total</th>
                    <th className="text-center py-3 px-4 font-semibold">Actions</th>
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
                        <td className="py-3 px-4">{sellerItems.length} item(s)</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 capitalize">
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs capitalize ${
                              order.payment_status === "paid"
                                ? "bg-green-100 text-green-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {order.payment_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">R{sellerTotal.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          <Link href={`/seller/orders/${order.id}`}>
                            <Button variant="outline" size="sm">
                              View
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
    </DashboardLayout>
  )
}
