export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    const body = await req.json()
    const { name, price, category_id, image_url, is_active, sort_order } = body

    if (Object.keys(body).length === 1 && 'is_active' in body) {
      await sql`UPDATE products SET is_active = ${is_active} WHERE id = ${id}`
    } else {
      await sql`
        UPDATE products SET
          name = ${name},
          price = ${price},
          category_id = ${category_id},
          image_url = ${image_url || ''},
          is_active = ${is_active ?? true},
          sort_order = ${sort_order ?? 0}
        WHERE id = ${id}
      `
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    await sql`DELETE FROM products WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
