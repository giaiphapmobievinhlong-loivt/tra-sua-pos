'use client'
import { useEffect, useState, useCallback } from 'react'
import { X, Pencil, Check, ChevronRight, Download } from 'lucide-react'

interface Product {
  id: number
  name: string
  price: number
  category_name: string
  category_slug: string
  cost_per_cup: number
  ingredient_count: number
}

interface Category {
  id: number
  name: string
  slug: string
}

interface Ingredient {
  material_id: number
  quantity_per_cup: number
  material_name: string
  unit: string
  price_per_unit: number
  price_note: string
  ingredient_cost: number
}

function fmt(n: number) {
  return n.toLocaleString('vi-VN') + 'đ'
}

function marginPct(price: number, cost: number) {
  if (price <= 0) return 0
  return Math.round(((price - cost) / price) * 100)
}

function MarginBadge({ price, cost }: { price: number; cost: number }) {
  const pct = marginPct(price, cost)
  const color =
    cost === 0
      ? 'bg-gray-100 text-gray-400'
      : pct >= 60
      ? 'bg-green-100 text-green-700'
      : pct >= 40
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {cost === 0 ? 'Chưa có giá' : `${pct}% lãi`}
    </span>
  )
}

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const margin = product.price - product.cost_per_cup
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left hover:shadow-md hover:border-orange-200 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{product.name}</p>
          <div className="mt-1">
            <MarginBadge price={product.price} cost={product.cost_per_cup} />
          </div>
        </div>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-400 shrink-0 mt-1 transition-colors" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="bg-orange-50 rounded-xl py-2">
          <p className="text-[10px] text-orange-400 font-medium uppercase tracking-wide">Giá bán</p>
          <p className="text-sm font-bold text-orange-700">{fmt(product.price)}</p>
        </div>
        <div className="bg-red-50 rounded-xl py-2">
          <p className="text-[10px] text-red-400 font-medium uppercase tracking-wide">Cost</p>
          <p className="text-sm font-bold text-red-600">
            {product.cost_per_cup > 0 ? fmt(Math.round(product.cost_per_cup)) : '—'}
          </p>
        </div>
        <div className="bg-green-50 rounded-xl py-2">
          <p className="text-[10px] text-green-500 font-medium uppercase tracking-wide">Lãi/ly</p>
          <p className="text-sm font-bold text-green-700">
            {product.cost_per_cup > 0 ? fmt(Math.round(margin)) : '—'}
          </p>
        </div>
      </div>

      {product.ingredient_count === 0 && (
        <p className="mt-2 text-xs text-gray-400 text-center">Chưa có công thức</p>
      )}
    </button>
  )
}

interface EditingPrice {
  material_id: number
  value: string
  note: string
}

function DetailModal({
  product,
  onClose,
  onUpdate,
}: {
  product: Product
  onClose: () => void
  onUpdate: () => void
}) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
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
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800 text-base">{product.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Chi tiết nguyên liệu & chi phí</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
            <X size={20} />
          </button>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50">
          <div className="py-3 px-4 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Giá bán</p>
            <p className="text-base font-bold text-orange-600">{fmt(product.price)}</p>
          </div>
          <div className="py-3 px-4 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Cost</p>
            <p className="text-base font-bold text-red-500">{fmt(Math.round(totalCost))}</p>
          </div>
          <div className="py-3 px-4 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Lãi/ly</p>
            <p className={`text-base font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmt(Math.round(margin))}
            </p>
          </div>
        </div>

        {/* Ingredient list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-sm">Đang tải...</div>
          ) : ingredients.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">Chưa có công thức nguyên liệu</div>
          ) : (
            ingredients.map((ing) => {
              const isEditing = editing?.material_id === ing.material_id
              return (
                <div key={ing.material_id} className="bg-gray-50 rounded-2xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm">
                        {ing.material_name}
                        <span className="text-gray-400 font-normal ml-1 text-xs">
                          ({ing.quantity_per_cup}{ing.unit})
                        </span>
                      </p>
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 shrink-0">Giá/đơn vị:</span>
                            <input
                              type="number"
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                              className="flex-1 border border-orange-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                              placeholder="VD: 55000"
                              autoFocus
                            />
                            <span className="text-xs text-gray-400">đ/{ing.unit}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 shrink-0">Ghi chú:</span>
                            <input
                              type="text"
                              value={editing.note}
                              onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                              className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                              placeholder="VD: 49k/900g"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={savePrice}
                              disabled={saving}
                              className="flex items-center gap-1 bg-orange-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-orange-600 disabled:opacity-50"
                            >
                              <Check size={12} />
                              {saving ? 'Lưu...' : 'Lưu'}
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          {ing.price_per_unit > 0 ? (
                            <span className="text-xs text-gray-500">
                              {fmt(ing.price_per_unit)}/{ing.unit}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Chưa có giá</span>
                          )}
                          {ing.price_note && (
                            <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                              {ing.price_note}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <p className={`text-sm font-bold ${ing.ingredient_cost > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                        {ing.ingredient_cost > 0 ? fmt(Math.round(ing.ingredient_cost)) : '—'}
                      </p>
                      {!isEditing && (
                        <button
                          onClick={() =>
                            setEditing({
                              material_id: ing.material_id,
                              value: ing.price_per_unit > 0 ? String(ing.price_per_unit) : '',
                              note: ing.price_note,
                            })
                          }
                          className="text-gray-300 hover:text-orange-400 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer total */}
        {ingredients.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-between">
            <span className="text-sm text-gray-500 font-medium">Tổng cost/ly</span>
            <span className="text-lg font-bold text-red-500">{fmt(Math.round(totalCost))}</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface SeedResult {
  recipe: string
  product_name?: string
  status: string
  linked?: number
}

export default function ChiPhiPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeTab, setActiveTab] = useState<string>('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<SeedResult[] | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/cost')
    const d = await r.json()
    const cats: Category[] = d.categories || []
    const prods: Product[] = d.products || []
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
    if (d.success) {
      setSeedResult(d.recipe_results || [])
      await load()
    } else {
      alert('Lỗi: ' + d.error)
    }
    setSeeding(false)
  }

  async function handleUpdate() {
    const r = await fetch('/api/cost')
    const d = await r.json()
    setProducts(d.products || [])
    if (selected) {
      const updated = (d.products || []).find((p: Product) => p.id === selected.id)
      if (updated) setSelected(updated)
    }
  }

  const tabProducts = products.filter(p => p.category_slug === activeTab)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 md:pb-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Chi Phí</h1>
            <p className="text-sm text-gray-400 mt-0.5">Giá vốn & lợi nhuận theo sản phẩm</p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="shrink-0 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <Download size={14} />
            {seeding ? 'Đang nhập...' : 'Nhập dữ liệu'}
          </button>
        </div>

        {/* Seed result report */}
        {seedResult && (
          <div className="mb-5 bg-white border border-gray-200 rounded-2xl p-4 text-xs space-y-1.5">
            <p className="font-bold text-gray-700 mb-2">Kết quả nhập dữ liệu:</p>
            {seedResult.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                {r.status === 'ok' ? (
                  <>
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-gray-700">{r.recipe}</span>
                    <span className="text-gray-400">→ <strong>{r.product_name}</strong> ({r.linked} nguyên liệu)</span>
                  </>
                ) : (
                  <>
                    <span className="text-amber-500 font-bold">!</span>
                    <span className="text-gray-500">{r.recipe}</span>
                    <span className="text-amber-600">— Không tìm thấy sản phẩm, cần gắn thủ công trong Quản Lý → Công thức SP</span>
                  </>
                )}
              </div>
            ))}
            <button onClick={() => setSeedResult(null)} className="mt-2 text-gray-400 hover:text-gray-600 text-xs underline">Đóng</button>
          </div>
        )}

        {/* Category tabs */}
        {loading ? (
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-9 w-24 bg-gray-200 rounded-full animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat.slug}
                onClick={() => setActiveTab(cat.slug)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeTab === cat.slug
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-orange-300 hover:text-orange-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-36 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : tabProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🍵</p>
            <p>Không có sản phẩm nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tabProducts.map(p => (
              <ProductCard key={p.id} product={p} onClick={() => setSelected(p)} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <DetailModal
          product={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}
