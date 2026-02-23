import json
import http.client
import urllib.parse
import os
import re

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

# Configuration
url = "https://anxjefehhzpczieewwei.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueGplZmVoaHpwY3ppZWV3d2VpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODU4MDkzOSwiZXhwIjoyMDg0MTU2OTM5fQ.JzH7JxpecZ0vai1al8MH_zgHCSF-Ong7xdZ9RopuZGs"

host = url.replace('https://', '').replace('http://', '').split('/')[0]

def supabase_get(table, params):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    query = urllib.parse.urlencode(params)
    conn = http.client.HTTPSConnection(host)
    conn.request("GET", f"/rest/v1/{table}?{query}", headers=headers)
    response = conn.getresponse()
    resp_data = response.read().decode()
    if response.status != 200:
        return None
    return json.loads(resp_data)

def supabase_upsert(table, data, on_conflict="slug"):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": f"return=representation,resolution=merge-duplicates"
    }
    conn = http.client.HTTPSConnection(host)
    conn.request("POST", f"/rest/v1/{table}", json.dumps(data), headers)
    response = conn.getresponse()
    resp_data = response.read().decode()
    
    if response.status in (200, 201):
        return json.loads(resp_data)
    
    if response.status == 409: # Conflict
        # Fallback: Try to get the existing record
        print(f"  Conflict detected for {data.get('name')}, fetching existing...")
        existing = supabase_get(table, {on_conflict: f"eq.{data[on_conflict]}", "select": "id"})
        if existing and len(existing) > 0:
            return existing
            
    print(f"Error upserting to {table}: {response.status} {resp_data}")
    return None

categories_data = [
    {
        "name": "Switches Series",
        "subcategories": ["DIP", "Toggle", "Push-button", "Power", "Keylock", "Rocker", "Illuminated Rocker", "Slide", "Tact", "Rotary", "Micro", "Limit", "Illuminated Push-button", "Proximity", "Reed-Alarm"]
    },
    {
        "name": "Audio connector series",
        "subcategories": ["Binding Post", "Fuse & Fuse Holder", "Thermal Cutoff", "Sub-miniature Fuse", "Resettable Fuse", "Ac Socket", "EMI Filters", "Clip", "RCA Phono Plug & Jack", "Screw Terminal", "Push Terminal", "Phone Plug & Jack", "Banana Plug", "Adaptor", "Auto Antenna Plug & Jack", "DC Plug & Jack", "DIN Plug & Socket", "Optical Adapter & Modules", "Convert Plug", "Universal Adapter"]
    },
    {
        "name": "Audio video cable series",
        "subcategories": ["Test Lead Set", "Oscilloscope Probe Kit", "Audio Cable", "Plastic Fiber Optic Cable", "Power Supply Cord", "Auto Cable", "Video Cable"]
    },
    {
        "name": "RF Connector",
        "subcategories": ["SMA", "SSMA", "SMB", "SSMB", "SMC", "SMP", "SMPM", "MCX", "MMCX", "K", "UHF & Mini UHF", "BNC & Mini BNC & Twin-BNC", "F", "N", "TNC", "Components For Antenna", "Twinaxial", "1.0", "2.3", "1.6", "5.6", "Reverse Polarity", "Technician Adapter Kit", "Solderless Cable", "MIC", "TV Plug & Jack", "Antenna", "RF Cable", "Waterproof M12 Connector", "Scart Adaptor", "Circular Power Connector"]
    },
    {
        "name": "Battery, VR, Light, Knob, Buzzer, Tel. Accessories",
        "subcategories": ["Battery Holder", "Circuit Protector", "Thermostat", "Relay", "Relay Socket", "Variable Resistor", "Trimming Potentiometer", "Rotary Encoder", "Neon Indicator Light", "Neon Lamp", "Vibration Switch", "LED", "LCD Module", "Knob", "Buzzer", "Siren", "Terminal Block", "Telephone Accessories"]
    },
    {
        "name": "Computer Connector series",
        "subcategories": ["Micro USB & USB 3.0", "3.1 & IEEE 1394 & Displayport & HDMI", "D-SUB", "Centronic", "Hard Metric", "Futurebus", "DIN 41612", "Edge", "DIMM & SIMM", "IC Socket", "Chip Carrier", "Pin Strip", "Header & SATA", "Housing", "Terminal", "Wafer", "SIM Card", "Memory Card", "DVI", "V.35", "Gender Changer", "Extension Cable", "Flat Cable", "Solderless Breadboard", "Card Reader", "Data Switch", "Electronic Educational Systems"]
    },
    {
        "name": "Semiconductors series",
        "subcategories": ["Diode", "Bridge Rectifier", "Thyristor", "Triac", "Transistor", "Integrated Circuit", "CMOS", "TTL", "Resistor", "Capacitor", "DC / DC Converter"]
    },
    {
        "name": "Equipment & Tool series",
        "subcategories": ["Cable", "Amplifier", "Electret Condenser Microphone", "Speaker", "Wiring Accessories", "Solderless Terminal", "Plastic & Metal Screw", "Heat Sink", "Magnetic Levitation Cooling Fan", "Soldering Tool", "Glue Gun", "Anti-Statics Accessories", "Hand Tool", "Screwdriver", "Mini Plier", "Tool", "Universal PC Board", "Universal Project Box", "Components Storage Box", "Maintenance Free Batteries", "DC Motor", "AC & DC Adaptor", "Solar Charger & Inverter & Module", "Programmer", "Tester", "Eraser", "Test Equipment", "Digital Multi Meter", "Oscilloscope"]
    }
]

def seed():
    print("Starting category seeding...")
    for main in categories_data:
        main_slug = slugify(main["name"])
        print(f"Processing Main Category: {main['name']}")
        
        main_cat = supabase_upsert("categories", {
            "name": main["name"],
            "name_pt": main["name"],
            "slug": main_slug,
            "level": 1
        })
        
        if not main_cat or len(main_cat) == 0:
            print(f"Error: Failed to upsert/retrieve main category {main['name']}")
            continue
            
        parent_id = main_cat[0]["id"]
        
        for sub in main["subcategories"]:
            sub_slug = f"{main_slug}-{slugify(sub)}"
            print(f"  Processing Subcategory: {sub}")
            
            supabase_upsert("categories", {
                "name": sub,
                "name_pt": sub,
                "parent_id": parent_id,
                "slug": sub_slug,
                "level": 2
            })
            
    print("Seeding completed!")

if __name__ == "__main__":
    seed()
