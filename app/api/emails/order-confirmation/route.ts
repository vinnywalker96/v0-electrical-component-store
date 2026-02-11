import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { generateOrderConfirmationEmail } from "@/lib/email-service"
import type { Language } from "@/lib/i18n/translations"

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
    const { orderId, firstName, lastName, email, total, items, paymentMethod, reference, invoiceUrl, language = "en" } = body as {
      orderId: string
      firstName: string
      lastName: string
      email: string
      total: number
      items: any[]
      paymentMethod: string
      reference: string
      invoiceUrl?: string
      language?: Language
    }

    if (!email || !orderId) {
      return NextResponse.json({ error: "Email and orderId are required" }, { status: 400 })
    }

    let bankingDetails = null
    if (paymentMethod === "bank_transfer") {
      const { data } = await supabase.from("banking_details").select("*").limit(1).single()
      if (data) {
        bankingDetails = {
          accountHolder: data.account_name,
          bankName: data.bank_name,
          accountNumber: data.account_number,
          branchCode: data.branch_code,
        }
      }
    }

    // Generate HTML email content using the unified service
    const htmlContent = generateOrderConfirmationEmail({
      orderId,
      firstName,
      lastName,
      email,
      total,
      items,
      paymentMethod,
      reference,
      invoiceUrl,
      bankingDetails: bankingDetails || undefined,
    }, language)

    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      try {
        const resendModule = await import("resend")
        const resend = new resendModule.Resend(apiKey)

        let attachments = []
        if (invoiceUrl) {
          try {
            const response = await fetch(invoiceUrl)
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)

              attachments.push({
                filename: `invoice-${orderId}.pdf`,
                content: buffer,
                contentType: 'application/pdf',
              })
            }
          } catch (fetchError) {
            console.error("Failed to fetch invoice for attachment:", fetchError)
          }
        }

        const response = await resend.emails.send({
          from: "orders@kg-components.com",
          to: email,
          subject: `${language === "pt" ? "Confirmação de Pedido" : "Order Confirmation"} - ${orderId}`,
          html: htmlContent,
          attachments,
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

