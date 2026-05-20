export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

const PACKAGES = {
  daily_100:   { price: 29000,  daily_limit: 100, days: 1,  type: 'daily'   },
  monthly_200: { price: 199000, daily_limit: 200, days: 30, type: 'monthly' },
  monthly_500: { price: 399000, daily_limit: 500, days: 30, type: 'monthly' },
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { package_key } = await req.json()
    const pkg = PACKAGES[package_key as keyof typeof PACKAGES]
    if (!pkg) return NextResponse.json({ error: 'Gói không hợp lệ' }, { status: 400 })

    const bankCode     = process.env.SEPAY_BANK_CODE
    const accountNumber = process.env.SEPAY_ACCOUNT_NUMBER
    const accountName  = process.env.SEPAY_ACCOUNT_NAME || ''

    if (!bankCode || !accountNumber) {
      return NextResponse.json({ error: 'Thanh toán chưa được cấu hình. Liên hệ admin.' }, { status: 503 })
    }

    const [payment] = await sql`
      INSERT INTO payments (store_id, amount, package_type, package_days, new_daily_limit, status)
      VALUES (${user.store_id}, ${pkg.price}, ${pkg.type}, ${pkg.days}, ${pkg.daily_limit}, 'pending')
      RETURNING id
    `

    // Mã nội dung chuyển khoản duy nhất — Sepay dùng để khớp giao dịch
    const transferCode = `TSPOS${payment.id}`
    await sql`UPDATE payments SET momo_order_id = ${transferCode} WHERE id = ${payment.id}`

    const qrUrl = `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${bankCode}&amount=${pkg.price}&des=${transferCode}&template=compact`

    return NextResponse.json({
      payment_id:     payment.id,
      transfer_code:  transferCode,
      amount:         pkg.price,
      bank_code:      bankCode,
      account_number: accountNumber,
      account_name:   accountName,
      qr_url:         qrUrl,
    })
  } catch (error) {
    console.error('[POST /api/payments/sepay]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
