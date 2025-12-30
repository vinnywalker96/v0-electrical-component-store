#!/usr/bin/env python3
"""
Mantech Product Scraper - Comprehensive Version
Scrapes all products from mantech.co.za including categories and images.
Loads complete product data into Supabase database with images.
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

# Performance settings
MAX_CONCURRENT_REQUESTS = 5  # Reduced for stability
REQUEST_TIMEOUT = 30
BATCH_SIZE = 25
IMAGE_DOWNLOAD_WORKERS = 3

# Initialize Supabase
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing Supabase environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

class MantechScraper:
    def __init__(self):
        self.session = None
        self.semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
        self.processed_urls: Set[str] = set()
        self.categories: Set[str] = set()
        self.executor = ThreadPoolExecutor(max_workers=IMAGE_DOWNLOAD_WORKERS)
        self.total_products_scraped = 0
        self.total_images_downloaded = 0
        self.processed_urls: Set[str] = set()
        self.executor = ThreadPoolExecutor(max_workers=IMAGE_DOWNLOAD_WORKERS)

    async def __aenter__(self):
        connector = aiohttp.TCPConnector(limit=MAX_CONCURRENT_REQUESTS, ttl_dns_cache=300)
        timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
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

    async def get_product_links(self) -> List[str]:
        """Get all product links from the main catalog"""
        product_links = []

        # Start with main catalog page
        soup = await self.get_page(f"{MANTECH_BASE_URL}/Stock.aspx")
        if not soup:
            return product_links

        # Find all product links - adjust selector based on actual site structure
        # This is a placeholder - need to inspect the actual site
        product_elements = soup.find_all('a', href=re.compile(r'Stock\.aspx\?'))

        for elem in product_elements:
            href = elem.get('href')
            if href:
                full_url = urljoin(MANTECH_BASE_URL, href)
                if full_url not in product_links:
                    product_links.append(full_url)

        logger.info(f"Found {len(product_links)} product links")
        return product_links

    async def parse_product_page(self, url: str) -> Optional[Dict]:
        """Parse individual product page for details"""
        if url in self.processed_urls:
            return None
        self.processed_urls.add(url)

        soup = await self.get_page(url)
        if not soup:
            return None

        try:
            # Extract product information - adjust selectors based on actual HTML
            product_data = {}

            # Product name
            name_elem = soup.find('h1') or soup.find('title')
            product_data['name'] = name_elem.text.strip() if name_elem else "Unknown Product"

            # Description
            desc_elem = soup.find('div', class_=re.compile(r'description|desc'))
            product_data['description'] = desc_elem.text.strip() if desc_elem else ""

            # Price
            price_elem = soup.find(text=re.compile(r'R\s*\d+'))
            if price_elem:
                price_match = re.search(r'R\s*(\d+(?:\.\d{2})?)', price_elem)
                if price_match:
                    product_data['price'] = float(price_match.group(1))

            # Image URL
            img_elem = soup.find('img', src=re.compile(r'\.(jpg|jpeg|png|gif|webp)'))
            if img_elem:
                img_src = img_elem.get('src')
                if img_src:
                    product_data['image_url'] = urljoin(url, img_src)

            # Category (try to infer from URL or page content)
            product_data['category'] = self.infer_category(url, soup)

            # Stock code
            stock_elem = soup.find(text=re.compile(r'Stock.*Code|Code'))
            if stock_elem:
                parent = stock_elem.parent
                code_elem = parent.find_next('span') or parent.find_next('div')
                if code_elem:
                    product_data['stock_code'] = code_elem.text.strip()

            # Specifications
            specs = {}
            spec_table = soup.find('table') or soup.find('div', class_=re.compile(r'spec'))
            if spec_table:
                # Parse specifications - adjust based on actual structure
                rows = spec_table.find_all('tr')
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 2:
                        key = cells[0].text.strip()
                        value = cells[1].text.strip()
                        specs[key] = value

            product_data['specifications'] = specs
            product_data['url'] = url

            return product_data

        except Exception as e:
            logger.warning(f"Error parsing product {url}: {e}")
            return None

    def infer_category(self, url: str, soup: BeautifulSoup) -> str:
        """Infer product category from URL or page content"""
        url_lower = url.lower()

        # Check URL for category hints
        if 'resistor' in url_lower:
            return 'Resistors'
        elif 'capacitor' in url_lower:
            return 'Capacitors'
        elif 'led' in url_lower or 'diode' in url_lower:
            return 'LEDs & Diodes'
        elif 'transistor' in url_lower:
            return 'Transistors'
        elif 'ic' in url_lower or 'integrated' in url_lower:
            return 'Integrated Circuits'
        elif 'microcontroller' in url_lower:
            return 'Microcontrollers'
        elif 'sensor' in url_lower:
            return 'Sensors'
        elif 'relay' in url_lower:
            return 'Relays'
        elif 'switch' in url_lower:
            return 'Switches'
        elif 'connector' in url_lower:
            return 'Connectors'
        elif 'wire' in url_lower or 'cable' in url_lower:
            return 'Wires & Cables'
        elif 'tool' in url_lower:
            return 'Tools'
        elif 'battery' in url_lower or 'power' in url_lower:
            return 'Power Supplies'

        # Check page content
        text_content = soup.get_text().lower()
        if 'resistor' in text_content:
            return 'Resistors'
        # Add more category detection logic...

        return 'Electronics Components'  # Default category

    def download_image(self, image_url: str, filename: str) -> Optional[str]:
        """Download product image"""
        try:
            response = self.session.get(image_url, timeout=30)
            response.raise_for_status()

            # Save to local directory (you might want to upload to cloud storage)
            os.makedirs('images', exist_ok=True)
            filepath = f"images/{filename}"

            with open(filepath, 'wb') as f:
                f.write(response.content)

            return filepath
        except Exception as e:
            print(f"Error downloading image {image_url}: {e}")
            return None

    def save_to_database(self, products: List[Dict]):
        """Save products to Supabase database"""
        try:
            # Ensure Mantech seller exists
            seller_id = self.get_or_create_mantech_seller()

            for product in products:
                # Prepare product data for database
                db_product = {
                    'seller_id': seller_id,
                    'name': product['name'],
                    'description': product.get('description', ''),
                    'category': product.get('category', 'Electronics Components'),
                    'price': product.get('price', 0),
                    'stock': 10,  # Default stock
                    'image_url': product.get('image_url', '/placeholder.svg'),
                    'specifications': product.get('specifications', {}),
                    'is_active': True,
                    'sku': product.get('stock_code', f"MT-{hash(product['name']) % 10000}")
                }

                # Insert product
                result = supabase.table('products').insert(db_product).execute()

                if result.data:
                    print(f"Inserted product: {product['name']}")
                else:
                    print(f"Failed to insert product: {product['name']}")

                # Small delay to avoid overwhelming the database
                time.sleep(0.1)

        except Exception as e:
            print(f"Error saving to database: {e}")

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

    async def scrape_all_products(self):
        """Main scraping function with concurrent processing"""
        logger.info("Starting Mantech product scraping...")

        # Get all product links
        product_links = await self.get_product_links()

        if not product_links:
            logger.warning("No product links found. Please check the website structure.")
            return

        # Limit for testing - remove in production
        product_links = product_links[:200]

        # Process products in batches
        products = []
        total_processed = 0

        for i in range(0, len(product_links), BATCH_SIZE):
            batch = product_links[i:i + BATCH_SIZE]
            logger.info(f"Processing batch {i//BATCH_SIZE + 1}/{(len(product_links) + BATCH_SIZE - 1)//BATCH_SIZE}")

            # Process batch concurrently
            tasks = [self.parse_product_page(url) for url in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in batch_results:
                if isinstance(result, Exception):
                    logger.error(f"Task failed: {result}")
                elif result:
                    products.append(result)
                    total_processed += 1

            logger.info(f"Processed {total_processed}/{len(product_links)} products so far")

            # Small delay between batches to be respectful
            await asyncio.sleep(0.5)

        logger.info(f"Successfully scraped {len(products)} products")

        # Save to database in batches
        if products:
            await self.save_to_database_batch(products)

        logger.info("Scraping completed!")

    async def save_to_database_batch(self, products: List[Dict]):
        """Save products to Supabase database in batches"""
        try:
            # Ensure Mantech seller exists
            seller_id = await self.get_or_create_mantech_seller()

            for i in range(0, len(products), BATCH_SIZE):
                batch = products[i:i + BATCH_SIZE]

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
                        'image_url': product.get('image_url', '/placeholder.svg'),
                        'specifications': product.get('specifications', {}),
                        'primary_image_url': product.get('image_url', '/placeholder.svg')
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

async def main():
    async with MantechScraper() as scraper:
        await scraper.scrape_all_products()

if __name__ == "__main__":
    asyncio.run(main())