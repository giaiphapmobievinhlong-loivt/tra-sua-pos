'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, Minus, Plus, Trash2, ShoppingCart, X } from 'lucide-react'
import Image from 'next/image'

interface Product {
  id: number
  name: string
  price: number
  category_name: string
  image_url: string
}

interface CartItem {
  product: Product
  quantity: number
}

interface Category {
  id: number
  name: string
  slug: string
}

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000, 200000, 500000]

export default function BanHangPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [customerPaid, setCustomerPaid] = useState(0)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products')
    const data = await res.json()
    setProducts(data.products || [])
    setCategories(data.categories || [])
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'all' || p.category_name === activeCategory
    return matchSearch && matchCat
  })

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const change = customerPaid - total

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
  }

  function updateQty(productId: number, delta: number) {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    )
  }

  function removeFromCart(productId: number) {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  function clearCart() {
    setCart([])
    setCustomerPaid(0)
    setNote('')
  }

  async function handleCheckout() {
    if (cart.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.price })),
          total_amount: total,
          customer_paid: customerPaid,
          change_amount: change,
          note,
        }),
      })
      if (res.ok) {
        setSuccess(true)
        clearCart()
        setTimeout(() => setSuccess(false), 3000)
      }
    } finally {
      setLoading(false)
    }
  }

  // const categoryNames = [...new Set(products.map(p => p.category_name))]
  const categoryNames = Array.from(
  new Set(products.map(p => p.category_name))
)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Products panel */}
      <div className="flex-1 flex flex-col p-5 overflow-hidden">
        {/* Search + Filter */}
        <div className="mb-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm món..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCategory === 'all' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              Tất cả
            </button>
            {categoryNames.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCategory === cat ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white rounded-xl p-3 text-left hover:shadow-md hover:ring-2 hover:ring-orange-300 transition-all group"
              >
                <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-gray-100">
                  <img
                    src={product.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' }}
                  />
                </div>
                <p className="font-semibold text-gray-800 text-sm leading-tight">{product.name}</p>
                <p className="text-orange-500 font-bold text-sm mt-1">{product.price.toLocaleString('vi-VN')}đ</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart panel */}
      <div className="w-80 bg-white border-l border-gray-100 flex flex-col">
        {/* Cart header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-orange-500" />
            <h2 className="font-bold text-gray-800">Đơn Hàng</h2>
            {cart.length > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 size={18} />
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 && (
            <div className="text-center text-gray-400 mt-10">
              <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Chọn món để thêm vào đơn</p>
            </div>
          )}
          {cart.map(({ product, quantity }) => (
            <div key={product.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-800 truncate">{product.name}</p>
                <p className="text-orange-500 text-xs">{product.price.toLocaleString('vi-VN')}đ</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(product.id, -1)} className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                  <Minus size={12} />
                </button>
                <span className="w-6 text-center text-sm font-bold">{quantity}</span>
                <button onClick={() => updateQty(product.id, 1)} className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                  <Plus size={12} />
                </button>
              </div>
              <div className="text-right min-w-[60px]">
                <p className="text-sm font-bold">{(product.price * quantity).toLocaleString('vi-VN')}đ</p>
                <button onClick={() => removeFromCart(product.id)} className="text-xs text-gray-400 hover:text-red-500">Xóa</button>
              </div>
            </div>
          ))}
        </div>

        {/* Payment section */}
        <div className="border-t border-gray-100 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-800">Tổng cộng</span>
            <span className="font-bold text-orange-500 text-lg">{total.toLocaleString('vi-VN')}đ</span>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Khách đưa</label>
            <input
              type="number"
              value={customerPaid || ''}
              onChange={e => setCustomerPaid(Number(e.target.value))}
              placeholder="0"
              className="input text-right"
            />
            <div className="flex gap-1 mt-2 flex-wrap">
              {QUICK_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => setCustomerPaid(amt)}
                  className={`flex-1 min-w-0 py-1 text-xs border rounded-lg transition-all ${customerPaid === amt ? 'bg-orange-50 border-orange-400 text-orange-600 font-bold' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}
                >
                  {amt >= 1000 ? `${amt/1000}k` : amt}
                </button>
              ))}
            </div>
          </div>

          {customerPaid > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tiền thối</span>
              <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {change.toLocaleString('vi-VN')}đ
              </span>
            </div>
          )}

          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ghi chú đơn hàng..."
            rows={2}
            className="input resize-none text-sm"
          />

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm text-center font-medium">
              ✅ Thanh toán thành công!
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <ShoppingCart size={18} />
            {loading ? 'Đang xử lý...' : 'THANH TOÁN'}
          </button>
        </div>
      </div>
    </div>
  )
}
