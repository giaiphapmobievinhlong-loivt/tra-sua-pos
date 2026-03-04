import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  try {
    const products = await sql`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
      ORDER BY c.name, p.name
    `
    const categories = await sql`SELECT * FROM categories ORDER BY name`
    return NextResponse.json({ products, categories })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
