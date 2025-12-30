import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logging/logger'
import { z } from 'zod'

// Validation schemas
const updateFulfillmentSchema = z.object({
  orderId: z.string().uuid(),
  fulfillmentStatus: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  estimatedDeliveryDate: z.string().optional(),
  notes: z.string().optional()
})

const createReturnRequestSchema = z.object({
  orderId: z.string().uuid(),
  orderItemId: z.string().uuid().optional(),
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

// GET /api/admin/orders/fulfillment - Get orders for fulfillment
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'processing'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const { data: orders, error, count } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        fulfillment_status,
        total_amount,
        currency,
        tracking_number,
        carrier,
        shipped_at,
        delivered_at,
        estimated_delivery_date,
        created_at,
        user:profiles!user_id (
          id,
          full_name,
          email
        ),
        items:order_items (
          id,
          quantity,
          price,
          product:products (
            id,
            name,
            sku
          )
        )
      `)
      .eq('fulfillment_status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logger.error('Failed to fetch orders for fulfillment', error)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('fulfillment_status', status)

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    logger.error('Fulfillment API error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/orders/fulfillment - Update order fulfillment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const validatedData = updateFulfillmentSchema.parse(body)
    const {
      orderId,
      fulfillmentStatus,
      trackingNumber,
      carrier,
      estimatedDeliveryDate,
      notes
    } = validatedData

    // Update order fulfillment details
    const updateData: any = {
      fulfillment_status: fulfillmentStatus,
      updated_at: new Date()
    }

    if (trackingNumber) updateData.tracking_number = trackingNumber
    if (carrier) updateData.carrier = carrier
    if (estimatedDeliveryDate) updateData.estimated_delivery_date = new Date(estimatedDeliveryDate)

    // Set timestamps based on status
    if (fulfillmentStatus === 'shipped') {
      updateData.status = 'shipped'
      updateData.shipped_at = new Date()
    } else if (fulfillmentStatus === 'delivered') {
      updateData.status = 'delivered'
      updateData.delivered_at = new Date()
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update order fulfillment', error)
      return NextResponse.json({ error: 'Failed to update order fulfillment' }, { status: 500 })
    }

    // Create shipment tracking entry if shipped
    if (fulfillmentStatus === 'shipped' && trackingNumber && carrier) {
      await supabase
        .from('shipment_tracking')
        .insert({
          order_id: orderId,
          tracking_number: trackingNumber,
          carrier: carrier,
          status: 'in_transit',
          estimated_delivery: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
          description: 'Order shipped'
        })
    }

    // Log the fulfillment update
    logger.info('Order fulfillment updated', {
      orderId,
      fulfillmentStatus,
      trackingNumber,
      carrier
    })

    return NextResponse.json({
      success: true,
      order
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 })
    }

    logger.error('Fulfillment update error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}