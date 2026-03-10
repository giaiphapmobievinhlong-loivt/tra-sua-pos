export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

// Auto-migrate: add sort_order column if not exists
async function ensureSortOrder() {
  try {
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`
  } catch {
    // Column already exists or migration not needed
  }
}

export async function GET() {
  try {
    await ensureSortOrder()
    const products = await sql`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.sort_order ASC NULLS LAST, p.id ASC
    `
    return NextResponse.json({ products })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSortOrder()
    const { name, price, category_id, image_url, is_active, sort_order } = await req.json()
    if (!name || !price || !category_id) return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })

    const rows = await sql`
      INSERT INTO products (name, price, category_id, image_url, is_active, sort_order)
      VALUES (${name}, ${price}, ${category_id}, ${image_url || ''}, ${is_active ?? true}, ${sort_order || 0})
      RETURNING *
    `
    return NextResponse.json({ product: rows[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
