export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const [products, categories] = await Promise.all([
      sql`
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.store_id = ${user.store_id} AND p.is_active IS NOT FALSE
        ORDER BY p.sort_order ASC NULLS LAST, p.id ASC
      `,
      sql`
        SELECT DISTINCT c.id, c.name, c.slug
        FROM categories c
        INNER JOIN products p ON p.category_id = c.id AND p.is_active IS NOT FALSE
        WHERE p.store_id = ${user.store_id}
        ORDER BY c.name
      `,
    ])
    return NextResponse.json({ products, categories }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Surrogate-Control': 'no-store',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
