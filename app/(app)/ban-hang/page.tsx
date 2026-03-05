'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, Minus, Plus, Trash2, ShoppingCart, X, ChevronUp, CreditCard, Clock } from 'lucide-react'

interface Product {
  id: number; name: string; price: number; category_name: string; image_url: string
}
interface CartItem {
  product: Product; quantity: number
}

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000, 200000, 500000]
const TABLE_NUMBERS = ['1','2','3','4','5','6','7','8','9','10','11','12']

export default function BanHangPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [customerPaid, setCustomerPaid] = useState(0)
  const [note, setNote] = useState('')
  const [tableNumber, setTableNumber] = useState<string>('')
  const [payNow, setPayNow] = useState(true) // pay now vs pay later
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [pendingPay, setPendingPay] = useState<{orderId: number, total: number} | null>(null)
  const [payAmount, setPayAmount] = useState(0)

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products')
    const data = await res.json()
    setProducts(data.products || [])
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // const categoryNames = [...new Set(products.map(p => p.category_name))]
    const categoryNames = Array.from(
      new Set(products.map(p => p.category_name)))
      
  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'all' || p.category_name === activeCategory
    return matchSearch && matchCat
  })

  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const change = customerPaid - total

  function addToCart(product: Product) {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id)
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
  }
  function updateQty(id: number, delta: number) {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0))
  }
  function removeFromCart(id: number) { setCart(prev => prev.filter(i => i.product.id !== id)) }
  function clearCart() { setCart([]); setCustomerPaid(0); setNote(''); setTableNumber('') }

  async function handleSubmit() {
    if (cart.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.price })),
          total_amount: total,
          customer_paid: payNow ? customerPaid : 0,
          change_amount: payNow ? Math.max(0, change) : 0,
          note,
          table_number: tableNumber || null,
          status: payNow ? 'pending' : 'pending',
          is_paid: payNow,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        if (payNow) {
          setSuccess('✅ Đã tạo đơn & thanh toán!')
          clearCart()
          setCartOpen(false)
        } else {
          setSuccess('📋 Đã tạo đơn, thanh toán sau!')
          clearCart()
          setCartOpen(false)
        }
        setTimeout(() => setSuccess(''), 3000)
      }
    } finally {
      setLoading(false)
    }
  }

  // Cart content shared between desktop + mobile
  const CartContent = () => (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {cart.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <ShoppingCart size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Chọn món để thêm vào đơn</p>
          </div>
        )}
        {cart.map(({ product, quantity }) => (
          <div key={product.id} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-800 truncate">{product.name}</p>
              <p className="text-orange-500 text-xs">{product.price.toLocaleString('vi-VN')}đ</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => updateQty(product.id, -1)} className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100"><Minus size={11} /></button>
              <span className="w-6 text-center text-sm font-bold">{quantity}</span>
              <button onClick={() => updateQty(product.id, 1)} className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100"><Plus size={11} /></button>
            </div>
            <div className="text-right min-w-[56px]">
              <p className="text-sm font-bold">{(product.price * quantity).toLocaleString('vi-VN')}đ</p>
              <button onClick={() => removeFromCart(product.id)} className="text-xs text-gray-400 hover:text-red-500">Xóa</button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 p-4 space-y-3 shrink-0">
        {/* Table number */}
        <div>
          <label className="text-sm text-gray-600 mb-1.5 block font-medium">Số bàn <span className="text-gray-400 font-normal">(tùy chọn)</span></label>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setTableNumber('')}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${!tableNumber ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
              Mang đi
            </button>
            {TABLE_NUMBERS.map(n => (
              <button key={n} onClick={() => setTableNumber(n === tableNumber ? '' : n)}
                className={`w-8 h-8 rounded-full text-xs font-bold border transition-all ${tableNumber === n ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Pay mode toggle */}
        <div>
          <label className="text-sm font-medium text-gray-600 mb-1.5 block">Thanh toán</label>
          <div className="flex gap-2">
            <button onClick={() => setPayNow(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border-2 transition-all ${payNow ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
              <CreditCard size={14} /> Trả ngay
            </button>
            <button onClick={() => setPayNow(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border-2 transition-all ${!payNow ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
              <Clock size={14} /> Trả sau
            </button>
          </div>
        </div>

        {/* Pay now: show amount inputs */}
        {payNow && (
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Khách đưa</label>
            <input type="number" value={customerPaid || ''} onChange={e => setCustomerPaid(Number(e.target.value))}
              placeholder="0" className="input text-right" />
            <div className="flex gap-1 mt-1.5">
              {QUICK_AMOUNTS.map(amt => (
                <button key={amt} onClick={() => setCustomerPaid(amt)}
                  className={`flex-1 py-1 text-[10px] border rounded-lg transition-all ${customerPaid === amt ? 'bg-orange-50 border-orange-400 text-orange-600 font-bold' : 'border-gray-200 text-gray-500 hover:border-orange-300'}`}>
                  {amt >= 1000 ? `${amt/1000}k` : amt}
                </button>
              ))}
            </div>
            {customerPaid > 0 && (
              <div className="flex justify-between mt-2">
                <span className="text-sm text-gray-500">Tiền thối</span>
                <span className={`text-sm font-bold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>{change.toLocaleString('vi-VN')}đ</span>
              </div>
            )}
          </div>
        )}

        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú đơn hàng..." rows={2} className="input resize-none text-sm" />

        <div className="flex justify-between items-center py-1">
          <span className="font-bold text-gray-800">Tổng cộng</span>
          <span className="font-bold text-orange-500 text-xl">{total.toLocaleString('vi-VN')}đ</span>
        </div>

        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm text-center">{success}</div>}

        <button onClick={handleSubmit} disabled={cart.length === 0 || loading}
          className={`w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 text-white ${payNow ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
          {payNow ? <CreditCard size={18} /> : <Clock size={18} />}
          {loading ? 'Đang xử lý...' : (payNow ? 'TẠO ĐƠN & THANH TOÁN' : 'TẠO ĐƠN (TRẢ SAU)')}
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden">
      {/* Products panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 md:p-5 pb-2 shrink-0">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm món..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button onClick={() => setActiveCategory('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeCategory === 'all' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              Tất cả
            </button>
            {categoryNames.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 md:px-5 pb-2">
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {filtered.map(product => (
              <button key={product.id} onClick={() => addToCart(product)}
                className="bg-white rounded-xl p-2 md:p-3 text-left hover:shadow-md active:scale-95 hover:ring-2 hover:ring-orange-300 transition-all group">
                <div className="aspect-square rounded-lg overflow-hidden mb-1.5 bg-gray-100">
                  <img src={product.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'} alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' }} />
                </div>
                <p className="font-semibold text-gray-800 text-xs md:text-sm leading-tight line-clamp-2">{product.name}</p>
                <p className="text-orange-500 font-bold text-xs md:text-sm mt-0.5">{product.price.toLocaleString('vi-VN')}đ</p>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile floating cart button */}
        {cartCount > 0 && (
          <div className="md:hidden px-3 pb-2 shrink-0">
            <button onClick={() => setCartOpen(true)}
              className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl flex items-center justify-between px-5 shadow-lg active:scale-95">
              <div className="flex items-center gap-2"><ShoppingCart size={18} /><span>{cartCount} món</span></div>
              <div className="flex items-center gap-2"><span>{total.toLocaleString('vi-VN')}đ</span><ChevronUp size={18} /></div>
            </button>
          </div>
        )}
      </div>

      {/* Desktop cart */}
      <div className="hidden md:flex w-80 bg-white border-l border-gray-100 flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-orange-500" />
            <h2 className="font-bold text-gray-800">Đơn Hàng</h2>
            {cartCount > 0 && <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{cartCount}</span>}
          </div>
          {cart.length > 0 && <button onClick={clearCart} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>}
        </div>
        <CartContent />
      </div>

      {/* Mobile cart bottom sheet */}
      {cartOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-2xl flex flex-col max-h-[90vh] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} className="text-orange-500" />
                <h2 className="font-bold text-gray-800">Đơn Hàng</h2>
                {cartCount > 0 && <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{cartCount}</span>}
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && <button onClick={clearCart} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={18} /></button>}
                <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
              </div>
            </div>
            <CartContent />
          </div>
        </div>
      )}
    </div>
  )
}
