import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Revenue stats
    const stats = await sql`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as order_count,
        COALESCE(AVG(total_amount), 0) as avg_order
      FROM orders
      WHERE DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = ${date}
        AND status = 'completed'
    `

    // Thu Chi for profit calc
    const thuChi = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN type='thu' THEN amount ELSE 0 END), 0) as total_thu,
        COALESCE(SUM(CASE WHEN type='chi' THEN amount ELSE 0 END), 0) as total_chi
      FROM transactions
      WHERE transaction_date = ${date}
    `

    // Recent orders
    const recent_orders = await sql`
      SELECT o.*, u.username
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE DATE(o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = ${date}
      ORDER BY o.created_at DESC
      LIMIT 10
    `

    // Hourly breakdown
    const hourly = await sql`
      SELECT 
        EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int as hour,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as count
      FROM orders
      WHERE DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = ${date}
        AND status = 'completed'
      GROUP BY hour
      ORDER BY hour
    `

    const totalRevenue = Number(stats[0].total_revenue)
    const totalThu = Number(thuChi[0].total_thu)
    const totalChi = Number(thuChi[0].total_chi)
    const estimatedProfit = totalRevenue + totalThu - totalChi

    return NextResponse.json({
      total_revenue: totalRevenue,
      order_count: Number(stats[0].order_count),
      avg_order: Math.round(Number(stats[0].avg_order)),
      estimated_profit: estimatedProfit,
      recent_orders,
      hourly,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
