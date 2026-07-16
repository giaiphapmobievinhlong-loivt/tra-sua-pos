import { neon } from '@neondatabase/serverless'

// fetchOptions: no-store — Next.js patches global fetch() và sẽ cache các request
// HTTP mà Neon driver gửi đi nếu không tắt tường minh, khiến báo cáo/đơn hàng
// mới tạo không hiện ra ngay dù route đã đánh dấu force-dynamic.
const sql = neon(process.env.DATABASE_URL!, {
  fetchOptions: { cache: 'no-store' },
})

export default sql

// ============ SCHEMA SQL (multi-tenant) ============
export const SCHEMA_SQL = `
-- Stores: mỗi cửa hàng là 1 tenant
CREATE TABLE IF NOT EXISTS stores (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(200) NOT NULL DEFAULT 'Cửa hàng',
  email      VARCHAR(200) UNIQUE,
  phone      VARCHAR(20),
  address    TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quotas: hạn mức đơn hàng theo store
CREATE TABLE IF NOT EXISTS quotas (
  store_id          INTEGER PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  plan              VARCHAR(20) DEFAULT 'free',
  daily_limit       INTEGER DEFAULT 10,
  orders_used_today INTEGER DEFAULT 0,
  reset_date        DATE DEFAULT CURRENT_DATE,
  expires_at        TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- Payments: lịch sử nạp tiền qua MoMo
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
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  store_id      INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  username      VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  role          VARCHAR(20) DEFAULT 'staff',
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE (store_id, username)
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (store_id, slug)
);

-- Products
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
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id              SERIAL PRIMARY KEY,
  store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_code      VARCHAR(20) NOT NULL,
  user_id         INTEGER REFERENCES users(id),
  total_amount    DECIMAL(12,0) NOT NULL,
  customer_paid   DECIMAL(12,0) DEFAULT 0,
  change_amount   DECIMAL(12,0) DEFAULT 0,
  note            TEXT,
  status          VARCHAR(20) DEFAULT 'completed',
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (store_id, order_code)
);

-- Order items
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
);

-- Transactions (Thu/Chi)
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
);

-- Materials (nguyên liệu)
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
);

-- Product ingredients
CREATE TABLE IF NOT EXISTS product_ingredients (
  id               SERIAL PRIMARY KEY,
  product_id       INTEGER REFERENCES products(id) ON DELETE CASCADE,
  material_id      INTEGER REFERENCES materials(id) ON DELETE CASCADE,
  quantity_per_cup DECIMAL(10,4) DEFAULT 0,
  UNIQUE (product_id, material_id)
);

-- Material logs
CREATE TABLE IF NOT EXISTS material_logs (
  id          SERIAL PRIMARY KEY,
  material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
  type        VARCHAR(20),
  quantity    DECIMAL(12,3),
  note        TEXT,
  user_id     INTEGER REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Discounts
CREATE TABLE IF NOT EXISTS discounts (
  id         SERIAL PRIMARY KEY,
  store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       VARCHAR(200) NOT NULL,
  type       VARCHAR(20) NOT NULL,
  value      DECIMAL(12,0) NOT NULL,
  min_order  DECIMAL(12,0) DEFAULT 0,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id         SERIAL PRIMARY KEY,
  store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  key        VARCHAR(100) NOT NULL,
  value      TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (store_id, key)
);
`
