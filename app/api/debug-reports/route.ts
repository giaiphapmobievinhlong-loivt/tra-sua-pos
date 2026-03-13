export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || '2026-03-13'
  const dateStart = `${date}T00:00:00+07:00`
  const dateEnd   = `${date}T23:59:59+07:00`

  // Raw check
  const all = await sql`SELECT id, order_code, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10`
  const inRange = await sql`
    SELECT id, order_code, status, created_at FROM orders
    WHERE created_at >= ${dateStart}::timestamptz 
      AND created_at <= ${dateEnd}::timestamptz
  `
  const withoutFilter = await sql`
    SELECT COUNT(*) as total FROM orders
    WHERE created_at >= ${dateStart}::timestamptz 
      AND created_at <= ${dateEnd}::timestamptz
  `
  const withFilter = await sql`
    SELECT COUNT(*) as total FROM orders
    WHERE created_at >= ${dateStart}::timestamptz 
      AND created_at <= ${dateEnd}::timestamptz
      AND status != 'cancelled'
  `

  return NextResponse.json({
    dateStart, dateEnd,
    latest_10: all,
    in_range: inRange,
    count_no_filter: withoutFilter[0].total,
    count_with_filter: withFilter[0].total,
  })
}
