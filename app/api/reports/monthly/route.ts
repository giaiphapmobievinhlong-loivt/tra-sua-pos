export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const year  = Number(req.nextUrl.searchParams.get('year')  || new Date().getFullYear())
    const month = Number(req.nextUrl.searchParams.get('month') || new Date().getMonth() + 1)

    const monthPad = String(month).padStart(2, '0')
    // VN midnight → UTC: subtract 7h
    const utcStart = new Date(`${year}-${monthPad}-01T00:00:00+07:00`).toISOString().replace('T', ' ').replace('Z', '').split('.')[0]
    // Last day of month 23:59:59 VN → UTC
    const lastDay = new Date(year, month, 0).getDate()
    const lastDayPad = String(lastDay).padStart(2, '0')
    const utcEnd = new Date(`${year}-${monthPad}-${lastDayPad}T23:59:59+07:00`).toISOString().replace('T', ' ').replace('Z', '').split('.')[0]

    // Daily breakdown — group by VN date (UTC+7)
    const daily = await sql`
      SELECT
        ((created_at + interval '7 hours')::date)::text as day,
        COALESCE(SUM(total_amount), 0)::numeric as revenue,
        COUNT(*)::int as order_count
      FROM orders
      WHERE created_at >= ${utcStart}::timestamp AND created_at <= ${utcEnd}::timestamp
        AND status != 'cancelled'
          AND is_paid = true
      GROUP BY day ORDER BY day
    `

    // Monthly totals
    const totals = await sql`
      SELECT
        COALESCE(SUM(total_amount), 0)::numeric as total_revenue,
        COUNT(*)::int as order_count,
        COALESCE(AVG(total_amount), 0)::numeric as avg_order
      FROM orders
      WHERE created_at >= ${utcStart}::timestamp AND created_at <= ${utcEnd}::timestamp
        AND status != 'cancelled'
          AND is_paid = true
    `

    // Thu/Chi for the month
    const startDate = `${year}-${monthPad}-01`
    const endDate   = `${year}-${monthPad}-${lastDayPad}`
    const thuChi = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type='thu' THEN amount ELSE 0 END), 0)::numeric as total_thu,
        COALESCE(SUM(CASE WHEN type='chi' THEN amount ELSE 0 END), 0)::numeric as total_chi
      FROM transactions
      WHERE transaction_date BETWEEN ${startDate} AND ${endDate}
    `

    // Individual transactions for the month
    const transactions = await sql`
      SELECT t.id, t.type, t.amount::numeric, t.description, t.note, t.transaction_date, u.username
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.transaction_date BETWEEN ${startDate} AND ${endDate}
      ORDER BY t.transaction_date ASC, t.created_at ASC
    `

    // Top products
    const top_products = await sql`
      SELECT
        oi.product_name,
        SUM(oi.quantity)::int as total_qty,
        SUM(oi.subtotal * (1 - COALESCE(o.discount_amount, 0)::float / NULLIF(o.total_amount + COALESCE(o.discount_amount, 0), 0)))::numeric as total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.created_at >= ${utcStart}::timestamp AND o.created_at <= ${utcEnd}::timestamp
        AND o.status != 'cancelled'
        AND o.is_paid = true
      GROUP BY oi.product_name
      ORDER BY total_qty DESC LIMIT 20
    `

    // 6-month trend
    const trend6Start = new Date(new Date(`${year}-${monthPad}-01T00:00:00+07:00`).getTime() - 5 * 30 * 24 * 60 * 60 * 1000)
    const trend6StartStr = trend6Start.toISOString().replace('T', ' ').replace('Z', '')
    const trend = await sql`
      SELECT
        TO_CHAR(((created_at + interval '7 hours')::date), 'YYYY-MM') as month_key,
        COALESCE(SUM(total_amount), 0)::numeric as revenue,
        COUNT(*)::int as order_count
      FROM orders
      WHERE created_at >= ${trend6StartStr}::timestamp
        AND status != 'cancelled'
          AND is_paid = true
      GROUP BY month_key ORDER BY month_key
    `

    const cups = await sql`
      SELECT COALESCE(SUM(oi.quantity),0)::int as total_cups
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.created_at >= ${utcStart}::timestamp AND o.created_at <= ${utcEnd}::timestamp
        AND o.status != 'cancelled'
        AND o.is_paid = true
    `

    const totalRevenue = Number(totals[0].total_revenue)
    const totalThu = Number(thuChi[0].total_thu)
    const totalChi = Number(thuChi[0].total_chi)

    return NextResponse.json({
      year, month,
      total_revenue: totalRevenue,
      order_count: Number(totals[0].order_count),
      avg_order: Math.round(Number(totals[0].avg_order)),
      total_thu: totalThu, total_chi: totalChi,
      estimated_profit: totalRevenue + totalThu - totalChi,
      total_cups: Number(cups[0].total_cups),
      daily: daily.map(d => ({ ...d, revenue: Number(d.revenue), order_count: Number(d.order_count) })),
      top_products: top_products.map(p => ({ ...p, total_qty: Number(p.total_qty), total_revenue: Number(p.total_revenue) })),
      trend: trend.map(t => ({ ...t, revenue: Number(t.revenue), order_count: Number(t.order_count) })),
      transactions: transactions.map(t => ({ ...t, amount: Number(t.amount) })),
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
