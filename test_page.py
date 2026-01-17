#!/usr/bin/env python3
import asyncio
import aiohttp
from bs4 import BeautifulSoup

async def test_page():
    async with aiohttp.ClientSession() as session:
        async with session.get('https://www.mantech.co.za/Categories.aspx') as response:
            html = await response.text()
            soup = BeautifulSoup(html, 'html.parser')

            # Look specifically at table 18 which seems to contain products
            tables = soup.find_all('table')
            if len(tables) > 18:
                table = tables[18]  # The product table
                rows = table.find_all('tr')
                print(f'Examining product table with {len(rows)} rows:')

                # Skip header rows and look for actual product rows
                product_count = 0
                for i, row in enumerate(rows):
                    cols = row.find_all(['td', 'th'])
                    if len(cols) >= 8:  # Product rows have many columns
                        row_text = row.text.strip()
                        # Skip header rows
                        if 'Description' in row_text or 'Stock Code' in row_text or 'Package' in row_text:
                            continue

                        # Look for rows with actual product content
                        if len(row_text) > 50 and any(keyword in row_text.upper() for keyword in ['RESISTOR', 'CAPACITOR', 'DIODE', 'IC', 'LED', 'TRANSISTOR']):
                            print(f'Product row {i}: {row_text[:400]}...')
                            product_count += 1
                            if product_count >= 5:  # Show first 5 products
                                break

                print(f'Found {product_count} sample products in the table')

                # Also check what the columns look like
                if rows:
                    first_product_row = None
                    for row in rows:
                        if len(row.find_all(['td', 'th'])) >= 8:
                            row_text = row.text.strip()
                            if len(row_text) > 100 and not any(header in row_text for header in ['Description', 'Stock Code', 'Package']):
                                first_product_row = row
                                break

                    if first_product_row:
                        cols = first_product_row.find_all(['td', 'th'])
                        print(f'\nFirst product row has {len(cols)} columns:')
                        for j, col in enumerate(cols):
                            col_text = col.text.strip()
                            if col_text:
                                print(f'  Col {j}: "{col_text[:100]}..."')

asyncio.run(test_page())
