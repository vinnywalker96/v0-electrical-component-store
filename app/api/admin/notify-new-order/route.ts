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
      from: "notifications@kg-components.com",
      to: adminEmails,
      subject: `New Order Received - ${orderId}`,
      html: `
        <h1>New Order Received</h1>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
        <p><strong>Total Amount:</strong> R ${totalAmount.toFixed(2)}</p>
        <h3>Items:</h3>
        <ul>
          ${items.map((item: any) => `<li>${item.name} (x${item.quantity}) - R ${item.unitPrice.toFixed(2)}</li>`).join("")}
        </ul>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://kg-components.com'}/admin/orders">View in Admin Dashboard</a></p>
      `,
    });

    return new Response(JSON.stringify({ message: "Admin notified successfully about new order" }), { status: 200 });
  } catch (error) {
    console.error("[v0] Error sending new order notification email:", error);
    return new Response(JSON.stringify({ error: "Failed to send new order notification email" }), { status: 500 });
  }
}
