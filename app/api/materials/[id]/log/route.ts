export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const id = Number(params.id)
    const logs = await sql`
      SELECT l.id, l.type, l.quantity::float, l.note,
             TO_CHAR(l.created_at + interval '7 hours', 'DD/MM/YYYY HH24:MI') as created_at_vn,
             u.full_name as user_name
      FROM material_logs l
      LEFT JOIN users u ON u.id = l.user_id
      JOIN materials m ON m.id = l.material_id
      WHERE l.material_id = ${id} AND m.store_id = ${user.store_id}
      ORDER BY l.created_at DESC
      LIMIT 50
    `
    return NextResponse.json({ logs })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const id = Number(params.id)
    const { type, quantity, note } = await req.json()
    if (!['in', 'out', 'adjust'].includes(type)) {
      return NextResponse.json({ error: 'Loại không hợp lệ' }, { status: 400 })
    }
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      return NextResponse.json({ error: 'Số lượng phải lớn hơn 0' }, { status: 400 })
    }

    const delta = type === 'in' ? qty : type === 'out' ? -qty : qty
    const [material] = await sql`
      UPDATE materials SET quantity = GREATEST(0, quantity + ${delta})
      WHERE id = ${id} AND store_id = ${user.store_id}
      RETURNING quantity::float
    `
    if (!material) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })

    await sql`
      INSERT INTO material_logs (material_id, type, quantity, note, user_id)
      VALUES (${id}, ${type}, ${qty}, ${note?.trim() || null}, ${user.id})
    `
    return NextResponse.json({ quantity: material.quantity })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
