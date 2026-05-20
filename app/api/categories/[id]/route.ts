export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const { name, slug } = await req.json()
    const { id: idStr } = await params
    const id = Number(idStr)

    const existing = await sql`SELECT id FROM categories WHERE slug = ${slug} AND id != ${id} AND store_id = ${user.store_id}`
    if (existing.length > 0) return NextResponse.json({ error: 'Slug đã tồn tại' }, { status: 400 })

    const rows = await sql`
      UPDATE categories SET name = ${name}, slug = ${slug} WHERE id = ${id} AND store_id = ${user.store_id} RETURNING *
    `
    return NextResponse.json({ category: rows[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const { id: idStr } = await params
    const id = Number(idStr)
    const products = await sql`SELECT id FROM products WHERE category_id = ${id} AND store_id = ${user.store_id} LIMIT 1`
    if (products.length > 0) return NextResponse.json({ error: 'Danh mục đang có sản phẩm, không thể xóa' }, { status: 400 })

    await sql`DELETE FROM categories WHERE id = ${id} AND store_id = ${user.store_id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
