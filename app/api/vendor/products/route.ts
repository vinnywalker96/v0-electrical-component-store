import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Product } from "@/lib/types"

export async function GET(request: Request) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "vendor_admin" && profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching vendor products:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(products)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const payload: Partial<Product> = await request.json()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "vendor_admin" && profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      ...payload,
      seller_id: user.id, // Ensure product is associated with the logged-in vendor
      status: "pending", // New products need to be approved
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const supabase = createClient()
  const payload: Partial<Product> = await request.json()
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get("id")

  if (!productId) {
    return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "vendor_admin" && profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Ensure the vendor can only update their own products
  const { data: existingProduct, error: fetchError } = await supabase
    .from("products")
    .select("seller_id")
    .eq("id", productId)
    .single()

  if (fetchError || !existingProduct) {
    return NextResponse.json({ error: "Product not found or not owned by vendor" }, { status: 404 })
  }

  if (existingProduct.seller_id !== user.id && profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: You can only update your own products" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      ...payload,
      status: "pending", // Any update means it needs re-approval
    })
    .eq("id", productId)
    .select()
    .single()

  if (error) {
    console.error("Error updating product:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get("id")

  if (!productId) {
    return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "vendor_admin" && profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Ensure the vendor can only delete their own products
  const { data: existingProduct, error: fetchError } = await supabase
    .from("products")
    .select("seller_id")
    .eq("id", productId)
    .single()

  if (fetchError || !existingProduct) {
    return NextResponse.json({ error: "Product not found or not owned by vendor" }, { status: 404 })
  }

  if (existingProduct.seller_id !== user.id && profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: You can only delete your own products" }, { status: 403 })
  }

  const { error } = await supabase.from("products").delete().eq("id", productId)

  if (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: "Product deleted successfully" })
}
