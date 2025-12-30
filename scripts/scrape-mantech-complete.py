#!/usr/bin/env python3
"""
Mantech Product Scraper - Complete Product Catalog
Scrapes ALL products from mantech.co.za using alphabetical search approach.
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

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
MANTECH_BASE_URL = "https://mantech.co.za"  # Changed from www.mantech.co.za
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Performance settings
MAX_CONCURRENT_REQUESTS = 2  # Very conservative
REQUEST_TIMEOUT = 30
BATCH_SIZE = 5
IMAGE_DOWNLOAD_WORKERS = 1

# Initialize Supabase
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing Supabase environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

class MantechScraper:
    def __init__(self):
        self.session = None
        self.semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
        self.processed_urls: Set[str] = set()
        self.executor = ThreadPoolExecutor(max_workers=IMAGE_DOWNLOAD_WORKERS)
        self.total_products_scraped = 0
        self.total_images_downloaded = 0

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

    async def find_all_products(self) -> List[str]:
        """Find all product URLs using predefined electronic component categories"""
        logger.info("Starting comprehensive product URL discovery...")

        # Predefined electronic component categories to search
        categories = [
            'RESISTOR', 'CAPACITOR', 'TRANSISTOR', 'DIODE', 'LED', 'IC', 'INTEGRATED+CIRCUIT',
            'RELAY', 'SWITCH', 'CONNECTOR', 'SENSOR', 'INDUCTOR', 'COIL', 'POTENTIOMETER',
            'FUSE', 'BATTERY', 'WIRE', 'CABLE', 'REGULATOR', 'AMPLIFIER', 'OSCILLATOR',
            'CRYSTAL', 'ANTENNA', 'MOTOR', 'SERVO', 'DISPLAY', 'MODULE', 'BOARD',
            'MICROCONTROLLER', 'OPTOCOUPLER', 'PHOTOTRANSISTOR', 'PHOTODIODE', 'VARISTOR',
            'THERMISTOR', 'BUZZER', 'SPEAKER', 'MICROPHONE', 'TERMINAL', 'HEADER', 'SOCKET'
        ]

        all_product_urls = []

        # Get products from each category
        for category in categories:
            logger.info(f"Processing category: {category}")
            try:
                category_products = await self.get_product_links_from_category(category)
                all_product_urls.extend(category_products)
                logger.info(f"Found {len(category_products)} products in category {category}")
                await asyncio.sleep(0.5)  # Be respectful
            except Exception as e:
                logger.warning(f"Error processing category {category}: {e}")
                continue

        # Remove duplicates
        unique_urls = list(set(all_product_urls))
        logger.info(f"Total unique product URLs found: {len(unique_urls)}")
        return unique_urls

    async def get_products_from_category(self, category: str) -> List[Dict]:
        """Get all products from a specific category by scraping the category page directly"""
        products = []
        page = 1
        max_pages = 50  # Increased limit for comprehensive scraping

        while page <= max_pages:
            try:
                if page == 1:
                    url = f"{MANTECH_BASE_URL}/Stock.aspx?Query={category}"
                else:
                    # Try pagination patterns
                    url = f"{MANTECH_BASE_URL}/Stock.aspx?Query={category}&Page={page}"

                logger.info(f"Fetching category {category}, page {page}")
                soup = await self.get_page(url)
                if not soup:
                    break

                # Extract products directly from this page
                page_products = self.extract_products_from_page(soup, url)
                if not page_products:
                    break  # No more products on this page

                products.extend(page_products)
                page += 1
                await asyncio.sleep(0.5)  # Be respectful

            except Exception as e:
                logger.warning(f"Error on page {page} for category {category}: {e}")
                break

        return products

    async def get_categories(self) -> Set[str]:
        """Get all product categories from the main page"""
        logger.info("Fetching product categories...")
        soup = await self.get_page(f"{MANTECH_BASE_URL}/Stock.aspx")
        if not soup:
            return set()

        categories = set()

        # Find all links with Query parameters
        links = soup.find_all('a', href=re.compile(r'Stock\.aspx\?Query='))

        for link in links:
            href = link.get('href')
            if href:
                # Extract query parameter
                query_match = re.search(r'Query=([^&]+)', href)
                if query_match:
                    query_param = unquote(query_match.group(1))
                    # Filter out very long queries (likely product-specific) and keep category queries
                    if len(query_param) < 100 and not query_param.isdigit():
                        categories.add(query_param)

        logger.info(f"Found {len(categories)} categories: {sorted(categories)}")
        return categories

    async def get_product_links_from_category(self, category: str) -> List[str]:
        """Get all product links from a specific category"""
        product_links = []
        page = 1
        max_pages = 20  # Safety limit

        while page <= max_pages:
            try:
                if page == 1:
                    url = f"{MANTECH_BASE_URL}/Stock.aspx?Query={category}"
                else:
                    # Try pagination patterns
                    url = f"{MANTECH_BASE_URL}/Stock.aspx?Query={category}&Page={page}"

                logger.info(f"Fetching category {category}, page {page}")
                soup = await self.get_page(url)
                if not soup:
                    break

                # Find product links on this page
                page_links = []
                links = soup.find_all('a', href=re.compile(r'ProductInfo\.aspx'))

                for link in links:
                    href = link.get('href')
                    if href and 'ProductInfo.aspx' in href:
                        full_url = urljoin(MANTECH_BASE_URL, href)
                        if full_url not in page_links:
                            page_links.append(full_url)

                if not page_links:
                    break  # No more products on this page

                product_links.extend(page_links)
                page += 1
                await asyncio.sleep(0.5)  # Be respectful

            except Exception as e:
                logger.warning(f"Error on page {page} for category {category}: {e}")
                break

        return product_links

    def extract_products_from_page(self, soup: BeautifulSoup, page_url: str) -> List[Dict]:
        """Extract product data directly from category/manufacturer pages using span-based structure"""
        products = []

        # Find all product name spans (they have IDs like ContentPlaceHolder1_GridView1_Label42_X)
        product_spans = soup.find_all('span', id=re.compile(r'ContentPlaceHolder1_GridView1_Label42_\d+'))

        for span in product_spans:
            try:
                span_id = span.get('id')
                if not span_id:
                    continue

                # Extract the index from the span ID
                match = re.search(r'Label42_(\d+)', span_id)
                if not match:
                    continue

                index = match.group(1)

                # Get the product name
                product_name = span.text.strip()
                if not product_name:
                    continue

                # Get the corresponding description span
                desc_span_id = f'ContentPlaceHolder1_GridView1_Label43_{index}'
                desc_span = soup.find('span', id=desc_span_id)
                description = desc_span.text.strip() if desc_span else ""

                # AGGRESSIVE CLEANING - Remove all unwanted content
                cleaning_patterns = [
                    (r'Restocking soon.*', ''),
                    (r'Enquire At Branch.*', ''),
                    (r'UnitEach.*', ''),
                    (r'\d+ extra days for delivery.*', ''),
                    (r'BID & SAVE.*', ''),
                    (r'NextLast Page.*', ''),
                    (r'Displaying records.*', ''),
                    (r'Prices are exclusive of VAT.*', ''),
                    (r'Prices are subject to change.*', ''),
                    (r'Prices are in South African Rands.*', ''),
                    (r'^\s*[\w\d]+\s*', ''),  # Remove stock codes at start
                    (r'\s+\d+\.\d+\s*$', ''),  # Remove prices at end
                    (r'\s+Unit\s*$', '', re.IGNORECASE),
                    (r'\s+Each\s*$', '', re.IGNORECASE),
                    (r'\s+Bulk\s*$', '', re.IGNORECASE),
                    (r'\s+MOQ\s*$', '', re.IGNORECASE),
                ]

                for pattern, replacement, *flags in cleaning_patterns:
                    flags = flags[0] if flags else re.DOTALL | re.IGNORECASE
                    product_name = re.sub(pattern, replacement, product_name, flags=flags)

                product_name = product_name.strip()

                # STRICT VALIDATION - Must pass all checks
                if not self._validate_product_name(product_name):
                    continue

                # Extract and validate price (look for price spans)
                price = self._extract_price_from_spans(soup, index)
                if price is None or price <= 0:
                    continue

                # Extract and validate stock quantity
                stock_quantity = self._extract_stock_quantity_from_spans(soup, index)
                if stock_quantity <= 0:
                    continue

                # Extract images (look for img tags near the product)
                image_urls = self._extract_images_from_spans(soup, span)

                # Create category
                category = self.infer_category_from_name(product_name)
                if category == 'Electronics Components':  # Too generic, skip
                    continue

                # Extract specifications
                specs = self._extract_specifications(product_name, "")

                # FINAL VALIDATION - Ensure product meets TypeScript interface requirements
                if not self._validate_final_product(product_name, category, price, stock_quantity):
                    continue

                product_data = {
                    'name': product_name,
                    'description': description or f"Electronic component: {product_name}",
                    'category': category,
                    'brand': 'Mantech',
                    'price': price,
                    'stock_quantity': stock_quantity,
                    'image_url': image_urls[0] if image_urls else '/placeholder.svg',
                    'primary_image_url': image_urls[0] if image_urls else '/placeholder.svg',
                    'images': image_urls,
                    'specifications': specs
                }

                products.append(product_data)

            except Exception as e:
                logger.warning(f"Error parsing product span {span_id}: {e}")
                continue

        return products

    def _validate_product_name(self, name: str) -> bool:
        """Strict validation for product names"""
        if not name or len(name) < 5 or len(name) > 120:
            return False

        # Must contain valid electronic component keywords
        valid_keywords = [
            'RESISTOR', 'CAPACITOR', 'TRANSISTOR', 'DIODE', 'IC', 'LED', 'CHIP',
            'RELAY', 'SWITCH', 'CONNECTOR', 'SENSOR', 'INDUCTOR', 'COIL',
            'POTENTIOMETER', 'FUSE', 'BATTERY', 'WIRE', 'CABLE', 'REGULATOR',
            'AMPLIFIER', 'OSCILLATOR', 'CRYSTAL', 'ANTENNA', 'MOTOR', 'SERVO',
            'DISPLAY', 'MODULE', 'BOARD', 'MICROCONTROLLER', 'OPTOCOUPLER',
            'PHOTOTRANSISTOR', 'PHOTODIODE', 'VARISTOR', 'THERMISTOR',
            'BUZZER', 'SPEAKER', 'MICROPHONE', 'TERMINAL', 'HEADER', 'SOCKET'
        ]

        if not any(keyword in name.upper() for keyword in valid_keywords):
            return False

        # Must NOT contain invalid content
        invalid_keywords = [
            'BID', 'SAVE', 'PACKAGE', 'STOCK CODE', 'PART NUMBER', 'MANUFACTURER',
            'MOQ', 'QTY', 'DISCOUNT', 'PRICE', 'DISPLAYING', 'RECORDS', 'VAT',
            'EXCLUSIVE', 'SUBJECT', 'CHANGE', 'NOTICE', 'RAND', 'ZAR', 'DELIVERY',
            'ENQUIRE', 'BRANCH', 'RESTOCKING', 'SOON', 'UNIT', 'EACH', 'BULK',
            'NEXT', 'LAST', 'PAGE', 'HOME', 'CONTACT', 'ABOUT', 'VACANCIES'
        ]

        if any(keyword in name.upper() for keyword in invalid_keywords):
            return False

        # Must have reasonable word count and structure
        words = name.split()
        if len(words) < 2 or len(words) > 15:
            return False

        return True

    def _extract_price_from_spans(self, soup: BeautifulSoup, index: str) -> Optional[float]:
        """Extract and validate price from spans"""
        # Look for price spans with pattern Label followed by index
        for label_num in ['44', '45', '46', '47', '48']:  # Common price label numbers
            price_span_id = f'ContentPlaceHolder1_GridView1_Label{label_num}_{index}'
            price_span = soup.find('span', id=price_span_id)
            if price_span:
                price_text = price_span.text.strip()
                price_match = re.search(r'(\d+(?:[.,]\d{1,2})?)', price_text)
                if price_match:
                    try:
                        price = float(price_match.group(1).replace(',', '.'))
                        if 0.1 <= price <= 5000:  # Reasonable price range
                            return price
                    except ValueError:
                        pass
        return None

    def _extract_stock_quantity_from_spans(self, soup: BeautifulSoup, index: str) -> int:
        """Extract stock quantity from spans"""
        # Look for stock spans with pattern Label followed by index
        for label_num in ['49', '50', '51', '52']:  # Common stock label numbers
            stock_span_id = f'ContentPlaceHolder1_GridView1_Label{label_num}_{index}'
            stock_span = soup.find('span', id=stock_span_id)
            if stock_span:
                stock_text = stock_span.text.strip()
                if stock_text.isdigit():
                    try:
                        qty = int(stock_text)
                        if 1 <= qty <= 1000:
                            return qty
                    except ValueError:
                        pass
        return 10  # Default

    def _extract_images_from_spans(self, soup: BeautifulSoup, product_span) -> List[str]:
        """Extract valid product images from spans"""
        image_urls = []
        # Look for images in the same table row or nearby
        parent_row = product_span.find_parent(['tr', 'div'])
        if parent_row:
            images = parent_row.find_all('img', src=True)
            for img in images:
                src = img.get('src')
                if src and len(src) > 10:
                    # Skip icons, logos, banners, buttons
                    if not any(skip in src.lower() for skip in ['icon', 'logo', 'banner', 'button', 'nav', 'menu', 'header', 'footer', 'arrow', 'search', 'cart']):
                        full_img_url = urljoin("https://mantech.co.za", src)
                        if full_img_url not in image_urls and 'http' in full_img_url and full_img_url.endswith(('.jpg', '.jpeg', '.png', '.gif')):
                            image_urls.append(full_img_url)
        return image_urls[:3]  # Limit to 3 images

    def _extract_specifications(self, product_name: str, manufacturer: str) -> Dict:
        """Extract technical specifications"""
        specs = {
            'import_date': time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
            'imported_from': 'mantech.co.za',
            'product_type': 'electronic_component'
        }

        if manufacturer and len(manufacturer) > 1 and manufacturer != '1.00':
            specs['manufacturer'] = manufacturer

        # Extract technical specs
        spec_patterns = {
            'resistance': r'(\d+(?:\.\d+)?)\s*(?:kΩ|Ω|MΩ|ohm|K|k)(?:\s*resistor)?',
            'capacitance': r'(\d+(?:\.\d+)?)\s*(?:µF|uF|nF|pF|mF|F)(?:\s*capacitor)?',
            'voltage': r'(\d+(?:\.\d+)?)\s*V(?:olt)?(?:\s*diode|\s*regulator|\s*zener)?',
            'current': r'(\d+(?:\.\d+)?)\s*(?:mA|A)(?:\s*diode|\s*regulator)?',
            'power': r'(\d+(?:\.\d+)?)\s*W(?:att)?(?:\s*resistor)?',
            'frequency': r'(\d+(?:\.\d+)?)\s*(?:MHz|kHz|Hz)(?:\s*crystal|\s*oscillator)?',
            'package': r'(?:DIP|SOP|SOIC|TO-?\d+|DO-?\d+)(?:\s*package)?',
            'pitch': r'(\d+(?:\.\d+)?)\s*mm(?:\s*pitch)?'
        }

        for spec_name, pattern in spec_patterns.items():
            match = re.search(pattern, product_name, re.IGNORECASE)
            if match:
                specs[spec_name] = match.group(1)

        return specs

    def _validate_final_product(self, name: str, category: str, price: float, stock_quantity: int) -> bool:
        """Final validation to ensure product meets all TypeScript interface requirements"""
        # Required fields validation
        if not name or not isinstance(name, str) or len(name.strip()) < 5:
            return False

        if not category or not isinstance(category, str) or len(category.strip()) < 3:
            return False

        if not isinstance(price, (int, float)) or price <= 0 or price > 10000:
            return False

        if not isinstance(stock_quantity, int) or stock_quantity <= 0:
            return False

        # Quality checks
        if len(name) > 120:  # Too long
            return False

        if category == 'Electronics Components':  # Too generic
            return False

        # Ensure it's a real electronic component
        electronic_indicators = ['resistor', 'capacitor', 'transistor', 'diode', 'ic', 'led', 'relay', 'switch', 'connector', 'sensor']
        if not any(indicator in name.lower() for indicator in electronic_indicators):
            return False

        return True

    def infer_category_from_name(self, product_name: str) -> str:
        """Infer product category from product name"""
        name_lower = product_name.lower()

        category_keywords = {
            'Resistors': ['resistor'],
            'Capacitors': ['capacitor'],
            'LEDs & Diodes': ['led', 'diode', 'light emitting'],
            'Transistors': ['transistor', 'mosfet', 'fet'],
            'Integrated Circuits': ['ic ', 'integrated circuit', 'microcontroller', 'arduino', 'chip'],
            'Sensors': ['sensor', 'detector', 'temperature', 'humidity', 'motion'],
            'Relays': ['relay'],
            'Switches': ['switch', 'button', 'toggle'],
            'Connectors': ['connector', 'header', 'socket', 'plug', 'jack'],
            'Wires & Cables': ['wire', 'cable', 'ribbon', 'lead'],
            'Tools': ['tool', 'multimeter', 'soldering', 'tester'],
            'Power Supplies': ['power', 'battery', 'supply', 'adapter', 'charger', 'regulator'],
            'Displays': ['display', 'lcd', 'oled', 'screen', 'segment'],
            'Motors': ['motor', 'servo', 'stepper', 'actuator'],
            'Audio': ['audio', 'speaker', 'amplifier', 'microphone'],
            'RF & Wireless': ['rf', 'wireless', 'antenna', 'bluetooth', 'wifi', 'gsm'],
            'Optoelectronics': ['opto', 'phototransistor', 'photodiode', 'coupler'],
            'Crystals & Oscillators': ['crystal', 'oscillator', 'resonator'],
            'Fuses & Circuit Protection': ['fuse', 'circuit breaker', 'varistor', 'protector']
        }

        for category, keywords in category_keywords.items():
            if any(keyword in name_lower for keyword in keywords):
                return category

        return 'Electronics Components'

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

    async def parse_product_page(self, url: str) -> Optional[Dict]:
        """Parse individual product page for clean product details only"""
        if url in self.processed_urls:
            return None
        self.processed_urls.add(url)

        soup = await self.get_page(url)
        if not soup:
            return None

        try:
            product_data = {}

            # Clean product name extraction - focus on table data like Mantech uses
            product_name = None

            # Primary method: extract from table structure (Mantech's format)
            tables = soup.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                for row in rows:
                    cols = row.find_all(['td', 'th'])
                    if len(cols) >= 4:  # Description column is usually 4th or 5th
                        # Look for description column containing product info
                        for col in cols[3:6]:  # Check columns 4-6 (0-indexed)
                            col_text = col.text.strip()

                            # Skip if it contains promotional content
                            if any(skip in col_text.upper() for skip in ['BID & SAVE', 'RESTOCKING SOON', 'ENQUIRE AT BRANCH', 'UNIT EACH', 'EXTRA DAYS FOR DELIVERY', 'NEXTLAST PAGE', 'PACKAGE STOCK CODE', 'PART NUMBER', 'MANUFACTURER', 'MOQ']):
                                continue

                            # Clean the text - remove any remaining unwanted content
                            col_text = re.sub(r'Restocking soon.*', '', col_text, flags=re.DOTALL | re.IGNORECASE)
                            col_text = re.sub(r'Enquire At Branch.*', '', col_text, flags=re.DOTALL | re.IGNORECASE)
                            col_text = re.sub(r'UnitEach.*', '', col_text, flags=re.DOTALL | re.IGNORECASE)
                            col_text = re.sub(r'\d+ extra days for delivery.*', '', col_text, flags=re.DOTALL | re.IGNORECASE)
                            col_text = re.sub(r'NextLast Page.*', '', col_text, flags=re.DOTALL | re.IGNORECASE)
                            col_text = col_text.strip()

                            # Must contain actual electronic component keywords
                            component_keywords = ['RESISTOR', 'CAPACITOR', 'TRANSISTOR', 'DIODE', 'IC', 'LED', 'RELAY', 'SWITCH', 'CONNECTOR', 'SENSOR', 'INDUCTOR', 'POTENTIOMETER', 'FUSE', 'BATTERY', 'WIRE', 'CABLE', 'REGULATOR', 'AMPLIFIER', 'OSCILLATOR', 'CRYSTAL', 'ANTENNA']

                            if (len(col_text) > 5 and len(col_text) < 200 and
                                any(keyword in col_text.upper() for keyword in component_keywords) and
                                not any(skip in col_text.upper() for skip in ['BID', 'SAVE', 'PACKAGE', 'STOCK CODE', 'PART NUMBER', 'MANUFACTURER'])):
                                product_name = col_text
                                break
                        if product_name:
                            break
                if product_name:
                    break

            # If no valid product name found, skip this product
            if not product_name:
                return None

            product_data['name'] = product_name

            # Clean description - only product-related information
            description = f"Electronic component: {product_name}"

            # Try to find additional product details from the page
            text_content = soup.get_text()

            # Remove all promotional and administrative content
            text_content = re.sub(r'Prices are exclusive of VAT.*?(?=Displaying|$)', '', text_content, flags=re.DOTALL | re.IGNORECASE)
            text_content = re.sub(r'Displaying records \d+ to \d+.*?(?=\d|\w|$)', '', text_content, flags=re.DOTALL | re.IGNORECASE)
            text_content = re.sub(r'DescriptionQty DiscountPrice.*?(?=\d|\w|$)', '', text_content, flags=re.DOTALL | re.IGNORECASE)
            text_content = re.sub(r'Restocking soon.*?(?=Enquire|$)', '', text_content, flags=re.DOTALL | re.IGNORECASE)
            text_content = re.sub(r'Enquire At Branch.*?(?=Unit|$)', '', text_content, flags=re.DOTALL | re.IGNORECASE)
            text_content = re.sub(r'UnitEach.*?(?=\d|\w|$)', '', text_content, flags=re.DOTALL | re.IGNORECASE)
            text_content = re.sub(r'\d+ extra days for delivery.*?(?=\d|\w|$)', '', text_content, flags=re.DOTALL | re.IGNORECASE)
            text_content = re.sub(r'BID & SAVE.*?(?=Bargain|$)', '', text_content, flags=re.DOTALL | re.IGNORECASE)
            text_content = re.sub(r'Bargain items are already at a well reduced price.*?(?=\d|\w|$)', '', text_content, flags=re.DOTALL | re.IGNORECASE)

            # Extract meaningful technical details
            lines = []
            for line in text_content.split('\n'):
                line = line.strip()
                # Skip promotional, pricing, or administrative content
                if (len(line) > 10 and len(line) < 300 and
                    not any(skip in line.upper() for skip in ['VAT', 'ZAR', 'RAND', 'R ', 'PRICE', 'EXCLUSIVE', 'SUBJECT', 'NOTICE', 'RESTOCKING', 'ENQUIRE', 'DELIVERY', 'DISPLAYING', 'RECORDS', 'QTY', 'DISCOUNT', 'PER', 'SOLD IN', 'BID', 'SAVE', 'PACKAGE', 'STOCK CODE', 'PART NUMBER', 'MANUFACTURER', 'MOQ'])):
                    # Look for technical specifications
                    if any(tech in line.upper() for tech in ['RESISTOR', 'CAPACITOR', 'VOLTAGE', 'CURRENT', 'POWER', 'SIZE', 'DIMENSIONS', 'PACKAGE', 'MOUNTING', 'TEMPERATURE', 'TOLERANCE', 'FREQUENCY', 'IMPEDANCE', 'GAIN', 'OUTPUT', 'INPUT']):
                        lines.append(line)

            if lines:
                description += ". " + " ".join(lines[:2])  # Add up to 2 technical details

            product_data['description'] = description

            # Clean price - just numeric value, no currency
            price = 0.0
            # Look for numeric prices without currency mentions in descriptions
            price_match = re.search(r'(\d+(?:[.,]\d{1,2})?)', soup.get_text())
            if price_match:
                try:
                    price = float(price_match.group(1).replace(',', '.'))
                    if price < 1:  # If price seems too low, use a reasonable default
                        price = 25.0
                    elif price > 10000:  # If price seems too high, cap it
                        price = 1000.0
                except ValueError:
                    price = 25.0
            else:
                price = 25.0  # Default price for electronic components

            product_data['price'] = price

            # Stock quantity - reasonable default
            product_data['stock_quantity'] = 50  # Default stock

            # Images - download clean product images only
            image_urls = []
            images = soup.find_all('img', src=True)

            for img in images:
                src = img.get('src')
                if src:
                    # Skip icons, logos, banners, buttons
                    if any(skip in src.lower() for skip in ['icon', 'logo', 'banner', 'button', 'nav', 'menu', 'header', 'footer']):
                        continue

                    # Only include reasonable product images
                    if len(src) > 15 and not src.endswith(('.gif', '.png')):  # Prefer JPG images
                        full_img_url = urljoin(url, src)
                        if full_img_url not in image_urls and 'http' in full_img_url:
                            image_urls.append(full_img_url)

            # Download images and get Supabase URLs (limit to 2 per product)
            supabase_image_urls = []
            for img_url in image_urls[:2]:
                supabase_url = await self.download_image_to_supabase(img_url, product_data['name'])
                if supabase_url:
                    supabase_image_urls.append(supabase_url)

            product_data['image_urls'] = supabase_image_urls
            product_data['primary_image_url'] = supabase_image_urls[0] if supabase_image_urls else None

            # Category - infer from product name and content
            product_data['category'] = self.infer_category(url, soup, product_name)

            # Brand - default to Mantech for all products from this site
            product_data['brand'] = 'Mantech'

            # Clean specifications - only technical specs
            specs = {
                'import_date': time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
                'imported_from': 'mantech.co.za',
                'product_type': 'electronic_component'
            }

            # Try to extract basic technical specs
            spec_patterns = {
                'voltage': r'(\d+(?:\.\d+)?)\s*V(?:olt)?(?:s)?',
                'current': r'(\d+(?:\.\d+)?)\s*(?:mA|A)(?:\s*current)?',
                'power': r'(\d+(?:\.\d+)?)\s*W(?:att)?(?:s)?',
                'resistance': r'(\d+(?:\.\d+)?)\s*(?:kΩ|Ω|MΩ|ohm)(?:\s*resistance)?'
            }

            text_content = soup.get_text()
            for spec_name, pattern in spec_patterns.items():
                match = re.search(pattern, text_content, re.IGNORECASE)
                if match:
                    specs[spec_name] = match.group(1)

            product_data['specifications'] = specs

            return product_data

        except Exception as e:
            logger.error(f"Error parsing product page {url}: {e}")
            return None

    def infer_category(self, url: str, soup: BeautifulSoup, product_name: str = "") -> str:
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
            # Get system admin user ID (no seller required)
            user_result = supabase.table('profiles').select('id').eq('email', 'vinnywalker96@gmail.com').execute()

            if not user_result.data:
                raise ValueError("System admin user not found")

            admin_user_id = user_result.data[0]['id']

            for i in range(0, len(products), BATCH_SIZE):
                batch = products[i:i + BATCH_SIZE]

                # Prepare batch data - no seller_id needed for system products
                batch_data = []
                for product in batch:
                    db_product = {
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

    async def scrape_all_products(self):
        """Main scraping function - find product URLs and scrape individual pages"""
        logger.info("Starting complete Mantech product catalog scraping...")

        # Find all product URLs
        all_product_urls = await self.find_all_products()

        if not all_product_urls:
            logger.warning("No products found. Please check the website structure.")
            return

        logger.info(f"Found {len(all_product_urls)} product URLs")

        # Process products in batches
        total_processed = 0

        for i in range(0, len(all_product_urls), BATCH_SIZE):
            batch_urls = all_product_urls[i:i + BATCH_SIZE]
            logger.info(f"Processing batch {i//BATCH_SIZE + 1}/{(len(all_product_urls) + BATCH_SIZE - 1)//BATCH_SIZE}")

            # Scrape products from this batch of URLs
            batch_products = []
            for url in batch_urls:
                product = await self.parse_product_page(url)
                if product:
                    batch_products.append(product)

            logger.info(f"Extracted {len(batch_products)} products from batch")

            # Download images for this batch
            for product in batch_products:
                if product.get('image_urls'):
                    supabase_image_urls = []
                    for img_url in product['image_urls'][:2]:  # Limit to 2 images per product
                        supabase_url = await self.download_image_to_supabase(img_url, product['name'])
                        if supabase_url:
                            supabase_image_urls.append(supabase_url)

                    product['image_urls'] = supabase_image_urls
                    product['primary_image_url'] = supabase_image_urls[0] if supabase_image_urls else '/placeholder.svg'

            # Save batch to database
            if batch_products:
                await self.save_to_database_batch(batch_products)
                total_processed += len(batch_products)

            logger.info(f"Processed {total_processed}/{len(all_product_urls)} products so far ({self.total_images_downloaded} images downloaded)")

            # Small delay between batches to be respectful
            await asyncio.sleep(1.0)

        self.total_products_scraped = total_processed
        logger.info(f"Scraping completed! Total valid products scraped: {self.total_products_scraped}, Images downloaded: {self.total_images_downloaded}")

async def main():
    async with MantechScraper() as scraper:
        await scraper.scrape_all_products()

if __name__ == "__main__":
    asyncio.run(main())