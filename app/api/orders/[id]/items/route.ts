export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    const { items } = await req.json() as {
      items: { product_id: number | null; product_name: string; quantity: number; unit_price: number; item_note?: string }[]
    }

    if (!items?.length) {
      return NextResponse.json({ error: 'Không có món nào' }, { status: 400 })
    }

    // Verify order exists and is unpaid
    const [order] = await sql`SELECT id, is_paid, status FROM orders WHERE id = ${id}`
    if (!order) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 })
    if (order.is_paid) return NextResponse.json({ error: 'Đơn đã thanh toán' }, { status: 400 })
    if (order.status === 'completed' || order.status === 'cancelled') {
      return NextResponse.json({ error: 'Đơn đã hoàn thành hoặc đã hủy' }, { status: 400 })
    }

    let addedSubtotal = 0
    for (const item of items) {
      const subtotal = Number(item.unit_price) * Number(item.quantity)
      addedSubtotal += subtotal
      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, item_note)
        VALUES (${id}, ${item.product_id ?? null}, ${item.product_name}, ${item.quantity}, ${item.unit_price}, ${subtotal}, ${item.item_note || ''})
      `
    }

    // Increase total_amount by the added subtotal (preserves existing discount)
    await sql`UPDATE orders SET total_amount = total_amount + ${addedSubtotal} WHERE id = ${id}`

    const rows = await sql`SELECT o.*, u.username FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ${id}`
    const orderItems = await sql`SELECT * FROM order_items WHERE order_id = ${id}`
    return NextResponse.json({ success: true, order: { ...rows[0], items: orderItems } })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
