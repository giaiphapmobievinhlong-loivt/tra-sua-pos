'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ShoppingCart, DollarSign, ClipboardList, BarChart2, Settings, LogOut, Menu, X } from 'lucide-react'

// ── Role-based nav config ─────────────────────────────────────
const ALL_NAV = [
  { href: '/ban-hang', label: 'Bán Hàng', icon: ShoppingCart,  roles: ['staff', 'manager', 'admin'] },
  { href: '/thu-chi',  label: 'Thu Chi',  icon: DollarSign,    roles: ['staff', 'manager', 'admin'] },
  { href: '/don-hang', label: 'Đơn Hàng', icon: ClipboardList, roles: ['staff', 'manager', 'admin'] },
  { href: '/bao-cao',  label: 'Báo Cáo',  icon: BarChart2,     roles: ['manager', 'admin'] },
  { href: '/quan-ly',  label: 'Quản Lý',  icon: Settings,      roles: ['admin'] },
]

const ROLE_LABEL: Record<string, string> = {
  staff: 'Nhân viên',
  manager: 'Quản lý',
  admin: 'Admin',
}

const ROLE_COLOR: Record<string, string> = {
  staff: 'bg-blue-100 text-blue-700',
  manager: 'bg-purple-100 text-purple-700',
  admin: 'bg-orange-100 text-orange-700',
}

interface SidebarProps { username: string; role: string }

export default function Sidebar({ username, role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navItems = ALL_NAV.filter(item => item.roles.includes(role))

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  function NavLink({ href, label, icon: Icon, onClick }: { href: string; label: string; icon: React.ElementType; onClick?: () => void }) {
    const active = pathname.startsWith(href)
    return (
      <Link href={href} onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
          active ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}>
        <Icon size={20} className={active ? 'text-orange-500' : ''} />
        {label}
      </Link>
    )
  }

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 min-h-screen bg-white border-r border-gray-100 flex-col shrink-0">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow">
              <span className="text-xl">🧋</span>
            </div>
            <div>
              <h1 className="font-bold text-orange-700 text-lg leading-tight">Trà Sữa Nhà Mèo</h1>
              <p className="text-xs text-gray-400 truncate">Xin chào, {username}</p>
            </div>
          </div>
          {/* Role badge */}
          <div className="mt-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLOR[role] || 'bg-gray-100 text-gray-600'}`}>
              {ROLE_LABEL[role] || role}
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => <NavLink key={item.href} {...item} />)}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 w-full transition-all">
            <LogOut size={20} />
            <span className="font-medium">Đăng Xuất</span>
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 flex items-center justify-between px-4 h-14 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-base">🧋</span>
          </div>
          <span className="font-bold text-orange-700">Trà Sữa Nhà Mèo</span>
        </div>
        <button onClick={() => setDrawerOpen(true)}
          className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
          <Menu size={22} />
        </button>
      </div>

      {/* MOBILE BOTTOM NAV — only show allowed items */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex items-center shadow-lg">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${active ? 'text-orange-600' : 'text-gray-400'}`}>
              <div className={`p-1.5 rounded-xl transition-colors ${active ? 'bg-orange-50' : ''}`}>
                <Icon size={20} />
              </div>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* MOBILE DRAWER */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative ml-auto w-72 h-full bg-white flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
                  <span className="text-lg">🧋</span>
                </div>
                <div>
                  <p className="font-bold text-orange-700">Trà Sữa Nhà Mèo</p>
                  <p className="text-xs text-gray-400">Xin chào, {username}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block ${ROLE_COLOR[role] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABEL[role] || role}
                  </span>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map(item => (
                <NavLink key={item.href} {...item} onClick={() => setDrawerOpen(false)} />
              ))}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <button onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 w-full transition-all">
                <LogOut size={20} />
                <span className="font-medium">Đăng Xuất</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
