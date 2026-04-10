'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Package, Layers, Users, X, Eye, EyeOff, Tag, Percent, DollarSign, ToggleLeft, ToggleRight, QrCode, Printer, ExternalLink, ChefHat } from 'lucide-react'

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

type Tab = 'products' | 'categories' | 'users' | 'discounts' | 'qr' | 'settings' | 'recipes'

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
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  function getOrderUrl(table: string) {
    return `${baseUrl}/order?table=${table}`
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
  const [activeSection, setActiveSection] = useState<'nen' | 'ly'>('nen')
  const [activeRecipe, setActiveRecipe] = useState(0)

  const nenTra = [
    {
      title: 'Nền Trà Cốt Tắc',
      emoji: '🍋',
      color: 'bg-yellow-50 border-yellow-200',
      headerColor: 'bg-yellow-500',
      steps: [
        { step: 1, title: 'Chuẩn bị trà', items: ['35g Lục trà Lài', '5g Trà đen Novia', '1.2 lít nước nóng 80–85°C'] },
        { step: 2, title: 'Ủ trà', items: ['Tráng trà 5–10ml trước', 'Cho 1.2 lít nước nóng vào', 'Ủ 12–15 phút đến khi ra hết màu', 'Vớt trà ra'] },
        { step: 3, title: 'Thêm nguyên liệu', items: ['Đường: 150g', 'Thêm 2 súc đá → đạt 2 lít', 'Sốc lên để giữ vị trà'] },
        { step: 4, title: 'Bảo quản', items: ['Để tủ lạnh 4–6 tiếng', 'Đậy nắp kín'] },
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
        { step: 3, title: 'Thêm nguyên liệu (theo thứ tự)', items: ['① Bột kem béo: 200g', '② Sữa đặc Ngôi Sao PN: 320ml', '③ Đường đen:320g', '④ Rich lùn: 100ml (tăng độ béo ngậy)', '⑤ Sốc nhiệt 2 súc đá'] },
        { step: 4, title: 'Bảo quản', items: ['Ủ tủ lạnh 7–8 tiếng', 'Đậy nắp kín'] },
      ]
    },
  ]

  const congThucLy = [
    {
      title: 'Trà Tắc', price: '10K', size: '700ml', emoji: '🍋',
      color: 'border-yellow-300', headerBg: 'bg-yellow-400', tagBg: 'bg-yellow-100 text-yellow-700',
      note: 'Lắc đều, decor lát tắc',
      items: [
        { label: 'Ly', value: '700ml' },
        { label: 'Trà', value: '200ml' },
        { label: 'Tắc', value: '20ml (1 trái lớn hoặc 1.5 trái nhỏ)' },
        { label: 'Đường', value: '45ml' },
      ]
    },
    {
      title: 'Trà Tắc Xí Muội', price: '15K', size: '700ml', emoji: '🍊',
      color: 'border-orange-300', headerBg: 'bg-orange-400', tagBg: 'bg-orange-100 text-orange-700',
      note: 'Đổ hết nước và đá ra trước, xí muội trang trí ở trên',
      items: [
        { label: 'Trà', value: '180ml' },
        { label: 'Sốt tắc xí muội', value: '50g (1 muỗng đen)' },
        { label: 'Đường', value: '45ml' },
        { label: 'Tắc', value: 'Nửa hoặc 1 trái' },
        { label: 'Đá', value: 'Cho đá vào lắc đều' },
      ]
    },
    {
      title: 'Trà Me', price: '15K', size: '700ml', emoji: '🟤',
      color: 'border-brown-300', headerBg: 'bg-stone-500', tagBg: 'bg-stone-100 text-stone-700',
      note: 'Thêm đậu phộng',
      items: [
        { label: 'Trà', value: '150ml' },
        { label: 'Me', value: '2 muỗng me (màu đen)' },
        { label: 'Siro đường', value: '20–45ml' },
        { label: 'Tắc', value: '½ trái' },
        { label: 'Đá', value: 'Xốc đều' },
      ]
    },
    {
      title: 'Trà Dâu', price: '20K', size: '500ml / 700ml', emoji: '🍓',
      color: 'border-pink-300', headerBg: 'bg-pink-400', tagBg: 'bg-pink-100 text-pink-700',
      note: 'Decor thêm dâu ngâm',
      items: [
        { label: 'Trà (S/L)', value: '110ml / 150–170ml' },
        { label: 'Mứt dâu (S/L)', value: '25ml / 35ml' },
        { label: 'Đường (S/L)', value: '25ml / 25ml' },
        { label: 'Tắc', value: '1.5 trái hoặc 1 trái to' },
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
    {
      title: 'Matcha Latte', price: '28K/32K', size: '500ml / 700ml', emoji: '🍵',
      color: 'border-green-300', headerBg: 'bg-green-500', tagBg: 'bg-green-100 text-green-700',
      note: 'Đánh matcha thật nhuyễn rồi rưới lên ly đá',
      items: [
        { label: 'Sữa tươi (S/L)', value: '110ml / 170ml' },
        { label: 'Sữa đặc (S/L)', value: '30ml / 50ml' },
        { label: 'Máy đánh cafe', value: 'Mở mức mạnh nhất' },
        { label: 'Đá', value: 'Cho vào gần đầy ly' },
        { label: 'Bột matcha', value: '5g (1 muỗng gỗ)' },
        { label: 'Nước ấm', value: '~80°C, đánh thật nhuyễn' },
      ]
    },
  ]

  return (
    <div className="space-y-4">
      {/* Section toggle */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setActiveSection('nen')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${activeSection === 'nen' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>
          🫖 Nền Trà
        </button>
        <button onClick={() => setActiveSection('ly')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${activeSection === 'ly' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>
          🧋 Công Thức Từng Ly
        </button>
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

      {activeSection === 'ly' && (
        <div className="space-y-3">
          {/* Recipe selector */}
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

          {/* Recipe card */}
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
    </div>
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
      {tab === 'discounts' && <DiscountsTab />}
      {tab === 'qr' && <QrTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'recipes' && <RecipesTab />}
    </div>
  )
}
