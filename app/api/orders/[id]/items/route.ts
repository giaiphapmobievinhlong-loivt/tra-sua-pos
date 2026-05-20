export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

type AddItem = { product_id: number | null; product_name: string; quantity: number; unit_price: number; item_note?: string }
type UpdateItem = { id: number; quantity: number }

async function recalcTotal(id: number, storeId: number) {
  await sql`
    UPDATE orders
    SET total_amount = GREATEST(0,
      (SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = ${id} AND store_id = ${storeId})
      - COALESCE(discount_amount, 0)
    )
    WHERE id = ${id} AND store_id = ${storeId}
  `
}

async function getUpdatedOrder(id: number, storeId: number) {
  const rows = await sql`SELECT o.*, u.username FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ${id} AND o.store_id = ${storeId}`
  const items = await sql`SELECT * FROM order_items WHERE order_id = ${id} AND store_id = ${storeId} ORDER BY id`
  return { ...rows[0], items }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const { id: idStr } = await params
    const id = Number(idStr)
    const { items } = await req.json() as { items: AddItem[] }

    if (!items?.length) return NextResponse.json({ error: 'Không có món nào' }, { status: 400 })

    const [order] = await sql`SELECT id, is_paid, status FROM orders WHERE id = ${id} AND store_id = ${user.store_id}`
    if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 })
    if (order.is_paid) return NextResponse.json({ error: 'Đơn đã thanh toán' }, { status: 400 })
    if (order.status === 'completed' || order.status === 'cancelled') {
      return NextResponse.json({ error: 'Đơn đã hoàn thành hoặc đã hủy' }, { status: 400 })
    }

    for (const item of items) {
      const subtotal = Number(item.unit_price) * Number(item.quantity)
      await sql`
        INSERT INTO order_items (store_id, order_id, product_id, product_name, quantity, unit_price, subtotal, item_note)
        VALUES (${user.store_id}, ${id}, ${item.product_id ?? null}, ${item.product_name}, ${item.quantity}, ${item.unit_price}, ${subtotal}, ${item.item_note || ''})
      `
    }

    await recalcTotal(id, user.store_id)
    return NextResponse.json({ success: true, order: await getUpdatedOrder(id, user.store_id) })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const { id: idStr } = await params
    const id = Number(idStr)
    const { updates, deletes, adds } = await req.json() as {
      updates?: UpdateItem[]
      deletes?: number[]
      adds?: AddItem[]
    }

    const [order] = await sql`SELECT id, is_paid, status FROM orders WHERE id = ${id} AND store_id = ${user.store_id}`
    if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 })
    if (order.is_paid) return NextResponse.json({ error: 'Đơn đã thanh toán' }, { status: 400 })
    if (order.status === 'completed' || order.status === 'cancelled') {
      return NextResponse.json({ error: 'Đơn đã hoàn thành hoặc đã hủy' }, { status: 400 })
    }

    const isPending = order.status === 'pending'

    if (isPending && deletes?.length) {
      for (const itemId of deletes) {
        await sql`DELETE FROM order_items WHERE id = ${itemId} AND order_id = ${id} AND store_id = ${user.store_id}`
      }
    }

    if (updates?.length) {
      for (const u of updates) {
        const [item] = await sql`SELECT quantity, unit_price FROM order_items WHERE id = ${u.id} AND order_id = ${id} AND store_id = ${user.store_id}`
        if (!item) continue

        const currentQty = Number(item.quantity)
        const newQty = Number(u.quantity)

        if (!isPending && newQty < currentQty) continue

        if (newQty <= 0) {
          if (isPending) await sql`DELETE FROM order_items WHERE id = ${u.id} AND order_id = ${id} AND store_id = ${user.store_id}`
          continue
        }

        const newSubtotal = Number(item.unit_price) * newQty
        await sql`UPDATE order_items SET quantity = ${newQty}, subtotal = ${newSubtotal} WHERE id = ${u.id} AND order_id = ${id} AND store_id = ${user.store_id}`
      }
    }

    if (adds?.length) {
      for (const item of adds) {
        const subtotal = Number(item.unit_price) * Number(item.quantity)
        await sql`
          INSERT INTO order_items (store_id, order_id, product_id, product_name, quantity, unit_price, subtotal, item_note)
          VALUES (${user.store_id}, ${id}, ${item.product_id ?? null}, ${item.product_name}, ${item.quantity}, ${item.unit_price}, ${subtotal}, ${item.item_note || ''})
        `
      }
    }

    await recalcTotal(id, user.store_id)
    return NextResponse.json({ success: true, order: await getUpdatedOrder(id, user.store_id) })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
