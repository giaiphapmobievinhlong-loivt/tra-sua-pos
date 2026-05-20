export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const rows = await sql`SELECT * FROM discounts WHERE store_id = ${user.store_id} ORDER BY is_active DESC, created_at DESC`
    return NextResponse.json({ discounts: rows })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const { name, type, value, min_order, is_active } = await req.json()
    if (!name || !type || value == null) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
    const rows = await sql`
      INSERT INTO discounts (store_id, name, type, value, min_order, is_active)
      VALUES (${user.store_id}, ${name}, ${type}, ${value}, ${min_order || 0}, ${is_active ?? true})
      RETURNING *
    `
    return NextResponse.json({ discount: rows[0] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
