import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { UpdateOrderSchema } from "@/lib/schemas"; // Import Zod schema

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const parsedBody = UpdateOrderSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.errors }, { status: 400 });
    }

    const { status, payment_status } = parsedBody.data;

    const updates: any = {};
    if (status) updates.status = status;
    if (payment_status) updates.payment_status = payment_status;

    const { data: updatedOrder, error } = await supabase.from("orders").update(updates).eq("id", id).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error: any) {
    console.error("[v0] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
