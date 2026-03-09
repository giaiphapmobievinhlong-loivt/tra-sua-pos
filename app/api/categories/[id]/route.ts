import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { name, slug } = await req.json()
    const { id: idStr } = await params
    const id = Number(idStr)

    // Check slug conflict
    const existing = await sql`SELECT id FROM categories WHERE slug = ${slug} AND id != ${id}`
    if (existing.length > 0) return NextResponse.json({ error: 'Slug đã tồn tại' }, { status: 400 })

    const rows = await sql`
      UPDATE categories SET name = ${name}, slug = ${slug} WHERE id = ${id} RETURNING *
    `
    return NextResponse.json({ category: rows[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    const products = await sql`SELECT id FROM products WHERE category_id = ${id} LIMIT 1`
    if (products.length > 0) return NextResponse.json({ error: 'Danh mục đang có sản phẩm, không thể xóa' }, { status: 400 })

    await sql`DELETE FROM categories WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
