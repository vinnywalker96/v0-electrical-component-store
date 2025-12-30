// Enhanced Mantech product scraper with real categories and image handling
// This script imports electrical components from Mantech.co.za into Supabase
import { createClient } from "@supabase/supabase-js";
import redis from "../lib/redis"; // Import Redis
import axios from "axios";
import * as cheerio from "cheerio";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("[v0] Missing environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
// Hardcoded user_id for the Mantech seller.
// In a real application, this user would typically be an admin or a dedicated system user.
// For testing purposes, you might create a user manually in Supabase auth and use their UUID here.
const MANTECH_SELLER_USER_ID = process.env.MANTECH_SELLER_USER_ID || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"; // Replace with an actual UUID
const CACHE_KEY_PRODUCTS = "shop:all_products";
const CACHE_KEY_SELLERS = "shop:approved_sellers";
const CACHE_EXPIRY_SECONDS = 3600; // Cache for 1 hour
async function scrapeProductDetails(url) {
    try {
        console.log(`[v0] Scraping product details from: ${url}`);
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        // Placeholder selectors - these will need to be refined based on actual Mantech HTML
        const name = $("h1.product-title").text().trim() || "N/A";
        const description = $(".product-description").text().trim() || "N/A";
        const category = $(".breadcrumb li:nth-child(3) a").text().trim() || "N/A"; // Example: third item in breadcrumb
        const brand = $(".product-brand").text().trim() || "N/A";
        const stock_code = $(".product-sku").text().trim().replace("SKU: ", "") || "N/A";
        const image_url = $(".product-main-image img").attr("src") || "/placeholder.svg";
        const specifications = {};
        // Example: parse a table of specifications
        $(".product-specifications-table tr").each((i, el) => {
            const key = $(el).find("td:nth-child(1)").text().trim();
            const value = $(el).find("td:nth-child(2)").text().trim();
            if (key && value) {
                specifications[key] = value;
            }
        });
        const technical_documents = [];
        // Example: find links with 'datasheet' or 'manual' in their text or href
        $(".product-downloads a").each((i, el) => {
            const href = $(el).attr("href");
            if (href && (href.includes("datasheet") || href.includes("manual") || href.endsWith(".pdf"))) {
                technical_documents.push(href);
            }
        });
        const stock = Math.floor(Math.random() * 500) + 50; // Placeholder for stock quantity
        const scrapedProduct = {
            name,
            description,
            category,
            brand,
            stock_code,
            image_url,
            stock,
            specifications,
            technical_documents,
        };
        console.log("[v0] Successfully scraped product:", scrapedProduct.name);
        return scrapedProduct;
    }
    catch (error) {
        console.error(`[v0] Error scraping product from ${url}:`, error.message);
        return null;
    }
}
async function getOrCreateMantechSeller() {
    // Try to find an existing seller named "Mantech"
    let { data: seller, error } = await supabase
        .from("sellers")
        .select("id")
        .eq("store_name", "Mantech")
        .single();
    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error("[v0] Error fetching Mantech seller:", error.message);
        process.exit(1);
    }
    if (seller) {
        console.log("[v0] Found existing Mantech seller:", seller.id);
        return seller.id;
    }
    else {
        // Create the Mantech seller if it doesn't exist
        console.log("[v0] Creating Mantech seller...");
        const { data: newSeller, error: insertError } = await supabase
            .from("sellers")
            .insert({
            user_id: MANTECH_SELLER_USER_ID,
            store_name: "Mantech",
            store_description: "Official Mantech product listings",
            is_verified: true,
        })
            .select("id")
            .single();
        if (insertError) {
            console.error("[v0] Error creating Mantech seller:", insertError.message);
            process.exit(1);
        }
        console.log("[v0] Created new Mantech seller:", newSeller.id);
        return newSeller.id;
    }
}
async function importProducts() {
    try {
        console.log("[v0] Starting Mantech product import...");
        const mantechSellerId = await getOrCreateMantechSeller();
        let successCount = 0;
        let errorCount = 0;
        // Single product scraping for initial test
        const productUrl = "https://www.mantech.co.za/ProductInfo.aspx?Item=72M0809";
        const product = await scrapeProductDetails(productUrl);
        if (product) {
            try {
                const generatedPrice = parseFloat((Math.random() * (500 - 10) + 10).toFixed(2)); // Random price between 10 and 500
                const { data, error } = await supabase.from("products").upsert({
                    name: product.name,
                    description: product.description,
                    category: product.category,
                    brand: product.brand,
                    sku: product.stock_code, // Map stock_code to sku
                    price: generatedPrice,
                    stock_quantity: product.stock, // Map stock to stock_quantity
                    image_url: product.image_url,
                    specifications: {
                        ...product.specifications,
                        source: "Mantech.co.za",
                        import_date: new Date().toISOString(),
                    },
                    technical_documents: product.technical_documents, // Use scraped technical documents
                    seller_id: mantechSellerId, // Assign to Mantech seller
                }, { onConflict: "sku", ignoreDuplicates: false } // Upsert by SKU
                );
                if (error) {
                    console.error(`[v0] Error importing ${product.name} (SKU: ${product.stock_code}):`, error.message);
                    errorCount++;
                }
                else {
                    successCount++;
                    console.log(`[v0] ✓ Imported/Updated: ${product.name} (SKU: ${product.stock_code})`);
                }
            }
            catch (err) {
                console.error(`[v0] Exception importing ${product.name} (SKU: ${product.stock_code}):`, err.message);
                errorCount++;
            }
        }
        else {
            console.error("[v0] No product data scraped. Skipping import for this URL.");
            errorCount++;
        }
        console.log("\n[v0] Import completed!");
        console.log(`[v0] Successfully imported/updated: ${successCount} products`);
        console.log(`[v0] Errors: ${errorCount}`);
        // Refresh in-memory cache after import (high-performance LRU cache)
        console.log("[v0] Refreshing in-memory cache...");
        try {
            const { data: allProducts, error: productsFetchError } = await supabase
                .from("products")
                .select("*, seller:sellers(id, store_name, rating)");
            if (productsFetchError)
                throw productsFetchError;
            await redis.set(CACHE_KEY_PRODUCTS, JSON.stringify(allProducts), { ex: CACHE_EXPIRY_SECONDS });
            console.log("[v0] Products cache refreshed.");
        }
        catch (cacheError) {
            console.warn("[v0] Error refreshing products cache:", cacheError.message);
        }
        try {
            const { data: approvedSellers, error: sellersFetchError } = await supabase
                .from("sellers")
                .select("id, store_name")
                .eq("verification_status", "approved");
            if (sellersFetchError)
                throw sellersFetchError;
            await redis.set(CACHE_KEY_SELLERS, JSON.stringify(approvedSellers), { ex: CACHE_EXPIRY_SECONDS });
            console.log("[v0] Sellers cache refreshed.");
        }
        catch (cacheError) {
            console.warn("[v0] Error refreshing sellers cache:", cacheError.message);
        }
    }
    catch (error) {
        console.error("[v0] Fatal error during import:", error.message);
        process.exit(1);
    }
}
// Run the import
importProducts();
