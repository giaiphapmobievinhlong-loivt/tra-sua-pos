export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    await sql`DELETE FROM transactions WHERE id = ${Number((await params).id)}`
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
