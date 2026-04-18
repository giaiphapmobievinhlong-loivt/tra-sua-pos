export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

// Get current date in VN timezone (safe on Vercel/UTC servers)
function todayVN() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
}
function currentYearVN() {
  return Number(new Date().toLocaleString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }))
}
function currentMonthVN() {
  return Number(new Date().toLocaleString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', month: 'numeric' }))
}

export async function GET(req: NextRequest) {
  try {
    const type  = req.nextUrl.searchParams.get('type') || 'daily'
    const date  = req.nextUrl.searchParams.get('date')  || todayVN()
    const year  = Number(req.nextUrl.searchParams.get('year')  || currentYearVN())
    const month = Number(req.nextUrl.searchParams.get('month') || currentMonthVN())

    if (type === 'monthly') {
      const monthPad  = String(month).padStart(2, '0')
      const nextMonthPad = month === 12 ? '01' : String(month + 1).padStart(2, '0')
      const nextYear  = month === 12 ? year + 1 : year
      const monthStart = `${year}-${monthPad}-01T00:00:00+07:00`
      const nextMonth  = `${nextYear}-${nextMonthPad}-01T00:00:00+07:00`

      const [stats, thuChi, daily, top_products, trend] = await Promise.all([
        sql`
          SELECT COALESCE(SUM(total_amount),0) as total_revenue,
                 COUNT(*) as order_count,
                 COALESCE(AVG(total_amount),0) as avg_order
          FROM orders
          WHERE created_at >= ${monthStart}::timestamptz AND created_at < ${nextMonth}::timestamptz
            AND status != 'cancelled' AND is_paid = true
        `,
        sql`
          SELECT COALESCE(SUM(CASE WHEN type='thu' THEN amount ELSE 0 END),0) as total_thu,
                 COALESCE(SUM(CASE WHEN type='chi' THEN amount ELSE 0 END),0) as total_chi
          FROM transactions
          WHERE EXTRACT(YEAR FROM transaction_date) = ${year}
            AND EXTRACT(MONTH FROM transaction_date) = ${month}
        `,
        sql`
          SELECT ((created_at + interval '7 hours')::date)::text as day,
                 COALESCE(SUM(total_amount),0) as revenue,
                 COUNT(*) as order_count
          FROM orders
          WHERE created_at >= ${monthStart}::timestamptz AND created_at < ${nextMonth}::timestamptz
            AND status != 'cancelled' AND is_paid = true
          GROUP BY ((created_at + interval '7 hours')::date)
          ORDER BY day
        `,
        sql`
          SELECT oi.product_name,
                 SUM(oi.quantity)::int as total_qty,
                 SUM(oi.subtotal) as total_revenue
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.created_at >= ${monthStart}::timestamptz AND o.created_at < ${nextMonth}::timestamptz
            AND o.status != 'cancelled' AND o.is_paid = true
          GROUP BY oi.product_name
          ORDER BY total_qty DESC LIMIT 20
        `,
        sql`
          SELECT TO_CHAR(DATE_TRUNC('month', created_at + interval '7 hours'), 'YYYY-MM') as month_key,
                 COALESCE(SUM(total_amount),0) as revenue,
                 COUNT(*) as order_count
          FROM orders
          WHERE created_at >= (${monthStart}::timestamptz - interval '5 months')
            AND created_at < ${nextMonth}::timestamptz
            AND status != 'cancelled' AND is_paid = true
          GROUP BY month_key ORDER BY month_key
        `,
      ])

      return NextResponse.json({
        year, month,
        total_revenue: Number(stats[0].total_revenue),
        order_count:   Number(stats[0].order_count),
        avg_order:     Math.round(Number(stats[0].avg_order)),
        total_thu:     Number(thuChi[0].total_thu),
        total_chi:     Number(thuChi[0].total_chi),
        estimated_profit: Number(stats[0].total_revenue) + Number(thuChi[0].total_thu) - Number(thuChi[0].total_chi),
        daily, top_products, trend,
      }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } })
    }

    // ── Daily report ───────────────────────────────────────────
    // Dùng VN midnight với +07:00 và ::timestamptz — cùng pattern với monthly report (đã hoạt động)
    const [dy, dm, dd] = date.split('-').map(Number)
    const nextDay    = new Date(Date.UTC(dy, dm - 1, dd + 1)).toISOString().slice(0, 10)
    const dayStart   = `${date}T00:00:00+07:00`
    const dayEnd     = `${nextDay}T00:00:00+07:00`

    const [stats, thuChi, recent_orders, hourly, cups, top_products] = await Promise.all([
      sql`
        SELECT COALESCE(SUM(total_amount),0) as total_revenue,
               COUNT(*) as order_count,
               COALESCE(AVG(total_amount),0) as avg_order
        FROM orders
        WHERE created_at >= ${dayStart}::timestamptz
          AND created_at <  ${dayEnd}::timestamptz
          AND status != 'cancelled' AND is_paid = true
      `,
      sql`
        SELECT COALESCE(SUM(CASE WHEN type='thu' THEN amount ELSE 0 END),0) as total_thu,
               COALESCE(SUM(CASE WHEN type='chi' THEN amount ELSE 0 END),0) as total_chi
        FROM transactions WHERE transaction_date = ${date}
      `,
      sql`
        SELECT o.*, TO_CHAR(o.created_at + interval '7 hours', 'YYYY-MM-DD HH24:MI:SS') as vn_created_at, u.username
        FROM orders o LEFT JOIN users u ON o.user_id = u.id
        WHERE o.created_at >= ${dayStart}::timestamptz
          AND o.created_at <  ${dayEnd}::timestamptz
        ORDER BY o.created_at DESC LIMIT 20
      `,
      sql`
        SELECT EXTRACT(HOUR FROM (created_at + interval '7 hours'))::int as hour,
               COALESCE(SUM(total_amount),0) as revenue,
               COUNT(*) as count
        FROM orders
        WHERE created_at >= ${dayStart}::timestamptz
          AND created_at <  ${dayEnd}::timestamptz
          AND status != 'cancelled' AND is_paid = true
        GROUP BY hour ORDER BY hour
      `,
      sql`
        SELECT COALESCE(SUM(oi.quantity),0)::int as total_cups
        FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at >= ${dayStart}::timestamptz
          AND o.created_at <  ${dayEnd}::timestamptz
          AND o.status = 'completed'
      `,
      sql`
        SELECT oi.product_name,
               SUM(oi.quantity)::int as total_qty,
               SUM(oi.subtotal)::numeric as total_revenue
        FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at >= ${dayStart}::timestamptz
          AND o.created_at <  ${dayEnd}::timestamptz
          AND o.status = 'completed'
        GROUP BY oi.product_name
        ORDER BY total_qty DESC LIMIT 10
      `,
    ])

    return NextResponse.json({
      total_revenue:    Number(stats[0].total_revenue),
      order_count:      Number(stats[0].order_count),
      avg_order:        Math.round(Number(stats[0].avg_order)),
      estimated_profit: Number(stats[0].total_revenue) + Number(thuChi[0].total_thu) - Number(thuChi[0].total_chi),
      total_cups:       Number(cups[0].total_cups),
      top_products: top_products.map(p => ({ ...p, total_qty: Number(p.total_qty), total_revenue: Number(p.total_revenue) })),
      recent_orders, hourly,
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
