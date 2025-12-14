import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { JSDOM } from "jsdom"

export async function POST(request: Request) {
  const supabase = createClient()

  // Authenticate user as super_admin
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: Only Super Admins can scrape products" }, { status: 403 })
  }

  try {
    const { url } = await request.json()

    if (!url || !url.startsWith("https://www.mantech.co.za/")) {
      return NextResponse.json({ error: "Invalid Mantech product URL provided" }, { status: 400 })
    }

    const response = await fetch(url)
    const html = await response.text()

    const dom = new JSDOM(html)
    const document = dom.window.document

    const productName = document.querySelector("h1.product-title")?.textContent?.trim() || "N/A"
    const productCode = document.querySelector(".product-code span")?.textContent?.trim() || "N/A"
    const description = document.querySelector(".product-description")?.textContent?.trim() || "N/A"
    const priceText = document.querySelector(".product-price")?.textContent?.trim() || "R0.00"
    const price = parseFloat(priceText.replace("R", "").replace(",", ""))
    const imageUrl = document.querySelector(".product-image img")?.getAttribute("src") || ""
    const category = document.querySelector(".breadcrumb li:nth-child(3) a")?.textContent?.trim() || "Uncategorized"
    const brand = document.querySelector(".product-brand img")?.getAttribute("alt") || "Generic"

    // Extract specifications from a table, if available
    const specifications: Record<string, string> = {};
    document.querySelectorAll(".product-specs tr").forEach(row => {
      const key = row.querySelector("td:first-child")?.textContent?.trim();
      const value = row.querySelector("td:last-child")?.textContent?.trim();
      if (key && value) {
        specifications[key] = value;
      }
    });

    const productData = {
      name: productName,
      description: description,
      category: category,
      brand: brand,
      price: price,
      stock_quantity: 999, // Default stock for scraped items
      image_urls: imageUrl ? [imageUrl] : [],
      sku: productCode,
      specifications: specifications,
      seller_id: user.id, // Assign to super admin
      status: "approved", // Scraped products are pre-approved
      is_featured: false,
    }

    // Insert into products table
    const { data, error } = await supabase.from("products").insert(productData).select().single()

    if (error) {
      console.error("Error inserting scraped product:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Product scraped and added successfully", product: data })
  } catch (error: any) {
    console.error("Scraping failed:", error)
    return NextResponse.json({ error: error.message || "Failed to scrape product" }, { status: 500 })
  }
}
