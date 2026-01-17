import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Only allow in development or with proper authentication
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Migrations not allowed in production' }, { status: 403 })
    }

    const supabase = await createClient()

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'scripts', '010_inventory_management_system.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Split the SQL into individual statements (simple split, may need refinement)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`Running ${statements.length} migration statements...`)

    const results = []

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`)
        try {
          // For complex DDL, we might need to use raw SQL execution
          // This is a simplified approach - in production, use proper migration tools
          const { data, error } = await supabase.rpc('exec', { query: statement })

          results.push({
            statement: i + 1,
            success: !error,
            error: error?.message
          })

          if (error) {
            console.error(`Error in statement ${i + 1}:`, error)
          }
        } catch (err) {
          console.error(`Failed to execute statement ${i + 1}:`, err)
          results.push({
            statement: i + 1,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed',
      results
    })

  } catch (error) {
    console.error('Migration failed:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
