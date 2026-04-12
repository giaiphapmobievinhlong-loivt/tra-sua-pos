export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  const rows = await sql`
    SELECT id, status, is_paid, total_amount,
      created_at,
      (created_at + interval '7 hours') as vn_time
    FROM orders
    ORDER BY created_at DESC LIMIT 5
  `
  const dbUrl = process.env.DATABASE_URL?.replace(/:([^@]+)@/, ':***@')
  return NextResponse.json({ db: dbUrl, rows })
}
