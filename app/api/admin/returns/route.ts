import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logging/logger'
import { z } from 'zod'

// Validation schemas
const createReturnRequestSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.enum(['defective', 'wrong_item', 'not_as_described', 'changed_mind', 'other']),
  description: z.string().optional(),
  items: z.array(z.object({
    orderItemId: z.string().uuid(),
    quantity: z.number().int().positive(),
    condition: z.enum(['new', 'opened', 'used', 'damaged']).default('new'),
    reason: z.string().optional(),
    refundAmount: z.number().positive().optional()
  }))
})

