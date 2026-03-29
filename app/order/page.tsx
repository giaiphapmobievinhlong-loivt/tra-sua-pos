'use client'
import { fmt } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Product { id: number; name: string; price: number; category_name: string; image_url: string }
interface CartItem { product: Product; quantity: number; itemNote: string }
type OrderType = 'dine_in' | 'takeaway' | 'delivery'

const TABLE_NUMBERS = ['1','2','3','4','5','6','7','8','9','10','11','12']
const QUICK_TAGS = ['Ít đá','Không đá','Ít ngọt','Không ngọt','Thêm trân châu','Thêm thạch']

const ORDER_TYPES: { key: OrderType; icon: string; label: string; desc: string }[] = [
  { key: 'dine_in',  icon: '🪑', label: 'Tại quán',    desc: 'Ngồi tại bàn' },
  { key: 'takeaway', icon: '🛍', label: 'Mang về',     desc: 'Tự đến lấy' },
  { key: 'delivery', icon: '🛵', label: 'Giao tận nơi', desc: 'Ship đến địa chỉ' },
]

export default function OrderPage() {
  const router = useRouter()
  const [products, setProducts]         = useState<Product[]>([])
  const [categories, setCategories]     = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch]             = useState('')
  const [cart, setCart]                 = useState<CartItem[]>([])
  const [cartOpen, setCartOpen]         = useState(false)
  const [orderType, setOrderType]       = useState<OrderType>('dine_in')
  const [tableNumber, setTableNumber]   = useState('')
  const [tableFromUrl, setTableFromUrl] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryNote, setDeliveryNote] = useState('')
  const [note, setNote]                 = useState('')
  const [deliveryFee, setDeliveryFee]   = useState(15000)
  const [loading, setLoading]           = useState(false)
  const [errors, setErrors]             = useState<Record<string, string>>({})
  const [addressSuggestions, setAddressSuggestions] = useState<{description: string; place_id: string; main_text?: string; secondary_text?: string}[]>([])
  const [showSuggestions, setShowSuggestions]       = useState(false)
  const [addressLoading, setAddressLoading]         = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => {
      setProducts(d.products || [])
      const cats = (d.products || [])
        .map((p: Product) => p.category_name)
        .filter((c: string, i: number, a: string[]) => a.indexOf(c) === i)
      setCategories(cats)
    })
    fetch('/api/public/settings').then(r => r.json()).then(d => {
      if (d.delivery_fee) setDeliveryFee(Number(d.delivery_fee))
    })
    const params = new URLSearchParams(window.location.search)
    const t = params.get('table')
    if (t) { setTableNumber(t); setTableFromUrl(true); setOrderType('dine_in') }
  }, [])

  const subtotal = cart.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0)
  const shipping = orderType === 'delivery' ? deliveryFee : 0
  const total = subtotal + shipping
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
  function updateItemNote(id: number, n: string) {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, itemNote: n } : i))
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'all' || p.category_name === activeCategory
    return matchSearch && matchCat
  })

  function validate() {
    const e: Record<string, string> = {}
    if (orderType === 'delivery') {
      if (!customerName.trim())    e.customerName    = 'Vui lòng nhập tên người nhận'
      if (!customerPhone.trim())   e.customerPhone   = 'Vui lòng nhập số điện thoại'
      if (!deliveryAddress.trim()) e.deliveryAddress = 'Vui lòng nhập địa chỉ giao hàng'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function searchAddress(query: string) {
    if (!query || query.length < 3) { setAddressSuggestions([]); return }
    setAddressLoading(true)
    try {
      const res = await fetch(`/api/public/places?input=${encodeURIComponent(query)}`)
      const data = await res.json()
      setAddressSuggestions(data.predictions || [])
      setShowSuggestions((data.predictions || []).length > 0)
    } catch {
      // fallback: keep manual input
    } finally { setAddressLoading(false) }
  }

  function handleAddressChange(val: string) {
    setDeliveryAddress(val)
    setErrors(p => ({...p, deliveryAddress: ''}))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchAddress(val), 400)
  }

  function selectAddress(description: string) {
    setDeliveryAddress(description)
    setAddressSuggestions([])
    setShowSuggestions(false)
  }

  async function handlePlaceOrder() {
    if (!validate()) { setCartOpen(true); return }
    setLoading(true)
    try {
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.price, item_note: i.itemNote })),
          total_amount: subtotal,
          delivery_fee: shipping,
          order_type: orderType,
          note: orderType === 'delivery' ? deliveryNote : note,
          table_number: orderType === 'dine_in' ? (tableNumber || null) : null,
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_address: deliveryAddress,
        })
      })
      const data = await res.json()
      if (data.success) {
        router.push(`/order/pay?code=${data.order_code}&total=${total}&type=${orderType}`)
      } else {
        setErrors({ submit: data.error || 'Có lỗi xảy ra' })
      }
    } catch {
      setErrors({ submit: 'Lỗi kết nối' })
    } finally {
      setLoading(false)
    }
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
          <div className="flex items-center gap-2">
            <a href="/login" className="text-xs text-gray-400 hover:text-orange-500 transition-colors px-2 py-1 rounded-lg hover:bg-orange-50">
              Nhân viên
            </a>
            {cartCount > 0 && (
              <button onClick={() => setCartOpen(true)}
                className="relative flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md active:scale-95 transition-transform">
                🛒 Giỏ hàng
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{cartCount}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-400 to-amber-500 text-white py-6 px-4">
        <p style={{ fontFamily: "'Baloo 2', cursive" }} className="text-2xl font-extrabold text-center mb-3">Đặt món ngay! 🐱</p>

        {/* Order type tabs — hidden if from QR */}
        {!tableFromUrl ? (
          <div className="flex gap-2 max-w-sm mx-auto">
            {ORDER_TYPES.map(({ key, icon, label }) => (
              <button key={key} onClick={() => setOrderType(key)}
                className={`flex-1 flex flex-col items-center py-2 px-1 rounded-xl text-xs font-bold transition-all border-2 ${
                  orderType === key
                    ? 'bg-white text-orange-600 border-white shadow-md'
                    : 'bg-white/20 text-white border-white/30'
                }`}>
                <span className="text-lg">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-1.5 rounded-full text-sm font-bold">
              🪑 Bàn {tableNumber}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-28">
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
              <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-orange-50 overflow-hidden">
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
                    className="mt-2 w-full bg-orange-500 text-white text-xs font-bold py-1.5 rounded-xl active:scale-95 transition-all">
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
            <span>🛒 {cartCount} món {orderType === 'delivery' && '· 🛵 Giao hàng'}</span>
            <span>{fmt(total)}đ →</span>
          </button>
        </div>
      )}

      {/* Cart sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
              <h2 style={{ fontFamily: "'Baloo 2', cursive" }} className="text-lg font-bold text-gray-800">
                Giỏ hàng · {ORDER_TYPES.find(t => t.key === orderType)?.icon} {ORDER_TYPES.find(t => t.key === orderType)?.label}
              </h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-4">
              {/* Cart items */}
              {cart.map(({ product, quantity, itemNote }) => (
                <div key={product.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} /> : <span className="text-xl">🧋</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800 truncate">{product.name}</p>
                      <p className="text-orange-500 text-xs font-bold">{fmt(Number(product.price) * quantity)}đ</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => updateQty(product.id, -1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">−</button>
                      <span className="w-5 text-center font-bold text-sm">{quantity}</span>
                      <button onClick={() => updateQty(product.id, 1)} className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">+</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
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

              {/* ── Section theo order type ── */}
              <div className="pt-2 border-t border-gray-100 space-y-3">

                {/* DINE IN */}
                {orderType === 'dine_in' && (
                  <>
                    {tableFromUrl ? (
                      <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                        <span className="text-2xl">🪑</span>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold">Bàn của bạn</p>
                          <p className="text-lg font-black text-orange-600">Bàn {tableNumber}</p>
                        </div>
                        <button onClick={() => { setTableFromUrl(false) }}
                          className="ml-auto text-xs text-gray-400 underline">Đổi</button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-gray-700">Chọn bàn</p>
                        <div className="flex flex-wrap gap-1.5">
                          {TABLE_NUMBERS.map(n => (
                            <button key={n} onClick={() => setTableNumber(tableNumber === n ? '' : n)}
                              className={`w-10 h-10 rounded-full text-sm font-bold border-2 transition-all ${tableNumber === n ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600'}`}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <textarea value={note} onChange={e => setNote(e.target.value)}
                      placeholder="Ghi chú thêm..." rows={2}
                      className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                  </>
                )}

                {/* TAKEAWAY */}
                {orderType === 'takeaway' && (
                  <>
                    <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                      <span className="text-2xl">🛍</span>
                      <p className="text-sm text-gray-600">Đặt xong đến quầy lấy nhé!</p>
                    </div>
                    <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                      placeholder="Tên của bạn (không bắt buộc)"
                      className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    <textarea value={note} onChange={e => setNote(e.target.value)}
                      placeholder="Ghi chú thêm..." rows={2}
                      className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                  </>
                )}

                {/* DELIVERY */}
                {orderType === 'delivery' && (
                  <div className="space-y-3">
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <span>🛵</span>
                      <p className="text-xs text-orange-700 font-semibold">Phí giao hàng: <strong>{fmt(deliveryFee)}đ</strong></p>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">Tên người nhận <span className="text-red-500">*</span></label>
                      <input value={customerName} onChange={e => { setCustomerName(e.target.value); setErrors(p => ({...p, customerName: ''})) }}
                        placeholder="Nguyễn Văn A"
                        className={`w-full text-sm px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 ${errors.customerName ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                      {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">Số điện thoại <span className="text-red-500">*</span></label>
                      <input value={customerPhone} onChange={e => { setCustomerPhone(e.target.value); setErrors(p => ({...p, customerPhone: ''})) }}
                        placeholder="0901 234 567" type="tel"
                        className={`w-full text-sm px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 ${errors.customerPhone ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                      {errors.customerPhone && <p className="text-red-500 text-xs mt-1">{errors.customerPhone}</p>}
                    </div>

                    {/* Address with Google Maps autocomplete */}
                    <div className="relative">
                      <label className="text-xs font-bold text-gray-600 mb-1 block">
                        Địa chỉ giao hàng <span className="text-red-500">*</span>
                        <span className="text-gray-400 font-normal ml-1">(gõ để tìm trên bản đồ)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">📍</span>
                        <input
                          value={deliveryAddress}
                          onChange={e => handleAddressChange(e.target.value)}
                          onFocus={() => deliveryAddress.length >= 3 && setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                          placeholder="Nhập số nhà, tên đường..."
                          className={`w-full text-sm pl-9 pr-9 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 ${errors.deliveryAddress ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                        />
                        {addressLoading && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs animate-spin">⏳</span>
                        )}
                        {deliveryAddress && !addressLoading && (
                          <button onClick={() => { setDeliveryAddress(''); setAddressSuggestions([]) }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
                        )}
                      </div>
                      {/* Suggestions dropdown */}
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                          {addressSuggestions.map(s => (
                            <button key={s.place_id} onMouseDown={() => selectAddress(s.description)}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-orange-50 border-b border-gray-50 last:border-0 flex items-start gap-2">
                              <span className="text-orange-400 mt-0.5 shrink-0">📍</span>
                              <span className="leading-snug">
                                <span className="font-semibold text-gray-800 block">{s.main_text || s.description}</span>
                                {s.secondary_text && <span className="text-xs text-gray-400">{s.secondary_text}</span>}
                              </span>
                            </button>
                          ))}
                          <div className="px-3 py-1.5 bg-gray-50 flex items-center justify-end">
                            <span className="text-[10px] text-gray-300">powered by Goong</span>
                          </div>
                        </div>
                      )}

                      {errors.deliveryAddress && <p className="text-red-500 text-xs mt-1">{errors.deliveryAddress}</p>}
                    </div>

                    {/* Delivery note */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">Ghi chú giao hàng</label>
                      <input value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)}
                        placeholder="VD: Gọi điện trước khi đến, gửi bảo vệ..."
                        className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    </div>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="bg-orange-50 rounded-2xl px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tiền món</span>
                  <span className="font-semibold">{fmt(subtotal)}đ</span>
                </div>
                {orderType === 'delivery' && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>🛵 Phí giao hàng</span>
                    <span className="font-semibold">{fmt(shipping)}đ</span>
                  </div>
                )}
                <div className="border-t border-orange-200 pt-1.5 flex justify-between items-center">
                  <span className="font-bold text-gray-800">Tổng cộng</span>
                  <span className="text-xl font-extrabold text-orange-500">{fmt(total)}đ</span>
                </div>
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs text-center px-4 py-2 rounded-xl">
                  {errors.submit}
                </div>
              )}
            </div>

            <div className="px-5 pb-6 pt-3 border-t border-gray-100">
              <button onClick={handlePlaceOrder} disabled={loading || cart.length === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-extrabold py-4 rounded-2xl text-base transition-all active:scale-[0.98] shadow-lg">
                {loading ? '⏳ Đang xử lý...' : `${ORDER_TYPES.find(t => t.key === orderType)?.icon} Đặt hàng · ${fmt(total)}đ`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
