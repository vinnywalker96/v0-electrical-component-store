#!/bin/bash
# Install Python dependencies and run the scraper

echo "Activating virtual environment..."
source scraper_env/bin/activate

echo "Installing Python dependencies..."
python3 -m pip install -r requirements.txt

echo "Running Mantech scraper..."
python3 scripts/scrape-mantech-python.py

echo "Deactivating virtual environment..."
deactivate