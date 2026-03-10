export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  try {
    const categories = await sql`
      SELECT c.*, COUNT(p.id)::int as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `
    return NextResponse.json({ categories })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, slug } = await req.json()
    if (!name || !slug) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })

    const existing = await sql`SELECT id FROM categories WHERE slug = ${slug}`
    if (existing.length > 0) return NextResponse.json({ error: 'Slug đã tồn tại' }, { status: 400 })

    const rows = await sql`
      INSERT INTO categories (name, slug) VALUES (${name}, ${slug}) RETURNING *
    `
    return NextResponse.json({ category: rows[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
