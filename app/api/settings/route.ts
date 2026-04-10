export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const body = await req.json()
    await Promise.all(
      Object.entries(body).map(([key, value]) =>
        sql`INSERT INTO settings (key, value) VALUES (${key}, ${String(value)})
            ON CONFLICT (key) DO UPDATE SET value = ${String(value)}, updated_at = NOW()`
      )
    )
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
