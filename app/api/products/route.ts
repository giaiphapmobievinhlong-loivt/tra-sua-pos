export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  try {
    // Ensure sort_order column exists (migration safety)
    try {
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`
    } catch { /* already exists */ }

    const products = await sql`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active IS NOT FALSE
      ORDER BY p.sort_order ASC NULLS LAST, p.id ASC
    `
    const categories = await sql`
      SELECT DISTINCT c.id, c.name, c.slug
      FROM categories c
      INNER JOIN products p ON p.category_id = c.id AND p.is_active IS NOT FALSE
      ORDER BY c.name
    `
    console.log('[products] count:', products.length, 'ids:', products.map((p: any) => p.id).join(','))
    return NextResponse.json({ products, categories }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
