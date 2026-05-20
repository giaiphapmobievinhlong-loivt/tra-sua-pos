/**
 * Migration: Single-tenant → Multi-tenant
 *
 * Chạy một lần duy nhất:  node scripts/migrate-multitenant.js
 *
 * Kết quả:
 *   - Tạo bảng stores, quotas, payments
 *   - Thêm store_id vào tất cả bảng hiện tại
 *   - Migrate toàn bộ data hiện tại → store_id = 1 (chủ hệ thống)
 *   - Store #1: plan = 'owner', không giới hạn đơn, không tính phí
 *   - Khách đăng ký mới: plan = 'free', 10 đơn/ngày
 */

const { neon } = require('@neondatabase/serverless')

const sql = neon(process.env.DATABASE_URL)

async function run() {
  console.log('🚀 Bắt đầu migration multi-tenant...\n')

  // ── 1. Bảng stores ────────────────────────────────────────────────────
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
    INSERT INTO stores (id, name)
    VALUES (1, 'Cửa hàng của tôi')
    ON CONFLICT (id) DO NOTHING
  `
  await sql`SELECT setval('stores_id_seq', GREATEST((SELECT MAX(id) FROM stores), 1))`
  console.log('✅ stores: store #1 (chủ hệ thống) sẵn sàng')

  // ── 2. Thêm store_id vào từng bảng ────────────────────────────────────
  // Đảm bảo các bảng tuỳ chọn tồn tại trước khi ALTER
  await sql`
    CREATE TABLE IF NOT EXISTS materials (
      id             SERIAL PRIMARY KEY,
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
    CREATE TABLE IF NOT EXISTS discounts (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(200) NOT NULL,
      type       VARCHAR(20)  NOT NULL,
      value      DECIMAL(12,0) NOT NULL,
      min_order  DECIMAL(12,0) DEFAULT 0,
      is_active  BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      id         SERIAL PRIMARY KEY,
      key        VARCHAR(100) NOT NULL,
      value      TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `

  const migrate = async (table) => {
    // Không thể dùng parameterized identifier cho DDL trong Neon HTTP driver,
    // nên gọi tường minh từng bảng bên dưới
  }

  // users
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS store_id INTEGER`
  await sql`UPDATE users SET store_id = 1 WHERE store_id IS NULL`
  await sql`ALTER TABLE users ALTER COLUMN store_id SET NOT NULL`
  console.log('✅ users.store_id')

  // categories
  await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS store_id INTEGER`
  await sql`UPDATE categories SET store_id = 1 WHERE store_id IS NULL`
  await sql`ALTER TABLE categories ALTER COLUMN store_id SET NOT NULL`
  console.log('✅ categories.store_id')

  // products
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id INTEGER`
  await sql`UPDATE products SET store_id = 1 WHERE store_id IS NULL`
  await sql`ALTER TABLE products ALTER COLUMN store_id SET NOT NULL`
  console.log('✅ products.store_id')

  // orders
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id INTEGER`
  await sql`UPDATE orders SET store_id = 1 WHERE store_id IS NULL`
  await sql`ALTER TABLE orders ALTER COLUMN store_id SET NOT NULL`
  console.log('✅ orders.store_id')

  // order_items
  await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS store_id INTEGER`
  await sql`UPDATE order_items SET store_id = 1 WHERE store_id IS NULL`
  await sql`ALTER TABLE order_items ALTER COLUMN store_id SET NOT NULL`
  console.log('✅ order_items.store_id')

  // transactions
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS store_id INTEGER`
  await sql`UPDATE transactions SET store_id = 1 WHERE store_id IS NULL`
  await sql`ALTER TABLE transactions ALTER COLUMN store_id SET NOT NULL`
  console.log('✅ transactions.store_id')

  // materials
  await sql`ALTER TABLE materials ADD COLUMN IF NOT EXISTS store_id INTEGER`
  await sql`UPDATE materials SET store_id = 1 WHERE store_id IS NULL`
  await sql`ALTER TABLE materials ALTER COLUMN store_id SET NOT NULL`
  console.log('✅ materials.store_id')

  // discounts
  await sql`ALTER TABLE discounts ADD COLUMN IF NOT EXISTS store_id INTEGER`
  await sql`UPDATE discounts SET store_id = 1 WHERE store_id IS NULL`
  await sql`ALTER TABLE discounts ALTER COLUMN store_id SET NOT NULL`
  console.log('✅ discounts.store_id')

  // settings
  await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_id INTEGER`
  await sql`UPDATE settings SET store_id = 1 WHERE store_id IS NULL`
  await sql`ALTER TABLE settings ALTER COLUMN store_id SET NOT NULL`
  console.log('✅ settings.store_id\n')

  // ── 3. FK store_id → stores ────────────────────────────────────────────
  const fkPairs = [
    ['users',        'users_store_id_fk'],
    ['categories',   'categories_store_id_fk'],
    ['products',     'products_store_id_fk'],
    ['orders',       'orders_store_id_fk'],
    ['order_items',  'order_items_store_id_fk'],
    ['transactions', 'transactions_store_id_fk'],
    ['materials',    'materials_store_id_fk'],
    ['discounts',    'discounts_store_id_fk'],
    ['settings',     'settings_store_id_fk'],
  ]

  // Ghi chú: không thể dùng sql(identifier) cho ALTER TABLE trong Neon HTTP,
  // dùng try/catch riêng để bỏ qua nếu constraint đã tồn tại
  try { await sql`ALTER TABLE users        ADD CONSTRAINT users_store_id_fk        FOREIGN KEY (store_id) REFERENCES stores(id)` } catch(_) {}
  try { await sql`ALTER TABLE categories   ADD CONSTRAINT categories_store_id_fk   FOREIGN KEY (store_id) REFERENCES stores(id)` } catch(_) {}
  try { await sql`ALTER TABLE products     ADD CONSTRAINT products_store_id_fk     FOREIGN KEY (store_id) REFERENCES stores(id)` } catch(_) {}
  try { await sql`ALTER TABLE orders       ADD CONSTRAINT orders_store_id_fk       FOREIGN KEY (store_id) REFERENCES stores(id)` } catch(_) {}
  try { await sql`ALTER TABLE order_items  ADD CONSTRAINT order_items_store_id_fk  FOREIGN KEY (store_id) REFERENCES stores(id)` } catch(_) {}
  try { await sql`ALTER TABLE transactions ADD CONSTRAINT transactions_store_id_fk FOREIGN KEY (store_id) REFERENCES stores(id)` } catch(_) {}
  try { await sql`ALTER TABLE materials    ADD CONSTRAINT materials_store_id_fk    FOREIGN KEY (store_id) REFERENCES stores(id)` } catch(_) {}
  try { await sql`ALTER TABLE discounts    ADD CONSTRAINT discounts_store_id_fk    FOREIGN KEY (store_id) REFERENCES stores(id)` } catch(_) {}
  try { await sql`ALTER TABLE settings     ADD CONSTRAINT settings_store_id_fk     FOREIGN KEY (store_id) REFERENCES stores(id)` } catch(_) {}
  console.log('✅ FK store_id → stores (tất cả bảng)')

  // ── 4. Sửa UNIQUE constraints thành per-store ─────────────────────────
  try {
    await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key`
    await sql`ALTER TABLE users ADD CONSTRAINT users_store_username_unique UNIQUE (store_id, username)`
    console.log('✅ users: UNIQUE(store_id, username)')
  } catch (e) { console.log('⚠️  users unique:', e.message) }

  try {
    await sql`ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_slug_key`
    await sql`ALTER TABLE categories ADD CONSTRAINT categories_store_slug_unique UNIQUE (store_id, slug)`
    console.log('✅ categories: UNIQUE(store_id, slug)')
  } catch (e) { console.log('⚠️  categories unique:', e.message) }

  try {
    await sql`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_code_key`
    await sql`ALTER TABLE orders ADD CONSTRAINT orders_store_code_unique UNIQUE (store_id, order_code)`
    console.log('✅ orders: UNIQUE(store_id, order_code)')
  } catch (e) { console.log('⚠️  orders unique:', e.message) }

  try {
    await sql`ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_key`
    await sql`ALTER TABLE settings ADD CONSTRAINT settings_store_key_unique UNIQUE (store_id, key)`
    console.log('✅ settings: UNIQUE(store_id, key)\n')
  } catch (e) { console.log('⚠️  settings unique:', e.message) }

  // ── 5. Bảng quotas ────────────────────────────────────────────────────
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
    INSERT INTO quotas (store_id, plan, daily_limit)
    VALUES (1, 'owner', 999999)
    ON CONFLICT (store_id) DO NOTHING
  `
  console.log('✅ quotas: store #1 = owner (không giới hạn)')

  // ── 6. Bảng payments ──────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id              SERIAL PRIMARY KEY,
      store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      amount          DECIMAL(12,0) NOT NULL,
      package_type    VARCHAR(20) NOT NULL,    -- 'daily' | 'monthly'
      package_days    INTEGER DEFAULT 0,       -- số ngày áp dụng
      new_daily_limit INTEGER DEFAULT 100,     -- hạn mức mới được cấp
      status          VARCHAR(20) DEFAULT 'pending',  -- pending | completed | failed
      momo_order_id   VARCHAR(200),
      momo_trans_id   VARCHAR(200),
      created_at      TIMESTAMP DEFAULT NOW(),
      expires_at      TIMESTAMP
    )
  `
  console.log('✅ payments: đã tạo')

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎉 Migration hoàn tất!')
  console.log('   Store #1 (của bạn) → owner, không giới hạn')
  console.log('   Khách đăng ký mới  → free, 10 đơn/ngày')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

run().catch((e) => {
  console.error('\n❌ Migration thất bại:', e.message)
  process.exit(1)
})
