export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS settings (key VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW())`
  await sql`INSERT INTO settings (key, value) VALUES ('delivery_fee', '15000') ON CONFLICT (key) DO NOTHING`
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await ensureTable()
    const rows = await sql`SELECT key, value FROM settings`
    const settings: Record<string, string> = {}
    rows.forEach((r) => { settings[r.key] = r.value })
    return NextResponse.json(settings)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user || user.role === 'staff') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await ensureTable()
    const body = await req.json()
    for (const [key, value] of Object.entries(body)) {
      await sql`INSERT INTO settings (key, value) VALUES (${key}, ${String(value)}) ON CONFLICT (key) DO UPDATE SET value = ${String(value)}, updated_at = NOW()`
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
