export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const { name, unit, min_quantity } = await req.json()
  if (!name?.trim() || !unit?.trim()) {
    return NextResponse.json({ error: 'Tên và đơn vị không được để trống' }, { status: 400 })
  }
  const [row] = await sql`
    UPDATE materials SET name = ${name.trim()}, unit = ${unit.trim()}, min_quantity = ${Number(min_quantity) || 0}
    WHERE id = ${id}
    RETURNING id, name, unit, quantity::float, min_quantity::float
  `
  if (!row) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })
  return NextResponse.json({ material: row })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  await sql`DELETE FROM materials WHERE id = ${id}`
  return NextResponse.json({ success: true })
}
