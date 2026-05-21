export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Chỉ chủ hệ thống (store_id = 1) mới được xem
  if (user.store_id !== 1) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const stores = await sql`
    SELECT
      s.id,
      s.name,
      s.email,
      s.created_at,
      q.plan,
      q.daily_limit,
      q.orders_used_today,
      q.expires_at,
      (SELECT COUNT(*) FROM orders o WHERE o.store_id = s.id) AS total_orders
    FROM stores s
    LEFT JOIN quotas q ON q.store_id = s.id
    ORDER BY s.id ASC
  `

  return NextResponse.json({ stores })
}
