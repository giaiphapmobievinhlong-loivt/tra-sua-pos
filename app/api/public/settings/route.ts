export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const storeId = Number(req.nextUrl.searchParams.get('store')) || 1
    const rows = await sql`SELECT key, value FROM settings WHERE store_id = ${storeId}`
    const settings: Record<string, string> = {}
    rows.forEach((r) => { settings[r.key] = r.value })
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ delivery_fee: '15000' })
  }
}
