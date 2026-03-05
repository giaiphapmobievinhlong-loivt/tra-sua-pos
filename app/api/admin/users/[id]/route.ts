import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    const { full_name, password, role } = await req.json()

    if (password) {
      const password_hash = await bcrypt.hash(password, 10)
      await sql`
        UPDATE users SET full_name = ${full_name}, role = ${role}, password_hash = ${password_hash}
        WHERE id = ${id}
      `
    } else {
      await sql`
        UPDATE users SET full_name = ${full_name}, role = ${role}
        WHERE id = ${id}
      `
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getUserFromRequest(req)
    const id = Number(params.id)

    // Prevent self-deletion
    if (currentUser?.id === id) {
      return NextResponse.json({ error: 'Không thể xóa tài khoản đang đăng nhập' }, { status: 400 })
    }

    // Check if last admin
    const target = await sql`SELECT role FROM users WHERE id = ${id}`
    if (target[0]?.role === 'admin') {
      const admins = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`
      if (Number(admins[0].count) <= 1) {
        return NextResponse.json({ error: 'Không thể xóa admin cuối cùng' }, { status: 400 })
      }
    }

    await sql`DELETE FROM users WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
