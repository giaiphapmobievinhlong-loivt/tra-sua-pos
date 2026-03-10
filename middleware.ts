import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
)

// Role → allowed page prefixes
const ROLE_ROUTES: Record<string, string[]> = {
  staff:   ['/ban-hang', '/thu-chi', '/don-hang', '/giao-hang'],
  manager: ['/ban-hang', '/thu-chi', '/don-hang', '/giao-hang', '/bao-cao'],
  admin:   ['/ban-hang', '/thu-chi', '/don-hang', '/giao-hang', '/bao-cao', '/quan-ly', '/debug'],
}

// Routes that never need auth check (public)
function isPublic(pathname: string) {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/order') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/setup') ||
    pathname.startsWith('/api/debug') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/api/products') ||
    pathname.startsWith('/api/settings') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  )
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Root path: redirect based on auth status
  if (pathname === '/') {
    const token = req.cookies.get('token')?.value
    if (!token) return NextResponse.redirect(new URL('/order', req.url))
    // Has token → let through, will redirect to /ban-hang below after role check
  }

  // Always allow public paths
  if (isPublic(pathname)) return NextResponse.next()

  const token = req.cookies.get('token')?.value

  // No token → login
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Verify JWT
  let role = 'staff'
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    role = (payload.role as string) || 'staff'
  } catch {
    // Bad token → clear it and redirect to login
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete('token')
    return res
  }

  // ── API routes ───────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    // Admin-only APIs
    if (pathname.startsWith('/api/admin/') && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // Reports: manager & admin only
    if (pathname.startsWith('/api/reports') && role === 'staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.next()
  }

  // ── Page routes ──────────────────────────────────────
  const allowed = ROLE_ROUTES[role] || ROLE_ROUTES['staff']
  const canAccess = allowed.some(route => pathname.startsWith(route))

  if (!canAccess) {
    return NextResponse.redirect(new URL(allowed[0], req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
