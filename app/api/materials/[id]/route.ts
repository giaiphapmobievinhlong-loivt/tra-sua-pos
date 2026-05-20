export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const id = Number(params.id)
    const { name, unit, min_quantity, price_per_unit, price_note } = await req.json()
    if (!name?.trim() || !unit?.trim()) {
      return NextResponse.json({ error: 'Tên và đơn vị không được để trống' }, { status: 400 })
    }
    const [row] = await sql`
      UPDATE materials
      SET name = ${name.trim()}, unit = ${unit.trim()}, min_quantity = ${Number(min_quantity) || 0},
          price_per_unit = ${Number(price_per_unit) || 0}, price_note = ${price_note || ''}
      WHERE id = ${id} AND store_id = ${user.store_id}
      RETURNING id, name, unit, quantity::float, min_quantity::float,
                COALESCE(price_per_unit, 0)::float as price_per_unit,
                COALESCE(price_note, '') as price_note
    `
    if (!row) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })
    return NextResponse.json({ material: row })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const id = Number(params.id)
    await sql`DELETE FROM materials WHERE id = ${id} AND store_id = ${user.store_id}`
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
