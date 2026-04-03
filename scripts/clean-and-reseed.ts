import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

const categories = [
  {
    name: "Switches Series",
    subs: ["DIP","Toggle","Push-button","Power","Keylock","Rocker","Illuminated Rocker","Slide","Tact","Rotary","Micro","Limit","Illuminated Push-button","Proximity","Reed-Alarm"]
  },
  {
    name: "Audio Connector Series",
    subs: ["Binding Post","Fuse & Fuse Holder","Thermal Cutoff","Sub-miniature Fuse","Resettable Fuse","AC Socket","EMI Filters","Clip","RCA Phono Plug & Jack","Screw Terminal","Push Terminal","Phone Plug & Jack","Banana Plug","Adaptor","Auto Antenna Plug & Jack","DC Plug & Jack","DIN Plug & Socket","Optical Adapter & Modules","Convert Plug","Universal Adapter"]
  },
  {
    name: "Audio Video Cable Series",
    subs: ["Test Lead Set","Oscilloscope Probe Kit","Audio Cable","Plastic Fiber Optic Cable","Power Supply Cord","Auto Cable","Video Cable"]
  },
  {
    name: "RF Connector",
    subs: ["SMA","SSMA","SMB","SSMB","SMC","SMP","SMPM","MCX","MMCX","K","UHF & Mini UHF","BNC & Mini BNC & Twin-BNC","F","N","TNC","Components For Antenna","Twinaxial","1.0/2.3/1.6/5.6","Reverse Polarity","Technician Adapter Kit","Solderless Cable","MIC","TV Plug & Jack","Antenna","RF Cable","Waterproof M12 Connector","Scart Adaptor","Circular Power Connector"]
  },
  {
    name: "Battery, VR, Light, Knob, Buzzer & Tel. Accessories",
    subs: ["Battery Holder","Circuit Protector","Thermostat","Relay","Relay Socket","Variable Resistor","Trimming Potentiometer","Rotary Encoder","Neon Indicator Light","Neon Lamp","Vibration Switch","LED","LCD Module","Knob","Buzzer","Siren","Terminal Block","Telephone Accessories"]
  },
  {
    name: "Computer Connector Series",
    subs: ["Micro USB & USB 3.0","IEEE 1394 & Displayport & HDMI","D-SUB","Centronic","Hard Metric","Futurebus","DIN 41612","Edge","DIMM & SIMM","IC Socket","Chip Carrier","Pin Strip","Header & SATA","Housing","Terminal","Wafer","SIM Card","Memory Card","DVI","V.35","Gender Changer","Extension Cable","Flat Cable","Solderless Breadboard","Card Reader","Data Switch","Electronic Educational Systems"]
  },
  {
    name: "Semiconductors Series",
    subs: ["Diode","Bridge Rectifier","Thyristor","Triac","Transistor","Integrated Circuit","CMOS","TTL","Resistor","Capacitor","DC/DC Converter"]
  },
  {
    name: "Equipment & Tool Series",
    subs: ["Cable","Amplifier","Electret Condenser Microphone","Speaker","Wiring Accessories","Solderless Terminal","Plastic & Metal Screw","Heat Sink","Magnetic Levitation Cooling Fan","Soldering Tool","Glue Gun","Anti-Statics Accessories","Hand Tool","Screwdriver","Mini Plier","Tool","Universal PC Board","Universal Project Box","Components Storage Box","Maintenance Free Batteries","DC Motor","AC & DC Adaptor","Solar Charger & Inverter & Module","Programmer","Tester","Eraser","Test Equipment","Digital Multi Meter","Oscilloscope"]
  }
]

async function run() {
  // Step 1: Delete all subcategories first (have parent_id)
  console.log("🗑️  Deleting all subcategories...")
  const { error: subErr } = await supabase
    .from("categories")
    .delete()
    .not("parent_id", "is", null)
  if (subErr) console.error("Error deleting subs:", subErr.message)
  else console.log("✅ Subcategories deleted")

  // Step 2: Delete all main categories except nothing
  console.log("🗑️  Deleting all main categories...")
  const { error: mainErr } = await supabase
    .from("categories")
    .delete()
    .is("parent_id", null)
  if (mainErr) console.error("Error deleting mains:", mainErr.message)
  else console.log("✅ Main categories deleted")

  // Step 3: Re-seed
  let totalSubs = 0
  for (const cat of categories) {
    const mainSlug = slug(cat.name)
    console.log(`\n➕ Adding main: ${cat.name}`)

    const { data: main, error: mainInsertErr } = await supabase
      .from("categories")
      .insert({ name: cat.name, slug: mainSlug })
      .select()
      .single()

    if (mainInsertErr || !main) {
      console.error(`  ❌ Failed: ${mainInsertErr?.message}`)
      continue
    }

    const parentId = main.id
    const subInserts = cat.subs.map(s => ({
      name: s,
      slug: `${mainSlug}-${slug(s)}`,
      parent_id: parentId
    }))

    const { error: subInsertErr } = await supabase
      .from("categories")
      .insert(subInserts)

    if (subInsertErr) {
      console.error(`  ❌ Failed subs: ${subInsertErr.message}`)
    } else {
      totalSubs += subInserts.length
      console.log(`  ✅ Added ${subInserts.length} subcategories`)
    }
  }

  console.log(`\n🎉 Done! Added ${categories.length} main categories and ${totalSubs} subcategories.`)
}

run()
