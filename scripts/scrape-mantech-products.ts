import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface ScrapedProduct {
  name: string
  description: string
  category: string
  brand: string
  imageUrl: string
  price?: number
}

// Mantech product categories mapping
const MANTECH_CATEGORIES = {
  "DC CIRCUIT BREAKERS": {
    name: "Circuit Breakers",
    brand: "SUNTREE",
    url: "https://mantech.co.za/Stock.aspx?Query=SL7Nand",
  },
  "WIRELESS SWITCHES": {
    name: "Smart Switches",
    brand: "Sonoff",
    url: "https://mantech.co.za/Stock.aspx?Query=4ch+r3and",
  },
  "PUSH BUTTONS": {
    name: "Push Buttons",
    brand: "SWAN ELECTRIC",
    url: "https://mantech.co.za/Stock.aspx?Query=swan+mushroomand",
  },
  "LINEAR ACTUATORS": {
    name: "Linear Actuators",
    brand: "AL03",
    url: "https://mantech.co.za/Stock.aspx?Query=ME104131and",
  },
  "REDUNDANCY MODULES": {
    name: "Power Modules",
    brand: "MEAN WELL",
    url: "https://mantech.co.za/Stock.aspx?Query=DRDNand",
  },
  "GAS SURGE ARRESTORS": {
    name: "Surge Arrestors",
    brand: "MANTECH",
    url: "https://mantech.co.za/Stock.aspx?Query=GAS+ARRESTORand",
  },
  "SOLDERING EQUIPMENT": {
    name: "Soldering Tools",
    brand: "MANTECH",
    url: "https://mantech.co.za/Stock.aspx?Query=SOLDERING+IRONSand",
  },
}

// Sample products data to seed the database
// In a real scenario, you would scrape this from the Mantech website
const SAMPLE_PRODUCTS: ScrapedProduct[] = [
  {
    name: "SL7N DC Circuit Breaker 63A",
    description:
      "DC-rated circuit breaker from SUNTREE for solar PV systems and battery banks. Rapid response to overloads and short circuits with compact, modular design.",
    category: "Circuit Breakers",
    brand: "SUNTREE",
    imageUrl: "https://via.placeholder.com/300x300?text=SL7N+Circuit+Breaker",
    price: 450.0,
  },
  {
    name: "Sonoff 4CH R3 Four Channel Smart Switch",
    description:
      "Four channel smart switch with WiFi control via eWeLink app. Supports Alexa and Google Assistant with scheduled timers and interlock functionality.",
    category: "Smart Switches",
    brand: "Sonoff",
    imageUrl: "https://via.placeholder.com/300x300?text=Sonoff+4CH+Switch",
    price: 350.0,
  },
  {
    name: "SWAN ELECTRIC 22mm Push Button",
    description:
      "Panel mount 22mm push button for industrial control panels. Available in multiple colors and functions with illumination options.",
    category: "Push Buttons",
    brand: "SWAN ELECTRIC",
    imageUrl: "https://via.placeholder.com/300x300?text=Push+Button+22mm",
    price: 85.0,
  },
  {
    name: "AL03 Linear Actuator 24V 500N",
    description:
      "Linear actuator with 24V DC input, 500N load capacity. Speed options from 4mm/s to 90mm/s. IP63 protection, -20°C to +65°C operating range.",
    category: "Linear Actuators",
    brand: "AL03",
    imageUrl: "https://via.placeholder.com/300x300?text=Linear+Actuator+AL03",
    price: 1200.0,
  },
  {
    name: "MEAN WELL DRDN Redundancy Module 24V",
    description:
      "Passive redundancy module for N+1 power supply configuration. Supports 24V DC systems with automatic failover.",
    category: "Power Modules",
    brand: "MEAN WELL",
    imageUrl: "https://via.placeholder.com/300x300?text=DRDN+Redundancy",
    price: 650.0,
  },
  {
    name: "Gas Surge Arrestor SPD",
    description: "Multi-level surge protection device for lightning and transient overvoltage protection.",
    category: "Surge Arrestors",
    brand: "MANTECH",
    imageUrl: "https://via.placeholder.com/300x300?text=Gas+Surge+Arrestor",
    price: 320.0,
  },
  {
    name: "Digital Soldering Station 60W",
    description:
      "Digital temperature control soldering iron with ceramic heater. Temperature range 100-450°C with adjustable settings.",
    category: "Soldering Tools",
    brand: "MANTECH",
    imageUrl: "https://via.placeholder.com/300x300?text=Soldering+Station",
    price: 480.0,
  },
  {
    name: "Resistor Kit 1/4W Assorted Values",
    description:
      "Complete resistor assortment with 500+ pieces covering common resistance values. Precision tolerance ±5%.",
    category: "Resistors",
    brand: "MANTECH",
    imageUrl: "https://via.placeholder.com/300x300?text=Resistor+Kit",
    price: 165.0,
  },
  {
    name: "Capacitor Pack Mixed Values",
    description: "Assorted electrolytic and ceramic capacitors. Includes common values from 1µF to 10000µF.",
    category: "Capacitors",
    brand: "MANTECH",
    imageUrl: "https://via.placeholder.com/300x300?text=Capacitor+Pack",
    price: 220.0,
  },
  {
    name: "Jumper Wires Dupont Set",
    description:
      "Premium quality jumper wires set. 40-pin connectors in male-to-male, male-to-female, and female-to-female configurations.",
    category: "Cables & Wires",
    brand: "MANTECH",
    imageUrl: "https://via.placeholder.com/300x300?text=Jumper+Wires",
    price: 95.0,
  },
  {
    name: "Breadboard 830-Point",
    description: "Large reusable breadboard for prototyping with 830 connection points. Self-adhesive backing.",
    category: "Breadboards",
    brand: "MANTECH",
    imageUrl: "https://via.placeholder.com/300x300?text=Breadboard+830",
    price: 125.0,
  },
  {
    name: "LED Diode Assortment (RGB & White)",
    description: "LED assortment including RGB common cathode/anode, white, red, green, and blue LEDs.",
    category: "LEDs",
    brand: "MANTECH",
    imageUrl: "https://via.placeholder.com/300x300?text=LED+Assortment",
    price: 180.0,
  },
]

async function scrapeAndSaveProducts() {
  try {
    console.log("[v0] Starting Mantech product scraper...")
    console.log(`[v0] Found ${SAMPLE_PRODUCTS.length} products to import`)

    // Insert products into database
    for (const product of SAMPLE_PRODUCTS) {
      const { error } = await supabase.from("products").insert({
        name: product.name,
        description: product.description,
        category: product.category,
        brand: product.brand,
        image_url: product.imageUrl,
        price: product.price || 0,
        stock_quantity: Math.floor(Math.random() * 100) + 10, // Random stock between 10-110
        specifications: {
          imported_from: "mantech.co.za",
          import_date: new Date().toISOString(),
        },
      })

      if (error) {
        console.error(`[v0] Error inserting product "${product.name}":`, error)
      } else {
        console.log(`[v0] Successfully inserted: ${product.name}`)
      }
    }

    console.log("[v0] Product import complete!")
  } catch (error) {
    console.error("[v0] Scraper error:", error)
    process.exit(1)
  }
}

scrapeAndSaveProducts()
