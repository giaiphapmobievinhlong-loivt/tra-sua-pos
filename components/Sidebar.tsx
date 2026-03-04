'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ShoppingCart, DollarSign, ClipboardList, BarChart2, LogOut } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/ban-hang', label: 'Bán Hàng', icon: ShoppingCart },
  { href: '/thu-chi', label: 'Thu Chi', icon: DollarSign },
  { href: '/don-hang', label: 'Đơn Hàng', icon: ClipboardList },
  { href: '/bao-cao', label: 'Báo Cáo', icon: BarChart2 },
]

interface SidebarProps {
  username: string
}

export default function Sidebar({ username }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Brand */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow">
            <span className="text-xl">🧋</span>
          </div>
          <div>
            <h1 className="font-bold text-orange-700 text-lg leading-tight">Trà Sữa POS</h1>
            <p className="text-xs text-gray-400">Xin chào, {username}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                active
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={20} className={active ? 'text-orange-500' : ''} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 w-full transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Đăng Xuất</span>
        </button>
      </div>
    </aside>
  )
}
