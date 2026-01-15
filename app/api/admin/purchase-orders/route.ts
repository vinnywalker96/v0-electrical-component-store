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

const updatePurchaseOrderSchema = z.object({
  status: z.enum(['pending', 'ordered', 'received', 'cancelled']).optional(),
  actualDeliveryDate: z.string().optional(),
  notes: z.string().optional()
})

const receiveItemsSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().uuid(),
    quantityReceived: z.number().int().min(0)
  }))
})

// GET /api/admin/purchase-orders - Get purchase orders
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    const status = searchParams.get('status')
    const vendorId = searchParams.get('vendorId')

    let query = supabase
      .from('purchase_orders')
      .select(`
        id,
        order_number,
        status,
        total_amount,
        currency,
        expected_delivery_date,
        actual_delivery_date,
        notes,
        created_at,
        updated_at,
        vendor:profiles!vendor_id (
          id,
          business_name,
          email
        ),
        items:purchase_order_items (
          id,
          quantity_ordered,
          quantity_received,
          unit_cost,
          total_cost,
          product:products (
            id,
            name,
            sku
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (vendorId) {
      query = query.eq('vendor_id', vendorId)
    }

    const { data: orders, error, count } = await query

    if (error) {
      logger.error('Failed to fetch purchase orders', error)
      return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 })
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('purchase_orders')
      .select('*', { count: 'exact', head: true })

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
    logger.error('Purchase orders API error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/purchase-orders - Create purchase order
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const validatedData = createPurchaseOrderSchema.parse(body)
    const { vendorId, items, expectedDeliveryDate, notes } = validatedData

    // Generate order number
    const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // Start transaction
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        vendor_id: vendorId,
        order_number: orderNumber,
        expected_delivery_date: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        notes
      })
      .select()
      .single()

    if (orderError) {
      logger.error('Failed to create purchase order', orderError)
      return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 })
    }

    // Insert order items
    const orderItems = items.map(item => ({
      purchase_order_id: order.id,
      product_id: item.productId,
      quantity_ordered: item.quantity,
      unit_cost: item.unitCost || 0,
      total_cost: (item.unitCost || 0) * item.quantity
    }))

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(orderItems)

    if (itemsError) {
      // Rollback by deleting the order
      await supabase.from('purchase_orders').delete().eq('id', order.id)
      logger.error('Failed to create purchase order items', itemsError)
      return NextResponse.json({ error: 'Failed to create purchase order items' }, { status: 500 })
    }

    logger.info('Purchase order created', {
      orderId: order.id,
      orderNumber,
      vendorId,
      itemCount: items.length
    })

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        items: orderItems
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 })
    }

    logger.error('Purchase order creation error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/purchase-orders/[id] - Update purchase order
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const validatedData = updatePurchaseOrderSchema.parse(body)
    const { status, actualDeliveryDate, notes } = validatedData

    const updateData: any = {
      updated_at: new Date()
    }

    if (status) updateData.status = status
    if (actualDeliveryDate) updateData.actual_delivery_date = new Date(actualDeliveryDate)
    if (notes !== undefined) updateData.notes = notes

    const { data: order, error } = await supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update purchase order', error)
      return NextResponse.json({ error: 'Failed to update purchase order' }, { status: 500 })
    }

    logger.info('Purchase order updated', {
      orderId: params.id,
      status,
      actualDeliveryDate
    })

    return NextResponse.json({
      success: true,
      order
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 })
    }

    logger.error('Purchase order update error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/purchase-orders/[id]/receive - Receive items
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const validatedData = receiveItemsSchema.parse(body)
    const { items } = validatedData

    // Update received quantities
    for (const item of items) {
      const { error } = await supabase
        .from('purchase_order_items')
        .update({
          quantity_received: item.quantityReceived,
          received_at: item.quantityReceived > 0 ? new Date() : null
        })
        .eq('id', item.itemId)

      if (error) {
        logger.error('Failed to update received quantity', error)
        return NextResponse.json({ error: 'Failed to update received quantity' }, { status: 500 })
      }

      // Update product inventory if items were received
      if (item.quantityReceived > 0) {
        const { data: orderItem } = await supabase
          .from('purchase_order_items')
          .select('product_id, quantity_received')
          .eq('id', item.itemId)
          .single()

        if (orderItem) {
          // Update product stock
          await supabase.rpc('increment_stock', {
            product_id: orderItem.product_id,
            quantity: item.quantityReceived
          })

          // Record inventory transaction
          await supabase
            .from('inventory_transactions')
            .insert({
              product_id: orderItem.product_id,
              transaction_type: 'purchase',
              quantity: item.quantityReceived,
              previous_quantity: 0, // Will be calculated by trigger
              new_quantity: 0, // Will be calculated by trigger
              reference_id: params.id,
              reference_type: 'purchase_order',
              notes: `Purchase order ${params.id} received`
            })
        }
      }
    }

    // Check if all items are received and update order status
    const { data: orderItems } = await supabase
      .from('purchase_order_items')
      .select('quantity_ordered, quantity_received')
      .eq('purchase_order_id', params.id)

    const allReceived = orderItems?.every(item => item.quantity_received >= item.quantity_ordered)

    if (allReceived) {
      await supabase
        .from('purchase_orders')
        .update({
          status: 'received',
          actual_delivery_date: new Date(),
          updated_at: new Date()
        })
        .eq('id', params.id)
    }

    logger.info('Purchase order items received', {
      orderId: params.id,
      itemsReceived: items.length
    })

    return NextResponse.json({
      success: true,
      message: 'Items received successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 })
    }

    logger.error('Purchase order receive error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
