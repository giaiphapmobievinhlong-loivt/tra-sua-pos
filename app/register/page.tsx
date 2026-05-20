'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [form, setForm] = useState({ store_name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: form.store_name,
          email: form.email,
          password: form.password,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push('/ban-hang')
        router.refresh()
      } else {
        setError(data.error || 'Đăng ký thất bại')
      }
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 md:p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-4xl">🧋</span>
          </div>
          <h1 className="text-2xl font-bold text-orange-700">Tạo cửa hàng mới</h1>
          <p className="text-gray-500 mt-1 text-sm">Dùng thử miễn phí · 10 đơn/ngày</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên cửa hàng</label>
            <input
              type="text"
              value={form.store_name}
              onChange={e => set('store_name', e.target.value)}
              className="input"
              placeholder="Ví dụ: Trà Sữa Nhà Mèo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className="input"
              placeholder="email@cuahang.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              className="input"
              placeholder="Tối thiểu 6 ký tự"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => set('confirm', e.target.value)}
              className="input"
              placeholder="Nhập lại mật khẩu"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Gói miễn phí */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm text-gray-600">
            <p className="font-semibold text-orange-700 mb-1">Gói miễn phí bao gồm:</p>
            <ul className="space-y-1">
              <li>✅ 10 đơn hàng mỗi ngày</li>
              <li>✅ Quản lý sản phẩm, danh mục</li>
              <li>✅ Báo cáo doanh thu</li>
              <li>✅ Quản lý nhân viên</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 text-base disabled:opacity-60"
          >
            {loading ? 'Đang tạo cửa hàng...' : 'Tạo cửa hàng miễn phí'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-orange-600 font-medium hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}
