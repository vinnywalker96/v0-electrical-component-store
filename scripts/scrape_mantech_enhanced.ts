import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://www.mantech.co.za/Categories.aspx';
const PRODUCT_DETAIL_URL = 'https://www.mantech.co.za/ProductInfo.aspx';
const IMAGE_DIR = path.join(process.cwd(), 'public', 'mantech-images');

// Ensure image directory exists
if (!fs.existsSync(IMAGE_DIR)) {
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

// Helper to slugify
function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Download image from URL
async function downloadImage(url: string, stockCode: string): Promise<string | null> {
    return new Promise((resolve) => {
        const filename = `${stockCode}.jpg`;
        const filepath = path.join(IMAGE_DIR, filename);

        // Skip if already exists
        if (fs.existsSync(filepath)) {
            console.log(`Image already exists: ${filename}`);
            resolve(`/mantech-images/${filename}`);
            return;
        }

        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                console.error(`Failed to download image: ${url}`);
                resolve(null);
                return;
            }

            const fileStream = fs.createWriteStream(filepath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Downloaded image: ${filename}`);
                resolve(`/mantech-images/${filename}`);
            });

            fileStream.on('error', (err) => {
                console.error(`Error saving image: ${err.message}`);
                fs.unlinkSync(filepath);
                resolve(null);
            });
        }).on('error', (err) => {
            console.error(`Error downloading image: ${err.message}`);
            resolve(null);
        });
    });
}

async function getOrCreateMantechVendor() {
    // 1. Check if exists
    const { data: existing } = await supabase
        .from('sellers')
        .select('id')
        .ilike('store_name', 'Mantech Automation')
        .single();

    if (existing) return existing.id;

    // 2. Find admin user to attach to
    const { data: admin } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'vinnywalker96@gmail.com')
        .single();

    if (!admin) throw new Error("Admin user vinnywalker96@gmail.com not found for vendor creation");

    // 3. Create
    const { data: newVendor, error } = await supabase
        .from('sellers')
        .upsert({
            user_id: admin.id,
            store_name: 'Mantech Automation',
            store_description: 'Official Mantech Automation Catalog - South African electronic components supplier',
            is_verified: true,
            is_active: true
        }, { onConflict: 'user_id' })
        .select('id')
        .single();

    if (error) throw error;
    return newVendor.id;
}

async function scrapeProductDetails(page: any, stockCode: string): Promise<any> {
    try {
        await page.goto(`${PRODUCT_DETAIL_URL}?Item=${stockCode}`, { waitUntil: 'networkidle2', timeout: 30000 });

        const productData = await page.evaluate(() => {
            const data: any = {};

            // Extract product name/description
            const descElement = document.querySelector('span[id*="lblDescription"]');
            data.description = descElement?.textContent?.trim() || '';

            // Extract part number
            const partNumElement = document.querySelector('span[id*="lblPartNum"]');
            data.partNumber = partNumElement?.textContent?.trim() || '';

            // Extract manufacturer
            const mfgElement = document.querySelector('span[id*="lblManufacturer"]');
            data.manufacturer = mfgElement?.textContent?.trim() || 'Mantech';

            // Extract detailed memo/technical description
            const memoElement = document.querySelector('span[id*="lblMemo"]');
            data.memo = memoElement?.textContent?.trim() || '';

            // Extract image URL
            const imgElement = document.querySelector('img[id*="imgProduct"]') as HTMLImageElement;
            data.imageUrl = imgElement?.src || null;

            // Extract price
            const priceElement = document.querySelector('span[id*="lblPrice"]');
            const priceText = priceElement?.textContent?.trim() || '';
            data.price = priceText.replace('R', '').replace(',', '').trim();

            // Extract stock
            const stockElement = document.querySelector('span[id*="lblStock"]');
            data.stock = stockElement?.textContent?.trim() || '';

            // Extract datasheet link
            const datasheetLink = document.querySelector('a[href*="datasheets"]') as HTMLAnchorElement;
            data.datasheetUrl = datasheetLink?.href || null;

            return data;
        });

        return productData;
    } catch (error) {
        console.error(`Error scraping details for ${stockCode}:`, error);
        return null;
    }
}

async function scrapeMantech() {
    console.log('Starting Enhanced Mantech Scraper...');

    // Ensure vendor exists
    let sellerId: string;
    try {
        sellerId = await getOrCreateMantechVendor();
        console.log(`Using Seller ID: ${sellerId}`);
    } catch (e: any) {
        console.error("Failed to get/create seller:", e.message || e);
        return;
    }

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);
    await page.setViewport({ width: 1280, height: 800 });

    try {
        await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
        await traverseCategories(page, 1, null, sellerId);
    } catch (error) {
        console.error('Fatal error during scraping:', error);
    } finally {
        await browser.close();
    }

    console.log('Scraping completed!');
}

async function traverseCategories(page: any, level: number, parentId: string | null, sellerId: string) {
    const listBoxId = `ContentPlaceHolder1_ListBox${level}`;

    // Check for element and handle detached frame/navigation errors
    let listBoxExists = null;
    try {
        listBoxExists = await page.$(`#${listBoxId}`);
    } catch (e: any) {
        console.log(`Error checking for listbox: ${e.message || "Unknown error"}. Retrying navigation...`);
        return; // Skip this branch if page is unstable
    }

    if (!listBoxExists) {
        await scrapeProducts(page, parentId, sellerId);
        return;
    }

    const optionsCount = await page.evaluate((id: string) => {
        const select = document.getElementById(id) as HTMLSelectElement;
        if (!select) return 0;
        return Array.from(select.options).filter(o => o.value && o.value !== '-1').length;
    }, listBoxId);

    if (optionsCount === 0) {
        await scrapeProducts(page, parentId, sellerId);
        return;
    }

    console.log(`Found ${optionsCount} categories at level ${level}`);

    for (let i = 0; i < optionsCount; i++) {
        // Re-acquire element info each time to avoid detached issues
        const optionInfo = await page.evaluate((id: string, index: number) => {
            const select = document.getElementById(id) as HTMLSelectElement;
            if (!select) return null;
            const validOptions = Array.from(select.options).filter(o => o.value && o.value !== '-1');
            const opt = validOptions[index];
            return opt ? { text: opt.text, value: opt.value } : null;
        }, listBoxId, i);

        if (!optionInfo) continue;

        const categoryName = optionInfo.text.trim();
        console.log(`[L${level}] Processing Category ${i + 1}/${optionsCount}: ${categoryName}`);

        const slug = (parentId ? `${parentId}-` : '') + slugify(categoryName);

        const { data: categoryData, error: catError } = await supabase
            .from('categories')
            .upsert({
                name: categoryName,
                name_pt: categoryName,
                parent_id: parentId,
                slug: slug,
                level: level,
            }, { onConflict: 'slug' })
            .select('id')
            .single();

        if (catError) {
            console.error(`Error upserting category ${categoryName}:`, catError.message);
        }

        const currentCategoryId = categoryData?.id;

        try {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => { }),
                page.select(`#${listBoxId}`, optionInfo.value)
            ]);
        } catch (e: any) {
            console.error(`Error during selection/navigation: ${e.message || "Unknown error"}`);
            continue; // Skip sub-branches if navigation fails
        }

        if (level < 6) {
            await traverseCategories(page, level + 1, currentCategoryId, sellerId);
        } else {
            await scrapeProducts(page, currentCategoryId, sellerId);
        }
    }
}

async function scrapeProducts(page: any, categoryId: string | null, sellerId: string) {
    const products = await page.evaluate(() => {
        const items: any[] = [];
        const rows = Array.from(document.querySelectorAll('table tr'));

        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length >= 7) {
                const stockCode = cols[0]?.innerText?.trim();
                const desc = cols[1]?.innerText?.trim();
                const priceStr = cols[5]?.innerText?.trim().replace('R', '').replace(',', '').replace(/\s/g, '');
                const stockStr = cols[6]?.innerText?.trim();

                const isHeader = stockCode?.toLowerCase().includes('stock code') ||
                    desc?.toLowerCase().includes('description') ||
                    stockCode?.toLowerCase().includes('part number');

                if (stockCode && desc && !isHeader && !isNaN(parseFloat(priceStr || '0'))) {
                    items.push({ stockCode, desc, priceStr, stockStr });
                }
            }
        });
        return items;
    });

    if (products.length > 0) {
        console.log(`Found ${products.length} products. Processing...`);

        for (const p of products) {
            // Simplified scraping for speed, as detail navigation is prone to errors on large catalogs
            const price = parseFloat(p.priceStr) || 0;
            let stock = 0;
            if (p.stockStr?.toLowerCase().includes('in stock')) {
                stock = 100;
            } else {
                stock = parseInt(p.stockStr?.replace(/\D/g, '') || '0');
            }

            const slug = slugify(p.desc) + '-' + slugify(p.stockCode);

            const { error } = await supabase.from('products').upsert({
                stock_code: p.stockCode,
                name: p.desc.split('\n')[0].trim(),
                name_pt: p.desc.split('\n')[0].trim(),
                description: p.desc,
                description_pt: p.desc,
                price: price,
                stock_quantity: stock,
                category_id: categoryId,
                seller_id: sellerId,
                manufacturer: 'Mantech',
                slug: slug,
                is_active: true
            }, { onConflict: 'stock_code' });

            if (error) {
                console.error(`Error saving product ${p.stockCode}:`, error.message);
            }
        }
    }
}

// Fixed ES module entry point
scrapeMantech();

export { scrapeMantech };

