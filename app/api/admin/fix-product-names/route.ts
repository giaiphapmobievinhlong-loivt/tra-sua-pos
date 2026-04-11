import { NextResponse } from 'next/server'
import sql from '@/lib/db'

// One-time migration: fix typos in order_items.product_name
// DELETE THIS FILE after running once
export async function POST() {
  const res = await sql`
    UPDATE order_items SET product_name = REPLACE(product_name, 'Trà Dây Tằm', 'Trà Dâu Tằm')
    WHERE product_name LIKE '%Trà Dây Tằm%'
  `
  return NextResponse.json({ updated: res.count ?? 0 })
}
