import { createServerClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId, reason, description } = await request.json();

    if (!productId || !reason) {
      return NextResponse.json({ error: "Product ID and reason are required" }, { status: 400 });
    }

    const { error } = await supabase.from("product_reports").insert({
      product_id: productId,
      reporter_id: user.id,
      reason: reason,
      description: description,
      status: "pending",
    });

    if (error) {
      console.error("[v0] Error submitting product report:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Product reported successfully" });
  } catch (error: any) {
    console.error("[v0] Error in report-product API:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
