import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { generateOrderConfirmationEmail } from "@/lib/email-service"; // Import the utility function

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, firstName, lastName, email, total, items, paymentMethod } = body;

    if (!email || !orderId) {
      return NextResponse.json({ error: "Email and orderId are required" }, { status: 400 });
    }

    let bankingDetails = null;
    if (paymentMethod === "bank_transfer") {
      const { data } = await supabase.from("banking_details").select("*").limit(1).single();
      bankingDetails = data;
    }

    // Generate HTML email content using the utility function
    const htmlContent = generateOrderConfirmationEmail({
      orderId,
      firstName,
      lastName,
      email,
      total,
      items,
      paymentMethod,
      bankingDetails: bankingDetails ? {
        accountHolder: bankingDetails.account_holder, // Map to camelCase
        bankName: bankingDetails.bank_name,
        accountNumber: bankingDetails.account_number,
        branchCode: bankingDetails.branch_code,
        swiftCode: bankingDetails.swift_code,
        referenceNote: bankingDetails.reference_note,
      } : undefined,
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const resendModule = await import("resend");
        const resend = new resendModule.Resend(apiKey);

        const response = await resend.emails.send({
          from: "orders@kg-compponents.com",
          to: email,
          subject: `Order Confirmation - ${orderId}`,
          html: htmlContent,
        });

        if (response.error) {
          console.log("Email send warning:", response.error.message);
        }
      } catch (emailError) {
        console.log("Email send skipped:", emailError);
      }
    } else {
      console.log("Order created but email not sent (RESEND_API_KEY not configured)");
    }

    return NextResponse.json({
      success: true,
      message: "Order confirmation received",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to process order";
    console.error("Email service error:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}