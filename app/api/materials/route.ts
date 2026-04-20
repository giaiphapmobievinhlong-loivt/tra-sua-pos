export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  const rows = await sql`
    SELECT id, name, unit, quantity::float as quantity, min_quantity::float as min_quantity, created_at
    FROM materials
    ORDER BY name
  `
  return NextResponse.json({ materials: rows })
}

export async function POST(req: NextRequest) {
  const { name, unit, quantity, min_quantity } = await req.json()
  if (!name?.trim() || !unit?.trim()) {
    return NextResponse.json({ error: 'Tên và đơn vị không được để trống' }, { status: 400 })
  }
  const [row] = await sql`
    INSERT INTO materials (name, unit, quantity, min_quantity)
    VALUES (${name.trim()}, ${unit.trim()}, ${Number(quantity) || 0}, ${Number(min_quantity) || 0})
    RETURNING id, name, unit, quantity::float, min_quantity::float, created_at
  `
  return NextResponse.json({ material: row }, { status: 201 })
}
