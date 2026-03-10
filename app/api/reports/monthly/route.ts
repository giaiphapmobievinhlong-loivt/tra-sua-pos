export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const year  = req.nextUrl.searchParams.get('year')  || new Date().getFullYear().toString()
    const month = req.nextUrl.searchParams.get('month') || String(new Date().getMonth() + 1)

    const monthPad = month.padStart(2, '0')
    const startDate = `${year}-${monthPad}-01`
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]

    // Daily breakdown
    const daily = await sql`
      SELECT
        DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as day,
        COALESCE(SUM(total_amount), 0)::numeric as revenue,
        COUNT(*)::int as order_count
      FROM orders
      WHERE DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') BETWEEN ${startDate} AND ${endDate}
        AND status != 'cancelled'
      GROUP BY day ORDER BY day
    `

    // Monthly totals
    const totals = await sql`
      SELECT
        COALESCE(SUM(total_amount), 0)::numeric as total_revenue,
        COUNT(*)::int as order_count,
        COALESCE(AVG(total_amount), 0)::numeric as avg_order
      FROM orders
      WHERE DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') BETWEEN ${startDate} AND ${endDate}
        AND status != 'cancelled'
    `

    // Thu/Chi
    const thuChi = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type='thu' THEN amount ELSE 0 END), 0)::numeric as total_thu,
        COALESCE(SUM(CASE WHEN type='chi' THEN amount ELSE 0 END), 0)::numeric as total_chi
      FROM transactions
      WHERE transaction_date BETWEEN ${startDate} AND ${endDate}
    `

    // Top products
    const top_products = await sql`
      SELECT
        oi.product_name,
        SUM(oi.quantity)::int as total_qty,
        SUM(oi.subtotal)::numeric as total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE DATE(o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') BETWEEN ${startDate} AND ${endDate}
        AND o.status != 'cancelled'
      GROUP BY oi.product_name
      ORDER BY total_qty DESC LIMIT 5
    `

    // 6-month trend
    const trend = await sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM') as month_key,
        COALESCE(SUM(total_amount), 0)::numeric as revenue,
        COUNT(*)::int as order_count
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '6 months'
        AND status != 'cancelled'
      GROUP BY month_key ORDER BY month_key
    `

    const totalRevenue = Number(totals[0].total_revenue)
    const totalThu = Number(thuChi[0].total_thu)
    const totalChi = Number(thuChi[0].total_chi)

    return NextResponse.json({
      year: Number(year), month: Number(month),
      total_revenue: totalRevenue,
      order_count: Number(totals[0].order_count),
      avg_order: Math.round(Number(totals[0].avg_order)),
      total_thu: totalThu, total_chi: totalChi,
      estimated_profit: totalRevenue + totalThu - totalChi,
      daily: daily.map(d => ({ ...d, revenue: Number(d.revenue), order_count: Number(d.order_count) })),
      top_products: top_products.map(p => ({ ...p, total_qty: Number(p.total_qty), total_revenue: Number(p.total_revenue) })),
      trend: trend.map(t => ({ ...t, revenue: Number(t.revenue), order_count: Number(t.order_count) })),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
