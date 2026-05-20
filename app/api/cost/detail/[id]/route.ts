export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const id = Number(params.id)
    const rows = await sql`
      SELECT
        pi.material_id,
        pi.quantity_per_cup::float,
        m.name as material_name,
        m.unit,
        COALESCE(m.price_per_unit, 0)::float as price_per_unit,
        COALESCE(m.price_note, '') as price_note,
        (pi.quantity_per_cup * COALESCE(m.price_per_unit, 0))::float as ingredient_cost
      FROM product_ingredients pi
      JOIN materials m ON m.id = pi.material_id
      JOIN products p ON p.id = pi.product_id
      WHERE pi.product_id = ${id} AND p.store_id = ${user.store_id}
      ORDER BY ingredient_cost DESC
    `
    return NextResponse.json({ ingredients: rows })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
