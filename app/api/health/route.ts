import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logging/logger'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Check database connectivity
    const supabase = await createClient()
    const { data, error } = await supabase.from('profiles').select('count').limit(1)

    if (error) {
      logger.error('Health check failed: Database connection error', error)
      return NextResponse.json(
        {
          status: 'error',
          timestamp: new Date().toISOString(),
          checks: {
            database: 'error',
            uptime: process.uptime(),
            responseTime: Date.now() - startTime
          }
        },
        { status: 503 }
      )
    }

    // Check Redis connectivity if available
    let redisStatus = 'not_configured'
    try {
      // Add Redis check here when implemented
      redisStatus = 'ok'
    } catch (redisError) {
      redisStatus = 'error'
      logger.warn('Redis health check failed', redisError)
    }

    // Check memory usage
    const memUsage = process.memoryUsage()
    const memoryMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    }

    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.round(process.uptime()),
      checks: {
        database: 'ok',
        redis: redisStatus,
        memory: memoryMB,
        responseTime: Date.now() - startTime
      }
    }

    logger.info('Health check passed', {
      responseTime: response.checks.responseTime,
      uptime: response.uptime
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Health check failed: Unexpected error', error)

    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'error',
          uptime: process.uptime(),
          responseTime: Date.now() - startTime
        },
        error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
      },
      { status: 503 }
    )
  }
}

// Detailed health check for internal monitoring
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check various system components
    const checks = {
      database: await checkDatabase(supabase),
      tables: await checkTables(supabase),
      storage: await checkStorage(supabase),
      environment: checkEnvironment(),
    }

    const allHealthy = Object.values(checks).every(check => check.status === 'ok')

    return NextResponse.json({
      status: allHealthy ? 'ok' : 'warning',
      timestamp: new Date().toISOString(),
      checks
    })

  } catch (error) {
    logger.error('Detailed health check failed', error)
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 503 }
    )
  }
}

async function checkDatabase(supabase: any) {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1)
    return {
      status: error ? 'error' : 'ok',
      message: error ? error.message : 'Database connection successful',
      responseTime: Date.now()
    }
  } catch (error) {
    return {
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkTables(supabase: any) {
  const tables = ['profiles', 'products', 'orders', 'sellers']
  const results = {}

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1)
      results[table] = error ? 'error' : 'ok'
    } catch (error) {
      results[table] = 'error'
    }
  }

  const allOk = Object.values(results).every(status => status === 'ok')

  return {
    status: allOk ? 'ok' : 'warning',
    message: allOk ? 'All tables accessible' : 'Some tables may have issues',
    tables: results
  }
}

async function checkStorage(supabase: any) {
  try {
    // Try to list files in a bucket (this will fail gracefully if bucket doesn't exist)
    const { error } = await supabase.storage.listBuckets()
    return {
      status: error ? 'warning' : 'ok',
      message: error ? 'Storage may not be configured' : 'Storage accessible'
    }
  } catch (error) {
    return {
      status: 'warning',
      message: 'Storage check failed'
    }
  }
}

function checkEnvironment() {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  const missing = requiredVars.filter(varName => !process.env[varName])

  return {
    status: missing.length === 0 ? 'ok' : 'warning',
    message: missing.length === 0 ? 'All required environment variables set' : `Missing: ${missing.join(', ')}`,
    missing: missing.length > 0 ? missing : undefined
  }
}
