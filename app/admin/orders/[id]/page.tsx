import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft, CheckCircle2, XCircle, Package, ShoppingBag, DollarSign, User, Mail, Phone, MapPin, CalendarDays, Receipt } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SetOrderPaidButton } from "@/components/set-order-paid-button"

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const supabase = createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()
  if (!currentUser) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", currentUser.id).single()
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    redirect("/protected/dashboard")
  }

  // Fetch detailed order data
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items (
        *,
        product:products (
          name,
          sku,
          image_url
        )
      ),
      user_id:profiles(first_name, last_name, email, phone),
      seller_id:sellers(store_name, contact_email)
      `
    )
    .eq("id", id)
    .single()

  if (orderError || !order) {
    console.error("Error fetching order:", orderError);
    notFound()
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/admin/orders" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to All Orders
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">Order #{order.id.slice(0, 8)}</h1>
          <div className="flex gap-2">
            <Badge
              variant={
                order.status === "delivered"
                  ? "default"
                  : order.status === "pending"
                    ? "secondary"
                    : "outline"
              }
              className="text-lg px-3 py-1"
            >
              {order.status}
            </Badge>
            <Badge
              variant={
                order.payment_status === "paid"
                  ? "default"
                  : order.payment_status === "unpaid"
                    ? "destructive"
                    : "secondary"
              }
              className="text-lg px-3 py-1"
            >
              {order.payment_status}
            </Badge>
          </div>
        </div>

        {/* Order Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Order Actions</CardTitle>
            <CardDescription>Manage the status and payment of this order.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <SetOrderPaidButton orderId={order.id} currentPaymentStatus={order.payment_status} />
            {/* Other order status update buttons can go here */}
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Order Date</p>
              <p className="text-lg flex items-center gap-2"><CalendarDays size={16} />{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
              <p className="text-lg font-semibold flex items-center gap-2"><DollarSign size={16} />R{order.total_amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
              <p className="text-lg capitalize flex items-center gap-2"><Receipt size={16} />{order.payment_method.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Order Status</p>
              <Badge
                variant={
                  order.status === "delivered"
                    ? "default"
                    : order.status === "pending"
                      ? "secondary"
                      : "outline"
                }
                className="text-base px-3 py-1"
              >
                {order.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
              <Badge
                variant={
                  order.payment_status === "paid"
                    ? "default"
                    : order.payment_status === "unpaid"
                      ? "destructive"
                      : "secondary"
                }
                className="text-base px-3 py-1"
              >
                {order.payment_status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        {order.user_id && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-lg font-semibold">{order.user_id.first_name} {order.user_id.last_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-lg flex items-center gap-2"><Mail size={16} />{order.user_id.email}</p>
              </div>
              {order.user_id.phone && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-lg flex items-center gap-2"><Phone size={16} />{order.user_id.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Shipping & Billing Addresses */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{order.shipping_address}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{order.billing_address}</p>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            {order.order_items && order.order_items.length > 0 ? (
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {item.product?.image_url && (
                        <Image src={item.product.image_url} alt={item.product.name} width={48} height={48} className="w-12 h-12 object-cover rounded" />
                      )}
                      <div>
                        <p className="font-semibold">{item.product?.name || "Product"}</p>
                        <p className="text-sm text-muted-foreground">SKU: {item.product?.sku || "N/A"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R{(item.unit_price * item.quantity).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No items in this order.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
