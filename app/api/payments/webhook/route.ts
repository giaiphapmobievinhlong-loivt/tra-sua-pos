export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    // Sepay xác thực bằng header: Authorization: Apikey <key>
    const apiKey = process.env.SEPAY_API_KEY
    if (!apiKey) {
      console.error('[webhook] SEPAY_API_KEY chưa cấu hình — từ chối toàn bộ webhook')
      return NextResponse.json({ success: false }, { status: 503 })
    }
    const authHeader = req.headers.get('authorization') || ''
    const sentKey = authHeader.replace(/^Apikey\s+/i, '').trim()
    if (sentKey !== apiKey) {
      console.error('[webhook] Invalid Sepay API key')
      return NextResponse.json({ success: false }, { status: 401 })
    }

    const body = await req.json()

    // Chỉ xử lý giao dịch tiền vào
    if (body.transferType !== 'in') {
      return NextResponse.json({ success: true })
    }

    // Tìm mã GOIDUNG<id> trong trường code hoặc description
    const searchText = `${body.code || ''} ${body.description || body.content || ''}`
    const match = searchText.match(/TSPOS(\d+)/i)
    if (!match) {
      return NextResponse.json({ success: true }) // giao dịch không liên quan
    }

    const paymentId = parseInt(match[1])
    const [payment] = await sql`
      SELECT id, store_id, package_days, new_daily_limit, amount, status
      FROM payments WHERE id = ${paymentId}
    `

    if (!payment) {
      console.warn('[webhook] Payment not found:', paymentId)
      return NextResponse.json({ success: true })
    }

    // Tránh xử lý trùng
    if (payment.status === 'completed') {
      return NextResponse.json({ success: true })
    }

    // Kiểm tra đủ số tiền (cho phép làm tròn ±1000đ)
    if (Number(body.transferAmount) < Number(payment.amount) - 1000) {
      console.warn(`[webhook] Amount too low: got ${body.transferAmount}, expected ${payment.amount}`)
      return NextResponse.json({ success: true })
    }

    // Tính expires_at: nối tiếp nếu còn hạn
    const [currentQuota] = await sql`SELECT expires_at FROM quotas WHERE store_id = ${payment.store_id}`
    const now = new Date()
    const currentExpiry = currentQuota?.expires_at ? new Date(currentQuota.expires_at) : now
    const base = currentExpiry > now ? currentExpiry : now
    const newExpiry = new Date(base.getTime() + Number(payment.package_days) * 24 * 60 * 60 * 1000)
    const newExpiryISO = newExpiry.toISOString()

    const transRef = String(body.referenceCode || body.id || '')

    await sql`
      UPDATE payments
      SET status = 'completed', momo_trans_id = ${transRef}, expires_at = ${newExpiryISO}::timestamptz
      WHERE id = ${payment.id}
    `

    await sql`
      UPDATE quotas
      SET daily_limit = ${payment.new_daily_limit},
          plan = 'paid',
          expires_at = ${newExpiryISO}::timestamptz
      WHERE store_id = ${payment.store_id}
    `

    console.log(`[webhook] Payment ${payment.id} OK — store ${payment.store_id} → ${payment.new_daily_limit}/day until ${newExpiryISO}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/payments/webhook]', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
