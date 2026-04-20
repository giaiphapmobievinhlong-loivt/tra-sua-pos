export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rows = await sql`
    SELECT pi.id, pi.material_id, pi.quantity_per_cup::float,
           m.name as material_name, m.unit
    FROM product_ingredients pi
    JOIN materials m ON m.id = pi.material_id
    WHERE pi.product_id = ${Number(id)}
    ORDER BY m.name
  `
  return NextResponse.json({ ingredients: rows })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { material_id, quantity_per_cup } = await req.json()
  if (!material_id || !quantity_per_cup || Number(quantity_per_cup) <= 0) {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
  }
  await sql`
    INSERT INTO product_ingredients (product_id, material_id, quantity_per_cup)
    VALUES (${Number(id)}, ${Number(material_id)}, ${Number(quantity_per_cup)})
    ON CONFLICT (product_id, material_id) DO UPDATE SET quantity_per_cup = EXCLUDED.quantity_per_cup
  `
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { material_id } = await req.json()
  await sql`
    DELETE FROM product_ingredients WHERE product_id = ${Number(id)} AND material_id = ${Number(material_id)}
  `
  return NextResponse.json({ success: true })
}
