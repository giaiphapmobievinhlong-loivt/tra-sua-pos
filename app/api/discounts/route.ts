import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS discounts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('percent', 'fixed')),
      value DECIMAL(10,2) NOT NULL,
      min_order DECIMAL(10,2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export async function GET() {
  try {
    await ensureTable()
    const rows = await sql`SELECT * FROM discounts ORDER BY is_active DESC, created_at DESC`
    return NextResponse.json({ discounts: rows })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable()
    const { name, type, value, min_order, is_active } = await req.json()
    if (!name || !type || value == null) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
    const rows = await sql`
      INSERT INTO discounts (name, type, value, min_order, is_active)
      VALUES (${name}, ${type}, ${value}, ${min_order || 0}, ${is_active ?? true})
      RETURNING *
    `
    return NextResponse.json({ discount: rows[0] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
