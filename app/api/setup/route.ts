export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET(req: import('next/server').NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.JWT_SECRET?.slice(0, 8)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    // ── Tạo bảng (thứ tự quan trọng vì có FK) ───────────────────────────

    await sql`
      CREATE TABLE IF NOT EXISTS stores (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(200) NOT NULL DEFAULT 'Cửa hàng',
        email      VARCHAR(200) UNIQUE,
        phone      VARCHAR(20),
        address    TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS quotas (
        store_id          INTEGER PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
        plan              VARCHAR(20) DEFAULT 'free',
        daily_limit       INTEGER DEFAULT 10,
        orders_used_today INTEGER DEFAULT 0,
        reset_date        DATE DEFAULT CURRENT_DATE,
        expires_at        TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id              SERIAL PRIMARY KEY,
        store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        amount          DECIMAL(12,0) NOT NULL,
        package_type    VARCHAR(20) NOT NULL,
        package_days    INTEGER DEFAULT 0,
        new_daily_limit INTEGER DEFAULT 100,
        status          VARCHAR(20) DEFAULT 'pending',
        momo_order_id   VARCHAR(200),
        momo_trans_id   VARCHAR(200),
        created_at      TIMESTAMP DEFAULT NOW(),
        expires_at      TIMESTAMP
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        store_id      INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        username      VARCHAR(50) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name     VARCHAR(100) NOT NULL,
        role          VARCHAR(20) DEFAULT 'staff',
        created_at    TIMESTAMP DEFAULT NOW(),
        UNIQUE (store_id, username)
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id         SERIAL PRIMARY KEY,
        store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        name       VARCHAR(100) NOT NULL,
        slug       VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (store_id, slug)
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id          SERIAL PRIMARY KEY,
        store_id    INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        name        VARCHAR(200) NOT NULL,
        price       DECIMAL(12,0) NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        image_url   TEXT,
        is_active   BOOLEAN DEFAULT true,
        sort_order  INTEGER DEFAULT 0,
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id            SERIAL PRIMARY KEY,
        store_id      INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        order_code    VARCHAR(20) NOT NULL,
        user_id       INTEGER REFERENCES users(id),
        total_amount  DECIMAL(12,0) NOT NULL,
        customer_paid DECIMAL(12,0) DEFAULT 0,
        change_amount DECIMAL(12,0) DEFAULT 0,
        note          TEXT,
        status        VARCHAR(20) DEFAULT 'completed',
        created_at    TIMESTAMP DEFAULT NOW(),
        UNIQUE (store_id, order_code)
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS order_items (
        id           SERIAL PRIMARY KEY,
        store_id     INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        order_id     INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id   INTEGER REFERENCES products(id),
        product_name VARCHAR(200) NOT NULL,
        quantity     INTEGER NOT NULL,
        unit_price   DECIMAL(12,0) NOT NULL,
        subtotal     DECIMAL(12,0) NOT NULL,
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id               SERIAL PRIMARY KEY,
        store_id         INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        user_id          INTEGER REFERENCES users(id),
        type             VARCHAR(10) NOT NULL CHECK (type IN ('thu', 'chi')),
        amount           DECIMAL(12,0) NOT NULL,
        description      VARCHAR(255) NOT NULL,
        note             TEXT,
        transaction_date DATE DEFAULT CURRENT_DATE,
        created_at       TIMESTAMP DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS materials (
        id             SERIAL PRIMARY KEY,
        store_id       INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        name           VARCHAR(200) NOT NULL,
        unit           VARCHAR(50),
        quantity       DECIMAL(12,3) DEFAULT 0,
        min_quantity   DECIMAL(12,3) DEFAULT 0,
        price_per_unit DECIMAL(12,2) DEFAULT 0,
        price_note     TEXT DEFAULT '',
        created_at     TIMESTAMP DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS product_ingredients (
        id               SERIAL PRIMARY KEY,
        product_id       INTEGER REFERENCES products(id) ON DELETE CASCADE,
        material_id      INTEGER REFERENCES materials(id) ON DELETE CASCADE,
        quantity_per_cup DECIMAL(10,4) DEFAULT 0,
        UNIQUE (product_id, material_id)
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS material_logs (
        id          SERIAL PRIMARY KEY,
        material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
        type        VARCHAR(20),
        quantity    DECIMAL(12,3),
        note        TEXT,
        user_id     INTEGER REFERENCES users(id),
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS discounts (
        id         SERIAL PRIMARY KEY,
        store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        name       VARCHAR(200) NOT NULL,
        type       VARCHAR(20) NOT NULL,
        value      DECIMAL(12,0) NOT NULL,
        min_order  DECIMAL(12,0) DEFAULT 0,
        is_active  BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id         SERIAL PRIMARY KEY,
        store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        key        VARCHAR(100) NOT NULL,
        value      TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (store_id, key)
      )
    `

    // ── Store #1: cửa hàng chủ hệ thống (owner) ─────────────────────────
    await sql`
      INSERT INTO stores (id, name)
      VALUES (1, 'Cửa hàng của tôi')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `
    await sql`SELECT setval('stores_id_seq', GREATEST((SELECT MAX(id) FROM stores), 1))`

    await sql`
      INSERT INTO quotas (store_id, plan, daily_limit)
      VALUES (1, 'owner', 999999)
      ON CONFLICT (store_id) DO NOTHING
    `

    // ── Seed tài khoản ───────────────────────────────────────────────────
    const hashedAdmin = await bcrypt.hash('admin123', 10)
    await sql`
      INSERT INTO users (store_id, username, password_hash, full_name, role)
      VALUES (1, 'admin', ${hashedAdmin}, 'Quản Trị Viên', 'admin')
      ON CONFLICT (store_id, username) DO UPDATE SET password_hash = ${hashedAdmin}
    `
    const hashedStaff = await bcrypt.hash('staff123', 10)
    await sql`
      INSERT INTO users (store_id, username, password_hash, full_name, role)
      VALUES (1, 'thu', ${hashedStaff}, 'Thu', 'staff')
      ON CONFLICT (store_id, username) DO NOTHING
    `

    // ── Seed categories ──────────────────────────────────────────────────
    await sql`
      INSERT INTO categories (store_id, name, slug) VALUES
        (1, 'Trà sữa', 'tra-sua'),
        (1, 'Trà',     'tra'),
        (1, 'Cà phê',  'ca-phe'),
        (1, 'Nước ép', 'nuoc-ep')
      ON CONFLICT (store_id, slug) DO NOTHING
    `

    const cats = await sql`SELECT id, slug FROM categories WHERE store_id = 1`
    const catMap: Record<string, number> = {}
    cats.forEach((c) => { catMap[c.slug] = c.id })

    // ── Seed products ────────────────────────────────────────────────────
    const productData = [
      { name: 'Matcha sữa',        price: 20000, slug: 'tra-sua', img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400' },
      { name: 'Matcha đá',         price: 30000, slug: 'tra',     img: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=400' },
      { name: 'Trà sữa trân châu', price: 25000, slug: 'tra-sua', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
      { name: 'Hồng trà sữa',      price: 25000, slug: 'tra-sua', img: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400' },
      { name: 'Trà đào cam sả',    price: 32000, slug: 'tra',     img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400' },
      { name: 'Trà vải',           price: 28000, slug: 'tra',     img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400' },
      { name: 'Cà phê sữa đá',     price: 25000, slug: 'ca-phe',  img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400' },
      { name: 'Bạc xỉu',           price: 22000, slug: 'ca-phe',  img: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400' },
      { name: 'Nước ép cam',       price: 30000, slug: 'nuoc-ep', img: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400' },
      { name: 'Sinh tố bơ',        price: 35000, slug: 'nuoc-ep', img: 'https://images.unsplash.com/photo-1553530979-7ee52a2670c4?w=400' },
    ]

    for (const p of productData) {
      await sql`
        INSERT INTO products (store_id, name, price, category_id, image_url)
        VALUES (1, ${p.name}, ${p.price}, ${catMap[p.slug]}, ${p.img})
        ON CONFLICT DO NOTHING
      `
    }

    return NextResponse.json({
      success: true,
      message: 'Database setup hoàn tất (multi-tenant)!',
      accounts: [
        { username: 'admin', password: 'admin123', role: 'admin' },
        { username: 'thu',   password: 'staff123', role: 'staff' },
      ],
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
