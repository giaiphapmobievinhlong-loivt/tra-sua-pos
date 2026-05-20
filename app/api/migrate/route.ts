export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import bcrypt from 'bcryptjs'

// Bảo vệ bằng secret: /api/migrate?secret=<8 ký tự đầu JWT_SECRET>
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.JWT_SECRET?.slice(0, 8)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const log: string[] = []

  try {
    // ── 1. Tạo bảng mới (stores, quotas, payments) ──────────────────────
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
    log.push('✅ stores table')

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
    log.push('✅ quotas table')

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
    log.push('✅ payments table')

    // ── 2. Seed store #1 (chủ hệ thống) ────────────────────────────────
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
    log.push('✅ store #1 + owner quota')

    // ── 3. Thêm store_id vào các bảng hiện có ───────────────────────────
    await sql`ALTER TABLE users         ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) DEFAULT 1`
    await sql`ALTER TABLE categories    ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) DEFAULT 1`
    await sql`ALTER TABLE products      ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) DEFAULT 1`
    await sql`ALTER TABLE orders        ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) DEFAULT 1`
    await sql`ALTER TABLE order_items   ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) DEFAULT 1`
    await sql`ALTER TABLE transactions  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) DEFAULT 1`
    await sql`ALTER TABLE materials     ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) DEFAULT 1`
    await sql`ALTER TABLE discounts     ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) DEFAULT 1`
    await sql`ALTER TABLE settings      ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) DEFAULT 1`
    log.push('✅ store_id columns added')

    // ── 4. Set store_id = 1 cho dữ liệu cũ ─────────────────────────────
    await sql`UPDATE users        SET store_id = 1 WHERE store_id IS NULL`
    await sql`UPDATE categories   SET store_id = 1 WHERE store_id IS NULL`
    await sql`UPDATE products     SET store_id = 1 WHERE store_id IS NULL`
    await sql`UPDATE orders       SET store_id = 1 WHERE store_id IS NULL`
    await sql`UPDATE order_items  SET store_id = 1 WHERE store_id IS NULL`
    await sql`UPDATE transactions SET store_id = 1 WHERE store_id IS NULL`
    await sql`UPDATE materials    SET store_id = 1 WHERE store_id IS NULL`
    await sql`UPDATE discounts    SET store_id = 1 WHERE store_id IS NULL`
    await sql`UPDATE settings     SET store_id = 1 WHERE store_id IS NULL`
    log.push('✅ existing data assigned to store #1')

    // ── 5. Thêm các cột còn thiếu trong orders / order_items ────────────
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,0) DEFAULT 0`
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_name   VARCHAR(200)  DEFAULT ''`
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number    VARCHAR(50)`
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_paid         BOOLEAN       DEFAULT false`
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_method      VARCHAR(50)`
    await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_note  TEXT          DEFAULT ''`
    log.push('✅ orders/order_items missing columns added')

    // ── 6. Cập nhật UNIQUE constraints sang store-scoped ────────────────
    // Xóa ràng buộc cũ (global), thêm ràng buộc mới (per-store)
    // Dùng try/catch riêng vì PostgreSQL không hỗ trợ ADD CONSTRAINT IF NOT EXISTS
    try { await sql`ALTER TABLE users      DROP CONSTRAINT IF EXISTS users_username_key` } catch {}
    try { await sql`ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_slug_key` } catch {}
    try { await sql`ALTER TABLE settings   DROP CONSTRAINT IF EXISTS settings_key_key` } catch {}

    try { await sql`ALTER TABLE users      ADD CONSTRAINT users_store_username_uq  UNIQUE (store_id, username)` } catch {}
    try { await sql`ALTER TABLE categories ADD CONSTRAINT categories_store_slug_uq UNIQUE (store_id, slug)` } catch {}
    try { await sql`ALTER TABLE orders     ADD CONSTRAINT orders_store_code_uq     UNIQUE (store_id, order_code)` } catch {}
    try { await sql`ALTER TABLE settings   ADD CONSTRAINT settings_store_key_uq    UNIQUE (store_id, key)` } catch {}
    log.push('✅ UNIQUE constraints updated')

    // ── 7. Seed tài khoản admin cho store #1 (nếu chưa có) ──────────────
    const hashedAdmin = await bcrypt.hash('admin123', 10)
    await sql`
      INSERT INTO users (store_id, username, password_hash, full_name, role)
      VALUES (1, 'admin', ${hashedAdmin}, 'Quản Trị Viên', 'admin')
      ON CONFLICT (store_id, username) DO UPDATE SET password_hash = ${hashedAdmin}
    `
    log.push('✅ admin user ensured')

    return NextResponse.json({ success: true, log })
  } catch (error) {
    console.error('[migrate]', error)
    return NextResponse.json({ error: String(error), log }, { status: 500 })
  }
}
