import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import puppeteer from "puppeteer"
import { v4 as uuidv4 } from "uuid"

// Function to generate invoice HTML (similar to the email one, but can be customized)
function generateInvoiceHtml(data: {
  orderId: string
  issueDate: string
  total: number
  items: Array<{ name: string; quantity: number; price: number }>
  billingAddress: string
  shippingAddress: string
  paymentMethod: string
  bankingDetails?: {
    bank_name: string
    account_holder: string
    account_number: string
    branch_code: string
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

  const bankingDetailsHtml =
    data.paymentMethod === "bank_transfer" && data.bankingDetails
      ? `
      <div style="margin-top: 30px;">
        <h3 style="border-bottom: 2px solid #ddd; padding-bottom: 10px;">Banking Details</h3>
        <p><strong>Bank:</strong> ${data.bankingDetails.bank_name}</p>
        <p><strong>Account Name:</strong> ${data.bankingDetails.account_holder}</p>
        <p><strong>Account Number:</strong> ${data.bankingDetails.account_number}</p>
        <p><strong>Branch Code:</strong> ${data.bankingDetails.branch_code}</p>
        <p><strong>Reference:</strong> ${data.orderId}</p>
      </div>
    `
      : ""

  return `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 800px; margin: auto; padding: 20px; border: 1px solid #eee;">
          <h1>Invoice</h1>
          <p><strong>Invoice Number:</strong> INV-${data.orderId.substring(0, 8)}</p>
          <p><strong>Order Number:</strong> ${data.orderId}</p>
          <p><strong>Date of Issue:</strong> ${data.issueDate}</p>
          <hr/>
          <table style="width: 100%; margin-top: 20px;">
            <tr>
              <td style="width: 50%;">
                <h3>Billed To:</h3>
                <p>${data.billingAddress.replace(/\n/g, "<br>")}</p>
              </td>
              <td style="width: 50%;">
                <h3>Shipped To:</h3>
                <p>${data.shippingAddress.replace(/\n/g, "<br>")}</p>
              </td>
            </tr>
          </table>
          <br/>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 10px; text-align: left;">Product</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 15px 10px; text-align: right; font-weight: bold;">Total:</td>
                <td style="padding: 15px 10px; text-align: right; font-weight: bold; color: #0066cc;">R ${data.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          ${bankingDetailsHtml}
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

    const { order_id } = await request.json()

    if (!order_id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
    }

    // 1. Fetch order data
    const { data: order, error: orderError } = await supabase.from("orders").select("*, seller:sellers(*)").eq("id", order_id).single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    
    const { data: orderItems, error: itemsError } = await supabase.from("order_items").select("*, product:products(name)").eq("order_id", order_id)

    if (itemsError) throw itemsError

    // 2. Determine banking details
    let bankingDetails = null
    if (order.payment_method === "bank_transfer") {
      if (order.seller) {
        bankingDetails = {
          bank_name: order.seller.bank_name,
          account_holder: order.seller.account_holder,
          account_number: order.seller.account_number,
          branch_code: order.seller.branch_code,
        }
      } else {
        const { data } = await supabase.from("banking_details").select("*").limit(1).single()
        bankingDetails = data
      }
    }

    // 3. Generate HTML
    const htmlContent = generateInvoiceHtml({
      orderId: order.id,
      issueDate: new Date().toLocaleDateString(),
      total: order.total_amount,
      items: orderItems.map(item => ({ name: item.product?.name || 'Unknown', quantity: item.quantity, price: item.unit_price})),
      billingAddress: order.billing_address || "N/A",
      shippingAddress: order.shipping_address || "N/A",
      paymentMethod: order.payment_method,
      bankingDetails,
    })

    // 4. Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage()
    await page.setContent(htmlContent)
    const pdfBuffer = await page.pdf({ format: "A4" })
    await browser.close()

    // 5. Upload PDF to Supabase Storage
    const pdfName = `invoice-${order.id}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage.from("invoices").upload(pdfName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
    })

    if (uploadError) {
        throw new Error(`Failed to upload PDF: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = supabase.storage.from("invoices").getPublicUrl(pdfName);

    // 6. Create invoice record in the database
    const invoiceNumber = `INV-${order.id.substring(0, 8)}`
    const { data: invoiceData, error: invoiceError } = await supabase
      .from("invoices")
      .upsert({
        order_id: order.id,
        invoice_number: invoiceNumber,
        total_amount: order.total_amount,
        pdf_url: publicUrl,
        status: 'unpaid'
      }, { onConflict: 'order_id'})
      .select()
      .single()

    if (invoiceError) {
        throw new Error(`Failed to create invoice record: ${invoiceError.message}`)
    }

    return NextResponse.json({ success: true, invoice: invoiceData })
  } catch (error: any) {
    console.error("Invoice generation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
