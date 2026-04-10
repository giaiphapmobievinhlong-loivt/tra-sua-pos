export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  const dateStart = `${date}T00:00:00+07:00`
  const dateEnd   = `${date}T23:59:59+07:00`

  const [latest, inRange, counts, itemCheck] = await Promise.all([
    // 5 đơn mới nhất trong DB (raw, không filter)
    sql`SELECT id, order_code, status, is_paid, total_amount, created_at FROM orders ORDER BY created_at DESC LIMIT 5`,

    // Các đơn trong ngày (không filter is_paid/status)
    sql`
      SELECT id, order_code, status, is_paid, total_amount, created_at
      FROM orders
      WHERE created_at >= ${dateStart}::timestamptz AND created_at <= ${dateEnd}::timestamptz
      ORDER BY created_at DESC
    `,

    // Đếm theo từng tổ hợp is_paid + status
    sql`
      SELECT status, is_paid, COUNT(*) as cnt, SUM(total_amount) as revenue
      FROM orders
      WHERE created_at >= ${dateStart}::timestamptz AND created_at <= ${dateEnd}::timestamptz
      GROUP BY status, is_paid
      ORDER BY status
    `,

    // Kiểm tra order_items của các đơn hôm nay
    sql`
      SELECT o.order_code, o.status, o.is_paid, COUNT(oi.id) as item_count, COALESCE(SUM(oi.quantity),0) as total_qty
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.created_at >= ${dateStart}::timestamptz AND o.created_at <= ${dateEnd}::timestamptz
      GROUP BY o.id, o.order_code, o.status, o.is_paid
      ORDER BY o.created_at DESC
    `,
  ])

  return NextResponse.json({
    date, dateStart, dateEnd,
    latest_5_orders: latest,
    orders_in_range: inRange,
    breakdown_by_status_paid: counts,
    items_per_order: itemCheck,
  })
}
