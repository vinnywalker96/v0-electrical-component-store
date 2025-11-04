import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 })
    }

    // In a real app, you'd save this to a newsletter subscribers table
    // or use a service like Mailchimp
    console.log("[v0] Newsletter subscription:", email)

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to our newsletter!",
    })
  } catch (error: any) {
    console.error("[v0] Newsletter subscription error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
