export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { store_name, email, password } = await req.json()

    if (!store_name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu tối thiểu 6 ký tự' }, { status: 400 })
    }

    // Email không được trùng
    const existing = await sql`SELECT id FROM stores WHERE email = ${email.trim().toLowerCase()}`
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email này đã được đăng ký' }, { status: 400 })
    }

    // 1. Tạo store
    const [store] = await sql`
      INSERT INTO stores (name, email)
      VALUES (${store_name.trim()}, ${email.trim().toLowerCase()})
      RETURNING id, name, email
    `

    // 2. Tạo tài khoản admin cho store
    const password_hash = await bcrypt.hash(password, 10)
    const username = email.trim().toLowerCase().split('@')[0].replace(/[^a-z0-9]/g, '') || 'admin'

    const [user] = await sql`
      INSERT INTO users (store_id, username, password_hash, full_name, role)
      VALUES (${store.id}, ${username}, ${password_hash}, ${store_name.trim()}, 'admin')
      RETURNING id, store_id, username, full_name, role
    `

    // 3. Tạo quota free: 10 đơn/ngày
    await sql`
      INSERT INTO quotas (store_id, plan, daily_limit, orders_used_today, reset_date)
      VALUES (${store.id}, 'free', 10, 0, CURRENT_DATE)
      ON CONFLICT (store_id) DO NOTHING
    `

    // 4. Đăng nhập luôn — set cookie
    const token = await signToken({
      id: user.id,
      store_id: user.store_id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    })

    const response = NextResponse.json({
      success: true,
      store: { id: store.id, name: store.name },
      user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
    })
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
    return response
  } catch (error) {
    console.error('[POST /api/auth/register]', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
