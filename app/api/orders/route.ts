import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest, generateOrderCode } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    const orders = await sql`
      SELECT o.*, u.username
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE DATE(o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = ${date}
      ORDER BY o.created_at DESC
    `

    // Fetch items for each order
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await sql`
        SELECT * FROM order_items WHERE order_id = ${order.id}
      `
      return { ...order, items }
    }))

    return NextResponse.json({ orders: ordersWithItems })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { items, total_amount, customer_paid, change_amount, note } = await req.json()
    const orderCode = generateOrderCode()

    // Create order
    const orders = await sql`
      INSERT INTO orders (order_code, user_id, total_amount, customer_paid, change_amount, note, status)
      VALUES (${orderCode}, ${user.id}, ${total_amount}, ${customer_paid || 0}, ${change_amount || 0}, ${note || ''}, 'completed')
      RETURNING *
    `
    const order = orders[0]

    // Create order items
    for (const item of items) {
      const products = await sql`SELECT name FROM products WHERE id = ${item.product_id}`
      const productName = products[0]?.name || 'Unknown'
      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
        VALUES (${order.id}, ${item.product_id}, ${productName}, ${item.quantity}, ${item.unit_price}, ${item.quantity * item.unit_price})
      `
    }

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
