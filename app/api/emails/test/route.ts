import { type NextRequest, NextResponse } from "next/server"
import { generateOrderConfirmationEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, language = "en" } = body

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 })
        }

        const htmlContent = generateOrderConfirmationEmail({
            orderId: "TEST-12345",
            firstName: "Test",
            lastName: "User",
            email: email,
            total: 1250.75,
            items: [
                { name: "Resistor Pack 100", quantity: 2, price: 50.00 },
                { name: "Arduino Uno R3", quantity: 1, price: 1150.75 }
            ],
            paymentMethod: "bank_transfer",
            reference: "TEST-REF-123",
            bankingDetails: {
                accountHolder: "KG Components Pty Ltd",
                bankName: "First National Bank",
                accountNumber: "123456789",
                branchCode: "250655"
            }
        }, language)

        const apiKey = process.env.RESEND_API_KEY
        if (!apiKey) {
            return NextResponse.json({
                success: true,
                message: "API Key not configured, but preview generated.",
                preview: htmlContent
            })
        }

        const resendModule = await import("resend")
        const resend = new resendModule.Resend(apiKey)

        const response = await resend.emails.send({
            from: "test@kg-components.com",
            to: email,
            subject: `Email Service Test (${language})`,
            html: htmlContent,
        })

        if (response.error) {
            return NextResponse.json({ error: response.error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: "Test email sent!" })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
