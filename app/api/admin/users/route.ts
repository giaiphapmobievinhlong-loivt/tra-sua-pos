export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'

export async function GET() {
  try {
    const users = await sql`
      SELECT id, username, full_name, role, created_at
      FROM users
      ORDER BY created_at DESC
    `
    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username, full_name, password, role } = await req.json()
    if (!username || !full_name || !password) return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })

    const existing = await sql`SELECT id FROM users WHERE username = ${username}`
    if (existing.length > 0) return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 400 })

    const password_hash = await bcrypt.hash(password, 10)
    const rows = await sql`
      INSERT INTO users (username, password_hash, full_name, role)
      VALUES (${username}, ${password_hash}, ${full_name}, ${role || 'staff'})
      RETURNING id, username, full_name, role, created_at
    `
    return NextResponse.json({ user: rows[0] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
