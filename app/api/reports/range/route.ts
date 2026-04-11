export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

function todayVN() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
}

export async function GET(req: NextRequest) {
  try {
    const from = req.nextUrl.searchParams.get('from') || todayVN()
    const to   = req.nextUrl.searchParams.get('to')   || todayVN()

    const dateStart = `${from}T00:00:00+07:00`
    // nextDay after 'to' as exclusive upper bound
    const toDate = new Date(`${to}T00:00:00+07:00`)
    toDate.setDate(toDate.getDate() + 1)
    const dateEnd = toDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) + 'T00:00:00+07:00'

    const [stats, thuChi, daily, top_products, payBreakdown] = await Promise.all([
      sql`
        SELECT
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COUNT(*) as order_count,
          COALESCE(AVG(total_amount), 0) as avg_order,
          COALESCE(SUM(discount_amount), 0) as total_discount
        FROM orders
        WHERE created_at >= ${dateStart}::timestamptz AND created_at < ${dateEnd}::timestamptz
          AND status != 'cancelled' AND is_paid = true
      `,
      sql`
        SELECT
          COALESCE(SUM(CASE WHEN type='thu' THEN amount ELSE 0 END), 0) as total_thu,
          COALESCE(SUM(CASE WHEN type='chi' THEN amount ELSE 0 END), 0) as total_chi
        FROM transactions
        WHERE transaction_date >= ${from} AND transaction_date <= ${to}
      `,
      // Doanh thu theo ngày (VN) — cups từ đơn completed (kể cả chưa thu tiền)
      sql`
        SELECT
          day,
          COALESCE(SUM(revenue), 0) as revenue,
          COALESCE(SUM(order_count), 0) as order_count,
          COALESCE(SUM(cups), 0) as cups
        FROM (
          SELECT
            ((created_at + interval '7 hours')::date)::text as day,
            SUM(total_amount) as revenue,
            COUNT(*) as order_count,
            0 as cups
          FROM orders
          WHERE created_at >= ${dateStart}::timestamptz AND created_at < ${dateEnd}::timestamptz
            AND status != 'cancelled' AND is_paid = true
          GROUP BY ((created_at + interval '7 hours')::date)
          UNION ALL
          SELECT
            ((o.created_at + interval '7 hours')::date)::text as day,
            0 as revenue,
            0 as order_count,
            SUM(oi.quantity) as cups
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.created_at >= ${dateStart}::timestamptz AND o.created_at < ${dateEnd}::timestamptz
            AND o.status = 'completed'
          GROUP BY ((o.created_at + interval '7 hours')::date)
        ) t
        GROUP BY day
        ORDER BY day
      `,
      // Top sản phẩm
      sql`
        SELECT oi.product_name,
               SUM(oi.quantity)::int as total_qty,
               SUM(oi.subtotal)::numeric as total_revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at >= ${dateStart}::timestamptz AND o.created_at < ${dateEnd}::timestamptz
          AND o.status = 'completed'
        GROUP BY oi.product_name
        ORDER BY total_qty DESC
        LIMIT 15
      `,
      // Phương thức thanh toán
      sql`
        SELECT pay_method,
               COUNT(*) as order_count,
               COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE created_at >= ${dateStart}::timestamptz AND created_at < ${dateEnd}::timestamptz
          AND status != 'cancelled' AND is_paid = true
        GROUP BY pay_method
      `,
    ])

    // Tổng ly = đơn completed trong range
    const cups = await sql`
      SELECT COALESCE(SUM(oi.quantity), 0)::int as total_cups
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.created_at >= ${dateStart}::timestamptz AND o.created_at < ${dateEnd}::timestamptz
        AND o.status = 'completed'
    `

    const totalRevenue = Number(stats[0].total_revenue)
    const totalThu = Number(thuChi[0].total_thu)
    const totalChi = Number(thuChi[0].total_chi)

    return NextResponse.json({
      from, to,
      total_revenue: totalRevenue,
      order_count: Number(stats[0].order_count),
      avg_order: Math.round(Number(stats[0].avg_order)),
      total_discount: Number(stats[0].total_discount),
      total_cups: Number(cups[0].total_cups),
      total_thu: totalThu,
      total_chi: totalChi,
      estimated_profit: totalRevenue + totalThu - totalChi,
      daily: daily.map(d => ({ ...d, revenue: Number(d.revenue), order_count: Number(d.order_count), cups: Number(d.cups) })),
      top_products: top_products.map(p => ({ ...p, total_qty: Number(p.total_qty), total_revenue: Number(p.total_revenue) })),
      pay_breakdown: payBreakdown.map(p => ({ ...p, order_count: Number(p.order_count), revenue: Number(p.revenue) })),
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' }
    })
  } catch (error) {
    console.error('[GET /api/reports/range]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
