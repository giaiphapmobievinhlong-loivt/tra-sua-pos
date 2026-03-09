import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

// Khách bấm "Đã chuyển khoản" → đơn chuyển sang awaiting_confirm
export async function POST(req: NextRequest) {
  try {
    const { order_code } = await req.json()
    if (!order_code) return NextResponse.json({ error: 'Thiếu mã đơn' }, { status: 400 })

    const rows = await sql`SELECT id, status FROM orders WHERE order_code = ${order_code}`
    if (!rows.length) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 })

    const order = rows[0]

    // Chỉ cho phép khi đang pending (chưa xác nhận lần nào)
    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Đơn này đã được xử lý rồi' }, { status: 400 })
    }

    await sql`UPDATE orders SET status = 'awaiting_confirm' WHERE id = ${order.id}`

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[POST /api/public/orders/confirm]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
