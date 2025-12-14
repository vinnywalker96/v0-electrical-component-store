import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod" // Assuming zod is used for validation
import { CheckoutFormSchema } from "@/lib/schemas" // Assuming this schema exists

// Define a schema for cart items to ensure data integrity
const CartItemSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  quantity: z.number().int().positive(),
  product: z.object({
    id: z.string(),
    price: z.number().positive(),
    seller_id: z.string(),
    commission_rate: z.number().min(0).max(1), // Assuming rate is 0-1 (e.g., 0.15 for 15%)
  }).partial().passthrough(), // Allow other product fields, but ensure these exist
});

const CreateOrderPayloadSchema = z.object({
  formData: CheckoutFormSchema,
  cartItems: z.array(CartItemSchema),
  total: z.number().positive(),
  tax: z.number().nonnegative(),
});

export async function POST(request: Request) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { formData, cartItems, total, tax } = CreateOrderPayloadSchema.parse(body)

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending", // Initial status
        total_amount: total,
        tax_amount: tax,
        shipping_address: `${formData.shippingAddress}, ${formData.shippingCity}, ${formData.shippingZip}`,
        billing_address: `${formData.billingAddress}, ${formData.billingCity}, ${formData.billingZip}`,
        payment_method: formData.paymentMethod,
        payment_status: "unpaid", // Initial payment status
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error("Error creating order:", orderError)
      return NextResponse.json({ error: orderError?.message || "Failed to create order" }, { status: 500 })
    }

    // Prepare order items with commission calculation
    const orderItemsToInsert = await Promise.all(cartItems.map(async (item) => {
      // Re-fetch product to ensure commission_rate is up-to-date and exists
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("price, commission_rate")
        .eq("id", item.product_id)
        .single()

      if (productError || !productData) {
        console.error(`Error fetching product ${item.product_id} for commission:`, productError)
        throw new Error(`Product ${item.product_id} not found or commission rate missing.`)
      }

      const unitPrice = productData.price // Use actual product price from DB
      const commissionRate = productData.commission_rate || 0.15 // Default to 15% if not set
      const commissionAmount = unitPrice * item.quantity * commissionRate

      return {
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        commission_amount: commissionAmount,
      }
    }))

    // Insert order items
    const { error: orderItemsError } = await supabase
      .from("order_items")
      .insert(orderItemsToInsert)

    if (orderItemsError) {
      console.error("Error creating order items:", orderItemsError)
      // Optionally, roll back the created order here
      return NextResponse.json({ error: orderItemsError.message || "Failed to create order items" }, { status: 500 })
    }

    return NextResponse.json({ orderId: order.id, message: "Order created successfully" })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 })
    }
    console.error("[v0] Create order error:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}