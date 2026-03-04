import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export default sql

// ============ SCHEMA SQL ============
export const SCHEMA_SQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  price DECIMAL(12,0) NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
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
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,0) NOT NULL,
  subtotal DECIMAL(12,0) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions (Thu/Chi) table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('thu', 'chi')),
  amount DECIMAL(12,0) NOT NULL,
  description VARCHAR(255) NOT NULL,
  note TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed default admin user (password: admin123)
INSERT INTO users (username, password_hash, full_name, role) 
VALUES ('admin', '$2a$10$rOzJqxkYwTkrQDPP.9Ef9.vJhHjuH1PNKLKiCXPXPXPXPXPXPXPXe', 'Quản Trị Viên', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Seed categories
INSERT INTO categories (name, slug) VALUES 
  ('Trà sữa', 'tra-sua'),
  ('Trà', 'tra'),
  ('Cà phê', 'ca-phe'),
  ('Nước ép', 'nuoc-ep')
ON CONFLICT (slug) DO NOTHING;

-- Seed products
INSERT INTO products (name, price, category_id, image_url) VALUES
  ('Matcha sữa', 20000, 1, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400'),
  ('Matcha đá', 30000, 2, 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=400'),
  ('Trà sữa trân châu', 25000, 1, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'),
  ('Hồng trà sữa', 25000, 1, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400'),
  ('Trà đào', 30000, 2, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400'),
  ('Trà vải', 28000, 2, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400'),
  ('Cà phê sữa', 25000, 3, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400'),
  ('Bạc xỉu', 22000, 3, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400')
ON CONFLICT DO NOTHING;
`
