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
        SELECT
          p.id, p.name, p.price::float,
          c.name as category_name, c.slug as category_slug,
          COALESCE((
            SELECT SUM(pi.quantity_per_cup * COALESCE(m.price_per_unit, 0))
            FROM product_ingredients pi
            JOIN materials m ON m.id = pi.material_id
            WHERE pi.product_id = p.id AND m.store_id = ${user.store_id}
          ), 0)::float as cost_per_cup,
          (SELECT COUNT(*) FROM product_ingredients WHERE product_id = p.id)::int as ingredient_count
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.store_id = ${user.store_id} AND p.is_active IS NOT FALSE
        ORDER BY p.sort_order ASC NULLS LAST, p.id ASC
      `,
      sql`
        SELECT DISTINCT c.id, c.name, c.slug
        FROM categories c
        INNER JOIN products p ON p.category_id = c.id AND p.is_active IS NOT FALSE
        WHERE c.store_id = ${user.store_id}
        ORDER BY c.name
      `,
    ])

    return NextResponse.json({ products, categories })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
