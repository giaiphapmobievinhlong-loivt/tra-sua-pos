export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/db"
import { getUserFromRequest, generateOrderCode } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const todayVN = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
    const date   = req.nextUrl.searchParams.get("date") || todayVN
    const status = req.nextUrl.searchParams.get("status")

    const dateStart = `${date}T00:00:00+07:00`
    const dateEnd   = `${date}T23:59:59+07:00`

    const orders = status && status !== "all"
      ? await sql`
          SELECT o.*, TO_CHAR(o.created_at + interval '7 hours', 'YYYY-MM-DD HH24:MI:SS') as vn_created_at, u.username
          FROM orders o LEFT JOIN users u ON o.user_id = u.id
          WHERE o.created_at >= ${dateStart}::timestamptz AND o.created_at <= ${dateEnd}::timestamptz
            AND o.status = ${status}
          ORDER BY o.created_at DESC
        `
      : await sql`
          SELECT o.*, TO_CHAR(o.created_at + interval '7 hours', 'YYYY-MM-DD HH24:MI:SS') as vn_created_at, u.username
          FROM orders o LEFT JOIN users u ON o.user_id = u.id
          WHERE o.created_at >= ${dateStart}::timestamptz AND o.created_at <= ${dateEnd}::timestamptz
          ORDER BY
            CASE o.status WHEN 'pending' THEN 1 WHEN 'brewing' THEN 2
              WHEN 'ready' THEN 3 WHEN 'completed' THEN 4 WHEN 'cancelled' THEN 5 ELSE 6
            END, o.created_at DESC
        `

    // Fetch all items in one query instead of N queries
    const orderIds = orders.map((o: Record<string, unknown>) => o.id)
    const allItems = orderIds.length
      ? await sql`SELECT * FROM order_items WHERE order_id = ANY(${orderIds})`
      : []

    const itemsByOrder: Record<number, unknown[]> = {}
    for (const item of allItems) {
      const oid = item.order_id as number
      ;(itemsByOrder[oid] ||= []).push(item)
    }

    const ordersWithItems = orders.map((o: Record<string, unknown>) => ({
      ...o,
      items: itemsByOrder[o.id as number] || [],
    }))

    return NextResponse.json({ orders: ordersWithItems, date_used: date, total: ordersWithItems.length })
  } catch (error) {
    console.error("[GET /api/orders]", error)
    return NextResponse.json({ error: String(error), orders: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })

    const body = await req.json()
    const { items, total_amount, discount_amount, discount_name, customer_paid, change_amount, note, table_number, status, is_paid, pay_method } = body

    if (!items?.length) return NextResponse.json({ error: "Đơn hàng trống" }, { status: 400 })

    const orderCode = generateOrderCode()
    const rows = await sql`
      INSERT INTO orders (order_code, user_id, total_amount, discount_amount, discount_name, customer_paid, change_amount, note, status, table_number, is_paid, pay_method)
      VALUES (${orderCode}, ${user.id}, ${total_amount}, ${discount_amount ?? 0}, ${discount_name || ''}, ${customer_paid ?? 0}, ${change_amount ?? 0},
              ${note || ""}, ${status || "pending"}, ${table_number ?? null}, ${is_paid ?? false}, ${pay_method ?? null})
      RETURNING *
    `
    const order = rows[0]

    // Fetch all product names in one query
    const productIds = items.map((i: { product_id: number }) => i.product_id)
    const prods = await sql`SELECT id, name FROM products WHERE id = ANY(${productIds})`
    const nameMap = Object.fromEntries(prods.map((p) => [p.id, p.name]))

    // Insert all items in parallel
    await Promise.all(items.map((item: { product_id: number; quantity: number; unit_price: number; item_note?: string }) =>
      sql`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, item_note)
        VALUES (${order.id}, ${item.product_id}, ${nameMap[item.product_id] || 'Unknown'},
                ${item.quantity}, ${item.unit_price}, ${item.quantity * item.unit_price}, ${item.item_note || ''})
      `
    ))

    const orderItems = await sql`SELECT * FROM order_items WHERE order_id = ${order.id}`
    return NextResponse.json({ success: true, order: { ...order, items: orderItems } })
  } catch (error) {
    console.error("[POST /api/orders]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
