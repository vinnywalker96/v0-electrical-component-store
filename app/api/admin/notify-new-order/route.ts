import { createServerClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { orderId, totalAmount, customerName, customerEmail, items } = await request.json();

    // Fetch all admin and super_admin emails
    const { data: admins, error: adminError } = await supabase
      .from("profiles")
      .select("email")
      .in("role", ["admin", "super_admin"]);

    if (adminError) {
      console.error("[v0] Error fetching admin emails:", adminError.message);
      return new Response(JSON.stringify({ error: "Failed to fetch admin emails" }), { status: 500 });
    }

    const adminEmails = admins.map((admin) => admin.email).filter(Boolean) as string[];

    if (adminEmails.length === 0) {
      console.warn("[v0] No admin emails found to send new order notification.");
      return new Response(JSON.stringify({ message: "No admins to notify" }), { status: 200 });
    }

    const orderLink = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/orders/${orderId}`;

    const orderItemsHtml = items.map((item: any) => `<li>${item.name} x${item.quantity} (R${item.unitPrice.toFixed(2)})</li>`).join("");

    if (!resend) {
      console.warn("[v0] RESEND_API_KEY not configured. Skipping email notification.");
      return new Response(JSON.stringify({ message: "Email notification skipped (API key not configured)" }), { status: 200 });
    }

    await resend.emails.send({
      from: "no-reply@kgcomponents.co.za", // Replace with your verified Resend email
      to: adminEmails,
      subject: `New Order Alert: #${orderId.slice(0, 8)} from ${customerName}`,
      html: `
        <p>A new order (<strong>#${orderId.slice(0, 8)}</strong>) has been placed on the marketplace.</p>
        <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
        <p><strong>Total Amount:</strong> R${totalAmount.toFixed(2)}</p>
        <p><strong>Order Items:</strong></p>
        <ul>
          ${orderItemsHtml}
        </ul>
        <p>Please review the order details:</p>
        <p><a href="${orderLink}">View Order Details</a></p>
        <p>Thank you,</p>
        <p>KG Components Admin Team</p>
      `,
    });

    return new Response(JSON.stringify({ message: "Admin notified successfully about new order" }), { status: 200 });
  } catch (error) {
    console.error("[v0] Error sending new order notification email:", error);
    return new Response(JSON.stringify({ error: "Failed to send new order notification email" }), { status: 500 });
  }
}
