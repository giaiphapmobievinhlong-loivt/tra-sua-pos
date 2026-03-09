'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Product { id: number; name: string; price: number; category_name: string; image_url: string }
interface CartItem { product: Product; quantity: number; itemNote: string }

const TABLE_NUMBERS = ['1','2','3','4','5','6','7','8','9','10','11','12']
const QUICK_TAGS = ['Ít đá','Không đá','Ít ngọt','Không ngọt','Thêm trân châu','Thêm thạch']
const fmt = (n: number) => n.toLocaleString('vi-VN')

export default function OrderPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [tableNumber, setTableNumber] = useState('')
  const [takeaway, setTakeaway] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'menu'|'info'|'pay'>('menu')

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => {
      setProducts(d.products || [])
      const cats = (d.products || []).map((p: Product) => p.category_name).filter((c: string, i: number, a: string[]) => a.indexOf(c) === i)
      setCategories(cats)
    })
    // read ?table= from URL
    const params = new URLSearchParams(window.location.search)
    const t = params.get('table')
    if (t) setTableNumber(t)
  }, [])

  const total = cart.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  function addToCart(product: Product) {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id)
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1, itemNote: '' }]
    })
  }
  function updateQty(id: number, delta: number) {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0))
  }
  function updateItemNote(id: number, note: string) {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, itemNote: note } : i))
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'all' || p.category_name === activeCategory
    return matchSearch && matchCat
  })

  async function handlePlaceOrder() {
    setLoading(true)
    try {
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.price, item_note: i.itemNote })),
          total_amount: total,
          note, table_number: takeaway ? null : tableNumber || null,
          customer_name: customerName, customer_phone: customerPhone,
        })
      })
      const data = await res.json()
      if (data.success) {
        router.push(`/order/pay?code=${data.order_code}&total=${total}`)
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-orange-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧋</span>
            <span style={{ fontFamily: "'Baloo 2', cursive" }} className="text-lg font-bold text-orange-600">Trà Sữa Nhà Mèo</span>
          </div>
          {cartCount > 0 && (
            <button onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md active:scale-95 transition-transform">
              🛒 Giỏ hàng
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{cartCount}</span>
            </button>
          )}
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-400 to-amber-500 text-white py-8 px-4 text-center">
        <p style={{ fontFamily: "'Baloo 2', cursive" }} className="text-3xl font-extrabold mb-1">Đặt món ngay! 🐱</p>
        <p className="text-orange-100 text-sm">Chọn món yêu thích, nhận tại quầy hoặc mang về</p>
        {tableNumber && !takeaway && (
          <div className="inline-flex items-center gap-2 mt-3 bg-white/20 backdrop-blur px-4 py-1.5 rounded-full text-sm font-bold">
            🪑 Bàn {tableNumber}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Search */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm món..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-orange-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 shadow-sm" />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {['all', ...categories].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                activeCategory === cat
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}>
              {cat === 'all' ? '✨ Tất cả' : cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(product => {
            const inCart = cart.find(i => i.product.id === product.id)
            return (
              <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-orange-50 overflow-hidden active:scale-[0.98] transition-transform">
                <div className="relative h-32 bg-orange-50 flex items-center justify-center">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                    : <span className="text-5xl">🧋</span>}
                  {inCart && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow">
                      ×{inCart.quantity}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-bold text-gray-800 text-sm leading-tight mb-0.5">{product.name}</p>
                  <p className="text-orange-500 font-extrabold text-sm">{fmt(Number(product.price))}đ</p>
                  <button onClick={() => addToCart(product)}
                    className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-1.5 rounded-xl transition-all active:scale-95">
                    + Thêm
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">🔍</p>
            <p className="text-sm">Không tìm thấy món</p>
          </div>
        )}
      </div>

      {/* Sticky cart bar */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-2xl mx-auto">
          <button onClick={() => setCartOpen(true)}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-base shadow-2xl flex items-center justify-between px-5 active:scale-[0.98] transition-transform">
            <span>🛒 {cartCount} món</span>
            <span>{fmt(total)}đ →</span>
          </button>
        </div>
      )}

      {/* Cart sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
              <h2 style={{ fontFamily: "'Baloo 2', cursive" }} className="text-lg font-bold text-gray-800">Giỏ hàng</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-4">
              {/* Cart items */}
              {cart.map(({ product, quantity, itemNote }) => (
                <div key={product.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover" /> : <span className="text-xl">🧋</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800 truncate">{product.name}</p>
                      <p className="text-orange-500 text-xs font-bold">{fmt(Number(product.price) * quantity)}đ</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => updateQty(product.id, -1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 active:bg-gray-200">−</button>
                      <span className="w-5 text-center font-bold text-sm">{quantity}</span>
                      <button onClick={() => updateQty(product.id, 1)} className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold active:bg-orange-200">+</button>
                    </div>
                  </div>
                  {/* Quick tags */}
                  <div className="flex flex-wrap gap-1 pl-15">
                    {QUICK_TAGS.map(tag => {
                      const active = itemNote.includes(tag)
                      return (
                        <button key={tag} onClick={() => {
                          const tags = itemNote ? itemNote.split(', ').filter(Boolean) : []
                          updateItemNote(product.id, active ? tags.filter(t => t !== tag).join(', ') : [...tags, tag].join(', '))
                        }} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${active ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-500'}`}>
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Table / takeaway */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-700 mb-2">Hình thức nhận</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button onClick={() => setTakeaway(false)}
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${!takeaway ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
                    🪑 Tại quán
                  </button>
                  <button onClick={() => setTakeaway(true)}
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${takeaway ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
                    🛍 Mang về
                  </button>
                </div>
                {!takeaway && (
                  <div className="flex flex-wrap gap-1.5">
                    {TABLE_NUMBERS.map(n => (
                      <button key={n} onClick={() => setTableNumber(tableNumber === n ? '' : n)}
                        className={`w-10 h-10 rounded-full text-sm font-bold border-2 transition-all ${tableNumber === n ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer info */}
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-700">Thông tin</p>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                  placeholder="Tên của bạn (không bắt buộc)"
                  className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Số điện thoại (không bắt buộc)"
                  className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú thêm..."
                  rows={2}
                  className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
              </div>

              {/* Total */}
              <div className="bg-orange-50 rounded-2xl px-4 py-3 flex justify-between items-center">
                <span className="font-bold text-gray-800">Tổng cộng</span>
                <span className="text-xl font-extrabold text-orange-500">{fmt(total)}đ</span>
              </div>
            </div>

            <div className="px-5 pb-6 pt-3 border-t border-gray-100">
              <button onClick={handlePlaceOrder} disabled={loading || cart.length === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-extrabold py-4 rounded-2xl text-base transition-all active:scale-[0.98] shadow-lg">
                {loading ? '⏳ Đang xử lý...' : `🧾 Đặt hàng • ${fmt(total)}đ`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
