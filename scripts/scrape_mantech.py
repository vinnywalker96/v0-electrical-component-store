#!/usr/bin/env python3
import asyncio
import aiohttp
from bs4 import BeautifulSoup
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import re

# Load environment variables from .env.local file
load_dotenv('.env.local')

# Supabase setup
url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def add_stock_code_column():
    """
    Checks for the stock_code column in the products table.
    This is a workaround for the failing node-based migration scripts.
    """
    try:
        # Check if the column exists
        supabase.table("products").select("stock_code").limit(1).execute()
        print("Column 'stock_code' already exists in 'products' table.")
        return True
    except Exception as e:
        # If the select fails, the column probably doesn't exist.
        print("Column 'stock_code' not found.")
        print("Please ensure the 'stock_code' column has been added to the 'products' table by running the migration.")
        print("I have created the migration file at 'scripts/012_add_stock_code_to_products.sql', but was unable to run it.")
        print("The scraper will not run without this column.")
        return False

async def scrape_and_save():
    """
    Scrapes product data from Mantech and saves it to the Supabase database.
    """
    if not add_stock_code_column():
        return

    async with aiohttp.ClientSession() as session:
        # Start with the main categories page
        async with session.get('https://www.mantech.co.za/Categories.aspx') as response:
            html = await response.text()
            soup = BeautifulSoup(html, 'html.parser')

            # Find the table containing the products (heuristic from test_page.py)
            tables = soup.find_all('table')
            if len(tables) > 18:
                table = tables[18]
                rows = table.find_all('tr')
                print(f'Found product table with {len(rows)} rows.')

                products_to_upsert = []

                for row in rows:
                    cols = row.find_all(['td', 'th'])
                    if len(cols) >= 8:
                        row_text = ' '.join(col.text for col in cols)
                        
                        # Skip header rows
                        if 'Description' in row_text or 'Stock Code' in row_text or 'Package' in row_text:
                            continue

                        # Extract data
                        stock_code = cols[0].text.strip()
                        description = cols[1].text.strip()
                        
                        # Price is tricky, it has 'R' and might have ','
                        price_str = cols[5].text.strip().replace('R', '').replace(',', '')
                        price = 0.0
                        if price_str:
                            try:
                                price = float(price_str)
                            except ValueError:
                                print(f"Could not parse price for {stock_code}: {price_str}")
                                continue

                        # Stock can be "In Stock" or a number
                        stock_str = cols[6].text.strip()
                        stock_quantity = 0
                        if stock_str.lower() == 'in stock':
                            stock_quantity = 100 # Assume a high number
                        else:
                            try:
                                stock_quantity = int(re.sub(r'\D', '', stock_str))
                            except ValueError:
                                stock_quantity = 0


                        if stock_code and description and price > 0:
                            product = {
                                "stock_code": stock_code,
                                "name": description.splitlines()[0],  # Take the first line as name
                                "description": description,
                                "price": price,
                                "stock_quantity": stock_quantity,
                                "category": "Electronic Components", # General category for now
                                "brand": "Mantech", # Assuming all are Mantech brand
                                "image_url": None, # No images on this page
                                "specifications": None, # No specs on this page
                            }
                            products_to_upsert.append(product)

                if products_to_upsert:
                    print(f"Found {len(products_to_upsert)} products to upsert.")
                    try:
                        data, error = supabase.table('products').upsert(products_to_upsert, on_conflict='stock_code').execute()
                        if error and error.message:
                             # Check if the error is about the column not existing
                            if 'column "stock_code" does not exist' in error.message:
                                print("The 'stock_code' column is missing. Please add it to the 'products' table.")
                                print("ALTER TABLE public.products ADD COLUMN stock_code TEXT UNIQUE;")
                            else:
                                print(f"Error upserting data: {error}")
                        else:
                            print("Successfully upserted data to Supabase.")
                    except Exception as e:
                        print(f"An exception occurred during upsert: {e}")


if __name__ == '__main__':
    asyncio.run(scrape_and_save())
