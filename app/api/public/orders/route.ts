export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

function generateOrderCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    if (!code) return NextResponse.json({ error: 'Thiếu mã đơn' }, { status: 400 })
    const rows = await sql`SELECT * FROM orders WHERE order_code = ${code}`
    if (!rows.length) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 })
    const order = rows[0]
    const items = await sql`SELECT * FROM order_items WHERE order_id = ${order.id} ORDER BY id`
    return NextResponse.json({ order: { ...order, items } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// Khách chỉnh sửa số lượng món khi đơn còn ở trạng thái pending
export async function PUT(req: NextRequest) {
  try {
    const { code, updates } = await req.json() as {
      code: string
      updates: { id: number; quantity: number }[]
    }

    if (!code) return NextResponse.json({ error: 'Thiếu mã đơn' }, { status: 400 })
    if (!updates?.length) return NextResponse.json({ error: 'Không có thay đổi' }, { status: 400 })

    const [order] = await sql`SELECT id, status FROM orders WHERE order_code = ${code}`
    if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 })
    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Đơn đang được xử lý, không thể chỉnh sửa' }, { status: 400 })
    }

    for (const u of updates) {
      if (u.quantity <= 0) {
        await sql`DELETE FROM order_items WHERE id = ${u.id} AND order_id = ${order.id}`
      } else {
        const [item] = await sql`SELECT unit_price FROM order_items WHERE id = ${u.id} AND order_id = ${order.id}`
        if (!item) continue
        const newSubtotal = Number(item.unit_price) * u.quantity
        await sql`UPDATE order_items SET quantity = ${u.quantity}, subtotal = ${newSubtotal} WHERE id = ${u.id} AND order_id = ${order.id}`
      }
    }

    // Recalculate total preserving any existing discount
    await sql`
      UPDATE orders
      SET total_amount = GREATEST(0,
        (SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = ${order.id})
        - COALESCE(discount_amount, 0)
      )
      WHERE id = ${order.id}
    `

    const rows = await sql`SELECT * FROM orders WHERE id = ${order.id}`
    const items = await sql`SELECT * FROM order_items WHERE order_id = ${order.id} ORDER BY id`
    return NextResponse.json({ order: { ...rows[0], items } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      items, total_amount, discount_amount, discount_name, note,
      table_number, customer_name, customer_phone,
      delivery_address, delivery_fee, order_type
    } = body

    if (!items?.length) return NextResponse.json({ error: 'Đơn hàng trống' }, { status: 400 })

    if (order_type === 'delivery') {
      if (!delivery_address?.trim()) return NextResponse.json({ error: 'Vui lòng nhập địa chỉ giao hàng' }, { status: 400 })
      if (!customer_phone?.trim()) return NextResponse.json({ error: 'Vui lòng nhập số điện thoại' }, { status: 400 })
      if (!customer_name?.trim()) return NextResponse.json({ error: 'Vui lòng nhập tên người nhận' }, { status: 400 })
    }

    const orderCode = generateOrderCode()
    const finalTotal = Number(total_amount) + Number(delivery_fee || 0)

    // Fetch product names trước transaction
    const productIds = items.map((i: { product_id: number }) => i.product_id)
    const prods = await sql`SELECT id, name FROM products WHERE id = ANY(${productIds})`
    const nameMap = Object.fromEntries(prods.map((p) => [p.id, p.name]))

    type Item = { product_id: number; quantity: number; unit_price: number; item_note?: string }

    const rows = await sql`
      INSERT INTO orders (
        order_code, user_id, total_amount, discount_amount, discount_name,
        customer_paid, change_amount, note, status, table_number, is_paid, pay_method,
        source, customer_name, customer_phone, delivery_address, delivery_fee, order_type
      ) VALUES (
        ${orderCode}, NULL, ${finalTotal}, ${discount_amount ?? 0}, ${discount_name || ''},
        0, 0, ${note || ''}, 'pending',
        ${order_type === 'delivery' ? null : (table_number ?? null)},
        false, 'transfer',
        'web', ${customer_name || ''}, ${customer_phone || ''},
        ${delivery_address || ''}, ${delivery_fee || 0}, ${order_type || 'dine_in'}
      ) RETURNING *
    `
    const order = rows[0]

    await Promise.all(items.map((item: Item) =>
      sql`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, item_note)
        VALUES (${order.id}, ${item.product_id}, ${nameMap[item.product_id] || 'Unknown'},
                ${item.quantity}, ${item.unit_price}, ${item.quantity * item.unit_price}, ${item.item_note || ''})
      `
    ))

    const orderItems = await sql`SELECT * FROM order_items WHERE order_id = ${order.id}`
    return NextResponse.json({ success: true, order_code: orderCode, order: { ...order, items: orderItems } })
  } catch (e) {
    console.error('[POST /api/public/orders]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
