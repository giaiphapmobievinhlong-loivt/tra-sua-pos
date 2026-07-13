export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.store_id !== 1 || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [row] = await sql`SELECT value FROM settings WHERE store_id = 1 AND key = 'free_daily_limit'`
  return NextResponse.json({ free_daily_limit: row ? Number(row.value) : 10 })
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.store_id !== 1 || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { free_daily_limit } = await req.json()
  const limit = Number(free_daily_limit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 9999) {
    return NextResponse.json({ error: 'Giới hạn phải là số nguyên từ 1 đến 9999' }, { status: 400 })
  }

  await sql`
    INSERT INTO settings (store_id, key, value)
    VALUES (1, 'free_daily_limit', ${String(limit)})
    ON CONFLICT (store_id, key) DO UPDATE SET value = ${String(limit)}, updated_at = NOW()
  `

  return NextResponse.json({ success: true, free_daily_limit: limit })
}
