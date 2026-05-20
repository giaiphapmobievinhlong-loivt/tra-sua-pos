export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

const PACKAGES: Record<string, { price: number; daily_limit: number; days: number; label: string; type: string }> = {
  daily_100:   { price: 29000,  daily_limit: 100, days: 1,  label: 'Goi Ngay 1 ngay',         type: 'daily'   },
  monthly_200: { price: 199000, daily_limit: 200, days: 30, label: 'Goi Co Ban 30 ngay',       type: 'monthly' },
  monthly_500: { price: 399000, daily_limit: 500, days: 30, label: 'Goi Tieu Chuan 30 ngay',   type: 'monthly' },
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { package_key } = await req.json()
    const pkg = PACKAGES[package_key]
    if (!pkg) return NextResponse.json({ error: 'Gói không hợp lệ' }, { status: 400 })

    const partnerCode = process.env.MOMO_PARTNER_CODE
    const accessKey   = process.env.MOMO_ACCESS_KEY
    const secretKey   = process.env.MOMO_SECRET_KEY
    const endpoint    = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn'
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (!partnerCode || !accessKey || !secretKey) {
      return NextResponse.json({ error: 'Thanh toán MoMo chưa được cấu hình' }, { status: 503 })
    }

    // Tạo payment record trạng thái pending
    const [payment] = await sql`
      INSERT INTO payments (store_id, amount, package_type, package_days, new_daily_limit, status)
      VALUES (${user.store_id}, ${pkg.price}, ${pkg.type}, ${pkg.days}, ${pkg.daily_limit}, 'pending')
      RETURNING id
    `

    const orderId     = `TRASUA_${payment.id}_${Date.now()}`
    const requestId   = orderId
    const amount      = pkg.price
    const orderInfo   = pkg.label
    const redirectUrl = `${appUrl}/billing?payment=done`
    const ipnUrl      = `${appUrl}/api/payments/webhook`
    const extraData   = ''
    const requestType = 'captureWallet'

    const rawSignature =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}&requestType=${requestType}`

    const signature = createHmac('sha256', secretKey).update(rawSignature).digest('hex')

    const momoRes = await fetch(`${endpoint}/v2/gateway/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerCode, accessKey, requestId, amount, orderId,
        orderInfo, redirectUrl, ipnUrl, extraData,
        requestType, signature, lang: 'vi',
      }),
    })

    const momoData = await momoRes.json()

    if (momoData.resultCode !== 0) {
      await sql`UPDATE payments SET status = 'failed' WHERE id = ${payment.id}`
      return NextResponse.json({ error: momoData.message || 'Lỗi kết nối MoMo' }, { status: 502 })
    }

    // Lưu orderId để đối chiếu webhook
    await sql`UPDATE payments SET momo_order_id = ${orderId} WHERE id = ${payment.id}`

    return NextResponse.json({ payUrl: momoData.payUrl, qrCodeUrl: momoData.qrCodeUrl })
  } catch (error) {
    console.error('[POST /api/payments/momo]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
