import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logging/logger'
import { z } from 'zod'

// Validation schemas
const createPurchaseOrderSchema = z.object({
  vendorId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    unitCost: z.number().positive().optional()
  })),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional()
})

