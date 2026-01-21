import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logging/logger'
import { z } from 'zod'

const updateReturnRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'received', 'refunded', 'completed']),
  refundMethod: z.enum(['original_payment', 'store_credit', 'bank_transfer']).optional(),
  returnTrackingNumber: z.string().optional(),
  returnCarrier: z.string().optional(),
  adminNotes: z.string().optional()
})

// PUT /api/admin/returns/[id] - Update return request
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const validatedData = updateReturnRequestSchema.parse(body)
    const { status, refundMethod, returnTrackingNumber, returnCarrier, adminNotes } = validatedData

    const updateData: any = {
      status,
      processed_at: status !== 'pending' ? new Date() : null
    }

    if (status === 'completed') {
      updateData.completed_at = new Date()
    }

    if (refundMethod) updateData.refund_method = refundMethod
    if (returnTrackingNumber) updateData.return_tracking_number = returnTrackingNumber
    if (returnCarrier) updateData.return_carrier = returnCarrier
    if (adminNotes !== undefined) updateData.admin_notes = adminNotes
    const params = await context.params;
    const { data: returnRequest, error } = await supabase
      .from('return_requests')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update return request', error)
      return NextResponse.json({ error: 'Failed to update return request' }, { status: 500 })
    }

    // If refund is processed, update inventory (return items to stock)
    if (status === 'refunded') {
      const { data: returnItems } = await supabase
        .from('return_items')
        .select(`
          order_item:order_items (
            product_id,
            quantity
          )
        `)
        .eq('return_request_id', params.id)

      for (const item of returnItems || []) {
        if (item.order_item && Array.isArray(item.order_item) && item.order_item.length > 0) {
          const orderItem = item.order_item[0];
          await supabase.rpc('increment_stock', {
            product_id: orderItem.product_id,
            quantity: orderItem.quantity
          })
        }
      }
    }

    logger.info('Return request updated', {
      returnId: params.id,
      status,
      refundMethod
    })

    return NextResponse.json({
      success: true,
      returnRequest
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 })
    }

    logger.error('Return request update error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
