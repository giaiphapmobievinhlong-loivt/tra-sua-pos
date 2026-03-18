export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') || 'daily'
    const date = req.nextUrl.searchParams.get('date') || new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0]
    const year  = Number(req.nextUrl.searchParams.get('year')  || new Date().getFullYear())
    const month = Number(req.nextUrl.searchParams.get('month') || new Date().getMonth() + 1)

    // Convert VN date to UTC for TIMESTAMP (no tz) column comparison
    const utcStart = new Date(`${date}T00:00:00+07:00`).toISOString().replace('T', ' ').replace('Z', '')
    const utcEnd   = new Date(`${date}T23:59:59+07:00`).toISOString().replace('T', ' ').replace('Z', '')
    // Keep for monthly queries
    const dateStart = `${date}T00:00:00+07:00`
    const dateEnd   = `${date}T23:59:59+07:00`

    if (type === 'monthly') {
      const monthStart = `${year}-${String(month).padStart(2,'0')}-01T00:00:00+07:00`
      const nextMonth  = month === 12 ? `${year+1}-01-01T00:00:00+07:00` : `${year}-${String(month+1).padStart(2,'0')}-01T00:00:00+07:00`
      // Convert to UTC for TIMESTAMP (no tz) column comparison
      const utcMonthStart = new Date(monthStart).toISOString().replace('T', ' ').replace('Z', '').split('.')[0]
      const utcNextMonth  = new Date(nextMonth).toISOString().replace('T', ' ').replace('Z', '').split('.')[0]

      const stats = await sql`
        SELECT COALESCE(SUM(total_amount),0) as total_revenue,
               COUNT(*) as order_count,
               COALESCE(AVG(total_amount),0) as avg_order
        FROM orders
        WHERE created_at >= ${utcMonthStart}::timestamp AND created_at < ${utcNextMonth}::timestamp
          AND status != 'cancelled'
          AND is_paid = true
      `
      const thuChi = await sql`
        SELECT COALESCE(SUM(CASE WHEN type='thu' THEN amount ELSE 0 END),0) as total_thu,
               COALESCE(SUM(CASE WHEN type='chi' THEN amount ELSE 0 END),0) as total_chi
        FROM transactions
        WHERE EXTRACT(YEAR FROM transaction_date) = ${year}
          AND EXTRACT(MONTH FROM transaction_date) = ${month}
      `
      const daily = await sql`
        SELECT ((created_at + interval '7 hours')::date)::text as day,
               COALESCE(SUM(total_amount),0) as revenue,
               COUNT(*) as order_count
        FROM orders
        WHERE created_at >= ${utcMonthStart}::timestamp AND created_at < ${utcNextMonth}::timestamp
          AND status != 'cancelled'
          AND is_paid = true
        GROUP BY ((created_at + interval '7 hours')::date)
        ORDER BY day
      `
      const top_products = await sql`
        SELECT oi.product_name,
               SUM(oi.quantity)::int as total_qty,
               SUM(oi.subtotal) as total_revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.created_at >= ${utcMonthStart}::timestamp AND o.created_at < ${utcNextMonth}::timestamp
          AND o.status != 'cancelled'
          AND o.is_paid = true
        GROUP BY oi.product_name
        ORDER BY total_qty DESC LIMIT 20
      `
      const trend = await sql`
        SELECT TO_CHAR(DATE_TRUNC('month', created_at + interval '7 hours'), 'YYYY-MM') as month_key,
               COALESCE(SUM(total_amount),0) as revenue,
               COUNT(*) as order_count
        FROM orders
        WHERE created_at >= (${utcMonthStart}::timestamp - interval '5 months')
          AND created_at < ${utcNextMonth}::timestamp
          AND status != 'cancelled'
          AND is_paid = true
        GROUP BY month_key ORDER BY month_key
      `
      return NextResponse.json({
        year, month,
        total_revenue: Number(stats[0].total_revenue),
        order_count: Number(stats[0].order_count),
        avg_order: Math.round(Number(stats[0].avg_order)),
        total_thu: Number(thuChi[0].total_thu),
        total_chi: Number(thuChi[0].total_chi),
        estimated_profit: Number(stats[0].total_revenue) + Number(thuChi[0].total_thu) - Number(thuChi[0].total_chi),
        daily, top_products, trend,
      })
    }

    // ── Daily report ───────────────────────────────────────────
    const stats = await sql`
      SELECT COALESCE(SUM(total_amount),0) as total_revenue,
             COUNT(*) as order_count,
             COALESCE(AVG(total_amount),0) as avg_order
      FROM orders
      WHERE created_at >= ${utcStart}::timestamp AND created_at <= ${utcEnd}::timestamp
        AND status != 'cancelled'
          AND is_paid = true
    `
    const thuChi = await sql`
      SELECT COALESCE(SUM(CASE WHEN type='thu' THEN amount ELSE 0 END),0) as total_thu,
             COALESCE(SUM(CASE WHEN type='chi' THEN amount ELSE 0 END),0) as total_chi
      FROM transactions WHERE transaction_date = ${date}
    `
    const recent_orders = await sql`
      SELECT o.*, TO_CHAR(o.created_at + interval '7 hours', 'YYYY-MM-DD HH24:MI:SS') as vn_created_at, u.username FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.created_at >= ${utcStart}::timestamp AND o.created_at <= ${utcEnd}::timestamp
      ORDER BY o.created_at DESC LIMIT 10
    `
    const hourly = await sql`
      SELECT EXTRACT(HOUR FROM (created_at + interval '7 hours'))::int as hour,
             COALESCE(SUM(total_amount),0) as revenue,
             COUNT(*) as count
      FROM orders
      WHERE created_at >= ${utcStart}::timestamp AND created_at <= ${utcEnd}::timestamp
        AND status != 'cancelled'
          AND is_paid = true
      GROUP BY hour ORDER BY hour
    `
    const cups = await sql`
      SELECT COALESCE(SUM(oi.quantity),0)::int as total_cups
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.created_at >= ${utcStart}::timestamp AND o.created_at <= ${utcEnd}::timestamp
        AND o.status != 'cancelled'
        AND o.is_paid = true
    `
    const top_products = await sql`
      SELECT oi.product_name,
             SUM(oi.quantity)::int as total_qty,
             SUM(oi.subtotal * (1 - COALESCE(o.discount_amount, 0)::float / NULLIF(o.total_amount + COALESCE(o.discount_amount, 0), 0)))::numeric as total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.created_at >= ${utcStart}::timestamp AND o.created_at <= ${utcEnd}::timestamp
        AND o.status != 'cancelled'
        AND o.is_paid = true
      GROUP BY oi.product_name
      ORDER BY total_qty DESC LIMIT 10
    `
    return NextResponse.json({
      total_revenue: Number(stats[0].total_revenue),
      order_count: Number(stats[0].order_count),
      avg_order: Math.round(Number(stats[0].avg_order)),
      estimated_profit: Number(stats[0].total_revenue) + Number(thuChi[0].total_thu) - Number(thuChi[0].total_chi),
      total_cups: Number(cups[0].total_cups),
      top_products: top_products.map(p => ({ ...p, total_qty: Number(p.total_qty), total_revenue: Number(p.total_revenue) })),
      recent_orders, hourly,
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
