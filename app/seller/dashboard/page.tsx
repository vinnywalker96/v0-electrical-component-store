import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, DollarSign, ShoppingCart, Star } from "lucide-react"
import Link from "next/link"
import DashboardLayout from "@/components/dashboard-layout"

export default async function SellerDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get seller profile
  const { data: seller } = await supabase.from("sellers").select("*").eq("user_id", user.id).single()

  if (!seller) redirect("/seller/register")

  // Get seller's products
  const { data: products, count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("seller_id", seller.id)

  // Get seller's orders
  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items!inner(
        *,
        product:products!inner(seller_id)
      )
    `
    )
    .eq("order_items.product.seller_id", seller.id)

  // Calculate stats
  const totalRevenue =
    orders?.reduce((sum, order) => {
      const sellerItems = order.order_items.filter((item: any) => item.product.seller_id === seller.id)
      return sum + sellerItems.reduce((itemSum: number, item: any) => itemSum + item.price * item.quantity, 0)
    }, 0) || 0

  const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0
  const avgRating = seller.rating || 0

  return (
    <DashboardLayout role="vendor">
      {seller.verification_status === "pending" && (
        <Card className="mb-6 border-orange-500 bg-orange-50">
          <CardContent className="pt-6">
            <p className="text-orange-900">
              Your seller account is pending verification. You can add products but they won't be visible to customers
              until approved.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R {totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">{order.status}</p>
                  </div>
                  <Link href={`/seller/orders/${order.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No orders yet</p>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
