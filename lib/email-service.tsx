import type { Language } from "@/lib/i18n/translations"
import { getTranslation } from "@/lib/i18n/translations"

interface OrderEmailData {
  orderId: string
  firstName: string
  lastName: string
  email: string
  total: number
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  paymentMethod: string
  bankingDetails?: {
    accountHolder: string
    bankName: string
    accountNumber: string
    branchCode?: string
    swiftCode?: string
    referenceNote?: string
  }
}

export function generateOrderConfirmationEmail(data: OrderEmailData, language: Language = "en"): string {
  const t = (path: string) => getTranslation(language, path, "")

  const bankingDetailsHtml =
    data.paymentMethod === "bank_transfer" && data.bankingDetails
      ? `
    <div style="background-color: #f0f7ff; padding: 20px; border-radius: 8px; margin-top: 20px;">
      <h3 style="color: #0052cc; margin-top: 0;">${language === "pt" ? "Detalhes Bancários" : "Banking Details"}</h3>
      <p><strong>${language === "pt" ? "Titular da Conta:" : "Account Holder:"}</strong> ${data.bankingDetails.accountHolder}</p>
      <p><strong>${language === "pt" ? "Banco:" : "Bank:"}</strong> ${data.bankingDetails.bankName}</p>
      <p><strong>${language === "pt" ? "Número da Conta:" : "Account Number:"}</strong> ${data.bankingDetails.accountNumber}</p>
      ${data.bankingDetails.branchCode ? `<p><strong>${language === "pt" ? "Código da Agência:" : "Branch Code:"}</strong> ${data.bankingDetails.branchCode}</p>` : ""}
      ${data.bankingDetails.swiftCode ? `<p><strong>${language === "pt" ? "Código SWIFT:" : "SWIFT Code:"}</strong> ${data.bankingDetails.swiftCode}</p>` : ""}
      ${data.bankingDetails.referenceNote ? `<p><strong>${language === "pt" ? "Referência:" : "Reference:"}</strong> ${data.bankingDetails.referenceNote}</p>` : ""}
    </div>
  `
      : ""

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0052cc; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .order-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .total-section { background-color: white; padding: 20px; border: 1px solid #e5e7eb; margin-top: 20px; }
          .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #0052cc; }
          .footer { background-color: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🎉 ${language === "pt" ? "Pedido Confirmado!" : "Order Confirmed!"}</h1>
          </div>
          
          <div class="content">
            <p>${language === "pt" ? "Olá" : "Hello"} ${data.firstName} ${data.lastName},</p>
            
            <p>${language === "pt" ? "Obrigado por sua compra! Seu pedido foi recebido e será processado em breve." : "Thank you for your purchase! Your order has been received and will be processed shortly."}</p>
            
            <h3>${language === "pt" ? "Número do Pedido:" : "Order Number:"} <strong>${data.orderId}</strong></h3>
            
            <h3>${language === "pt" ? "Itens do Pedido:" : "Order Items:"}</h3>
            ${data.items
              .map(
                (item) => `
              <div class="order-item">
                <span>${item.name} x${item.quantity}</span>
                <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `,
              )
              .join("")}
            
            <div class="total-section">
              <div class="total-row">
                <span>${language === "pt" ? "Total:" : "Total:"}</span>
                <span>R$ ${data.total.toFixed(2)}</span>
              </div>
            </div>
            
            ${bankingDetailsHtml}
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              ${language === "pt" ? "Seu pagamento foi marcado como <strong>PENDENTE</strong>. Após recebermos sua confirmação de pagamento, seu pedido será processado." : "Your payment is marked as <strong>PENDING</strong>. Once we confirm payment, your order will be processed."}
            </p>
          </div>
          
          <div class="footer">
            <p>${language === "pt" ? "Dúvidas? Entre em contato conosco em" : "Questions? Contact us at"} support@electrohub.com</p>
          </div>
        </div>
      </body>
    </html>
  `
}
