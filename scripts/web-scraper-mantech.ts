// scripts/web-scraper-mantech.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapedProduct {
  name: string;
  sku: string;
  description: string;
  price: number;
  image_url?: string;
  technical_documents?: string[];
  category?: string;
  brand?: string;
  specifications?: Record<string, string>;
}

async function scrapeProductPage(url: string): Promise<ScrapedProduct | null> {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(data);

    // --- Product Name ---
    const name = $('h1.product-title').text().trim() || $('meta[property="og:title"]').attr('content')?.trim() || '';

    // --- SKU (Stock Code) ---
    const sku = $('span.product-sku').text().trim().replace('SKU:', '').trim() || $('td:contains("Mantech Code")').next('td').text().trim() || '';

    // --- Description ---
    const description = $('div.product-description').text().trim() || $('meta[name="description"]').attr('content')?.trim() || '';

    // --- Price ---
    let price = 0;
    const priceText = $('span.product-price').text().trim() || $('div.price').text().trim();
    if (priceText) {
      price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
    }
    
    // --- Image URL ---
    const imageUrl = $('img.product-image').attr('src') || $('meta[property="og:image"]').attr('content') || '';

    // --- Technical Documents (PDFs) ---
    const technicalDocuments: string[] = [];
    $('a:contains(".pdf")').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.endsWith('.pdf')) {
        technicalDocuments.push(new URL(href, url).href); // Resolve relative URLs
      }
    });

    // --- Category (best effort from breadcrumbs or meta) ---
    let category: string | undefined;
    const breadcrumb = $('ol.breadcrumb li:nth-last-child(2) a').text().trim();
    if (breadcrumb) {
      category = breadcrumb;
    } else {
      category = $('meta[property="product:category"]').attr('content')?.trim();
    }

    // --- Brand (best effort from product details or meta) ---
    let brand: string | undefined;
    brand = $('span.product-brand').text().trim() || $('meta[property="product:brand"]').attr('content')?.trim();

    // --- Specifications (from a common table or list) ---
    const specifications: Record<string, string> = {};
    $('table.product-specifications tr').each((i, row) => {
      const key = $(row).find('th').text().trim();
      const value = $(row).find('td').text().trim();
      if (key && value) {
        specifications[key.toLowerCase().replace(/[^a-z0-9]/g, '_')] = value;
      }
    });
    // Fallback for specifications if not in a table (e.g., description paragraphs)
    if (Object.keys(specifications).length === 0) {
        $('div.product-details ul li').each((i, el) => {
            const text = $(el).text().trim();
            const parts = text.split(':');
            if (parts.length >= 2) {
                const key = parts[0].toLowerCase().replace(/[^a-z0-9]/g, '_');
                const value = parts.slice(1).join(':').trim();
                specifications[key] = value;
            }
        });
    }


    if (!name || !sku) {
      console.warn(`[v0-scraper] Skipping product from ${url}: Missing name or SKU.`);
      return null;
    }

    console.log(`[v0-scraper] Scraped: ${name} (SKU: ${sku})`);
    return {
      name,
      sku,
      description: description || 'No description available.',
      price: price || 0,
      image_url: imageUrl || undefined,
      technical_documents: technicalDocuments.length > 0 ? technicalDocuments : undefined,
      category: category || 'Uncategorized',
      brand: brand || 'Generic',
      specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
    };

  } catch (error: any) {
    console.error(`[v0-scraper] Error scraping ${url}:`, error.message);
    return null;
  }
}

// Example usage
async function runScraper() {
  const sampleUrl = 'https://www.mantech.co.za/ProductDisplay.aspx?code=036Y005'; // Example URL for a resistor
  const product = await scrapeProductPage(sampleUrl);
  if (product) {
    console.log('\n--- Scraped Product Details ---');
    console.log(JSON.stringify(product, null, 2));
  } else {
    console.log('\nFailed to scrape product from example URL.');
  }
}

// runScraper(); // Uncomment to run the scraper directly
