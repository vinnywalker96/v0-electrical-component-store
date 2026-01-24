import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logging/logger'
import { z } from 'zod'

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

// PUT /api/admin/purchase-orders/[id] - Update purchase order
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const params = await context.params;
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

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const validatedData = receiveItemsSchema.parse(body)
    const { items } = validatedData
    const params = await context.params;

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
