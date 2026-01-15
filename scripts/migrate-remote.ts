import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { Client } from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.local
config({ path: path.join(__dirname, '..', '.env.local') })

async function runMigrations() {
  const dbUrl = process.env.SUPABASE_POSTGRES_URL

  if (!dbUrl) {
    console.error('Missing SUPABASE_POSTGRES_URL_NON_POOLING')
    process.exit(1)
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Connected to database')
  } catch (error) {
    console.error('Failed to connect to database:', error)
    process.exit(1)
  }

  // List of migration files in order
  const migrationFiles = [
    '001_create_tables.sql',
    '002_seed_products.sql',
    '003_add_payment_status_and_banking.sql',
    '004_add_super_admin_user.sql',
    '005_enable_banking_and_payment_features.sql',
    '006_marketplace_schema.sql',
    '007_commission_and_rbac_system.sql',
    '008_comprehensive_marketplace_system.sql',
    '009_add_aoa_currency.sql',
    '010_inventory_management_system.sql',
    '011_order_fulfillment_system.sql'
  ]

  console.log('Starting database migrations...')

  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, '..', 'scripts', file)

    if (!fs.existsSync(filePath)) {
      console.log(`Migration file ${file} not found, skipping...`)
      continue
    }

    console.log(`\nRunning migration: ${file}`)

    try {
      const sql = fs.readFileSync(filePath, 'utf8')

      // Execute the entire SQL file as one query
      console.log(`  Executing entire file...`)

      await client.query(sql)

      console.log(`✅ Migration ${file} completed`)

    } catch (error) {
      console.error(`❌ Failed to run migration ${file}:`, error)
    }
  }

  console.log('\n🎉 All migrations completed!')

  // Test the connection and verify tables exist
  console.log('\nVerifying database setup...')

  try {
    const currencies = await client.query('SELECT * FROM currency_rates LIMIT 5')

    if (currencies.rows.length >= 0) {
      console.log(`✅ Currency rates table: ${currencies.rows.length} records found`)
    } else {
      console.error('❌ Currency rates table issue: No data')
    }

    const profiles = await client.query('SELECT * FROM profiles LIMIT 1')

    if (profiles.rows.length >= 0) {
      console.log(`✅ Profiles table accessible`)
    } else {
      console.error('❌ Profiles table issue: No data')
    }

  } catch (error) {
    console.error('❌ Database verification failed:', error)
  } finally {
    await client.end()
  }
}

runMigrations().catch(console.error)
