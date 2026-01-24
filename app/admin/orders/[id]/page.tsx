import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import {
  ArrowLeft,
  DollarSign,
  Mail,
  Phone,
  CalendarDays,
  Receipt
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SetOrderPaidButton } from "@/components/set-order-paid-button"

export default async function AdminOrderDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = await paramsPromise;
  const { id } = params;
  const supabase = createClient()

  /* ---------------- AUTH ---------------- */
  const {
    data: { user },
  } = await (await supabase).auth.getUser()

  if (!user) {
    return redirect("/auth/login")
  }

  const { data: profile } = await (await supabase)
    .from("profiles")
    .select("role")
    .eq("id", user.id) // ✅ correct: profiles table uses 'id' as PK which matches user.id
    .single()

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return redirect("/protected/dashboard")
  }

  /* ---------------- ORDER ---------------- */
  const { data: order, error } = await (await supabase)
    .from("orders")
    .select(`
      *,
      order_items (
        *,
        product:products (
          name,
          sku,
          image_url
        )
      ),
      user:profiles!user_id(first_name, last_name, email, phone),
      seller:sellers(store_name, contact_email)
    `)
    .eq("id", params.id)
    .single()

  if (error || !order) {
    console.error("Error fetching order:", error?.message || error)
    notFound()
  }

  /* ---------------- UI ---------------- */
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">

        <Link
          href="/admin/orders"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8"
        >
          <ArrowLeft size={20} />
          Back to All Orders
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">
            Order #{order.id.slice(0, 8)}
          </h1>

          <div className="flex gap-2">
            <Badge className="text-lg px-3 py-1">
              {order.status}
            </Badge>
            <Badge
              variant={order.payment_status === "paid" ? "default" : "destructive"}
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
            <CardDescription>
              Manage payment and order status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SetOrderPaidButton
              orderId={order.id}
              currentPaymentStatus={order.payment_status}
            />
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p className="flex items-center gap-2">
                <CalendarDays size={16} />
                {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="flex items-center gap-2 font-semibold">
                <DollarSign size={16} />
                R{order.total_amount.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Payment</p>
              <p className="capitalize flex items-center gap-2">
                <Receipt size={16} />
                {order.payment_method.replace(/_/g, " ")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        {order.user && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">
                  {order.user.first_name} {order.user.last_name}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="flex items-center gap-2">
                  <Mail size={16} />
                  {order.user.email}
                </p>
              </div>

              {order.user.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="flex items-center gap-2">
                    <Phone size={16} />
                    {order.user.phone}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.order_items?.map((item: any) => (
              <div
                key={item.id}
                className="flex justify-between items-center border p-3 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {item.product?.image_url && (
                    <Image
                      src={item.product.image_url}
                      alt={item.product.name}
                      width={48}
                      height={48}
                      className="rounded"
                    />
                  )}
                  <div>
                    <p className="font-semibold">{item.product?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {item.product?.sku}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-medium">
                    R{(item.unit_price * item.quantity).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
