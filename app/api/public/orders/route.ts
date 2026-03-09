import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

function generateOrderCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function ensureColumns() {
  try { await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'pos'` } catch { /**/ }
  try { await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100) DEFAULT ''` } catch { /**/ }
  try { await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20) DEFAULT ''` } catch { /**/ }
  try { await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0` } catch { /**/ }
  try { await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_name VARCHAR(100) DEFAULT ''` } catch { /**/ }
  try { await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_note TEXT DEFAULT ''` } catch { /**/ }
}

// GET: track order by code
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    if (!code) return NextResponse.json({ error: 'Thiếu mã đơn' }, { status: 400 })

    const rows = await sql`SELECT * FROM orders WHERE order_code = ${code}`
    if (!rows.length) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 })

    const order = rows[0]
    const items = await sql`SELECT * FROM order_items WHERE order_id = ${order.id}`
    return NextResponse.json({ order: { ...order, items } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST: place order from website (no auth required)
export async function POST(req: NextRequest) {
  try {
    await ensureColumns()
    const body = await req.json()
    const { items, total_amount, discount_amount, discount_name, note, table_number, customer_name, customer_phone } = body

    if (!items?.length) return NextResponse.json({ error: 'Đơn hàng trống' }, { status: 400 })

    const orderCode = generateOrderCode()
    const rows = await sql`
      INSERT INTO orders (order_code, user_id, total_amount, discount_amount, discount_name,
        customer_paid, change_amount, note, status, table_number, is_paid, pay_method,
        source, customer_name, customer_phone)
      VALUES (${orderCode}, NULL, ${total_amount}, ${discount_amount ?? 0}, ${discount_name || ''},
        0, 0, ${note || ''}, 'pending', ${table_number ?? null}, false, 'transfer',
        'web', ${customer_name || ''}, ${customer_phone || ''})
      RETURNING *
    `
    const order = rows[0]

    for (const item of items) {
      const prods = await sql`SELECT name FROM products WHERE id = ${item.product_id}`
      const productName = prods[0]?.name || 'Unknown'
      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, item_note)
        VALUES (${order.id}, ${item.product_id}, ${productName}, ${item.quantity},
          ${item.unit_price}, ${item.quantity * item.unit_price}, ${item.item_note || ''})
      `
    }

    const orderItems = await sql`SELECT * FROM order_items WHERE order_id = ${order.id}`
    return NextResponse.json({ success: true, order_code: orderCode, order: { ...order, items: orderItems } })
  } catch (e) {
    console.error('[POST /api/public/orders]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
