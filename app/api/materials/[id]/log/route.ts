export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const logs = await sql`
    SELECT l.id, l.type, l.quantity::float, l.note,
           TO_CHAR(l.created_at + interval '7 hours', 'DD/MM/YYYY HH24:MI') as created_at_vn,
           u.full_name as user_name
    FROM material_logs l
    LEFT JOIN users u ON u.id = l.user_id
    WHERE l.material_id = ${id}
    ORDER BY l.created_at DESC
    LIMIT 50
  `
  return NextResponse.json({ logs })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const { type, quantity, note, user_id } = await req.json()
  if (!['in', 'out', 'adjust'].includes(type)) {
    return NextResponse.json({ error: 'Loại không hợp lệ' }, { status: 400 })
  }
  const qty = Number(quantity)
  if (!qty || qty <= 0) {
    return NextResponse.json({ error: 'Số lượng phải lớn hơn 0' }, { status: 400 })
  }

  // Update quantity: in = +qty, out = -qty, adjust = set absolute value (passed as signed)
  const delta = type === 'in' ? qty : type === 'out' ? -qty : qty
  const [material] = await sql`
    UPDATE materials SET quantity = GREATEST(0, quantity + ${delta})
    WHERE id = ${id}
    RETURNING quantity::float
  `
  if (!material) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })

  await sql`
    INSERT INTO material_logs (material_id, type, quantity, note, user_id)
    VALUES (${id}, ${type}, ${qty}, ${note?.trim() || null}, ${user_id || null})
  `
  return NextResponse.json({ quantity: material.quantity })
}
