#!/usr/bin/env python3
"""
Mantech Product Scraper - Simplified Version with Images
Scrapes sample products from mantech.co.za and demonstrates image downloading.
"""

import asyncio
import aiohttp
import json
import os
import time
import uuid
from typing import List, Dict, Optional, Set
from urllib.parse import urljoin, urlparse, unquote
import re
from concurrent.futures import ThreadPoolExecutor
from supabase import create_client, Client
import logging
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import base64

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
MANTECH_BASE_URL = "https://mantech.co.za"
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
MANTECH_SELLER_USER_ID = os.getenv("MANTECH_SELLER_USER_ID", "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")

# Initialize Supabase
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing Supabase environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

class MantechScraper:
    def __init__(self):
        self.session = None
        self.semaphore = asyncio.Semaphore(3)  # Reduced for stability
        self.processed_urls: Set[str] = set()
        self.executor = ThreadPoolExecutor(max_workers=2)
        self.total_products_scraped = 0
        self.total_images_downloaded = 0

    async def __aenter__(self):
        connector = aiohttp.TCPConnector(limit=3, ttl_dns_cache=300)
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
        self.executor.shutdown(wait=True)

    async def get_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch a page and return BeautifulSoup object with rate limiting"""
        async with self.semaphore:
            try:
                async with self.session.get(url) as response:
                    response.raise_for_status()
                    html = await response.text()
                    return BeautifulSoup(html, 'html.parser')
            except Exception as e:
                logger.warning(f"Error fetching {url}: {e}")
                return None

    async def download_image_to_supabase(self, image_url: str, product_name: str) -> Optional[str]:
        """Download image and upload to Supabase storage"""
        try:
            async with self.session.get(image_url) as response:
                if response.status != 200:
                    return None

                # Get image content
                image_data = await response.read()
                content_type = response.headers.get('content-type', 'image/jpeg')

                # Generate unique filename
                ext = '.jpg'
                if 'png' in content_type.lower():
                    ext = '.png'
                elif 'gif' in content_type.lower():
                    ext = '.gif'
                elif 'webp' in content_type.lower():
                    ext = '.webp'

                # Clean product name for filename
                clean_name = re.sub(r'[^\w\-_\.]', '_', product_name)[:50]
                filename = f"mantech_{clean_name}_{uuid.uuid4().hex[:8]}{ext}"

                # Upload to Supabase storage
                bucket_name = 'product-images'
                file_path = f"mantech/{filename}"

                # Upload file
                upload_response = supabase.storage.from_(bucket_name).upload(
                    file_path,
                    image_data,
                    file_options={"content-type": content_type}
                )

                if hasattr(upload_response, 'path') and upload_response.path:
                    # Get public URL
                    public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
                    self.total_images_downloaded += 1
                    logger.info(f"Uploaded image: {filename}")
                    return public_url
                else:
                    logger.warning(f"Failed to upload image {filename}: {upload_response}")
                    return None

        except Exception as e:
            logger.warning(f"Error downloading/uploading image {image_url}: {e}")
            return None

    async def scrape_sample_products(self):
        """Scrape a few sample products to demonstrate functionality"""
        logger.info("Starting sample Mantech product scraping...")

        # Some sample product URLs that might work (based on common patterns)
        sample_urls = [
            "https://mantech.co.za/Stock.aspx?Query=RESISTOR+CARBON+FILM+1%2F4W+1K0+5%25",
            "https://mantech.co.za/Stock.aspx?Query=CAPACITOR+ELECTROLYTIC+10UF+50V",
            "https://mantech.co.za/Stock.aspx?Query=LED+5MM+RED",
            "https://mantech.co.za/Stock.aspx?Query=TRANSISTOR+BC547",
            "https://mantech.co.za/Stock.aspx?Query=IC+LM358",
        ]

        products = []

        for url in sample_urls:
            logger.info(f"Scraping sample product: {url}")
            product = await self.parse_product_page(url)
            if product:
                products.append(product)
            await asyncio.sleep(1)  # Be respectful

        logger.info(f"Successfully scraped {len(products)} sample products")

        # Save to database
        if products:
            await self.save_to_database_batch(products)
            logger.info("Sample products saved to database")

        return len(products)

    async def parse_product_page(self, url: str) -> Optional[Dict]:
        """Parse individual product page for details"""
        if url in self.processed_urls:
            return None
        self.processed_urls.add(url)

        soup = await self.get_page(url)
        if not soup:
            return None

        try:
            product_data = {}

            # Product name - try multiple selectors, including table parsing
            name_elem = (
                soup.find('h1') or
                soup.find('title') or
                soup.find('h2') or
                soup.find(text=re.compile(r'Product|Item', re.I))
            )
            
            product_name = None
            if name_elem and name_elem.text.strip() not in ['Products', '']:
                product_name = name_elem.text.strip()
            else:
                # Try to extract from table structure (Mantech's format)
                tables = soup.find_all('table')
                for table in tables:
                    rows = table.find_all('tr')
                    for row in rows:
                        cols = row.find_all(['td', 'th'])
                        if len(cols) >= 4:  # Description column is usually 4th or 5th
                            # Look for description column containing product info
                            for col in cols[3:6]:  # Check columns 4-6 (0-indexed)
                                col_text = col.text.strip()
                                if (len(col_text) > 10 and 
                                    any(keyword in col_text.upper() for keyword in ['RESISTOR', 'CAPACITOR', 'TRANSISTOR', 'DIODE', 'IC', 'LED', 'RELAY', 'SWITCH', 'CONNECTOR', 'SENSOR'])):
                                    product_name = col_text
                                    break
                            if product_name:
                                break
                    if product_name:
                        break
                
                # Fallback to URL extraction
                if not product_name:
                    query = url.split('Query=')[1].split('&')[0]
                    product_name = unquote(query).replace('+', ' ')
            
            product_data['name'] = product_name

            # Description - look for various description elements
            desc_elem = (
                soup.find('div', class_=re.compile(r'description|desc|product-description')) or
                soup.find('p', class_=re.compile(r'description|desc')) or
                soup.find('div', id=re.compile(r'description|desc'))
            )
            if desc_elem:
                product_data['description'] = desc_elem.text.strip()
            else:
                # Get general text content
                text_content = soup.get_text()
                # Extract meaningful description
                lines = [line.strip() for line in text_content.split('\n') if len(line.strip()) > 20]
                product_data['description'] = ' '.join(lines[:3]) if lines else f'Product: {product_data["name"]}'

            # Price - look for various price patterns
            price = 0.0
            price_patterns = [
                r'R\s*(\d+(?:[.,]\d{2})?)',
                r'Price:\s*R\s*(\d+(?:[.,]\d{2})?)',
                r'(\d+(?:[.,]\d{2})?)\s*ZAR',
                r'(\d+(?:[.,]\d{2})?)\s*RAND'
            ]

            for pattern in price_patterns:
                price_match = re.search(pattern, soup.get_text(), re.IGNORECASE)
                if price_match:
                    price_str = price_match.group(1).replace(',', '.')
                    try:
                        price = float(price_str)
                        break
                    except ValueError:
                        continue

            product_data['price'] = price if price > 0 else 10.0  # Default price

            # Images - find all product images
            image_urls = []
            images = soup.find_all('img', src=True)

            for img in images:
                src = img.get('src')
                if src:
                    # Skip very small images, icons, etc.
                    if 'icon' in src.lower() or 'logo' in src.lower() or 'banner' in src.lower():
                        continue

                    # Check if it's a product image
                    alt_text = img.get('alt', '').lower()
                    if any(keyword in alt_text for keyword in ['product', 'item', product_data['name'].lower()[:20]]):
                        full_img_url = urljoin(url, src)
                        if full_img_url not in image_urls:
                            image_urls.append(full_img_url)

            # If no images found with alt text, take the largest images
            if not image_urls:
                for img in images:
                    src = img.get('src')
                    if src and len(src) > 10:  # Skip very short URLs
                        full_img_url = urljoin(url, src)
                        if full_img_url not in image_urls and not any(skip in full_img_url.lower() for skip in ['icon', 'logo', 'banner']):
                            image_urls.append(full_img_url)

            # Download images and get Supabase URLs
            supabase_image_urls = []
            for img_url in image_urls[:3]:  # Limit to 3 images per product
                supabase_url = await self.download_image_to_supabase(img_url, product_data['name'])
                if supabase_url:
                    supabase_image_urls.append(supabase_url)

            product_data['image_urls'] = supabase_image_urls
            product_data['primary_image_url'] = supabase_image_urls[0] if supabase_image_urls else '/placeholder.svg'

            # Category - infer from URL or content
            product_data['category'] = self.infer_category(url, soup)

            # Stock code/SKU
            stock_code = ""
            stock_patterns = [
                r'Stock\s*Code:?\s*([A-Z0-9\-]+)',
                r'SKU:?\s*([A-Z0-9\-]+)',
                r'Part\s*Number:?\s*([A-Z0-9\-]+)',
                r'Code:?\s*([A-Z0-9\-]+)'
            ]

            for pattern in stock_patterns:
                stock_match = re.search(pattern, soup.get_text(), re.IGNORECASE)
                if stock_match:
                    stock_code = stock_match.group(1)
                    break

            product_data['stock_code'] = stock_code or f"MT-{hash(product_data['name']) % 10000}"

            # Specifications - try to extract structured data
            specs = {}
            spec_table = soup.find('table') or soup.find('div', class_=re.compile(r'spec|technical|details'))

            if spec_table:
                if spec_table.name == 'table':
                    rows = spec_table.find_all('tr')
                    for row in rows:
                        cells = row.find_all(['td', 'th'])
                        if len(cells) >= 2:
                            key = cells[0].text.strip()
                            value = cells[1].text.strip()
                            if key and value:
                                specs[key] = value
                else:
                    # Try to extract from div content
                    spec_items = spec_table.find_all(['li', 'div', 'p'])
                    for item in spec_items:
                        text = item.text.strip()
                        if ':' in text:
                            key, value = text.split(':', 1)
                            specs[key.strip()] = value.strip()

            product_data['specifications'] = specs
            product_data['url'] = url
            product_data['brand'] = 'Mantech'

            self.total_products_scraped += 1
            logger.info(f"Parsed product: {product_data['name']} (Price: R{product_data['price']}, Images: {len(supabase_image_urls)})")

            return product_data

        except Exception as e:
            logger.warning(f"Error parsing product {url}: {e}")
            return None

    def infer_category(self, url: str, soup: BeautifulSoup) -> str:
        """Infer product category from URL or page content"""
        url_lower = url.lower()
        text_content = soup.get_text().lower()

        # Check URL for category hints
        category_keywords = {
            'Resistors': ['resistor'],
            'Capacitors': ['capacitor'],
            'LEDs & Diodes': ['led', 'diode', 'light emitting'],
            'Transistors': ['transistor', 'mosfet', 'fet'],
            'Integrated Circuits': ['ic', 'integrated circuit', 'microcontroller', 'arduino'],
            'Sensors': ['sensor', 'detector'],
            'Relays': ['relay'],
            'Switches': ['switch', 'button'],
            'Connectors': ['connector', 'header', 'socket'],
            'Wires & Cables': ['wire', 'cable', 'ribbon'],
            'Tools': ['tool', 'multimeter', 'soldering'],
            'Power Supplies': ['power', 'battery', 'supply', 'adapter'],
            'Displays': ['display', 'lcd', 'oled', 'screen'],
            'Motors': ['motor', 'servo', 'stepper'],
            'Audio': ['audio', 'speaker', 'amplifier'],
            'RF & Wireless': ['rf', 'wireless', 'antenna', 'bluetooth']
        }

        for category, keywords in category_keywords.items():
            if any(keyword in url_lower or keyword in text_content for keyword in keywords):
                return category

        return 'Electronics Components'  # Default category

    async def save_to_database_batch(self, products: List[Dict]):
        """Save products to Supabase database in batches"""
        try:
            # Ensure Mantech seller exists
            seller_id = await self.get_or_create_mantech_seller()

            for i in range(0, len(products), 10):  # Smaller batches for samples
                batch = products[i:i + 10]

                # Prepare batch data
                batch_data = []
                for product in batch:
                    db_product = {
                        'seller_id': seller_id,
                        'name': product['name'],
                        'description': product.get('description', ''),
                        'category': product.get('category', 'Electronics Components'),
                        'brand': product.get('brand', 'Mantech'),
                        'price': product.get('price', 0),
                        'stock_quantity': 10,  # Default stock
                        'image_url': product.get('primary_image_url', '/placeholder.svg'),
                        'primary_image_url': product.get('primary_image_url', '/placeholder.svg'),
                        'images': product.get('image_urls', []),
                        'specifications': product.get('specifications', {})
                    }
                    batch_data.append(db_product)

                # Insert batch
                result = supabase.table('products').insert(batch_data).execute()

                if result.data:
                    logger.info(f"Inserted batch of {len(batch)} products")
                else:
                    logger.error(f"Failed to insert batch: {result}")

                # Small delay to avoid overwhelming the database
                await asyncio.sleep(0.1)

        except Exception as e:
            logger.error(f"Error saving to database: {e}")
            raise

    async def get_or_create_mantech_seller(self) -> str:
        """Get or create Mantech seller"""
        try:
            # Check if seller exists by store name
            result = supabase.table('sellers').select('id').eq('store_name', 'Mantech').execute()

            if result.data:
                return result.data[0]['id']

            # Get super admin user ID
            user_result = supabase.table('profiles').select('id').eq('email', 'vinnywalker96@gmail.com').execute()

            if not user_result.data:
                raise ValueError("Super admin user not found. Please ensure vinnywalker96@gmail.com exists in the database.")

            user_id = user_result.data[0]['id']

            # Check if user already has a seller profile
            existing_seller = supabase.table('sellers').select('id').eq('user_id', user_id).execute()
            if existing_seller.data:
                # Update the existing seller to be Mantech
                supabase.table('sellers').update({
                    'store_name': 'Mantech',
                    'store_description': 'Official Mantech product listings - South African electronics components',
                    'is_verified': True
                }).eq('id', existing_seller.data[0]['id']).execute()
                return existing_seller.data[0]['id']

            # Create seller
            seller_data = {
                'user_id': user_id,
                'store_name': 'Mantech',
                'store_description': 'Official Mantech product listings - South African electronics components',
                'is_verified': True
            }

            result = supabase.table('sellers').insert(seller_data).execute()
            return result.data[0]['id']

        except Exception as e:
            logger.error(f"Error creating/getting Mantech seller: {e}")
            raise

async def main():
    async with MantechScraper() as scraper:
        sample_count = await scraper.scrape_sample_products()
        print(f"\n=== SCRAPING SUMMARY ===")
        print(f"Sample products scraped: {scraper.total_products_scraped}")
        print(f"Images downloaded: {scraper.total_images_downloaded}")

if __name__ == "__main__":
    asyncio.run(main())