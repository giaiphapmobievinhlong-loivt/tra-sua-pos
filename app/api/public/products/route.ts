export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const storeId = Number(req.nextUrl.searchParams.get('store')) || 1
    const [store] = await sql`SELECT name FROM stores WHERE id = ${storeId}`
    const products = await sql`
      SELECT p.id, p.name, p.price, p.image_url,
             COALESCE(c.name, 'Khác') AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id AND c.store_id = p.store_id
      WHERE p.store_id = ${storeId} AND p.is_active IS NOT FALSE
      ORDER BY p.sort_order ASC, p.id ASC
    `
    return NextResponse.json({
      products,
      store_name: store?.name || 'Cửa hàng',
    })
  } catch (e) {
    return NextResponse.json({ error: String(e), products: [], store_name: 'Cửa hàng' }, { status: 500 })
  }
}
