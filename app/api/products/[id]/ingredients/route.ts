export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const rows = await sql`
      SELECT pi.id, pi.material_id, pi.quantity_per_cup::float,
             m.name as material_name, m.unit
      FROM product_ingredients pi
      JOIN materials m ON m.id = pi.material_id
      JOIN products p ON p.id = pi.product_id
      WHERE pi.product_id = ${Number(params.id)} AND p.store_id = ${user.store_id}
      ORDER BY m.name
    `
    return NextResponse.json({ ingredients: rows })
  } catch (e) {
    return NextResponse.json({ ingredients: [], error: String(e) })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const { material_id, quantity_per_cup } = await req.json()
    if (!material_id || !quantity_per_cup || Number(quantity_per_cup) <= 0) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
    }

    // Verify product and material belong to this store
    const [product] = await sql`SELECT id FROM products WHERE id = ${Number(params.id)} AND store_id = ${user.store_id}`
    if (!product) return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 })

    const [material] = await sql`SELECT id FROM materials WHERE id = ${Number(material_id)} AND store_id = ${user.store_id}`
    if (!material) return NextResponse.json({ error: 'Không tìm thấy nguyên liệu' }, { status: 404 })

    await sql`
      INSERT INTO product_ingredients (product_id, material_id, quantity_per_cup)
      VALUES (${Number(params.id)}, ${Number(material_id)}, ${Number(quantity_per_cup)})
      ON CONFLICT (product_id, material_id) DO UPDATE SET quantity_per_cup = EXCLUDED.quantity_per_cup
    `
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const { material_id } = await req.json()

    const [product] = await sql`SELECT id FROM products WHERE id = ${Number(params.id)} AND store_id = ${user.store_id}`
    if (!product) return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 })

    await sql`
      DELETE FROM product_ingredients WHERE product_id = ${Number(params.id)} AND material_id = ${Number(material_id)}
    `
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
