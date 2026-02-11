import { createServerClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { sellerId, storeName, sellerEmail } = await request.json();

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
      console.warn("[v0] No admin emails found to send new vendor notification.");
      return new Response(JSON.stringify({ message: "No admins to notify" }), { status: 200 });
    }

    const approvalLink = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/vendors/${sellerId}`;

    if (!resend) {
      console.warn("[v0] RESEND_API_KEY not configured. Skipping email notification.");
      return new Response(JSON.stringify({ message: "Email notification skipped (API key not configured)" }), { status: 200 });
    }

    await resend.emails.send({
      from: "notifications@kg-components.com",
      to: adminEmails,
      subject: `New Vendor Application: ${storeName}`,
      html: `
        <p>A new vendor, <strong>${storeName}</strong>, has applied to join the marketplace.</p>
        <p>Email: ${sellerEmail}</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://kg-components.com'}/admin/vendors/${sellerId}">Review Vendor Application</a></p>
        <br/>
        <p>KG Components Admin Team</p>
      `,
    });

    return new Response(JSON.stringify({ message: "Admin notified successfully" }), { status: 200 });
  } catch (error) {
    console.error("[v0] Error sending new vendor notification email:", error);
    return new Response(JSON.stringify({ error: "Failed to send notification email" }), { status: 500 });
  }
}
