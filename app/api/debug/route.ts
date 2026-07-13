export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await sql`
    SELECT id, status, is_paid, total_amount,
      created_at,
      (created_at + interval '7 hours') as vn_time
    FROM orders
    WHERE store_id = ${user.store_id}
    ORDER BY created_at DESC LIMIT 5
  `
  return NextResponse.json({ rows })
}
