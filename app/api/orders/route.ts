export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/db"
import { getUserFromRequest, generateOrderCode } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 })

    const todayVN = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
    const date   = req.nextUrl.searchParams.get("date") || todayVN
    const status = req.nextUrl.searchParams.get("status")

    const dateStart = `${date}T00:00:00+07:00`
    const dateEnd   = `${date}T23:59:59+07:00`

    const [orders, allItemsRaw] = await Promise.all([
      status && status !== "all"
        ? sql`
            SELECT o.*, TO_CHAR(o.created_at + interval '7 hours', 'YYYY-MM-DD HH24:MI:SS') as vn_created_at, u.username
            FROM orders o LEFT JOIN users u ON o.user_id = u.id
            WHERE o.store_id = ${user.store_id}
              AND o.created_at >= ${dateStart}::timestamptz AND o.created_at <= ${dateEnd}::timestamptz
              AND o.status = ${status}
            ORDER BY o.created_at DESC
          `
        : sql`
            SELECT o.*, TO_CHAR(o.created_at + interval '7 hours', 'YYYY-MM-DD HH24:MI:SS') as vn_created_at, u.username
            FROM orders o LEFT JOIN users u ON o.user_id = u.id
            WHERE o.store_id = ${user.store_id}
              AND o.created_at >= ${dateStart}::timestamptz AND o.created_at <= ${dateEnd}::timestamptz
            ORDER BY
              CASE o.status WHEN 'pending' THEN 1 WHEN 'brewing' THEN 2
                WHEN 'ready' THEN 3 WHEN 'completed' THEN 4 WHEN 'cancelled' THEN 5 ELSE 6
              END, o.created_at DESC
          `,
      sql`
        SELECT oi.* FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.store_id = ${user.store_id}
          AND o.created_at >= ${dateStart}::timestamptz AND o.created_at <= ${dateEnd}::timestamptz
      `,
    ])

    const itemsByOrder: Record<number, unknown[]> = {}
    for (const item of allItemsRaw) {
      const oid = item.order_id as number
      ;(itemsByOrder[oid] ||= []).push(item)
    }

    const ordersWithItems = orders.map((o: Record<string, unknown>) => ({
      ...o,
      items: itemsByOrder[o.id as number] || [],
    }))

    return NextResponse.json({ orders: ordersWithItems, date_used: date, total: ordersWithItems.length }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' }
    })
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
    const { items, discount_amount, discount_name, customer_paid, change_amount, note, table_number, status, is_paid, pay_method } = body

    if (!items?.length) return NextResponse.json({ error: "Đơn hàng trống" }, { status: 400 })

    // ── Kiểm tra và cập nhật quota ────────────────────────────────────────
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
    const nowISO = new Date().toISOString()

    // Downgrade về free nếu gói trả phí đã hết hạn
    const [configRow] = await sql`SELECT value FROM settings WHERE store_id = 1 AND key = 'free_daily_limit'`
    const freeDailyLimit = configRow ? Number(configRow.value) : 10
    await sql`
      UPDATE quotas
      SET plan = 'free', daily_limit = ${freeDailyLimit}, expires_at = NULL
      WHERE store_id = ${user.store_id}
        AND plan = 'paid'
        AND expires_at IS NOT NULL
        AND expires_at < ${nowISO}::timestamptz
    `

    // Reset nếu sang ngày mới
    await sql`
      UPDATE quotas SET orders_used_today = 0, reset_date = ${today}
      WHERE store_id = ${user.store_id} AND reset_date < ${today}
    `

    const [quota] = await sql`SELECT plan, daily_limit, orders_used_today FROM quotas WHERE store_id = ${user.store_id}`
    if (!quota) return NextResponse.json({ error: "Lỗi cấu hình quota" }, { status: 500 })

    if (Number(quota.orders_used_today) >= Number(quota.daily_limit)) {
      return NextResponse.json({
        error: `Đã đạt giới hạn ${quota.daily_limit} đơn hôm nay. Vui lòng nâng cấp gói để tạo thêm đơn.`,
        quota_exceeded: true,
      }, { status: 403 })
    }
    // ─────────────────────────────────────────────────────────────────────

    const orderCode = generateOrderCode()

    type Item = { product_id: number | null; quantity: number; unit_price: number; item_note?: string }

    const productIds = items.map((i: Item) => i.product_id).filter((id: number | null) => id != null)
    const prods = productIds.length
      ? await sql`SELECT id, name, price FROM products WHERE id = ANY(${productIds}) AND store_id = ${user.store_id}`
      : []
    const nameMap = Object.fromEntries(prods.map((p) => [p.id, p.name]))
    const priceMap = Object.fromEntries(prods.map((p) => [p.id, Number(p.price)]))

    // Giá lấy từ DB cho món có product_id (không tin unit_price client gửi lên) —
    // món tự thêm (product_id = null, vd. topping ngoài menu) vẫn dùng giá staff nhập tay
    const resolvedItems = (items as Item[]).map((item) => {
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0))
      const unitPrice = item.product_id != null && priceMap[item.product_id] != null
        ? priceMap[item.product_id]
        : Math.max(0, Number(item.unit_price) || 0)
      return { ...item, quantity, unit_price: unitPrice, subtotal: unitPrice * quantity }
    })

    const subtotal = resolvedItems.reduce((sum, i) => sum + i.subtotal, 0)
    const safeDiscount = Math.min(Math.max(Number(discount_amount) || 0, 0), subtotal)
    const finalTotal = Math.max(0, subtotal - safeDiscount)

    const rows = await sql`
      INSERT INTO orders (store_id, order_code, user_id, total_amount, discount_amount, discount_name, customer_paid, change_amount, note, status, table_number, is_paid, pay_method)
      VALUES (${user.store_id}, ${orderCode}, ${user.id}, ${finalTotal}, ${safeDiscount}, ${discount_name || ''}, ${customer_paid ?? 0}, ${change_amount ?? 0},
              ${note || ""}, ${status || "pending"}, ${table_number ?? null}, ${is_paid ?? false}, ${pay_method ?? null})
      RETURNING *
    `
    const order = rows[0]

    try {
      await sql.transaction(resolvedItems.map((item) =>
        sql`
          INSERT INTO order_items (store_id, order_id, product_id, product_name, quantity, unit_price, subtotal, item_note)
          VALUES (${user.store_id}, ${order.id}, ${item.product_id}, ${item.product_id != null ? (nameMap[item.product_id] || 'Unknown') : 'Món thêm'},
                  ${item.quantity}, ${item.unit_price}, ${item.subtotal}, ${item.item_note || ''})
        `
      ))
    } catch (itemError) {
      // Không để lại đơn hàng rỗng nếu ghi món thất bại
      await sql`DELETE FROM orders WHERE id = ${order.id} AND store_id = ${user.store_id}`
      throw itemError
    }

    // Tăng quota đã dùng
    await sql`UPDATE quotas SET orders_used_today = orders_used_today + 1 WHERE store_id = ${user.store_id}`

    const orderItems = await sql`SELECT * FROM order_items WHERE order_id = ${order.id} AND store_id = ${user.store_id}`
    return NextResponse.json({ success: true, order: { ...order, items: orderItems } })
  } catch (error) {
    console.error("[POST /api/orders]", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
