const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from("messages").select("*").limit(1);
  if (error) {
    console.error("Error details:", error);
  } else {
    console.log("Success! Columns:", data.length > 0 ? Object.keys(data[0]) : "No rows");
  }
}

test();
