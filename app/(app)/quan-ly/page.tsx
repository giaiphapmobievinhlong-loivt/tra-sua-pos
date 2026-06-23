'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Package, Layers, Users, X, Eye, EyeOff, Tag, Percent, DollarSign, ToggleLeft, ToggleRight, QrCode, Printer, ExternalLink, ChefHat, Boxes, ArrowDownToLine, ArrowUpFromLine, History, AlertTriangle, Store, Check, ChevronRight, Download, CreditCard, Zap, CheckCircle, Clock, AlertCircle, Loader2, Copy, TrendingDown } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────
interface Category {
  id: number
  name: string
  slug: string
  product_count?: number
}

interface Product {
  id: number
  name: string
  price: number
  category_id: number
  category_name: string
  image_url: string
  is_active: boolean
  sort_order: number
}

interface User {
  id: number
  username: string
  full_name: string
  role: string
  created_at: string
}

type Tab = 'products' | 'categories' | 'users' | 'discounts' | 'qr' | 'settings' | 'recipes' | 'inventory' | 'stores' | 'cost' | 'billing'

// ─── Modal wrapper ────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── Confirm delete modal ─────────────────────────────────
function ConfirmDelete({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal title="Xác nhận xóa" onClose={onCancel}>
      <p className="text-gray-600 mb-6">Bạn có chắc muốn xóa <strong>{name}</strong>? Hành động này không thể hoàn tác.</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 btn-secondary">Hủy</button>
        <button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Xóa</button>
      </div>
    </Modal>
  )
}

// ─── Products Tab ─────────────────────────────────────────
function ProductsTab({ categories }: { categories: Category[] }) {
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', price: '', category_id: '', image_url: '', is_active: true, sort_order: '0' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetch_ = useCallback(async () => {
    const res = await fetch('/api/admin/products')
    const d = await res.json()
    setProducts(d.products || [])
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  function openAdd() {
    setEditing(null)
    setForm({ name: '', price: '', category_id: categories[0]?.id?.toString() || '', image_url: '', is_active: true, sort_order: String(products.length + 1) })
    setError('')
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({ name: p.name, price: String(p.price), category_id: String(p.category_id), image_url: p.image_url || '', is_active: p.is_active, sort_order: String(p.sort_order || 0) })
    setError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price || !form.category_id) { setError('Vui lòng điền đầy đủ thông tin'); return }
    setSaving(true)
    setError('')
    try {
      const url = editing ? `/api/admin/products/${editing.id}` : '/api/admin/products'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: Number(form.price), category_id: Number(form.category_id), sort_order: Number(form.sort_order) }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Lỗi server'); return }
      setShowForm(false)
      fetch_()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(p: Product) {
    const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) { alert(d.error || 'Không thể xóa'); return }
    setDeleting(null)
    fetch_()
  }

  async function toggleActive(p: Product) {
    await fetch(`/api/admin/products/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !p.is_active }),
    })
    fetch_()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-600 font-medium">Danh sách sản phẩm ({products.length})</p>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Thêm Sản Phẩm
        </button>
      </div>

      <div className="card overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-500">Ảnh</th>
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-500">Tên món</th>
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-500">Danh mục</th>
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-500">Giá bán</th>
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-500">Thứ tự</th>
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-500">Trạng thái</th>
              <th className="text-right px-5 py-3 text-sm font-semibold text-gray-500">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Chưa có sản phẩm nào</td></tr>
            )}
            {products.map(p => (
              <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={p.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100'}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100' }}
                    />
                  </div>
                </td>
                <td className="px-5 py-3 font-medium text-gray-800">{p.name}</td>
                <td className="px-5 py-3 text-gray-600">{p.category_name}</td>
                <td className="px-5 py-3 font-semibold text-gray-800">{p.price.toLocaleString('vi-VN')}đ</td>
                <td className="px-5 py-3 text-gray-600">{p.sort_order}</td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => toggleActive(p)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${p.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {p.is_active ? 'Hiện' : 'Ẩn'}
                  </button>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-orange-500 transition-colors p-1.5 hover:bg-orange-50 rounded-lg">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleting(p)} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <Modal title={editing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Tên món <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Ví dụ: Trà sữa trân châu" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Giá bán (đ) <span className="text-red-500">*</span></label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="input" placeholder="25000" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Thứ tự hiển thị</label>
                <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} className="input" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Danh mục <span className="text-red-500">*</span></label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="input">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">URL ảnh</label>
                <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} className="input" placeholder="https://..." />
                {form.image_url && (
                  <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                    <img src={form.image_url} alt="preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className={`w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-orange-500' : 'bg-gray-300'} relative`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Hiển thị trên menu bán hàng</span>
                </label>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 btn-secondary">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary disabled:opacity-60">
                {saving ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Thêm mới')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleting && <ConfirmDelete name={deleting.name} onConfirm={() => handleDelete(deleting)} onCancel={() => setDeleting(null)} />}
    </div>
  )
}

// ─── Categories Tab ───────────────────────────────────────
function CategoriesTab({ onCategoriesChange }: { onCategoriesChange: () => void }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', slug: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetch_ = useCallback(async () => {
    const res = await fetch('/api/categories')
    const d = await res.json()
    setCategories(d.categories || [])
    onCategoriesChange()
  }, [onCategoriesChange])

  useEffect(() => { fetch_() }, [fetch_])

  function toSlug(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function openAdd() {
    setEditing(null)
    setForm({ name: '', slug: '' })
    setError('')
    setShowForm(true)
  }

  function openEdit(c: Category) {
    setEditing(c)
    setForm({ name: c.name, slug: c.slug })
    setError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Vui lòng nhập tên danh mục'); return }
    const slug = form.slug || toSlug(form.name)
    setSaving(true); setError('')
    try {
      const url = editing ? `/api/categories/${editing.id}` : '/api/categories'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, slug }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Lỗi server'); return }
      setShowForm(false)
      fetch_()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(c: Category) {
    const res = await fetch(`/api/categories/${c.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) { alert(d.error || 'Không thể xóa'); }
    setDeleting(null)
    fetch_()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-600 font-medium">Danh sách danh mục ({categories.length})</p>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Thêm Danh Mục
        </button>
      </div>

      <div className="card overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-500">Tên danh mục</th>
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-500">Slug</th>
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-500">Số sản phẩm</th>
              <th className="text-right px-5 py-3 text-sm font-semibold text-gray-500">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Chưa có danh mục</td></tr>
            )}
            {categories.map(c => (
              <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Layers size={16} className="text-orange-600" />
                    </div>
                    <span className="font-medium text-gray-800">{c.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <code className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">{c.slug}</code>
                </td>
                <td className="px-5 py-4 text-gray-600">{c.product_count ?? 0} sản phẩm</td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-orange-500 transition-colors p-1.5 hover:bg-orange-50 rounded-lg">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleting(c)} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tên danh mục <span className="text-red-500">*</span></label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))}
                className="input" placeholder="Ví dụ: Trà sữa"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Slug (tự động tạo)</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="input" placeholder="tra-sua" />
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 btn-secondary">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary disabled:opacity-60">
                {saving ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Thêm mới')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && <ConfirmDelete name={deleting.name} onConfirm={() => handleDelete(deleting)} onCancel={() => setDeleting(null)} />}
    </div>
  )
}

// ─── Users Tab ────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)
  const [form, setForm] = useState({ username: '', full_name: '', password: '', role: 'staff' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const fetch_ = useCallback(async () => {
    const res = await fetch('/api/admin/users')
    const d = await res.json()
    setUsers(d.users || [])
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  function openAdd() {
    setEditing(null)
    setForm({ username: '', full_name: '', password: '', role: 'staff' })
    setError('')
    setShowForm(true)
  }

  function openEdit(u: User) {
    setEditing(u)
    setForm({ username: u.username, full_name: u.full_name, password: '', role: u.role })
    setError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.username.trim() || !form.full_name.trim()) { setError('Vui lòng điền đầy đủ thông tin'); return }
    if (!editing && !form.password) { setError('Vui lòng nhập mật khẩu'); return }
    setSaving(true); setError('')
    try {
      const url = editing ? `/api/admin/users/${editing.id}` : '/api/admin/users'
      const method = editing ? 'PUT' : 'POST'
      const body: Record<string, string> = { username: form.username, full_name: form.full_name, role: form.role }
      if (form.password) body.password = form.password
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Lỗi server'); return }
      setShowForm(false)
      fetch_()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(u: User) {
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) { alert(d.error || 'Không thể xóa'); }
    setDeleting(null)
    fetch_()
  }

  const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'bg-red-100 text-red-700' },
    staff: { label: 'Nhân viên', color: 'bg-blue-100 text-blue-700' },
    manager: { label: 'Quản lý', color: 'bg-purple-100 text-purple-700' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-600 font-medium">Danh sách nhân viên ({users.length})</p>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Thêm Nhân Viên
        </button>
      </div>

      <div className="card overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-500">Nhân viên</th>
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-500">Tên đăng nhập</th>
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-500">Vai trò</th>
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-500">Ngày tạo</th>
              <th className="text-right px-5 py-3 text-sm font-semibold text-gray-500">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Chưa có nhân viên</td></tr>
            )}
            {users.map(u => {
              const roleInfo = ROLE_LABELS[u.role] || { label: u.role, color: 'bg-gray-100 text-gray-600' }
              return (
                <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <code className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">@{u.username}</code>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleInfo.color}`}>{roleInfo.label}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-sm">
                    {new Date(u.created_at).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(u)} className="text-gray-400 hover:text-orange-500 transition-colors p-1.5 hover:bg-orange-50 rounded-lg">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => setDeleting(u)} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editing ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Họ tên <span className="text-red-500">*</span></label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="input" placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tên đăng nhập <span className="text-red-500">*</span></label>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="input" placeholder="nguyenvana" disabled={!!editing} />
              {editing && <p className="text-xs text-gray-400 mt-1">Không thể thay đổi tên đăng nhập</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Mật khẩu {!editing && <span className="text-red-500">*</span>}
                {editing && <span className="text-gray-400 font-normal">(để trống nếu không đổi)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Vai trò</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'staff', label: 'Nhân viên', desc: 'Bán hàng, thu chi' },
                  { value: 'manager', label: 'Quản lý', desc: 'Xem báo cáo' },
                  { value: 'admin', label: 'Admin', desc: 'Toàn quyền' },
                ].map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: r.value }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.role === r.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <p className="font-semibold text-sm text-gray-800">{r.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 btn-secondary">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary disabled:opacity-60">
                {saving ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Thêm mới')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && <ConfirmDelete name={deleting.full_name} onConfirm={() => handleDelete(deleting)} onCancel={() => setDeleting(null)} />}
    </div>
  )
}


// ─── Discounts Tab ────────────────────────────────────────
interface Discount {
  id: number; name: string; type: 'percent' | 'fixed'
  value: number; min_order: number; is_active: boolean
}

function DiscountsTab() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Discount | null>(null)
  const [form, setForm] = useState({ name: '', type: 'percent' as 'percent'|'fixed', value: '', min_order: '', is_active: true })
  const [deleting, setDeleting] = useState<Discount | null>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/discounts')
    const d = await res.json()
    setDiscounts(d.discounts || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', type: 'percent', value: '', min_order: '', is_active: true })
    setShowForm(true)
  }
  function openEdit(d: Discount) {
    setEditing(d)
    setForm({ name: d.name, type: d.type, value: String(d.value), min_order: String(d.min_order || 0), is_active: d.is_active })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.value) return
    const body = { name: form.name, type: form.type, value: Number(form.value), min_order: Number(form.min_order || 0), is_active: form.is_active }
    if (editing) {
      await fetch(`/api/discounts/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/discounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setShowForm(false)
    fetch_()
  }

  async function handleToggle(d: Discount) {
    await fetch(`/api/discounts/${d.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...d, is_active: !d.is_active })
    })
    fetch_()
  }

  async function handleDelete() {
    if (!deleting) return
    const res = await fetch(`/api/discounts/${deleting.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) { alert(d.error || 'Không thể xóa'); return }
    setDeleting(null)
    fetch_()
  }

  const fmt = (n: number) => n.toLocaleString('vi-VN')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{discounts.length} khuyến mãi</p>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all">
          <Plus size={16} /> Thêm khuyến mãi
        </button>
      </div>

      {loading && <div className="text-center py-10 text-gray-400 text-sm">Đang tải...</div>}

      {!loading && discounts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Tag size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Chưa có khuyến mãi nào</p>
          <p className="text-xs mt-1">Bấm "Thêm khuyến mãi" để tạo mới</p>
        </div>
      )}

      <div className="space-y-3">
        {discounts.map(d => (
          <div key={d.id} className={`bg-white rounded-2xl p-4 border shadow-sm transition-all ${d.is_active ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${d.type === 'percent' ? 'bg-purple-100' : 'bg-green-100'}`}>
                {d.type === 'percent' ? <Percent size={18} className="text-purple-600" /> : <DollarSign size={18} className="text-green-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-800">{d.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {d.is_active ? 'Đang bật' : 'Tắt'}
                  </span>
                </div>
                <p className="text-sm font-bold mt-0.5 text-orange-600">
                  {d.type === 'percent' ? `Giảm ${d.value}%` : `Giảm ${fmt(d.value)}đ`}
                </p>
                {Number(d.min_order) > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">Đơn tối thiểu: {fmt(Number(d.min_order))}đ</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleToggle(d)} title={d.is_active ? 'Tắt' : 'Bật'}
                  className={`p-2 rounded-lg transition-all ${d.is_active ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                  {d.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
                <button onClick={() => openEdit(d)} className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all">
                  <Pencil size={16} />
                </button>
                <button onClick={() => setDeleting(d)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <Modal title={editing ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên khuyến mãi *</label>
              <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                placeholder="VD: Giảm 10% cuối tuần, Combo sinh nhật..."
                className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loại giảm giá</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setForm(p => ({...p, type: 'percent'}))}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    form.type === 'percent' ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'
                  }`}>
                  <Percent size={15} /> Phần trăm (%)
                </button>
                <button onClick={() => setForm(p => ({...p, type: 'fixed'}))}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    form.type === 'fixed' ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'
                  }`}>
                  <DollarSign size={15} /> Số tiền cố định
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá trị giảm {form.type === 'percent' ? '(%)' : '(đ)'} *
                </label>
                <input type="number" value={form.value} onChange={e => setForm(p => ({...p, value: e.target.value}))}
                  placeholder={form.type === 'percent' ? '10' : '20000'}
                  className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đơn tối thiểu (đ)</label>
                <input type="number" value={form.min_order} onChange={e => setForm(p => ({...p, min_order: e.target.value}))}
                  placeholder="0 = không giới hạn"
                  className="input w-full" />
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-700">Kích hoạt ngay</span>
              <button onClick={() => setForm(p => ({...p, is_active: !p.is_active}))}
                className={`transition-all ${form.is_active ? 'text-green-500' : 'text-gray-300'}`}>
                {form.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>
            {form.value && (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium ${form.type === 'percent' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'}`}>
                Preview: {form.type === 'percent'
                  ? `Giảm ${form.value}% cho đơn hàng${Number(form.min_order) > 0 ? ` từ ${fmt(Number(form.min_order))}đ` : ''}`
                  : `Giảm thẳng ${fmt(Number(form.value))}đ${Number(form.min_order) > 0 ? ` (đơn từ ${fmt(Number(form.min_order))}đ)` : ''}`
                }
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 btn-secondary">Hủy</button>
              <button onClick={handleSave}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                {editing ? 'Lưu thay đổi' : 'Tạo khuyến mãi'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDelete name={deleting.name} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
      )}
    </div>
  )
}


// ─── QR Tab ───────────────────────────────────────────────
const TABLE_LIST = ['1','2','3','4','5','6','7','8','9','10','11','12']

function QrTab() {
  const [baseUrl, setBaseUrl] = useState('')
  const [storeId, setStoreId] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    setBaseUrl(window.location.origin)
    fetch('/api/quota').then(r => r.json()).then(d => { if (d.store_id) setStoreId(d.store_id) })
  }, [])

  function getOrderUrl(table: string) {
    return `${baseUrl}/order?table=${table}&store=${storeId}`
  }

  function printAll() {
    window.print()
  }

  function printSingle(table: string) {
    setSelected(table)
    setTimeout(() => { window.print(); setSelected(null) }, 300)
  }

  return (
    <div>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #qr-print-area { display: block !important; }
          .no-print { display: none !important; }
        }
        #qr-print-area { display: none; }
        @media print { #qr-print-area { display: block; } }
      `}</style>

      {/* Print area (hidden, shown on print) */}
      <div id="qr-print-area">
        {(selected ? [selected] : TABLE_LIST).map(table => (
          <div key={table} style={{
            width: '8cm', height: '10cm', margin: '0.5cm auto',
            border: '2px solid #f97316', borderRadius: '12px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '16px', pageBreakAfter: 'always',
            fontFamily: 'sans-serif',
          }}>
            <div style={{ fontSize: 32, marginBottom: 4 }}>🧋</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#c2410c', marginBottom: 2 }}>Trà Sữa Nhà Mèo</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>Quét mã để đặt món</div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getOrderUrl(table))}`}
              alt={`QR Bàn ${table}`}
              style={{ width: 180, height: 180, borderRadius: 8 }}
            />
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 12, color: '#1f2937' }}>Bàn {table}</div>
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 4, wordBreak: 'break-all', textAlign: 'center' }}>
              {getOrderUrl(table)}
            </div>
          </div>
        ))}
      </div>

      {/* UI */}
      <div className="no-print">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm text-gray-500">QR cố định — khách scan là vào trang đặt món đúng bàn</p>
          </div>
          <button onClick={printAll}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all">
            <Printer size={15} /> In tất cả ({TABLE_LIST.length} bàn)
          </button>
        </div>

        {/* Base URL config */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
          <div className="shrink-0 mt-0.5">ℹ️</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-blue-700 mb-1">URL website của quán</p>
            <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
              className="w-full text-xs px-3 py-1.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white font-mono"
              placeholder="https://ten-quan.vercel.app" />
            <p className="text-xs text-blue-500 mt-1">Tự động lấy từ domain hiện tại. Sửa nếu domain thực tế khác.</p>
          </div>
        </div>

        {/* Grid of tables */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {TABLE_LIST.map(table => (
            <div key={table} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-3">
              <div className="font-black text-gray-800 text-lg">Bàn {table}</div>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getOrderUrl(table))}`}
                alt={`QR Bàn ${table}`}
                className="w-36 h-36 rounded-xl border border-gray-100"
              />
              <p className="text-[10px] text-gray-400 text-center break-all">{getOrderUrl(table)}</p>
              <div className="flex gap-2 w-full">
                <a href={getOrderUrl(table)} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 py-1.5 rounded-lg hover:bg-blue-100 transition-all">
                  <ExternalLink size={11} /> Mở thử
                </a>
                <button onClick={() => printSingle(table)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-100 py-1.5 rounded-lg hover:bg-orange-100 transition-all">
                  <Printer size={11} /> In
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}



// ─── Settings Tab ─────────────────────────────────────────
function SettingsTab() {
  const [deliveryFee, setDeliveryFee] = useState('15000')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.delivery_fee) setDeliveryFee(d.delivery_fee)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_fee: deliveryFee }),
      })
      const data = await res.json()
      if (data.success) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } finally { setSaving(false) }
  }

  const feeNum = Number(deliveryFee) || 0

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          🛵 Cài đặt giao hàng
        </h3>
        {loading ? (
          <p className="text-sm text-gray-400">Đang tải...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1.5">
                Phí giao hàng cố định
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={e => setDeliveryFee(e.target.value)}
                  className="flex-1 text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="15000"
                  min="0"
                  step="1000"
                />
                <span className="text-sm text-gray-500 font-semibold shrink-0">đồng</span>
              </div>
              {feeNum > 0 && (
                <p className="text-xs text-orange-500 mt-1 font-semibold">
                  = {feeNum.toLocaleString('vi-VN')}đ / đơn
                </p>
              )}
              {feeNum === 0 && (
                <p className="text-xs text-green-500 mt-1 font-semibold">Giao hàng miễn phí</p>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold py-2.5 rounded-xl transition-all">
              {saved ? '✓ Đã lưu!' : saving ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-blue-700 mb-1">ℹ️ Lưu ý</p>
        <p className="text-xs text-blue-600">
          Phí giao hàng sẽ được hiển thị cho khách trên trang đặt món và cộng vào tổng tiền.
          Thay đổi có hiệu lực ngay với đơn mới.
        </p>
      </div>
    </div>
  )
}


// ─── Recipes Tab ──────────────────────────────────────────
function RecipesTab() {
  const [activeSection, setActiveSection] = useState<'nen' | 'ly' | 'topping' | 'cafe'>('nen')
  const [activeRecipe, setActiveRecipe] = useState(0)
  const [activeCafe, setActiveCafe] = useState(0)

  const congThucCafe = [
    {
      title: 'Cà Phê Đen', emoji: '☕', price: '15K', color: 'border-stone-300',
      headerBg: 'bg-stone-700', tagBg: 'bg-stone-100 text-stone-700',
      note: 'Cho đá vào ly trước khi rót',
      items: [
        { label: 'Cốt cà phê', value: '50ml' },
        { label: 'Siro đường', value: '20ml' },
      ]
    },
    {
      title: 'Cà Phê Sữa', emoji: '☕', price: '18K', color: 'border-amber-300',
      headerBg: 'bg-amber-600', tagBg: 'bg-amber-100 text-amber-700',
      note: 'Cho đá vào ly, khuấy nhẹ',
      items: [
        { label: 'Cốt cà phê', value: '50ml' },
        { label: 'Sữa đặc', value: '25ml' },
      ]
    },
    {
      title: 'Bạc Xỉu', emoji: '🥛', price: '20K', color: 'border-blue-200',
      headerBg: 'bg-blue-400', tagBg: 'bg-blue-100 text-blue-700',
      note: 'Đánh cốt cà phê tạo bông trước khi rưới lên trên',
      items: [
        { label: 'Sữa tươi', value: '50ml' },
        { label: 'Sữa đặc', value: '30ml' },
        { label: 'Rich lùn', value: '10ml' },
        { label: 'Cốt cà phê đánh bông', value: '30ml' },
      ]
    },
    {
      title: 'Sữa Tươi Cà Phê', emoji: '🥛', price: '20K', color: 'border-orange-200',
      headerBg: 'bg-orange-400', tagBg: 'bg-orange-100 text-orange-700',
      note: 'Cốt cà phê chỉ đánh hơi có bọt nhẹ (không bông hoàn toàn)',
      items: [
        { label: 'Sữa tươi', value: '50ml' },
        { label: 'Sữa đặc', value: '30ml' },
        { label: 'Rich lùn', value: '10ml' },
        { label: 'Cốt cà phê hơi đánh bọt', value: '30ml' },
      ]
    },
    {
      title: 'Cà Phê Sữa Dừa', emoji: '🥥', price: '22K', color: 'border-green-200',
      headerBg: 'bg-green-500', tagBg: 'bg-green-100 text-green-700',
      note: 'Đánh cốt cà phê tạo bọt trước khi rưới lên mặt ly',
      items: [
        { label: 'Sữa tươi', value: '50ml' },
        { label: 'Sữa đặc', value: '30ml' },
        { label: 'Sữa dừa Nhất Hương', value: '40ml' },
        { label: 'Cốt cà phê đánh bọt', value: '30ml' },
      ]
    },
    {
      title: 'Cà Phê Muối', emoji: '🧂', price: '18K', color: 'border-teal-300',
      headerBg: 'bg-teal-500', tagBg: 'bg-teal-100 text-teal-700',
      note: 'Lắc đều cà phê + sữa đặc trước, rưới kem muối lên trên, rắc bột cacao trang trí',
      items: [
        { label: 'Sữa đặc', value: '25ml' },
        { label: 'Cốt cà phê', value: '50ml (lắc đều cùng sữa đặc)' },
        { label: 'Kem muối', value: '1,5 vá' },
        { label: 'Bột cacao', value: 'Rắc trang trí' },
      ]
    },
    {
      title: 'Cà Phê Kem Dẻo Buôn Mê', emoji: '🍦', price: '25K', color: 'border-yellow-300',
      headerBg: 'bg-yellow-500', tagBg: 'bg-yellow-100 text-yellow-700',
      note: 'Rưới kem dẻo Buôn Mê lên trên cùng',
      items: [
        { label: 'Sữa đặc', value: '25ml' },
        { label: 'Cốt cà phê', value: '50ml' },
        { label: 'Kem dẻo Buôn Mê', value: '1,5 vá' },
      ]
    },
    {
      title: 'Matcha Latte', emoji: '🍵', price: '22K / 28K', color: 'border-green-300',
      headerBg: 'bg-green-600', tagBg: 'bg-green-100 text-green-700',
      note: 'Đánh bột matcha với 50ml nước nóng ~80°C thật nhuyễn rồi rưới vào ly sữa có đá',
      items: [
        { label: 'Sữa tươi (S/L)', value: '110ml / 180ml' },
        { label: 'Sữa đặc (S/L)', value: '30ml / 50ml' },
        { label: 'Đường (S/L)', value: '10ml / 20ml' },
        { label: 'Bột matcha (S/L)', value: '3–4gr / 5–6gr' },
        { label: 'Nước nóng (~80°C)', value: '50ml — đánh tan matcha trước' },
      ]
    },
    {
      title: 'Khoai Môn Latte', emoji: '🟣', price: '22K / 28K', color: 'border-purple-300',
      headerBg: 'bg-purple-500', tagBg: 'bg-purple-100 text-purple-700',
      note: 'Đánh bột khoai môn với nước nóng cho tan hẳn trước khi cho vào ly',
      items: [
        { label: 'Sữa tươi (S/L)', value: '100ml / 180ml' },
        { label: 'Sữa đặc (S/L)', value: '20ml / 30ml' },
        { label: 'Bột khoai môn (S/L)', value: '15gr / 20gr' },
        { label: 'Nước nóng', value: '50ml — đánh tan bột trước' },
      ]
    },
    {
      title: 'Cacao Latte', emoji: '🍫', price: '22K / 28K', color: 'border-stone-400',
      headerBg: 'bg-stone-600', tagBg: 'bg-stone-100 text-stone-700',
      note: 'Đánh bột cacao với nước nóng cho tan hẳn trước',
      items: [
        { label: 'Sữa tươi (S/L)', value: '100ml / 180ml' },
        { label: 'Sữa đặc (S/L)', value: '30ml / 50ml' },
        { label: 'Bột cacao (S/L)', value: '10–15gr / 15–20gr' },
        { label: 'Nước nóng', value: '50ml — đánh tan bột trước' },
      ]
    },
    {
      title: 'Phindi Hạnh Nhân', emoji: '🌰', price: '25K', color: 'border-amber-400',
      headerBg: 'bg-amber-700', tagBg: 'bg-amber-100 text-amber-800',
      note: 'Đánh cốt cà phê tạo bông rồi rưới lên trên, thêm thạch cà phê',
      items: [
        { label: 'Sữa đặc', value: '10ml' },
        { label: 'Siro hạt phỉ', value: '20ml' },
        { label: 'Sữa tươi', value: '80ml' },
        { label: 'Cốt cà phê đánh bông', value: '30ml' },
        { label: 'Thạch cà phê', value: '1 vá' },
      ]
    },
  ]

  const nenTra = [
    {
      title: 'Cốt Trà (Take Away)',
      emoji: '🍋',
      color: 'bg-yellow-50 border-yellow-200',
      headerColor: 'bg-yellow-500',
      steps: [
        { step: 1, title: 'Nguyên liệu', items: ['35gr lục trà', '5gr trà đen Novia', '150gr đường', '1gr muối'] },
        { step: 2, title: 'Ủ trà', items: ['Lấy 1,6 lít nước sôi', 'Ủ trong 15 phút'] },
        { step: 3, title: 'Hoàn thiện', items: ['Thêm đường + muối vào', '2 xúc đá sốc nhiệt', 'Khuấy đều cho tan đường'] },
        { step: 4, title: 'Bảo quản', items: ['Để tủ lạnh', 'Đậy nắp kín'] },
      ]
    },
    {
      title: 'Nền Trà Sữa',
      emoji: '🧋',
      color: 'bg-amber-50 border-amber-200',
      headerColor: 'bg-amber-600',
      steps: [
        { step: 1, title: 'Chuẩn bị trà', items: ['60g Trà đen Hoàng Gia', '40g Trà nguyên lá Novia', '2.1 lít nước sôi ~100°C'] },
        { step: 2, title: 'Ủ trà', items: ['Cho nước sôi vào', 'Ủ 25 phút'] },
        { step: 3, title: 'Thêm nguyên liệu (theo thứ tự)', items: ['① Bột kem béo: 200g', '② Sữa đặc Ngôi Sao PN: 320ml', '③ Đường đen: 320g', '④ Rich lùn: 100ml (tăng độ béo ngậy)', '⑤ Sốc nhiệt 2 súc đá'] },
        { step: 4, title: 'Bảo quản', items: ['Ủ tủ lạnh 7–8 tiếng', 'Đậy nắp kín'] },
      ]
    },
    {
      title: 'Cốt Cà Phê (Ủ Phin)',
      emoji: '☕',
      color: 'bg-stone-50 border-stone-300',
      headerColor: 'bg-stone-700',
      steps: [
        { step: 1, title: 'Chuẩn bị phin', items: ['200gr bột cà phê cho vào phin', '100ml nước sôi vào đáy nồi', '100ml nước sôi để nổi lên trên'] },
        { step: 2, title: 'Ủ lần 1', items: ['Đợi 20 phút cho cà phê nở', 'Lấy 200ml nước nóng đổ vào lần 1'] },
        { step: 3, title: 'Ủ lần 2', items: ['Sau 20 phút tiếp theo', 'Lấy 200ml nước nóng đổ lần 2', 'Tổng thu được ~400ml cốt cà phê'] },
        { step: 4, title: 'Bảo quản', items: ['Dùng trong ngày', 'Để tủ lạnh nếu chưa dùng'] },
      ]
    },
  ]

  const congThucLy = [
    {
      title: 'Trà Tắc', price: '10K', size: '700ml', emoji: '🍋',
      color: 'border-yellow-300', headerBg: 'bg-yellow-400', tagBg: 'bg-yellow-100 text-yellow-700',
      note: 'Lắc đều, trang trí thêm lát tắc',
      items: [
        { label: 'Trà', value: '200ml' },
        { label: 'Tắc', value: '2 trái' },
        { label: 'Đường', value: '50–60ml' },
      ]
    },
    {
      title: 'Trà Tắc Xí Muội', price: '15K', size: '700ml', emoji: '🍊',
      color: 'border-orange-300', headerBg: 'bg-orange-400', tagBg: 'bg-orange-100 text-orange-700',
      note: 'Xí muội trang trí bên trên sau cùng',
      items: [
        { label: 'Trà', value: '200ml' },
        { label: 'Xí muội', value: '1 muỗng 5' },
        { label: 'Đường', value: '30ml (hoặc 50ml)' },
        { label: 'Tắc', value: '1 trái' },
      ]
    },
    {
      title: 'Trà Me', price: '15K', size: '700ml', emoji: '🟤',
      color: 'border-stone-300', headerBg: 'bg-stone-500', tagBg: 'bg-stone-100 text-stone-700',
      note: 'Xốc đều trước khi rót',
      items: [
        { label: 'Trà', value: '200ml' },
        { label: 'Me', value: '1,5 muỗng' },
        { label: 'Đường', value: '30ml (hoặc 50ml)' },
        { label: 'Tắc', value: '1 trái' },
      ]
    },
    {
      title: 'Hồng Trà Sốt Tắc', price: '15K', size: '700ml', emoji: '🌸',
      color: 'border-pink-300', headerBg: 'bg-pink-500', tagBg: 'bg-pink-100 text-pink-700',
      note: 'Rưới sốt tắc lên trên cùng sau khi có đá',
      items: [
        { label: 'Cốt hồng trà', value: '200ml' },
        { label: 'Đường', value: '30ml' },
        { label: 'Tắc', value: '2 trái' },
        { label: 'Trân châu 3q', value: '1 vá' },
        { label: 'Sốt tắc', value: '1 vá' },
      ]
    },
    {
      title: 'Trà Dâu', price: '20K', size: '500ml / 700ml', emoji: '🍓',
      color: 'border-pink-300', headerBg: 'bg-pink-400', tagBg: 'bg-pink-100 text-pink-700',
      note: 'Trang trí thêm dâu ngâm',
      items: [
        { label: 'Trà (S/L)', value: '110ml / 150–170ml' },
        { label: 'Mứt dâu (S/L)', value: '25ml / 35ml' },
        { label: 'Đường (S/L)', value: '25ml / 25ml' },
        { label: 'Tắc', value: '1,5 trái hoặc 1 trái to' },
        { label: 'Đá', value: 'Lắc đều' },
      ]
    },
    {
      title: 'Trà Sữa', price: '20K/25K', size: '500ml / 700ml', emoji: '🧋',
      color: 'border-amber-300', headerBg: 'bg-amber-500', tagBg: 'bg-amber-100 text-amber-700',
      note: 'Đổ đầy đá vào ly trước',
      items: [
        { label: 'Đá', value: 'Đổ đầy ly' },
        { label: 'Trà sữa', value: 'Đổ vào khoảng 7 phần' },
        { label: 'Trân châu', value: '1 vá' },
        { label: 'Pudding trứng', value: '4–5 cục' },
      ]
    },
  ]

  return (
    <div className="space-y-4">
      {/* Section toggle */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl flex-wrap">
        {([['nen','🫖 Nền Trà'],['ly','🧋 Từng Ly'],['topping','🍮 Topping'],['cafe','☕ Cafe']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveSection(id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeSection === id ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'nen' && (
        <div className="space-y-4">
          {nenTra.map((recipe, ri) => (
            <div key={ri} className={`border-2 rounded-2xl overflow-hidden ${recipe.color}`}>
              <div className={`${recipe.headerColor} px-4 py-3 flex items-center gap-2`}>
                <span className="text-2xl">{recipe.emoji}</span>
                <h3 className="font-bold text-white text-base">{recipe.title}</h3>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {recipe.steps.map((s) => (
                  <div key={s.step} className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center shrink-0">{s.step}</span>
                      <p className="font-bold text-gray-700 text-sm">{s.title}</p>
                    </div>
                    <ul className="space-y-1">
                      {s.items.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                          <span className="text-orange-400 mt-0.5 shrink-0">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'topping' && (
        <div className="space-y-4">
          {/* Pudding trứng */}
          <div className="border-2 border-yellow-300 rounded-2xl overflow-hidden">
            <div className="bg-yellow-400 px-4 py-3 flex items-center gap-2">
              <span className="text-2xl">🍮</span>
              <div>
                <h3 className="font-bold text-white text-base">Pudding Trứng</h3>
                <p className="text-white/80 text-xs">Cho ~1 lít thành phẩm</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {/* Nguyên liệu */}
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <p className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center">1</span>
                  Nguyên liệu
                </p>
                <ul className="space-y-1.5">
                  {[
                    '100g bột kem béo',
                    '100g bột pudding trứng',
                    '1 ít muối hồng',
                    '3g rau câu',
                    '70g đường',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center justify-between bg-yellow-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Cách làm */}
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <p className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center">2</span>
                  Cách làm
                </p>
                <ul className="space-y-2">
                  {[
                    'Trộn đều tất cả nguyên liệu khô vào nhau',
                    'Cho 1 lít nước lọc vào, khuấy đều',
                    'Đun sôi trên bếp lửa lớn',
                    'Hạ lửa nhỏ khoảng 2 phút rồi tắt bếp',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-sm text-gray-600">{step}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-start gap-2">
                <span className="text-orange-500 shrink-0">📝</span>
                <p className="text-sm text-orange-700 font-medium">Khuấy đều tay khi đun để tránh vón cục. Đổ ra khuôn, để nguội rồi cắt miếng.</p>
              </div>
            </div>
          </div>

          {/* Kem Muối */}
          <div className="border-2 border-blue-300 rounded-2xl overflow-hidden">
            <div className="bg-blue-400 px-4 py-3 flex items-center gap-2">
              <span className="text-2xl">🧂</span>
              <div>
                <h3 className="font-bold text-white text-base">Kem Muối</h3>
                <p className="text-white/80 text-xs">Dùng 2–3 ngày</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <p className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center">1</span>
                  Nguyên liệu
                </p>
                <ul className="space-y-1.5">
                  {[
                    '200ml sữa tươi',
                    '8–10gr muối hồng',
                    '200ml rich cao',
                    '1 hộp rich lùn',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center bg-blue-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-start gap-2">
                <span className="text-orange-500 shrink-0">📝</span>
                <p className="text-sm text-orange-700 font-medium">Đánh máy tốc độ cao 5 phút, sau đó thấp 3 phút.</p>
              </div>
            </div>
          </div>

          {/* Kem Dẻo Buôn Mê */}
          <div className="border-2 border-amber-300 rounded-2xl overflow-hidden">
            <div className="bg-amber-500 px-4 py-3 flex items-center gap-2">
              <span className="text-2xl">🍦</span>
              <div>
                <h3 className="font-bold text-white text-base">Kem Dẻo Buôn Mê</h3>
                <p className="text-white/80 text-xs">Dùng 10 ngày</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <p className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center">1</span>
                  Nguyên liệu
                </p>
                <ul className="space-y-1.5">
                  {[
                    '200ml rich lùn',
                    '80ml sữa đặc',
                    '50gr frappe laave',
                    '50ml cốt cà phê',
                    '10gr bột cacao',
                    '30ml siro caramel',
                    '1gr muối hồng',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center bg-amber-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-start gap-2">
                <span className="text-orange-500 shrink-0">📝</span>
                <p className="text-sm text-orange-700 font-medium">Đánh máy 5–6 phút cho đến khi kem dẻo mịn.</p>
              </div>
            </div>
          </div>

          {/* Thạch Cà Phê */}
          <div className="border-2 border-stone-300 rounded-2xl overflow-hidden">
            <div className="bg-stone-600 px-4 py-3 flex items-center gap-2">
              <span className="text-2xl">☕</span>
              <div>
                <h3 className="font-bold text-white text-base">Thạch Cà Phê</h3>
                <p className="text-white/80 text-xs">Bảo quản 3–4 ngày</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <p className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center">1</span>
                  Nguyên liệu
                </p>
                <ul className="space-y-1.5">
                  {[
                    '160gr đường',
                    '12gr rau câu dẻo',
                    '1,3 lít nước sôi',
                    '15ml cốt cà phê',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center bg-stone-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-start gap-2">
                <span className="text-orange-500 shrink-0">📝</span>
                <p className="text-sm text-orange-700 font-medium">Hòa tan đường + rau câu vào nước sôi, khuấy đều rồi thêm cốt cà phê. Đổ ra khay, để nguội cắt miếng.</p>
              </div>
            </div>
          </div>

          {/* Sốt Tắc */}
          <div className="border-2 border-yellow-300 rounded-2xl overflow-hidden">
            <div className="bg-yellow-500 px-4 py-3 flex items-center gap-2">
              <span className="text-2xl">🍋</span>
              <div>
                <h3 className="font-bold text-white text-base">Sốt Tắc</h3>
                <p className="text-white/80 text-xs">Dùng 3–4 ngày</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <p className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center">1</span>
                  Nguyên liệu
                </p>
                <ul className="space-y-1.5">
                  {[
                    '300ml cốt nước tắc',
                    '700gr đường',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center bg-yellow-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-start gap-2">
                <span className="text-orange-500 shrink-0">📝</span>
                <p className="text-sm text-orange-700 font-medium">Đun sôi cùng nhau, khuấy đều cho đến khi đường tan hoàn toàn. Để nguội, bảo quản lạnh.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'ly' && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {congThucLy.map((r, i) => (
              <button key={i} onClick={() => setActiveRecipe(i)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                  activeRecipe === i ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {r.emoji} {r.title}
              </button>
            ))}
          </div>
          {(() => {
            const r = congThucLy[activeRecipe]
            return (
              <div className={`border-2 rounded-2xl overflow-hidden ${r.color}`}>
                <div className={`${r.headerBg} px-4 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{r.emoji}</span>
                    <div>
                      <h3 className="font-bold text-white text-base">{r.title}</h3>
                      <p className="text-white/80 text-xs">{r.size}</p>
                    </div>
                  </div>
                  <span className={`${r.tagBg} font-black text-sm px-3 py-1 rounded-full`}>{r.price}</span>
                </div>
                <div className="p-4 space-y-2">
                  {r.items.map((item, i) => (
                    <div key={i} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                      <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 font-black text-sm flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="flex-1 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                        <p className="text-sm text-orange-600 font-bold text-right">{item.value}</p>
                      </div>
                    </div>
                  ))}
                  {r.note && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-start gap-2">
                      <span className="text-orange-500 shrink-0">📝</span>
                      <p className="text-sm text-orange-700 font-medium">{r.note}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {activeSection === 'cafe' && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {congThucCafe.map((r, i) => (
              <button key={i} onClick={() => setActiveCafe(i)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                  activeCafe === i ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {r.emoji} {r.title}
              </button>
            ))}
          </div>
          {(() => {
            const r = congThucCafe[activeCafe]
            return (
              <div className={`border-2 rounded-2xl overflow-hidden ${r.color}`}>
                <div className={`${r.headerBg} px-4 py-3 flex items-center gap-2`}>
                  <span className="text-2xl">{r.emoji}</span>
                  <h3 className="font-bold text-white text-base">{r.title}</h3>
                </div>
                <div className="p-4 space-y-2">
                  {r.items.map((item, i) => (
                    <div key={i} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                      <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 font-black text-sm flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="flex-1 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                        <p className="text-sm text-orange-600 font-bold text-right">{item.value}</p>
                      </div>
                    </div>
                  ))}
                  {r.note && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-start gap-2">
                      <span className="text-orange-500 shrink-0">📝</span>
                      <p className="text-sm text-orange-700 font-medium">{r.note}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// ─── Inventory Tab ────────────────────────────────────────
interface ProductIngredient {
  material_id: number
  quantity_per_cup: number
  material_name: string
  unit: string
}

interface Material {
  id: number
  name: string
  unit: string
  quantity: number
  min_quantity: number
  price_per_unit: number
  price_note: string
}

interface MaterialLog {
  id: number
  type: 'in' | 'out' | 'adjust'
  quantity: number
  note: string | null
  created_at_vn: string
  user_name: string | null
}

function stockStatus(m: Material): { label: string; color: string; bg: string } {
  if (m.quantity <= 0) return { label: 'Hết hàng', color: 'text-red-600', bg: 'bg-red-50 border-red-200' }
  if (m.min_quantity > 0 && m.quantity <= m.min_quantity) return { label: 'Sắp hết', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' }
  return { label: 'Đủ hàng', color: 'text-green-600', bg: 'bg-green-50 border-green-200' }
}

function InventoryTab() {
  const [subTab, setSubTab] = useState<'stock' | 'recipes'>('stock')
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)
  const [selected, setSelected] = useState<Material | null>(null)
  const [logs, setLogs] = useState<MaterialLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [deleting, setDeleting] = useState<Material | null>(null)
  const [form, setForm] = useState({ name: '', unit: 'kg', min_quantity: '0', price_per_unit: '', price_note: '' })
  const [logForm, setLogForm] = useState({ type: 'in' as 'in' | 'out' | 'adjust', quantity: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [logSaving, setLogSaving] = useState(false)
  const [error, setError] = useState('')

  // Recipe config state
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productIngredients, setProductIngredients] = useState<ProductIngredient[]>([])
  const [ingForm, setIngForm] = useState({ material_id: '', quantity_per_cup: '' })
  const [ingLoading, setIngLoading] = useState(false)
  const [ingSaving, setIngSaving] = useState(false)

  const fetchMaterials = useCallback(async () => {
    const res = await fetch('/api/materials')
    const d = await res.json()
    setMaterials(d.materials || [])
    setLoading(false)
  }, [])

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/admin/products')
    const d = await res.json()
    setAllProducts(d.products || [])
  }, [])

  useEffect(() => { fetchMaterials() }, [fetchMaterials])
  useEffect(() => { if (subTab === 'recipes') fetchProducts() }, [subTab, fetchProducts])

  async function openProductRecipe(p: Product) {
    setSelectedProduct(p)
    setIngForm({ material_id: '', quantity_per_cup: '' })
    setIngLoading(true)
    try {
      const res = await fetch(`/api/products/${p.id}/ingredients`)
      const d = await res.json()
      setProductIngredients(d.ingredients || [])
    } catch {
      setProductIngredients([])
    } finally {
      setIngLoading(false)
    }
  }

  async function handleAddIngredient() {
    if (!ingForm.material_id || !ingForm.quantity_per_cup || Number(ingForm.quantity_per_cup) <= 0) return
    setIngSaving(true)
    const res = await fetch(`/api/products/${selectedProduct!.id}/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ material_id: Number(ingForm.material_id), quantity_per_cup: Number(ingForm.quantity_per_cup) }),
    })
    if (res.ok) {
      setIngForm({ material_id: '', quantity_per_cup: '' })
      const r2 = await fetch(`/api/products/${selectedProduct!.id}/ingredients`)
      const d2 = await r2.json()
      setProductIngredients(d2.ingredients || [])
    }
    setIngSaving(false)
  }

  async function handleRemoveIngredient(materialId: number) {
    await fetch(`/api/products/${selectedProduct!.id}/ingredients`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ material_id: materialId }),
    })
    setProductIngredients(prev => prev.filter(i => i.material_id !== materialId))
  }

  async function fetchLogs(id: number) {
    setLogsLoading(true)
    const res = await fetch(`/api/materials/${id}/log`)
    const d = await res.json()
    setLogs(d.logs || [])
    setLogsLoading(false)
  }

  function openAdd() {
    setEditing(null)
    setForm({ name: '', unit: 'kg', min_quantity: '0', price_per_unit: '', price_note: '' })
    setError('')
    setShowAdd(true)
  }

  function openEdit(m: Material) {
    setEditing(m)
    setForm({ name: m.name, unit: m.unit, min_quantity: String(m.min_quantity), price_per_unit: m.price_per_unit > 0 ? String(m.price_per_unit) : '', price_note: m.price_note || '' })
    setError('')
    setShowAdd(true)
  }

  function openDetail(m: Material) {
    setSelected(m)
    setLogForm({ type: 'in', quantity: '', note: '' })
    fetchLogs(m.id)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.unit.trim()) { setError('Vui lòng điền đầy đủ'); return }
    setSaving(true); setError('')
    try {
      const url = editing ? `/api/materials/${editing.id}` : '/api/materials'
      const method = editing ? 'PUT' : 'POST'
      const body = editing
        ? { name: form.name, unit: form.unit, min_quantity: Number(form.min_quantity), price_per_unit: Number(form.price_per_unit) || 0, price_note: form.price_note }
        : { name: form.name, unit: form.unit, quantity: 0, min_quantity: Number(form.min_quantity), price_per_unit: Number(form.price_per_unit) || 0, price_note: form.price_note }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Lỗi'); return }
      setShowAdd(false)
      fetchMaterials()
    } finally { setSaving(false) }
  }

  async function handleDelete(m: Material) {
    await fetch(`/api/materials/${m.id}`, { method: 'DELETE' })
    setDeleting(null)
    fetchMaterials()
  }

  async function handleLog() {
    if (!logForm.quantity || Number(logForm.quantity) <= 0) return
    setLogSaving(true)
    const res = await fetch(`/api/materials/${selected!.id}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: logForm.type, quantity: Number(logForm.quantity), note: logForm.note }),
    })
    const d = await res.json()
    if (res.ok) {
      setSelected(prev => prev ? { ...prev, quantity: d.quantity } : null)
      setMaterials(prev => prev.map(m => m.id === selected!.id ? { ...m, quantity: d.quantity } : m))
      setLogForm({ type: 'in', quantity: '', note: '' })
      fetchLogs(selected!.id)
    }
    setLogSaving(false)
  }

  const lowCount = materials.filter(m => m.quantity <= m.min_quantity && m.min_quantity > 0 || m.quantity <= 0).length

  if (loading) return <p className="text-sm text-gray-400">Đang tải...</p>

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([['stock', 'Tồn Kho'], ['recipes', 'Công thức SP']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all ${
              subTab === id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Recipes sub-tab ── */}
      {subTab === 'recipes' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">Cấu hình nguyên liệu tiêu thụ cho từng sản phẩm. Hệ thống sẽ tự động trừ kho khi đơn hoàn thành.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allProducts.map(p => (
              <button key={p.id} onClick={() => openProductRecipe(p)}
                className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md text-left transition-all">
                <p className="font-bold text-gray-800 text-sm">{p.name}</p>
                <p className="text-xs text-orange-500 mt-1">{p.price.toLocaleString('vi-VN')}đ</p>
              </button>
            ))}
          </div>

          {selectedProduct && (
            <Modal title={`Nguyên liệu: ${selectedProduct.name}`} onClose={() => setSelectedProduct(null)}>
              <div className="space-y-4">
                {ingLoading ? (
                  <p className="text-sm text-gray-400 text-center py-4">Đang tải...</p>
                ) : (
                  <>
                    {productIngredients.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-3">Chưa cấu hình nguyên liệu</p>
                    ) : (
                      <div className="space-y-2">
                        {productIngredients.map(ing => (
                          <div key={ing.material_id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-700">{ing.material_name}</p>
                              <p className="text-xs text-orange-600 font-bold">{ing.quantity_per_cup} {ing.unit} / ly</p>
                            </div>
                            <button onClick={() => handleRemoveIngredient(ing.material_id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      <p className="text-sm font-bold text-gray-700">Thêm nguyên liệu</p>
                      <select value={ingForm.material_id} onChange={e => setIngForm(f => ({ ...f, material_id: e.target.value }))}
                        className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                        <option value="">-- Chọn nguyên liệu --</option>
                        {materials.filter(m => !productIngredients.find(i => i.material_id === m.id)).map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <input type="number" value={ingForm.quantity_per_cup} onChange={e => setIngForm(f => ({ ...f, quantity_per_cup: e.target.value }))}
                          className="flex-1 text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                          placeholder="Số lượng / ly" min="0" step="0.001" />
                        <button onClick={handleAddIngredient} disabled={ingSaving || !ingForm.material_id || !ingForm.quantity_per_cup}
                          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm whitespace-nowrap">
                          {ingSaving ? '...' : 'Thêm'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ── Stock sub-tab ── */}
      {subTab === 'stock' && <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{materials.length} nguyên liệu</span>
          {lowCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <AlertTriangle size={12} /> {lowCount} cần nhập thêm
            </span>
          )}
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
          <Plus size={16} /> Thêm nguyên liệu
        </button>
      </div>

      {/* List */}
      {materials.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Boxes size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Chưa có nguyên liệu nào</p>
          <p className="text-xs mt-1">Nhấn "Thêm nguyên liệu" để bắt đầu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {materials.map(m => {
            const st = stockStatus(m)
            return (
              <div key={m.id} onClick={() => openDetail(m)}
                className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{m.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {m.price_per_unit > 0
                        ? <span className="text-orange-500 font-semibold">{m.price_per_unit.toLocaleString('vi-VN')}đ/{m.unit}</span>
                        : <span className="italic">Chưa có giá</span>
                      }
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(m)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleting(m)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-black text-gray-800">{m.quantity.toLocaleString('vi-VN')}</p>
                    <p className="text-xs text-gray-500 font-medium">{m.unit}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${st.color} ${st.bg}`}>{st.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {showAdd && (
        <Modal title={editing ? 'Sửa nguyên liệu' : 'Thêm nguyên liệu'} onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1.5">Tên nguyên liệu</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="VD: Trà Tắc, Đường, Sữa đặc..." autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1.5">Đơn vị</label>
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                  {['kg', 'g', 'lít', 'ml', 'gói', 'hộp', 'lon', 'chai', 'cái', 'thùng'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1.5">Mức báo hết</label>
                <input type="number" value={form.min_quantity} onChange={e => setForm(f => ({ ...f, min_quantity: e.target.value }))}
                  className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="0" min="0" />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1.5">Giá / đơn vị <span className="text-gray-400 font-normal">(dùng tính cost)</span></label>
              <div className="flex gap-2">
                <input type="number" value={form.price_per_unit} onChange={e => setForm(f => ({ ...f, price_per_unit: e.target.value }))}
                  className="flex-1 text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="VD: 55000" min="0" />
                <span className="flex items-center text-sm text-gray-400 shrink-0">đ/{form.unit || 'đơn vị'}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1.5">Ghi chú giá <span className="text-gray-400 font-normal">(tuỳ chọn)</span></label>
              <input type="text" value={form.price_note} onChange={e => setForm(f => ({ ...f, price_note: e.target.value }))}
                className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="VD: 49k/900g, mua ở chợ đầu mối" />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowAdd(false)} className="flex-1 btn-secondary">Hủy</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold py-2.5 rounded-xl transition-colors">
                {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selected.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Hiện có: <strong className="text-gray-700">{selected.quantity.toLocaleString('vi-VN')} {selected.unit}</strong>
                  {' · '}Mức báo hết: {selected.min_quantity} {selected.unit}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Transaction form */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <p className="text-sm font-bold text-gray-700">Cập nhật tồn kho</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['in', 'out', 'adjust'] as const).map(t => (
                    <button key={t} onClick={() => setLogForm(f => ({ ...f, type: t }))}
                      className={`py-2 rounded-xl text-xs font-bold transition-colors border ${
                        logForm.type === t
                          ? t === 'in' ? 'bg-green-500 text-white border-green-500'
                            : t === 'out' ? 'bg-red-500 text-white border-red-500'
                            : 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}>
                      {t === 'in' ? '+ Nhập kho' : t === 'out' ? '− Xuất kho' : '✎ Điều chỉnh'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="number" value={logForm.quantity} onChange={e => setLogForm(f => ({ ...f, quantity: e.target.value }))}
                    className="flex-1 text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder={`Số lượng (${selected.unit})`} min="0" />
                  <input value={logForm.note} onChange={e => setLogForm(f => ({ ...f, note: e.target.value }))}
                    className="flex-1 text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="Ghi chú (tuỳ chọn)" />
                </div>
                <button onClick={handleLog} disabled={logSaving || !logForm.quantity || Number(logForm.quantity) <= 0}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
                  {logSaving ? 'Đang lưu...' : 'Xác nhận'}
                </button>
              </div>

              {/* Log history */}
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <History size={15} /> Lịch sử
                </p>
                {logsLoading ? (
                  <p className="text-xs text-gray-400 text-center py-4">Đang tải...</p>
                ) : logs.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Chưa có giao dịch nào</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map(log => (
                      <div key={log.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          {log.type === 'in'
                            ? <ArrowDownToLine size={16} className="text-green-500 shrink-0" />
                            : log.type === 'out'
                            ? <ArrowUpFromLine size={16} className="text-red-500 shrink-0" />
                            : <Pencil size={16} className="text-blue-500 shrink-0" />
                          }
                          <div>
                            <p className="text-sm font-semibold text-gray-700">
                              {log.type === 'in' ? 'Nhập kho' : log.type === 'out' ? 'Xuất kho' : 'Điều chỉnh'}
                              {log.note && <span className="text-gray-400 font-normal"> · {log.note}</span>}
                            </p>
                            <p className="text-xs text-gray-400">{log.created_at_vn}{log.user_name ? ` · ${log.user_name}` : ''}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-black ${log.type === 'in' ? 'text-green-600' : log.type === 'out' ? 'text-red-600' : 'text-blue-600'}`}>
                          {log.type === 'in' ? '+' : log.type === 'out' ? '−' : '='}{log.quantity} {selected.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {deleting && (
        <ConfirmDelete name={deleting.name} onConfirm={() => handleDelete(deleting)} onCancel={() => setDeleting(null)} />
      )}
      </>}
    </div>
  )
}

// ─── Stores Tab (chủ hệ thống) ───────────────────────────
interface StoreRow {
  id: number; name: string; email: string; created_at: string
  plan: string; daily_limit: number; orders_used_today: number
  expires_at: string | null; total_orders: number
}

function StoresTab() {
  const [stores, setStores] = useState<StoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [freeLimitInput, setFreeLimitInput] = useState('10')
  const [configSaving, setConfigSaving] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [configError, setConfigError] = useState('')

  useEffect(() => {
    fetch('/api/owner/stores')
      .then(r => { if (r.status === 403) { setForbidden(true); return null } return r.json() })
      .then(d => { if (d) setStores(d.stores || []) })
      .finally(() => setLoading(false))
    fetch('/api/owner/config')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setFreeLimitInput(String(d.free_daily_limit)) })
  }, [])

  async function handleSaveConfig() {
    const val = Number(freeLimitInput)
    if (!Number.isInteger(val) || val < 1 || val > 9999) {
      setConfigError('Nhập số nguyên từ 1 đến 9999')
      return
    }
    setConfigSaving(true)
    setConfigError('')
    try {
      const res = await fetch('/api/owner/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ free_daily_limit: val }),
      })
      const d = await res.json()
      if (!res.ok) { setConfigError(d.error || 'Lỗi lưu'); return }
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 2000)
    } finally {
      setConfigSaving(false)
    }
  }

  if (forbidden) return (
    <div className="text-center py-16 text-gray-400 text-sm">Chỉ dành cho chủ hệ thống</div>
  )
  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">Đang tải...</div>

  const paid = stores.filter(s => s.plan === 'paid').length
  const free = stores.filter(s => s.plan === 'free').length

  return (
    <div className="space-y-6">
      {/* Cấu hình hệ thống */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-800 mb-4">Cấu hình gói miễn phí</h3>
        <div className="flex items-end gap-3 max-w-sm">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Số đơn miễn phí mỗi ngày</label>
            <input
              type="number"
              value={freeLimitInput}
              onChange={e => setFreeLimitInput(e.target.value)}
              className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
              min="1" max="9999" placeholder="10"
            />
          </div>
          <span className="text-sm text-gray-500 pb-2.5 shrink-0">đơn/ngày</span>
          <button
            onClick={handleSaveConfig}
            disabled={configSaving}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm shrink-0 pb-2.5">
            {configSaved ? '✓ Đã lưu' : configSaving ? '...' : 'Lưu'}
          </button>
        </div>
        {configError && <p className="text-red-500 text-xs mt-2">{configError}</p>}
        <p className="text-xs text-gray-400 mt-2">Áp dụng cho cửa hàng mới đăng ký và khi gói trả phí hết hạn.</p>
      </div>

      {/* Tổng quan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tổng cửa hàng', value: stores.length, color: 'text-gray-800' },
          { label: 'Trả phí', value: paid, color: 'text-green-600' },
          { label: 'Miễn phí', value: free, color: 'text-orange-500' },
          { label: 'Tổng đơn hàng', value: stores.reduce((a, s) => a + Number(s.total_orders), 0), color: 'text-blue-600' },
        ].map(stat => (
          <div key={stat.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value.toLocaleString('vi-VN')}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Bảng danh sách */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Cửa hàng</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Gói</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Đơn hôm nay</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Tổng đơn</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Hết hạn</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Ngày tạo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stores.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400 font-mono">#{s.id}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                <td className="px-4 py-3 text-gray-500">{s.email || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    s.plan === 'owner' ? 'bg-orange-100 text-orange-700' :
                    s.plan === 'paid'  ? 'bg-green-100 text-green-700' :
                                         'bg-gray-100 text-gray-500'
                  }`}>
                    {s.plan === 'owner' ? 'Owner' : s.plan === 'paid' ? 'Trả phí' : 'Miễn phí'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {s.orders_used_today} / {s.daily_limit}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">
                  {Number(s.total_orders).toLocaleString('vi-VN')}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {s.expires_at ? new Date(s.expires_at).toLocaleDateString('vi-VN') : '—'}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(s.created_at).toLocaleDateString('vi-VN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {stores.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">Chưa có cửa hàng nào</div>
        )}
      </div>
    </div>
  )
}

// ─── Cost Tab ─────────────────────────────────────────────
interface CostProduct {
  id: number; name: string; price: number
  category_name: string; category_slug: string
  cost_per_cup: number; ingredient_count: number
}
interface CostCategory { id: number; name: string; slug: string }
interface CostIngredient {
  material_id: number; quantity_per_cup: number
  material_name: string; unit: string
  price_per_unit: number; price_note: string; ingredient_cost: number
}
interface EditingPrice { material_id: number; value: string; note: string }

function fmtCost(n: number) { return n.toLocaleString('vi-VN') + 'đ' }

function MarginBadge({ price, cost }: { price: number; cost: number }) {
  const pct = price > 0 ? Math.round(((price - cost) / price) * 100) : 0
  const color = cost === 0 ? 'bg-gray-100 text-gray-400' : pct >= 60 ? 'bg-green-100 text-green-700' : pct >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{cost === 0 ? 'Chưa có giá' : `${pct}% lãi`}</span>
}

function CostProductCard({ product, onClick }: { product: CostProduct; onClick: () => void }) {
  const margin = product.price - product.cost_per_cup
  return (
    <button onClick={onClick} className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left hover:shadow-md hover:border-orange-200 transition-all group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{product.name}</p>
          <div className="mt-1"><MarginBadge price={product.price} cost={product.cost_per_cup} /></div>
        </div>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-400 shrink-0 mt-1 transition-colors" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="bg-orange-50 rounded-xl py-2">
          <p className="text-[10px] text-orange-400 font-medium uppercase tracking-wide">Giá bán</p>
          <p className="text-sm font-bold text-orange-700">{fmtCost(product.price)}</p>
        </div>
        <div className="bg-red-50 rounded-xl py-2">
          <p className="text-[10px] text-red-400 font-medium uppercase tracking-wide">Cost</p>
          <p className="text-sm font-bold text-red-600">{product.cost_per_cup > 0 ? fmtCost(Math.round(product.cost_per_cup)) : '—'}</p>
        </div>
        <div className="bg-green-50 rounded-xl py-2">
          <p className="text-[10px] text-green-500 font-medium uppercase tracking-wide">Lãi/ly</p>
          <p className="text-sm font-bold text-green-700">{product.cost_per_cup > 0 ? fmtCost(Math.round(margin)) : '—'}</p>
        </div>
      </div>
      {product.ingredient_count === 0 && <p className="mt-2 text-xs text-gray-400 text-center">Chưa có công thức</p>}
    </button>
  )
}

function CostDetailModal({ product, onClose, onUpdate }: { product: CostProduct; onClose: () => void; onUpdate: () => void }) {
  const [ingredients, setIngredients] = useState<CostIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditingPrice | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/cost/detail/${product.id}`)
    const d = await r.json()
    setIngredients(d.ingredients || [])
    setLoading(false)
  }, [product.id])

  useEffect(() => { load() }, [load])

  const totalCost = ingredients.reduce((s, i) => s + i.ingredient_cost, 0)
  const margin = product.price - totalCost

  async function savePrice() {
    if (!editing) return
    setSaving(true)
    await fetch(`/api/cost/materials/${editing.material_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price_per_unit: Number(editing.value) || 0, price_note: editing.note }),
    })
    setSaving(false)
    setEditing(null)
    await load()
    onUpdate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800 text-base">{product.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Chi tiết nguyên liệu & chi phí</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50">
          <div className="py-3 px-4 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Giá bán</p>
            <p className="text-base font-bold text-orange-600">{fmtCost(product.price)}</p>
          </div>
          <div className="py-3 px-4 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Cost</p>
            <p className="text-base font-bold text-red-500">{fmtCost(Math.round(totalCost))}</p>
          </div>
          <div className="py-3 px-4 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Lãi/ly</p>
            <p className={`text-base font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtCost(Math.round(margin))}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-sm">Đang tải...</div>
          ) : ingredients.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">Chưa có công thức nguyên liệu</div>
          ) : ingredients.map(ing => {
            const isEditing = editing?.material_id === ing.material_id
            return (
              <div key={ing.material_id} className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">
                      {ing.material_name}
                      <span className="text-gray-400 font-normal ml-1 text-xs">({ing.quantity_per_cup}{ing.unit})</span>
                    </p>
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 shrink-0">Giá/đơn vị:</span>
                          <input type="number" value={editing.value} onChange={e => setEditing({ ...editing, value: e.target.value })}
                            className="flex-1 border border-orange-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400" placeholder="VD: 55000" autoFocus />
                          <span className="text-xs text-gray-400">đ/{ing.unit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 shrink-0">Ghi chú:</span>
                          <input type="text" value={editing.note} onChange={e => setEditing({ ...editing, note: e.target.value })}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400" placeholder="VD: 49k/900g" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={savePrice} disabled={saving}
                            className="flex items-center gap-1 bg-orange-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-orange-600 disabled:opacity-50">
                            <Check size={12} />{saving ? 'Lưu...' : 'Lưu'}
                          </button>
                          <button onClick={() => setEditing(null)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100">Hủy</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {ing.price_per_unit > 0
                          ? <span className="text-xs text-gray-500">{fmtCost(ing.price_per_unit)}/{ing.unit}</span>
                          : <span className="text-xs text-gray-400 italic">Chưa có giá</span>}
                        {ing.price_note && <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">{ing.price_note}</span>}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className={`text-sm font-bold ${ing.ingredient_cost > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                      {ing.ingredient_cost > 0 ? fmtCost(Math.round(ing.ingredient_cost)) : '—'}
                    </p>
                    {!isEditing && (
                      <button onClick={() => setEditing({ material_id: ing.material_id, value: ing.price_per_unit > 0 ? String(ing.price_per_unit) : '', note: ing.price_note })}
                        className="text-gray-300 hover:text-orange-400 transition-colors"><Pencil size={13} /></button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {ingredients.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-between">
            <span className="text-sm text-gray-500 font-medium">Tổng cost/ly</span>
            <span className="text-lg font-bold text-red-500">{fmtCost(Math.round(totalCost))}</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface SeedResult { recipe: string; product_name?: string; status: string; linked?: number }

function CostTab() {
  const [products, setProducts] = useState<CostProduct[]>([])
  const [categories, setCategories] = useState<CostCategory[]>([])
  const [activeTab, setActiveTab] = useState<string>('')
  const [selected, setSelected] = useState<CostProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<SeedResult[] | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/cost')
    const d = await r.json()
    const cats: CostCategory[] = d.categories || []
    const prods: CostProduct[] = d.products || []
    setCategories(cats)
    setProducts(prods)
    if (cats.length > 0 && !activeTab) setActiveTab(cats[0].slug)
    setLoading(false)
  }, [activeTab])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSeed() {
    setSeeding(true)
    setSeedResult(null)
    const r = await fetch('/api/cost/seed', { method: 'POST' })
    const d = await r.json()
    if (d.success) { setSeedResult(d.recipe_results || []); await load() }
    else alert('Lỗi: ' + d.error)
    setSeeding(false)
  }

  async function handleUpdate() {
    const r = await fetch('/api/cost')
    const d = await r.json()
    setProducts(d.products || [])
    if (selected) {
      const updated = (d.products || []).find((p: CostProduct) => p.id === selected.id)
      if (updated) setSelected(updated)
    }
  }

  const tabProducts = products.filter(p => p.category_slug === activeTab)

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <p className="text-sm text-gray-500">Giá vốn & lợi nhuận theo sản phẩm</p>
        <button onClick={handleSeed} disabled={seeding}
          className="shrink-0 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
          <Download size={14} />{seeding ? 'Đang nhập...' : 'Nhập dữ liệu'}
        </button>
      </div>

      {seedResult && (
        <div className="mb-5 bg-white border border-gray-200 rounded-2xl p-4 text-xs space-y-1.5">
          <p className="font-bold text-gray-700 mb-2">Kết quả nhập dữ liệu:</p>
          {seedResult.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              {r.status === 'ok' ? (
                <><span className="text-green-500 font-bold">✓</span><span className="text-gray-700">{r.recipe}</span><span className="text-gray-400">→ <strong>{r.product_name}</strong> ({r.linked} nguyên liệu)</span></>
              ) : (
                <><span className="text-amber-500 font-bold">!</span><span className="text-gray-500">{r.recipe}</span><span className="text-amber-600">— Không tìm thấy, cần gắn thủ công trong tab Tồn Kho → Công thức SP</span></>
              )}
            </div>
          ))}
          <button onClick={() => setSeedResult(null)} className="mt-2 text-gray-400 hover:text-gray-600 text-xs underline">Đóng</button>
        </div>
      )}

      {loading ? (
        <div className="flex gap-2 mb-6">{[1, 2, 3].map(i => <div key={i} className="h-9 w-24 bg-gray-200 rounded-full animate-pulse" />)}</div>
      ) : (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button key={cat.slug} onClick={() => setActiveTab(cat.slug)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === cat.slug ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-orange-300 hover:text-orange-600'
              }`}>{cat.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-36 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
      ) : tabProducts.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-3">🍵</p><p>Không có sản phẩm nào</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tabProducts.map(p => <CostProductCard key={p.id} product={p} onClick={() => setSelected(p)} />)}
        </div>
      )}

      {selected && <CostDetailModal product={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}
    </div>
  )
}


// ─── Billing Tab ───────────────────────────────────────────
interface QuotaInfo {
  plan: string; daily_limit: number; orders_used_today: number
  orders_remaining: number; reset_date: string
  expires_at: string | null; payments: BillingPayment[]
}
interface BillingPayment {
  id: number; amount: number; package_type: string; package_days: number
  new_daily_limit: number; status: string; created_at: string; expires_at: string | null
}
interface PaymentInfo {
  payment_id: number; transfer_code: string; amount: number
  bank_code: string; account_number: string; account_name: string; qr_url: string
}

const PACKAGES = [
  { key: 'daily_100',   label: 'Gói Ngày',   price: 29000,  daily_limit: 100, days: 1,  description: '100 đơn/ngày · 1 ngày',   highlight: false },
  { key: 'monthly_200', label: 'Cơ Bản',      price: 199000, daily_limit: 200, days: 30, description: '200 đơn/ngày · 30 ngày',  highlight: true  },
  { key: 'monthly_500', label: 'Tiêu Chuẩn',  price: 399000, daily_limit: 500, days: 30, description: '500 đơn/ngày · 30 ngày',  highlight: false },
]

function fmtMoney(n: number) { return new Intl.NumberFormat('vi-VN').format(n) + 'đ' }
function fmtDate(s: string) { return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button onClick={copy} className="ml-2 text-orange-500 hover:text-orange-700 transition-colors">
      {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
    </button>
  )
}

function PaymentModal({ info, onClose, onSuccess }: { info: PaymentInfo; onClose: () => void; onSuccess: () => void }) {
  const [confirmed, setConfirmed] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const attemptsRef = useRef(0)
  const MAX_ATTEMPTS = 120

  const checkPayment = useCallback(async () => {
    attemptsRef.current++
    if (attemptsRef.current > MAX_ATTEMPTS) { if (pollRef.current) clearInterval(pollRef.current); return }
    try {
      const res = await fetch('/api/quota')
      const data = await res.json()
      const found = data.payments?.find((p: BillingPayment) => p.id === info.payment_id && p.status === 'completed')
      if (found) { if (pollRef.current) clearInterval(pollRef.current); setConfirmed(true); setTimeout(onSuccess, 1500) }
    } catch { /* ignore */ }
  }, [info.payment_id, onSuccess])

  useEffect(() => {
    pollRef.current = setInterval(checkPayment, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [checkPayment])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Thanh toán chuyển khoản</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          {confirmed ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle size={48} className="text-green-500" />
              <p className="font-semibold text-green-700 text-lg">Thanh toán thành công!</p>
              <p className="text-sm text-gray-500">Gói đã được kích hoạt tự động.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={info.qr_url} alt="QR thanh toán" className="w-48 h-48 rounded-xl border border-gray-200" />
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ngân hàng</span>
                  <span className="font-semibold text-gray-800">{info.bank_code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Số tài khoản</span>
                  <span className="font-semibold text-gray-800 flex items-center">{info.account_number}<CopyButton text={info.account_number} /></span>
                </div>
                {info.account_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Chủ tài khoản</span>
                    <span className="font-semibold text-gray-800">{info.account_name}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Số tiền</span>
                  <span className="font-bold text-orange-600 flex items-center">{fmtMoney(info.amount)}<CopyButton text={String(info.amount)} /></span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                  <span className="text-gray-500">Nội dung CK</span>
                  <span className="font-bold text-orange-600 tracking-wide flex items-center">{info.transfer_code}<CopyButton text={info.transfer_code} /></span>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                Nhập <strong>đúng nội dung chuyển khoản</strong> để hệ thống tự động kích hoạt gói.
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 pt-1">
                <Loader2 size={16} className="animate-spin text-orange-400" />
                Đang chờ xác nhận thanh toán...
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function BillingTab() {
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [buyingKey, setBuyingKey] = useState<string | null>(null)
  const [buyError, setBuyError] = useState('')
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)

  const fetchQuota = useCallback(() => {
    fetch('/api/quota').then(r => r.json()).then(d => setQuota(d)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchQuota() }, [fetchQuota])

  async function handleBuy(packageKey: string) {
    setBuyingKey(packageKey); setBuyError('')
    try {
      const res = await fetch('/api/payments/sepay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_key: packageKey }),
      })
      const data = await res.json()
      if (!res.ok) { setBuyError(data.error || 'Không thể tạo thanh toán'); return }
      setPaymentInfo(data)
    } catch { setBuyError('Lỗi kết nối, vui lòng thử lại') }
    finally { setBuyingKey(null) }
  }

  function handlePaymentSuccess() { setPaymentInfo(null); setLoading(true); fetchQuota() }

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full" /></div>
  if (!quota) return null

  const usedPct = Math.min(100, Math.round((quota.orders_used_today / quota.daily_limit) * 100))
  const isOwner = quota.plan === 'owner'

  return (
    <>
      {paymentInfo && <PaymentModal info={paymentInfo} onClose={() => setPaymentInfo(null)} onSuccess={handlePaymentSuccess} />}

      <div className="space-y-6 max-w-3xl">
        {/* Trạng thái hiện tại */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Gói hiện tại</p>
              <p className="text-xl font-bold text-orange-600">
                {isOwner ? 'Chủ hệ thống (Không giới hạn)' : quota.plan === 'free' ? 'Miễn phí' : 'Trả phí'}
              </p>
            </div>
            {quota.expires_at && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Hết hạn</p>
                <p className="text-sm font-semibold text-gray-700">{fmtDate(quota.expires_at)}</p>
              </div>
            )}
          </div>
          {!isOwner && (
            <>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Đơn hôm nay</span>
                  <span className="font-semibold">{quota.orders_used_today} / {quota.daily_limit}<span className="text-gray-400 font-normal ml-1">(còn {quota.orders_remaining})</span></span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full transition-all ${usedPct >= 90 ? 'bg-red-500' : usedPct >= 70 ? 'bg-orange-400' : 'bg-green-500'}`} style={{ width: `${usedPct}%` }} />
                </div>
              </div>
              {quota.orders_remaining === 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  <AlertCircle size={16} />Đã hết hạn mức hôm nay. Nâng cấp để tạo thêm đơn.
                </div>
              )}
            </>
          )}
        </div>

        {/* Gói nâng cấp */}
        {!isOwner && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2"><Zap size={18} className="text-orange-500" /> Nâng cấp gói</h2>
            {buyError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                <AlertCircle size={16} />{buyError}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              {PACKAGES.map(pkg => {
                const isBuying = buyingKey === pkg.key
                return (
                  <div key={pkg.key} className={`card p-4 flex flex-col gap-3 relative ${pkg.highlight ? 'ring-2 ring-orange-400' : ''}`}>
                    {pkg.highlight && <span className="absolute -top-2.5 left-4 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Phổ biến</span>}
                    <div>
                      <p className="font-bold text-gray-800">{pkg.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{pkg.description}</p>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{fmtMoney(pkg.price)}</p>
                    <button onClick={() => handleBuy(pkg.key)} disabled={!!buyingKey}
                      className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${
                        pkg.highlight ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'border border-orange-400 text-orange-600 hover:bg-orange-50'
                      }`}>
                      {isBuying ? <><Loader2 size={14} className="animate-spin" /> Đang xử lý...</> : 'Mua ngay'}
                    </button>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 text-center">Chuyển khoản ngân hàng · Kích hoạt tự động sau khi thanh toán thành công</p>
          </div>
        )}

        {/* Lịch sử thanh toán */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2"><CreditCard size={18} className="text-gray-500" /> Lịch sử thanh toán</h2>
          {quota.payments.length === 0 ? (
            <div className="card p-6 text-center text-gray-400 text-sm">Chưa có giao dịch nào</div>
          ) : (
            <div className="card divide-y divide-gray-50">
              {quota.payments.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.status === 'completed' ? <CheckCircle size={18} className="text-green-500 shrink-0" />
                      : p.status === 'pending' ? <Clock size={18} className="text-orange-400 shrink-0" />
                      : <AlertCircle size={18} className="text-red-400 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {p.package_type === 'daily' ? `Gói ngày · ${p.package_days} ngày` : `Gói tháng · ${p.package_days} ngày`}{' · '}{p.new_daily_limit} đơn/ngày
                      </p>
                      <p className="text-xs text-gray-400">{fmtDate(p.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{fmtMoney(p.amount)}</p>
                    <p className={`text-xs ${p.status === 'completed' ? 'text-green-600' : p.status === 'pending' ? 'text-orange-500' : 'text-red-500'}`}>
                      {p.status === 'completed' ? 'Thành công' : p.status === 'pending' ? 'Đang xử lý' : 'Thất bại'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}


// ─── Main Page ────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'products', label: 'Sản Phẩm', icon: Package },
  { id: 'categories', label: 'Danh Mục', icon: Layers },
  { id: 'users', label: 'Nhân Viên', icon: Users },
  { id: 'discounts', label: 'Khuyến Mãi', icon: Tag },
  { id: 'qr', label: 'QR Bàn', icon: QrCode },
  { id: 'settings', label: 'Cài Đặt', icon: ToggleRight },
  { id: 'recipes', label: 'Công Thức', icon: ChefHat },
  { id: 'inventory', label: 'Tồn Kho', icon: Boxes },
  { id: 'stores', label: 'Cửa Hàng', icon: Store },
  { id: 'cost', label: 'Chi Phí', icon: TrendingDown },
  { id: 'billing', label: 'Gói Dùng', icon: CreditCard },
]

export default function QuanLyPage() {
  const [tab, setTab] = useState<Tab>('products')
  const [categories, setCategories] = useState<Category[]>([])

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/categories')
    const d = await res.json()
    setCategories(d.categories || [])
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Quản Lý Hệ Thống</h1>
      </div>

      {/* Tabs — scrollable on mobile, horizontal bar on desktop */}
      <div className="flex gap-0.5 mb-5 md:mb-6 border-b border-gray-200 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 md:px-5 pt-2 pb-2.5 md:py-3 font-medium text-[10px] md:text-sm transition-all border-b-2 -mb-px min-w-[52px] md:min-w-0 ${
              tab === id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={17} />
            <span className="leading-tight text-center whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'products' && <ProductsTab categories={categories} />}
      {tab === 'categories' && <CategoriesTab onCategoriesChange={fetchCategories} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'discounts' && <DiscountsTab />}
      {tab === 'qr' && <QrTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'recipes' && <RecipesTab />}
      {tab === 'inventory' && <InventoryTab />}
      {tab === 'stores' && <StoresTab />}
      {tab === 'cost' && <CostTab />}
      {tab === 'billing' && <BillingTab />}
    </div>
  )
}
