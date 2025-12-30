import { createClient } from '../lib/supabase/server'
import fs from 'fs'
import path from 'path'

async function runMigration() {
  try {
    const supabase = await createClient()

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'scripts', '010_inventory_management_system.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`Running ${statements.length} migration statements...`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`)
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          if (error) {
            console.error(`Error in statement ${i + 1}:`, error)
            // Continue with other statements
          }
        } catch (err) {
          console.error(`Failed to execute statement ${i + 1}:`, err)
          // Continue with other statements
        }
      }
    }

    console.log('Migration completed!')
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

runMigration()