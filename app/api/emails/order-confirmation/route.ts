import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { generateOrderConfirmationEmail } from "@/lib/email-service"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

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
    const htmlContent = generateOrderConfirmationEmail(
      {
        orderId,
        firstName,
        lastName,
        email,
        total,
        items,
        paymentMethod,
        bankingDetails,
      },
      "en",
    )

    const response = await resend.emails.send({
      from: "orders@electroniccomponents.com",
      to: email,
      subject: `Order Confirmation - ${orderId}`,
      html: htmlContent,
    })

    if (response.error) {
      throw new Error(response.error.message || "Failed to send email")
    }

    console.log("[v0] Order confirmation email sent successfully to:", email)

    return NextResponse.json({
      success: true,
      message: "Order confirmation email sent successfully",
    })
  } catch (error: any) {
    console.error("[v0] Email service error:", error)
    return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 })
  }
}
