export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
    const nowISO = new Date().toISOString()

    // Downgrade về free nếu gói trả phí đã hết hạn
    await sql`
      UPDATE quotas
      SET plan = 'free', daily_limit = 10, expires_at = NULL
      WHERE store_id = ${user.store_id}
        AND plan = 'paid'
        AND expires_at IS NOT NULL
        AND expires_at < ${nowISO}::timestamptz
    `

    // Reset nếu sang ngày mới
    await sql`
      UPDATE quotas
      SET orders_used_today = 0, reset_date = ${today}
      WHERE store_id = ${user.store_id} AND reset_date < ${today}
    `

    const [quota] = await sql`
      SELECT plan, daily_limit, orders_used_today, reset_date, expires_at
      FROM quotas
      WHERE store_id = ${user.store_id}
    `

    if (!quota) {
      return NextResponse.json({ error: 'Không tìm thấy quota' }, { status: 404 })
    }

    // Lịch sử thanh toán
    const payments = await sql`
      SELECT id, amount, package_type, package_days, new_daily_limit, status, created_at, expires_at
      FROM payments
      WHERE store_id = ${user.store_id}
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      plan: quota.plan,
      daily_limit: Number(quota.daily_limit),
      orders_used_today: Number(quota.orders_used_today),
      orders_remaining: Math.max(0, Number(quota.daily_limit) - Number(quota.orders_used_today)),
      reset_date: quota.reset_date,
      expires_at: quota.expires_at,
      payments,
    }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('[GET /api/quota]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
