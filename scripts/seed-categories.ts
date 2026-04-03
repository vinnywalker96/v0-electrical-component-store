import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables.")
}

const supabase = createClient(supabaseUrl, supabaseKey)

const categoriesData = [
  {
    name: "Switches Series",
    subcategories: [
      "DIP", "Toggle", "Push-button", "Power", "Keylock", "Rocker",
      "Illuminated Rocker", "Slide", "Tact", "Rotary", "Micro", "Limit",
      "Illuminated Push-button", "Proximity", "Reed-Alarm"
    ]
  },
  {
    name: "Audio connector series",
    subcategories: [
      "Binding Post", "Fuse & Fuse Holder", "Thermal Cutoff", "Sub-miniature Fuse",
      "Resettable Fuse", "Ac Socket", "EMI Filters", "Clip", "RCA Phono Plug & Jack",
      "Screw Terminal", "Push Terminal", "Phone Plug & Jack", "Banana Plug", "Adaptor",
      "Auto Antenna Plug & Jack", "DC Plug & Jack", "DIN Plug & Socket", 
      "Optical Adapter & Modules", "Convert Plug", "Universal Adapter"
    ]
  },
  {
    name: "Audio video cable series",
    subcategories: [
      "Test Lead Set", "Oscilloscope Probe Kit", "Audio Cable", "Plastic Fiber Optic Cable",
      "Power Supply Cord", "Auto Cable", "Video Cable"
    ]
  },
  {
    name: "RF Connector",
    subcategories: [
      "SMA", "SSMA", "SMB", "SSMB", "SMC", "SMP", "SMPM", "MCX", "MMCX", "K",
      "UHF & Mini UHF", "BNC & Mini BNC & Twin-BNC", "F", "N", "TNC",
      "Components For Antenna", "Twinaxial", "1.0 / 2.3 / 1.6 / 5.6",
      "Reverse Polarity", "Technician Adapter Kit", "Solderless Cable",
      "MIC", "TV Plug & Jack", "Antenna", "RF Cable", "Waterproof M12 Connector",
      "Scart Adaptor", "Circular Power Connector"
    ]
  },
  {
    name: "Battery, VR, Light, Knob, Buzzer, Tel. Accessories",
    subcategories: [
      "Battery Holder", "Circuit Protector", "Thermostat", "Relay", "Relay Socket",
      "Variable Resistor", "Trimming Potentiometer", "Rotary Encoder",
      "Neon Indicator Light", "Neon Lamp", "Vibration Switch", "LED",
      "LCD Module", "Knob", "Buzzer", "Siren", "Terminal Block", "Telephone Accessories"
    ]
  },
  {
    name: "Computer Connector series",
    subcategories: [
      "Micro USB & USB 3.0", "3.1 & IEEE 1394 & Displayport & HDMI", "D-SUB",
      "Centronic", "Hard Metric", "Futurebus", "DIN 41612", "Edge", "DIMM & SIMM",
      "IC Socket", "Chip Carrier", "Pin Strip", "Header & SATA", "Housing", "Terminal",
      "Wafer", "SIM Card", "Memory Card", "DVI", "V.35", "Gender Changer",
      "Extension Cable", "Flat Cable", "Solderless Breadboard", "Card Reader",
      "Data Switch", "Electronic Educational Systems"
    ]
  },
  {
    name: "Semiconductors series",
    subcategories: [
      "Diode", "Bridge Rectifier", "Thyristor", "Triac", "Transistor",
      "Integrated Circuit", "CMOS", "TTL", "Resistor", "Capacitor", "DC", "DC Converter"
    ]
  },
  {
    name: "Equipment & Tool series",
    subcategories: [
      "Cable", "Amplifier", "Electret Condenser Microphone", "Speaker",
      "Wiring Acessories", "Solderless Terminal", "Plastic & Metal Screw",
      "Heat Sink", "Magnetic Levitation Cooling Fan", "Soldering Tool", "Glue Gun",
      "Anti-Statics Accessories", "Hand Tool", "Screwdriver", "Mini Plier", "Tool",
      "Universal PC Board", "Universal Project Box", "Components Storage Box",
      "Maintenance Free Batteries", "DC Motor", "AC & DC Adaptor",
      "Solar Charger & Inverter & Module", "Programmer", "Tester", "Eraser",
      "Test Equipment", "Digital Multi Meter", "Oscilloscope"
    ]
  }
]

function generateSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
}

async function run() {
  console.log("Fetching existing categories...")
  
  const { data: existingCategories, error: fetchErr } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .limit(5000)

  if (fetchErr) {
    console.error("Error fetching categories:", fetchErr)
    return
  }

  const existingMap = new Map()
  
  for (const c of existingCategories) {
    if (c.slug) {
      existingMap.set(c.slug, c)
    }
  }

  let addedMain = 0
  let addedSub = 0

  for (const group of categoriesData) {
    // 1. Check or Insert Main Category
    const mainCategoryName = group.name.trim()
    const mainSlug = generateSlug(mainCategoryName)
    let parentId = null

    console.log(`Processing MAIN category: ${mainCategoryName}`)
    const { data: newMain, error: upsertMainErr } = await supabase
      .from("categories")
      .upsert({ name: mainCategoryName, slug: mainSlug }, { onConflict: 'slug', ignoreDuplicates: false })
      .select()
      .single()
      
    if (upsertMainErr) {
      console.error(`Failed to upsert main category ${mainCategoryName}:`, upsertMainErr)
      continue
    }
    
    parentId = newMain.id
    addedMain++;

    // 2. Check or Insert Subcategories
    if (parentId) {
      for (const sub of group.subcategories) {
        const subName = sub.trim()
        const subSlug = generateSlug(`${mainCategoryName}-${subName}`)

        try {
          // Upsert subcategories natively
          const { error: upsertSubErr } = await supabase
            .from("categories")
            .upsert({ name: subName, slug: subSlug, parent_id: parentId }, { onConflict: 'slug', ignoreDuplicates: true })
            
          if (upsertSubErr) {
            console.error(`Failed to upsert subcategory ${subName}:`, upsertSubErr)
          } else {
            addedSub++
          }
        } catch(err) {
          console.error('Unhandled upsert sub', err)
        }
      }
    }
  }

  console.log(`Done! Added ${addedMain} main categories and ${addedSub} subcategories.`)
}

run()
