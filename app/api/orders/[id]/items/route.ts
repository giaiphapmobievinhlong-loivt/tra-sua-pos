export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

type AddItem = { product_id: number | null; product_name: string; quantity: number; unit_price: number; item_note?: string }
type UpdateItem = { id: number; quantity: number }

async function recalcTotal(id: number) {
  await sql`
    UPDATE orders
    SET total_amount = GREATEST(0,
      (SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = ${id})
      - COALESCE(discount_amount, 0)
    )
    WHERE id = ${id}
  `
}

async function getUpdatedOrder(id: number) {
  const rows = await sql`SELECT o.*, u.username FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ${id}`
  const items = await sql`SELECT * FROM order_items WHERE order_id = ${id} ORDER BY id`
  return { ...rows[0], items }
}

// POST: add new items only (legacy, still used by existing code path)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    const { items } = await req.json() as { items: AddItem[] }

    if (!items?.length) return NextResponse.json({ error: 'Không có món nào' }, { status: 400 })

    const [order] = await sql`SELECT id, is_paid, status FROM orders WHERE id = ${id}`
    if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 })
    if (order.is_paid) return NextResponse.json({ error: 'Đơn đã thanh toán' }, { status: 400 })
    if (order.status === 'completed' || order.status === 'cancelled') {
      return NextResponse.json({ error: 'Đơn đã hoàn thành hoặc đã hủy' }, { status: 400 })
    }

    for (const item of items) {
      const subtotal = Number(item.unit_price) * Number(item.quantity)
      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, item_note)
        VALUES (${id}, ${item.product_id ?? null}, ${item.product_name}, ${item.quantity}, ${item.unit_price}, ${subtotal}, ${item.item_note || ''})
      `
    }

    await recalcTotal(id)
    return NextResponse.json({ success: true, order: await getUpdatedOrder(id) })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// PUT: combined edit — update quantities, delete items (pending only), add new items
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    const { updates, deletes, adds } = await req.json() as {
      updates?: UpdateItem[]
      deletes?: number[]
      adds?: AddItem[]
    }

    const [order] = await sql`SELECT id, is_paid, status FROM orders WHERE id = ${id}`
    if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 })
    if (order.is_paid) return NextResponse.json({ error: 'Đơn đã thanh toán' }, { status: 400 })
    if (order.status === 'completed' || order.status === 'cancelled') {
      return NextResponse.json({ error: 'Đơn đã hoàn thành hoặc đã hủy' }, { status: 400 })
    }

    const isPending = order.status === 'pending'

    // Delete items — only allowed when status is pending
    if (isPending && deletes?.length) {
      for (const itemId of deletes) {
        await sql`DELETE FROM order_items WHERE id = ${itemId} AND order_id = ${id}`
      }
    }

    // Update existing item quantities
    if (updates?.length) {
      for (const u of updates) {
        const [item] = await sql`SELECT quantity, unit_price FROM order_items WHERE id = ${u.id} AND order_id = ${id}`
        if (!item) continue

        const currentQty = Number(item.quantity)
        const newQty = Number(u.quantity)

        // Non-pending: only allow increasing quantity
        if (!isPending && newQty < currentQty) continue

        if (newQty <= 0) {
          if (isPending) await sql`DELETE FROM order_items WHERE id = ${u.id} AND order_id = ${id}`
          continue
        }

        const newSubtotal = Number(item.unit_price) * newQty
        await sql`UPDATE order_items SET quantity = ${newQty}, subtotal = ${newSubtotal} WHERE id = ${u.id} AND order_id = ${id}`
      }
    }

    // Add new items
    if (adds?.length) {
      for (const item of adds) {
        const subtotal = Number(item.unit_price) * Number(item.quantity)
        await sql`
          INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, item_note)
          VALUES (${id}, ${item.product_id ?? null}, ${item.product_name}, ${item.quantity}, ${item.unit_price}, ${subtotal}, ${item.item_note || ''})
        `
      }
    }

    await recalcTotal(id)
    return NextResponse.json({ success: true, order: await getUpdatedOrder(id) })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
