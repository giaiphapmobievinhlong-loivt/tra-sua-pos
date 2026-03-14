export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  try {
    // Xóa sạch theo đúng thứ tự foreign key
    await sql`DELETE FROM order_items WHERE product_id IN (SELECT id FROM products)`
    await sql`UPDATE order_items SET product_id = NULL WHERE product_id IS NOT NULL`
    await sql`DELETE FROM products`
    await sql`DELETE FROM categories`

    // Seed categories mới
    await sql`
      INSERT INTO categories (name, slug) VALUES
        ('Trà', 'tra'),
        ('Trà Sữa', 'tra-sua'),
        ('Matcha', 'matcha')
    `

    const cats = await sql`SELECT id, slug FROM categories`
    const catMap: Record<string, number> = {}
    cats.forEach((c: any) => { catMap[c.slug] = c.id })

    // Seed products theo menu thực tế
    const products = [
      // Trà
      { name: 'Trà tắc',         price: 10000, slug: 'tra',      img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400', sort: 1 },
      { name: 'Trà tắc xí muội', price: 15000, slug: 'tra',      img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400', sort: 2 },
      { name: 'Trà me',          price: 15000, slug: 'tra',      img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400', sort: 3 },
      { name: 'Trà dâu tây (S)', price: 20000, slug: 'tra',      img: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400', sort: 4 },
      { name: 'Trà dâu tây (L)', price: 25000, slug: 'tra',      img: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400', sort: 5 },
      // Trà Sữa
      { name: 'Trà sữa (S)',     price: 20000, slug: 'tra-sua',  img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', sort: 6 },
      { name: 'Trà sữa (L)',     price: 25000, slug: 'tra-sua',  img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', sort: 7 },
      // Matcha
      { name: 'Matcha latte (S)', price: 28000, slug: 'matcha',  img: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=400', sort: 8 },
      { name: 'Matcha latte (L)', price: 32000, slug: 'matcha',  img: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=400', sort: 9 },
    ]

    for (const p of products) {
      await sql`
        INSERT INTO products (name, price, category_id, image_url, sort_order)
        VALUES (${p.name}, ${p.price}, ${catMap[p.slug]}, ${p.img}, ${p.sort})
      `
    }

    return NextResponse.json({
      success: true,
      message: 'Menu đã được cập nhật theo Nhà Mèo Có!',
      categories: 3,
      products: products.length,
      menu: products.map(p => `${p.name} — ${p.price.toLocaleString()}đ`)
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
