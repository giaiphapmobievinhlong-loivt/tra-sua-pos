import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params
    const id = Number(idStr)
    const body = await req.json()
    const { status, is_paid, customer_paid, change_amount, pay_method } = body

    if (status !== undefined && is_paid !== undefined) {
      await sql`
        UPDATE orders SET status = ${status}, is_paid = ${is_paid},
          customer_paid = ${customer_paid || 0}, change_amount = ${change_amount || 0},
          pay_method = ${pay_method || null}
        WHERE id = ${id}
      `
    } else if (status !== undefined) {
      await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`
    } else if (is_paid !== undefined) {
      await sql`
        UPDATE orders SET is_paid = ${is_paid},
          customer_paid = ${customer_paid || 0}, change_amount = ${change_amount || 0},
          pay_method = ${pay_method || null}
        WHERE id = ${id}
      `
    }

    const rows = await sql`SELECT o.*, u.username FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ${id}`
    const items = await sql`SELECT * FROM order_items WHERE order_id = ${id}`
    return NextResponse.json({ success: true, order: { ...rows[0], items } })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params
    await sql`UPDATE orders SET status = 'cancelled' WHERE id = ${Number(idStr)}`
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
