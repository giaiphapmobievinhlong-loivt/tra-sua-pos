export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import sql from "@/lib/db"

export async function GET() {
  try {
    const allOrders = await sql`
      SELECT id, order_code, status, total_amount, created_at,
             DATE(created_at) as utc_date,
             (created_at + interval '7 hours')::date as vn_date
      FROM orders ORDER BY created_at DESC LIMIT 20
    `
    const serverNow = new Date()
    const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const columns = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'orders' ORDER BY ordinal_position
    `
    const itemColumns = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'order_items' ORDER BY ordinal_position
    `
    return NextResponse.json({
      server_utc: serverNow.toISOString(),
      vn_now: vnNow.toISOString(),
      vn_date_today: vnNow.toISOString().split("T")[0],
      orders_count: allOrders.length,
      orders: allOrders,
      order_columns: columns.map((c: any) => c.column_name),
      item_columns: itemColumns.map((c: any) => c.column_name),
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
