export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, password, store_email } = await req.json()

    let users
    if (store_email?.trim()) {
      // Khi có email cửa hàng: scope chính xác theo store
      users = await sql`
        SELECT u.* FROM users u
        JOIN stores s ON s.id = u.store_id
        WHERE u.username = ${username}
          AND s.email = ${store_email.trim().toLowerCase()}
      `
    } else {
      users = await sql`SELECT * FROM users WHERE username = ${username}`
    }

    if (users.length === 0) {
      return NextResponse.json({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, { status: 401 })
    }

    // Nhiều store cùng username → yêu cầu nhập email cửa hàng để phân biệt
    if (users.length > 1) {
      return NextResponse.json({
        error: 'Có nhiều tài khoản cùng tên đăng nhập. Vui lòng nhập email cửa hàng để xác định.',
        need_store_email: true,
      }, { status: 409 })
    }

    const user = users[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, { status: 401 })
    }

    const token = await signToken({
      id: user.id,
      store_id: user.store_id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    })

    const response = NextResponse.json({
      success: true, token,
      user: { id: user.id, store_id: user.store_id, username: user.username, full_name: user.full_name, role: user.role },
    })
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
    return response
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
