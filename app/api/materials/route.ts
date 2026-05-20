export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const rows = await sql`
      SELECT id, name, unit, quantity::float as quantity, min_quantity::float as min_quantity,
             COALESCE(price_per_unit, 0)::float as price_per_unit,
             COALESCE(price_note, '') as price_note,
             created_at
      FROM materials
      WHERE store_id = ${user.store_id}
      ORDER BY name
    `
    return NextResponse.json({ materials: rows })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const { name, unit, quantity, min_quantity, price_per_unit, price_note } = await req.json()
    if (!name?.trim() || !unit?.trim()) {
      return NextResponse.json({ error: 'Tên và đơn vị không được để trống' }, { status: 400 })
    }
    const [row] = await sql`
      INSERT INTO materials (store_id, name, unit, quantity, min_quantity, price_per_unit, price_note)
      VALUES (${user.store_id}, ${name.trim()}, ${unit.trim()}, ${Number(quantity) || 0}, ${Number(min_quantity) || 0},
              ${Number(price_per_unit) || 0}, ${price_note || ''})
      RETURNING id, name, unit, quantity::float, min_quantity::float,
                COALESCE(price_per_unit, 0)::float as price_per_unit,
                COALESCE(price_note, '') as price_note, created_at
    `
    return NextResponse.json({ material: row }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
