import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        price DECIMAL(12,0) NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_code VARCHAR(20) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        total_amount DECIMAL(12,0) NOT NULL,
        customer_paid DECIMAL(12,0) DEFAULT 0,
        change_amount DECIMAL(12,0) DEFAULT 0,
        note TEXT,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        product_name VARCHAR(200) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(12,0) NOT NULL,
        subtotal DECIMAL(12,0) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(10) NOT NULL CHECK (type IN ('thu', 'chi')),
        amount DECIMAL(12,0) NOT NULL,
        description VARCHAR(255) NOT NULL,
        note TEXT,
        transaction_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `

    // Seed admin user
    const hashedPassword = await bcrypt.hash('admin123', 10)
    await sql`
      INSERT INTO users (username, password_hash, full_name, role) 
      VALUES ('admin', ${hashedPassword}, 'Quản Trị Viên', 'admin')
      ON CONFLICT (username) DO UPDATE SET password_hash = ${hashedPassword}
    `

    // Seed a staff user
    const hashedPassword2 = await bcrypt.hash('staff123', 10)
    await sql`
      INSERT INTO users (username, password_hash, full_name, role) 
      VALUES ('thu', ${hashedPassword2}, 'Thu', 'staff')
      ON CONFLICT (username) DO NOTHING
    `

    // Seed categories
    await sql`
      INSERT INTO categories (name, slug) VALUES 
        ('Trà sữa', 'tra-sua'),
        ('Trà', 'tra'),
        ('Cà phê', 'ca-phe'),
        ('Nước ép', 'nuoc-ep')
      ON CONFLICT (slug) DO NOTHING
    `

    // Get category IDs
    
  const cats = await sql`SELECT id, slug FROM categories` as { id: number; slug: string }[]

  const catMap: Record<string, number> = {}

  cats.forEach((c) => {catMap[c.slug] = c.id})

    // Seed products
    const productData = [
      { name: 'Matcha sữa', price: 20000, slug: 'tra-sua', img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400' },
      { name: 'Matcha đá', price: 30000, slug: 'tra', img: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=400' },
      { name: 'Trà sữa trân châu', price: 25000, slug: 'tra-sua', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
      { name: 'Hồng trà sữa', price: 25000, slug: 'tra-sua', img: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400' },
      { name: 'Trà đào cam sả', price: 32000, slug: 'tra', img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400' },
      { name: 'Trà vải', price: 28000, slug: 'tra', img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400' },
      { name: 'Cà phê sữa đá', price: 25000, slug: 'ca-phe', img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400' },
      { name: 'Bạc xỉu', price: 22000, slug: 'ca-phe', img: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400' },
      { name: 'Nước ép cam', price: 30000, slug: 'nuoc-ep', img: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400' },
      { name: 'Sinh tố bơ', price: 35000, slug: 'nuoc-ep', img: 'https://images.unsplash.com/photo-1553530979-7ee52a2670c4?w=400' },
    ]

    for (const p of productData) {
      await sql`
        INSERT INTO products (name, price, category_id, image_url) 
        VALUES (${p.name}, ${p.price}, ${catMap[p.slug]}, ${p.img})
        ON CONFLICT DO NOTHING
      `
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database setup complete!',
      accounts: [
        { username: 'admin', password: 'admin123', role: 'admin' },
        { username: 'thu', password: 'staff123', role: 'staff' },
      ]
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
