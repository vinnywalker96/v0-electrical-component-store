import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { BankingDetailsSchema } from "@/lib/schemas"; // Import Zod schema

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await supabase.from("banking_details").select("*").limit(1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ banking_details: data })
  } catch (error: any) {
    console.error("[v0] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
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

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Only super admin can update banking details" }, { status: 403 })
    }

    const body = await request.json()
    const parsedBody = BankingDetailsSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.errors }, { status: 400 });
    }

    const { account_holder, bank_name, account_number, branch_code, swift_code, reference_note } = parsedBody.data;

    // Check if banking details exist
    const { data: existing } = await supabase.from("banking_details").select("id").limit(1).single()

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from("banking_details")
        .update({
          account_holder,
          bank_name,
          account_number,
          branch_code,
          swift_code,
          reference_note,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, banking_details: data })
    } else {
      // Insert
      const { data, error } = await supabase
        .from("banking_details")
        .insert({
          account_holder,
          bank_name,
          account_number,
          branch_code,
          swift_code,
          reference_note,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, banking_details: data })
    }
  } catch (error: any) {
    console.error("[v0] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
