export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date') || new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const transactions = await sql`
      SELECT t.*, u.username
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.transaction_date = ${date}
      ORDER BY t.created_at DESC
    `
    return NextResponse.json({ transactions })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, amount, description, note, transaction_date } = await req.json()

    const transactions = await sql`
      INSERT INTO transactions (user_id, type, amount, description, note, transaction_date)
      VALUES (${user.id}, ${type}, ${amount}, ${description}, ${note || ''}, ${transaction_date || 'now()'})
      RETURNING *
    `
    return NextResponse.json({ success: true, transaction: transactions[0] })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
