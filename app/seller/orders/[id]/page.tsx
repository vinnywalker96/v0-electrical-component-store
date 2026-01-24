import { redirect, notFound } from "next/navigation"
import { ArrowLeft, MapPin, User, Phone, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { OrderStatusUpdater } from "@/components/order-status-updater"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { SetOrderPaidButton } from "@/components/set-order-paid-button" // Import SetOrderPaidButton

export default async function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get seller profile
  const { data: seller } = await supabase.from("sellers").select("*").eq("user_id", user.id).single()

  if (!seller) redirect("/seller/register")

  // Get order with items
  const { data: order } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items(
        *,
        product:products(*, seller:sellers(*))
      ),
      user:user_profiles!orders_user_id_fkey(*)
    `,
    )
    .eq("id", id)
    .single()

  if (!order) notFound()

  // Filter items that belong to this seller
  const sellerItems = order.order_items.filter((item: any) => item.product.seller_id === seller.id)

  if (sellerItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>You don&apos;t have any items in this order</p>
      </div>
    )
  }

  const sellerTotal = sellerItems.reduce((sum: number, item: any) => sum + item.unit_price * item.quantity, 0)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        href="/seller/orders"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      <h1 className="text-3xl font-bold mb-2">Order Details</h1>
      <p className="text-muted-foreground mb-8">Order #{id.slice(0, 8)}</p>

      {/* Order Status Management */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderStatusUpdater orderId={id} currentStatus={order.status} currentPaymentStatus={order.payment_status} />
          <div className="mt-4">
            <SetOrderPaidButton orderId={order.id} currentPaymentStatus={order.payment_status} />
          </div>
        </CardContent>
      </Card>

      {/* Customer Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm">
              {order.user?.first_name} {order.user?.last_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm">{order.user?.email}</p>
          </div>
          {order.user?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{order.user.phone}</p>
            </div>
          )}
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-semibold mb-1">Delivery Address:</p>
              <p className="text-sm text-muted-foreground">{order.shipping_address}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Items in this Order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sellerItems.map((item: any) => (
              <div key={item.id} className="flex justify-between items-start pb-4 border-b last:border-0">
                <div>
                  <p className="font-semibold">{item.product.name}</p>
                  <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  <p className="text-sm text-muted-foreground">Unit Price: R{item.unit_price.toFixed(2)}</p>
                </div>
                <p className="font-semibold">R{(item.unit_price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between font-bold text-lg">
              <span>Your Total</span>
              <span className="text-primary">R{sellerTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-semibold capitalize">{order.payment_method?.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Status</p>
              <p
                className={`font-semibold capitalize ${
                  order.payment_status === "paid" ? "text-green-600" : "text-orange-600"
                }`}
              >
                {order.payment_status}
              </p>
            </div>
          </div>

          {order.payment_method === "cash_on_delivery" && order.payment_status === "unpaid" && (
            <div className="mt-4 p-4 bg-orange-50 rounded text-sm text-orange-900">
              <p className="font-semibold mb-1">Cash on Delivery</p>
              <p>Customer will pay upon delivery. Please ensure to collect payment when delivering the order.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
