export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

async function deductInventory(orderId: number, storeId: number) {
  const items = await sql`SELECT product_id, quantity FROM order_items WHERE order_id = ${orderId} AND store_id = ${storeId}`
  for (const item of items) {
    if (!item.product_id) continue
    const ingredients = await sql`
      SELECT pi.material_id, pi.quantity_per_cup::float FROM product_ingredients pi
      JOIN materials m ON m.id = pi.material_id
      WHERE pi.product_id = ${item.product_id} AND m.store_id = ${storeId}
    `
    for (const ing of ingredients) {
      const deductQty = Number(ing.quantity_per_cup) * Number(item.quantity)
      await sql`UPDATE materials SET quantity = GREATEST(0, quantity - ${deductQty}) WHERE id = ${ing.material_id} AND store_id = ${storeId}`
      await sql`
        INSERT INTO material_logs (material_id, type, quantity, note)
        VALUES (${ing.material_id}, 'out', ${deductQty}, ${`Đơn #${orderId} tự động trừ`})
      `
    }
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const { id: idStr } = await params
    const id = Number(idStr)
    const body = await req.json()
    const { status, is_paid, customer_paid, change_amount, pay_method } = body

    const [current] = await sql`SELECT status FROM orders WHERE id = ${id} AND store_id = ${user.store_id}`
    if (!current) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 })
    const wasCompleted = current?.status === 'completed'

    if (status !== undefined && is_paid !== undefined) {
      await sql`
        UPDATE orders SET status = ${status}, is_paid = ${is_paid},
          customer_paid = ${customer_paid || 0}, change_amount = ${change_amount || 0},
          pay_method = ${pay_method || null}
        WHERE id = ${id} AND store_id = ${user.store_id}
      `
    } else if (status !== undefined && pay_method !== undefined) {
      await sql`UPDATE orders SET status = ${status}, is_paid = true, pay_method = ${pay_method} WHERE id = ${id} AND store_id = ${user.store_id}`
    } else if (status !== undefined) {
      await sql`UPDATE orders SET status = ${status} WHERE id = ${id} AND store_id = ${user.store_id}`
    } else if (is_paid !== undefined) {
      await sql`
        UPDATE orders SET is_paid = ${is_paid},
          customer_paid = ${customer_paid || 0}, change_amount = ${change_amount || 0},
          pay_method = ${pay_method || null}
        WHERE id = ${id} AND store_id = ${user.store_id}
      `
    }

    if (status === 'completed' && !wasCompleted) {
      await deductInventory(id, user.store_id)
    }

    const rows = await sql`SELECT o.*, u.username FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ${id} AND o.store_id = ${user.store_id}`
    const items = await sql`SELECT * FROM order_items WHERE order_id = ${id} AND store_id = ${user.store_id}`
    return NextResponse.json({ success: true, order: { ...rows[0], items } })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const { id: idStr } = await params
    await sql`UPDATE orders SET status = 'cancelled' WHERE id = ${Number(idStr)} AND store_id = ${user.store_id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
