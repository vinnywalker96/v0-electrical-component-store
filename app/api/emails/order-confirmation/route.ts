import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

function generateSimpleEmailHtml(data: {
  orderId: string
  firstName: string
  lastName: string
  total: number
  items: Array<{ name: string; quantity: number; price: number }>
  paymentMethod: string
  bankingDetails?: {
    bank_name: string
    account_name: string
    account_number: string
    branch_code: string
    reference: string
  } | null
}): string {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">R ${item.price.toFixed(2)}</td>
      </tr>
    `,
    )
    .join("")

  const bankingHtml = data.bankingDetails
    ? `
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #333;">Banking Details for Payment</h3>
      <p style="margin: 5px 0;"><strong>Bank:</strong> ${data.bankingDetails.bank_name}</p>
      <p style="margin: 5px 0;"><strong>Account Name:</strong> ${data.bankingDetails.account_name}</p>
      <p style="margin: 5px 0;"><strong>Account Number:</strong> ${data.bankingDetails.account_number}</p>
      <p style="margin: 5px 0;"><strong>Branch Code:</strong> ${data.bankingDetails.branch_code}</p>
      <p style="margin: 5px 0;"><strong>Reference:</strong> ${data.orderId}</p>
      <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">
        Please use your order number as the payment reference.
      </p>
    </div>
  `
    : ""

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">KG Compponents</h1>
        <p style="margin: 10px 0 0 0;">Order Confirmation</p>
      </div>
      
      <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-top: none;">
        <h2 style="color: #0066cc;">Thank you for your order, ${data.firstName}!</h2>
        
        <p><strong>Order Number:</strong> ${data.orderId}</p>
        <p><strong>Payment Method:</strong> ${data.paymentMethod === "bank_transfer" ? "Bank Transfer (EFT)" : "Cash on Delivery"}</p>
        
        ${bankingHtml}
        
        <h3 style="border-bottom: 2px solid #0066cc; padding-bottom: 10px;">Order Summary</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left;">Product</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 15px 10px; text-align: right; font-weight: bold;">Total:</td>
              <td style="padding: 15px 10px; text-align: right; font-weight: bold; color: #0066cc;">R ${data.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
          If you have any questions about your order, please contact us.
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} KG Compponents. All rights reserved.</p>
      </div>
    </body>
    </html>
  `
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, firstName, lastName, email, total, items, paymentMethod } = body

    if (!email || !orderId) {
      return NextResponse.json({ error: "Email and orderId are required" }, { status: 400 })
    }

    let bankingDetails = null
    if (paymentMethod === "bank_transfer") {
      const { data } = await supabase.from("banking_details").select("*").limit(1).single()
      bankingDetails = data
    }

    // Generate HTML email content with banking details
    const htmlContent = generateSimpleEmailHtml({
      orderId,
      firstName,
      lastName,
      total,
      items,
      paymentMethod,
      bankingDetails,
    })

    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      try {
        // Dynamic import to avoid build-time instantiation
        const resendModule = await import("resend")
        const resend = new resendModule.Resend(apiKey)

        const response = await resend.emails.send({
          from: "orders@kg-compponents.com",
          to: email,
          subject: `Order Confirmation - ${orderId}`,
          html: htmlContent,
        })

        if (response.error) {
          console.log("Email send warning:", response.error.message)
        }
      } catch (emailError) {
        console.log("Email send skipped:", emailError)
      }
    } else {
      console.log("Order created but email not sent (RESEND_API_KEY not configured)")
    }

    return NextResponse.json({
      success: true,
      message: "Order confirmation received",
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to process order"
    console.error("Email service error:", error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
