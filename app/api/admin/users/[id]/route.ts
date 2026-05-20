export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getUserFromRequest(req)
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: idStr } = await params
    const id = Number(idStr)
    const { full_name, password, role } = await req.json()

    if (password) {
      const password_hash = await bcrypt.hash(password, 10)
      await sql`
        UPDATE users SET full_name = ${full_name}, role = ${role}, password_hash = ${password_hash}
        WHERE id = ${id} AND store_id = ${currentUser.store_id}
      `
    } else {
      await sql`
        UPDATE users SET full_name = ${full_name}, role = ${role}
        WHERE id = ${id} AND store_id = ${currentUser.store_id}
      `
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getUserFromRequest(req)
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: idStr } = await params
    const id = Number(idStr)

    if (currentUser.id === id) {
      return NextResponse.json({ error: 'Không thể xóa tài khoản đang đăng nhập' }, { status: 400 })
    }

    const target = await sql`SELECT role FROM users WHERE id = ${id} AND store_id = ${currentUser.store_id}`
    if (!target[0]) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })

    if (target[0].role === 'admin') {
      const admins = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND store_id = ${currentUser.store_id}`
      if (Number(admins[0].count) <= 1) {
        return NextResponse.json({ error: 'Không thể xóa admin cuối cùng' }, { status: 400 })
      }
    }

    await sql`DELETE FROM users WHERE id = ${id} AND store_id = ${currentUser.store_id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
