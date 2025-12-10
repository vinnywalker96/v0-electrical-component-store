import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import type { CartItem } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      formData,
      cartItems,
      total,
      tax,
    }: {
      formData: {
        firstName: string
        lastName: string
        email: string
        phone: string
        shippingAddress: string
        shippingCity: string
        shippingZip: string
        billingAddress: string
        billingCity: string
        billingZip: string
        paymentMethod: string
      }
      cartItems: CartItem[]
      total: number
      tax: number
    } = await request.json()

    if (!formData || !cartItems || cartItems.length === 0 || total === undefined || tax === undefined) {
      return NextResponse.json({ error: "Missing required order data" }, { status: 400 })
    }

    // Server-side validation (basic example)
    if (total <= 0) {
      return NextResponse.json({ error: "Total amount must be greater than 0" }, { status: 400 })
    }
    // More comprehensive validation should be added here

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending", // Always pending initially
        payment_status: "unpaid", // Always unpaid initially
        total_amount: total,
        tax_amount: tax,
        shipping_address: `${formData.shippingAddress}, ${formData.shippingCity}, ${formData.shippingZip}`,
        billing_address: `${formData.billingAddress}, ${formData.billingCity}, ${formData.billingZip}`,
        payment_method: formData.paymentMethod,
      })
      .select()
      .single()

    if (orderError) {
      console.error("[v0] Order creation error:", orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    // Prepare order items for insertion
    const orderItemsToInsert = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.product?.price || 0, // Ensure product price is used
    }))

    const { error: itemsError } = await supabase.from("order_items").insert(orderItemsToInsert)

    if (itemsError) {
      console.error("[v0] Order items creation error:", itemsError)
      // Potentially roll back order creation here if order items fail
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // Return the created order ID
    return NextResponse.json({ success: true, orderId: order.id })
  } catch (error: any) {
    console.error("[v0] Error processing checkout:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
