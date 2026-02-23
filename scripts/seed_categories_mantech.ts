import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const data = [
    {
        name: "Switches Series",
        subcategories: ["DIP", "Toggle", "Push-button", "Power", "Keylock", "Rocker", "Illuminated Rocker", "Slide", "Tact", "Rotary", "Micro", "Limit", "Illuminated Push-button", "Proximity", "Reed-Alarm"]
    },
    {
        name: "Audio connector series",
        subcategories: ["Binding Post", "Fuse & Fuse Holder", "Thermal Cutoff", "Sub-miniature Fuse", "Resettable Fuse", "Ac Socket", "EMI Filters", "Clip", "RCA Phono Plug & Jack", "Screw Terminal", "Push Terminal", "Phone Plug & Jack", "Banana Plug", "Adaptor", "Auto Antenna Plug & Jack", "DC Plug & Jack", "DIN Plug & Socket", "Optical Adapter & Modules", "Convert Plug", "Universal Adapter"]
    },
    {
        name: "Audio video cable series",
        subcategories: ["Test Lead Set", "Oscilloscope Probe Kit", "Audio Cable", "Plastic Fiber Optic Cable", "Power Supply Cord", "Auto Cable", "Video Cable"]
    },
    {
        name: "RF Connector",
        subcategories: ["SMA", "SSMA", "SMB", "SSMB", "SMC", "SMP", "SMPM", "MCX", "MMCX", "K", "UHF & Mini UHF", "BNC & Mini BNC & Twin-BNC", "F", "N", "TNC", "Components For Antenna", "Twinaxial", "1.0", "2.3", "1.6", "5.6", "Reverse Polarity", "Technician Adapter Kit", "Solderless Cable", "MIC", "TV Plug & Jack", "Antenna", "RF Cable", "Waterproof M12 Connector", "Scart Adaptor", "Circular Power Connector"]
    },
    {
        name: "Battery, VR, Light, Knob, Buzzer, Tel. Accessories",
        subcategories: ["Battery Holder", "Circuit Protector", "Thermostat", "Relay", "Relay Socket", "Variable Resistor", "Trimming Potentiometer", "Rotary Encoder", "Neon Indicator Light", "Neon Lamp", "Vibration Switch", "LED", "LCD Module", "Knob", "Buzzer", "Siren", "Terminal Block", "Telephone Accessories"]
    },
    {
        name: "Computer Connector series",
        subcategories: ["Micro USB & USB 3.0", "3.1 & IEEE 1394 & Displayport & HDMI", "D-SUB", "Centronic", "Hard Metric", "Futurebus", "DIN 41612", "Edge", "DIMM & SIMM", "IC Socket", "Chip Carrier", "Pin Strip", "Header & SATA", "Housing", "Terminal", "Wafer", "SIM Card", "Memory Card", "DVI", "V.35", "Gender Changer", "Extension Cable", "Flat Cable", "Solderless Breadboard", "Card Reader", "Data Switch", "Electronic Educational Systems"]
    },
    {
        name: "Semiconductors series",
        subcategories: ["Diode", "Bridge Rectifier", "Thyristor", "Triac", "Transistor", "Integrated Circuit", "CMOS", "TTL", "Resistor", "Capacitor", "DC / DC Converter"]
    },
    {
        name: "Equipment & Tool series",
        subcategories: ["Cable", "Amplifier", "Electret Condenser Microphone", "Speaker", "Wiring Accessories", "Solderless Terminal", "Plastic & Metal Screw", "Heat Sink", "Magnetic Levitation Cooling Fan", "Soldering Tool", "Glue Gun", "Anti-Statics Accessories", "Hand Tool", "Screwdriver", "Mini Plier", "Tool", "Universal PC Board", "Universal Project Box", "Components Storage Box", "Maintenance Free Batteries", "DC Motor", "AC & DC Adaptor", "Solar Charger & Inverter & Module", "Programmer", "Tester", "Eraser", "Test Equipment", "Digital Multi Meter", "Oscilloscope"]
    }
];

async function seed() {
    console.log("Starting category seeding...");
    for (const main of data) {
        const mainSlug = slugify(main.name);
        console.log(`Processing Main Category: ${main.name}`);

        const { data: mainCategory, error: mainError } = await supabase
            .from('categories')
            .upsert({
                name: main.name,
                name_pt: main.name,
                slug: mainSlug,
                level: 1
            }, { onConflict: 'slug' })
            .select('id')
            .single();

        if (mainError) {
            console.error(`Error seeding main category ${main.name}:`, mainError.message);
            continue;
        }

        const parentId = mainCategory.id;

        for (const sub of main.subcategories) {
            const subSlug = `${mainSlug}-${slugify(sub)}`;
            console.log(`  Processing Subcategory: ${sub}`);

            const { error: subError } = await supabase
                .from('categories')
                .upsert({
                    name: sub,
                    name_pt: sub,
                    parent_id: parentId,
                    slug: subSlug,
                    level: 2
                }, { onConflict: 'slug' });

            if (subError) {
                console.error(`  Error seeding subcategory ${sub}:`, subError.message);
            }
        }
    }
    console.log("Seeding completed!");
}

seed();
