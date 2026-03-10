import { NextResponse } from 'next/server'
import sql from '@/lib/db'

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  // seed default delivery fee
  await sql`
    INSERT INTO settings (key, value) VALUES ('delivery_fee', '15000')
    ON CONFLICT (key) DO NOTHING
  `
}

export async function GET() {
  try {
    await ensureTable()
    const rows = await sql`SELECT key, value FROM settings`
    const settings: Record<string, string> = {}
    rows.forEach((r) => { settings[r.key] = r.value })
    return NextResponse.json(settings)
  } catch (e) {
    return NextResponse.json({ delivery_fee: '15000' })
  }
}
