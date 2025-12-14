import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(request: Request) {
  const supabase = createClient()
  const { orderId, status } = await request.json()

  if (!orderId || !status) {
    return NextResponse.json({ error: "Order ID and status are required" }, { status: 400 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "vendor_admin" && profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Verify that the order contains products from this vendor
  const { data: orderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .select("product_id")
    .eq("order_id", orderId)

  if (orderItemsError || !orderItems || orderItems.length === 0) {
    return NextResponse.json({ error: "Order not found or no items associated." }, { status: 404 })
  }

  const productIds = orderItems.map((item) => item.product_id)

  const { data: vendorProducts, error: vendorProductsError } = await supabase
    .from("products")
    .select("id")
    .in("id", productIds)
    .eq("seller_id", user.id)

  if (vendorProductsError) {
    console.error("Error fetching vendor products for order:", vendorProductsError)
    return NextResponse.json({ error: vendorProductsError.message }, { status: 500 })
  }

  if (!vendorProducts || vendorProducts.length === 0) {
    return NextResponse.json({ error: "Forbidden: Order does not contain your products" }, { status: 403 })
  }

  // Perform the update
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select()
    .single()

  if (error) {
    console.error("Error updating order status:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
