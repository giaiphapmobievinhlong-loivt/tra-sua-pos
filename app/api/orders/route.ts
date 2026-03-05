import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest, generateOrderCode } from '@/lib/auth'

async function migrate() {
  try {
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number VARCHAR(20) DEFAULT NULL`
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false`
  } catch { /* ignore */ }
}

export async function GET(req: NextRequest) {
  try {
    await migrate()
    const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0]
    const status = req.nextUrl.searchParams.get('status')

    let orders
    if (status && status !== 'all') {
      orders = await sql`
        SELECT o.*, u.username FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE DATE(o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = ${date} AND o.status = ${status}
        ORDER BY o.created_at DESC
      `
    } else {
      orders = await sql`
        SELECT o.*, u.username FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE DATE(o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = ${date}
        ORDER BY
          CASE o.status
            WHEN 'pending' THEN 1 WHEN 'brewing' THEN 2 WHEN 'ready' THEN 3
            WHEN 'completed' THEN 4 WHEN 'cancelled' THEN 5 ELSE 6
          END, o.created_at DESC
      `
    }

    const ordersWithItems = await Promise.all(orders.map(async (order: Record<string, unknown>) => {
      const items = await sql`SELECT * FROM order_items WHERE order_id = ${order.id}`
      return { ...order, items }
    }))

    return NextResponse.json({ orders: ordersWithItems })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await migrate()
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { items, total_amount, customer_paid, change_amount, note, table_number, status, is_paid } = await req.json()
    const orderCode = generateOrderCode()

    const orders = await sql`
      INSERT INTO orders (order_code, user_id, total_amount, customer_paid, change_amount, note, status, table_number, is_paid)
      VALUES (${orderCode}, ${user.id}, ${total_amount}, ${customer_paid || 0}, ${change_amount || 0},
              ${note || ''}, ${status || 'pending'}, ${table_number || null}, ${is_paid || false})
      RETURNING *
    `
    const order = orders[0]

    for (const item of items) {
      const products = await sql`SELECT name FROM products WHERE id = ${item.product_id}`
      const productName = products[0]?.name || item.product_name || 'Unknown'
      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
        VALUES (${order.id}, ${item.product_id}, ${productName}, ${item.quantity}, ${item.unit_price}, ${item.quantity * item.unit_price})
      `
    }

    const items_ = await sql`SELECT * FROM order_items WHERE order_id = ${order.id}`
    return NextResponse.json({ success: true, order: { ...order, items: items_ } })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
