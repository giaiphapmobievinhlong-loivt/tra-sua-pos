export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    const { name, type, value, min_order, is_active } = await req.json()
    const rows = await sql`
      UPDATE discounts SET name=${name}, type=${type}, value=${value},
        min_order=${min_order||0}, is_active=${is_active??true}
      WHERE id=${id} RETURNING *
    `
    return NextResponse.json({ discount: rows[0] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params
    await sql`DELETE FROM discounts WHERE id=${Number(idStr)}`
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
