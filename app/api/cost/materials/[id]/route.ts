export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const id = Number(params.id)
    const { price_per_unit, price_note } = await req.json()
    await sql`
      UPDATE materials
      SET price_per_unit = ${Number(price_per_unit) || 0},
          price_note = ${price_note || ''}
      WHERE id = ${id} AND store_id = ${user.store_id}
    `
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
