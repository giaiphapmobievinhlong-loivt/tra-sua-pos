'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Package, Layers, Users, X, Check, Eye, EyeOff } from 'lucide-react'

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

type Tab = 'products' | 'categories' | 'users'

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
    await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' })
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
                    {new Date(u.created_at).toLocaleDateString('vi-VN')}
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

// ─── Main Page ────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'products', label: 'Sản Phẩm', icon: Package },
  { id: 'categories', label: 'Danh Mục', icon: Layers },
  { id: 'users', label: 'Nhân Viên', icon: Users },
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản Lý Hệ Thống</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 font-medium text-sm transition-all border-b-2 -mb-px ${
              tab === id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'products' && <ProductsTab categories={categories} />}
      {tab === 'categories' && <CategoriesTab onCategoriesChange={fetchCategories} />}
      {tab === 'users' && <UsersTab />}
    </div>
  )
}
