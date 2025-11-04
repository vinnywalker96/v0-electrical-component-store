import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 })
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Get order items
    const { data: items } = await supabase.from("order_items").select("*, product:products(*)").eq("order_id", orderId)

    // TODO: Integrate with Stripe or PayFast for actual payment processing
    // For now, we'll simulate successful payment for cash/bank transfer methods

    if (order.payment_method === "cash_on_delivery" || order.payment_method === "bank_transfer") {
      // Update order status to processing
      const { error: updateError } = await supabase.from("orders").update({ status: "processing" }).eq("id", orderId)

      if (updateError) throw updateError

      return NextResponse.json({
        success: true,
        message: `Payment method: ${order.payment_method}. Order is being processed.`,
        order,
      })
    }

    // For card payments, would connect to Stripe API here
    return NextResponse.json(
      {
        success: false,
        message: "Card payment processing not yet implemented. Use Bank Transfer or Cash on Delivery.",
      },
      { status: 400 },
    )
  } catch (error: any) {
    console.error("[v0] Checkout error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
