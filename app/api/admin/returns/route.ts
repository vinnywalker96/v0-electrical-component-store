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

const updateReturnRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'received', 'refunded', 'completed']),
  refundMethod: z.enum(['original_payment', 'store_credit', 'bank_transfer']).optional(),
  returnTrackingNumber: z.string().optional(),
  returnCarrier: z.string().optional(),
  adminNotes: z.string().optional()
})

// GET /api/admin/returns - Get return requests
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('return_requests')
      .select(`
        id,
        order_id,
        reason,
        description,
        status,
        refund_amount,
        refund_method,
        return_tracking_number,
        return_carrier,
        admin_notes,
        requested_at,
        processed_at,
        completed_at,
        order:orders (
          id,
          order_number,
          total_amount,
          user:profiles!user_id (
            id,
            full_name,
            email
          )
        ),
        items:return_items (
          id,
          quantity,
          condition,
          reason,
          refund_amount,
          order_item:order_items (
            product:products (
              id,
              name,
              sku
            )
          )
        )
      `)
      .order('requested_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: returns, error, count } = await query

    if (error) {
      logger.error('Failed to fetch return requests', error)
      return NextResponse.json({ error: 'Failed to fetch return requests' }, { status: 500 })
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('return_requests')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      returns,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    logger.error('Returns API error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/returns - Create return request (for customers)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const validatedData = createReturnRequestSchema.parse(body)
    const { orderId, reason, description, items } = validatedData

    // Verify the order belongs to the current user and is eligible for return
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status, created_at')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.user_id !== (await supabase.auth.getUser()).data.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if order is eligible for return (delivered within 30 days)
    const orderDate = new Date(order.created_at)
    const daysSinceOrder = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceOrder > 30) {
      return NextResponse.json({ error: 'Return window has expired' }, { status: 400 })
    }

    if (!['delivered', 'shipped'].includes(order.status)) {
      return NextResponse.json({ error: 'Order is not eligible for return' }, { status: 400 })
    }

    // Create return request
    const { data: returnRequest, error: returnError } = await supabase
      .from('return_requests')
      .insert({
        order_id: orderId,
        user_id: order.user_id,
        reason,
        description
      })
      .select()
      .single()

    if (returnError) {
      logger.error('Failed to create return request', returnError)
      return NextResponse.json({ error: 'Failed to create return request' }, { status: 500 })
    }

    // Create return items
    const returnItems = items.map(item => ({
      return_request_id: returnRequest.id,
      order_item_id: item.orderItemId,
      quantity: item.quantity,
      condition: item.condition,
      reason: item.reason,
      refund_amount: item.refundAmount
    }))

    const { error: itemsError } = await supabase
      .from('return_items')
      .insert(returnItems)

    if (itemsError) {
      // Rollback return request
      await supabase.from('return_requests').delete().eq('id', returnRequest.id)
      logger.error('Failed to create return items', itemsError)
      return NextResponse.json({ error: 'Failed to create return items' }, { status: 500 })
    }

    logger.info('Return request created', {
      returnId: returnRequest.id,
      orderId,
      itemCount: items.length
    })

    return NextResponse.json({
      success: true,
      returnRequest: {
        ...returnRequest,
        items: returnItems
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 })
    }

    logger.error('Return request creation error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/returns/[id] - Update return request
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
        if (item.order_item) {
          await supabase.rpc('increment_stock', {
            product_id: item.order_item.product_id,
            quantity: item.order_item.quantity
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