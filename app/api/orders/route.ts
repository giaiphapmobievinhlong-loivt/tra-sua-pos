export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/db"
import { getUserFromRequest, generateOrderCode } from "@/lib/auth"

// Cache migration per cold start
let migrated = false
async function ensureColumns() {
  if (migrated) return
  try { await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number VARCHAR(20) DEFAULT NULL` } catch { /**/ }
  try { await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false` } catch { /**/ }
  try { await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_method VARCHAR(20) DEFAULT NULL` } catch { /**/ }
  try { await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_note TEXT DEFAULT ''` } catch { /**/ }
  try { await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0` } catch { /**/ }
  try { await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_name VARCHAR(100) DEFAULT ''` } catch { /**/ }
  migrated = true
}

export async function GET(req: NextRequest) {
  try {
    await ensureColumns()

    const todayVN = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split("T")[0]
    const date   = req.nextUrl.searchParams.get("date") || todayVN
    const status = req.nextUrl.searchParams.get("status")

    // Convert VN date to UTC range: VN = UTC+7, so VN day starts at UTC-7h previous day
    // e.g. 2026-03-09 VN = 2026-03-08 17:00 UTC to 2026-03-09 17:00 UTC
    const dateStart = `${date}T00:00:00+07:00`
    const dateEnd   = `${date}T23:59:59+07:00`

    let orders
    if (status && status !== "all") {
      orders = await sql`
        SELECT o.*, TO_CHAR(o.created_at + interval '7 hours', 'YYYY-MM-DD HH24:MI:SS') as vn_created_at, u.username FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.created_at >= ${dateStart}::timestamptz
          AND o.created_at <= ${dateEnd}::timestamptz
          AND o.status = ${status}
        ORDER BY o.created_at DESC
      `
    } else {
      orders = await sql`
        SELECT o.*, TO_CHAR(o.created_at + interval '7 hours', 'YYYY-MM-DD HH24:MI:SS') as vn_created_at, u.username FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.created_at >= ${dateStart}::timestamptz
          AND o.created_at <= ${dateEnd}::timestamptz
        ORDER BY
          CASE o.status
            WHEN 'pending'   THEN 1 WHEN 'brewing'   THEN 2
            WHEN 'ready'     THEN 3 WHEN 'completed' THEN 4
            WHEN 'cancelled' THEN 5 ELSE 6
          END, o.created_at DESC
      `
    }

    const ordersWithItems = await Promise.all(
      orders.map(async (order: Record<string, unknown>) => {
        const items = await sql`SELECT * FROM order_items WHERE order_id = ${order.id}`
        return { ...order, items }
      })
    )

    return NextResponse.json({ orders: ordersWithItems, date_used: date, total: ordersWithItems.length })
  } catch (error) {
    console.error("[GET /api/orders]", error)
    return NextResponse.json({ error: String(error), orders: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureColumns()

    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: "Chua dang nhap" }, { status: 401 })

    const body = await req.json()
    const { items, total_amount, discount_amount, discount_name, customer_paid, change_amount, note, table_number, status, is_paid, pay_method } = body

    if (!items?.length) return NextResponse.json({ error: "Don hang trong" }, { status: 400 })

    const orderCode = generateOrderCode()
    const rows = await sql`
      INSERT INTO orders (order_code, user_id, total_amount, discount_amount, discount_name, customer_paid, change_amount, note, status, table_number, is_paid, pay_method)
      VALUES (${orderCode}, ${user.id}, ${total_amount}, ${discount_amount ?? 0}, ${discount_name || ''}, ${customer_paid ?? 0}, ${change_amount ?? 0},
              ${note || ""}, ${status || "pending"}, ${table_number ?? null}, ${is_paid ?? false}, ${pay_method ?? null})
      RETURNING *
    `
    const order = rows[0]

    for (const item of items) {
      const prods = await sql`SELECT name FROM products WHERE id = ${item.product_id}`
      const productName = prods[0]?.name || "Unknown"
      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, item_note)
        VALUES (${order.id}, ${item.product_id}, ${productName}, ${item.quantity}, ${item.unit_price}, ${item.quantity * item.unit_price}, ${item.item_note || ''})
      `
    }

    const orderItems = await sql`SELECT * FROM order_items WHERE order_id = ${order.id}`
    return NextResponse.json({ success: true, order: { ...order, items: orderItems } })

  } catch (error) {
    console.error("[POST /api/orders]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
