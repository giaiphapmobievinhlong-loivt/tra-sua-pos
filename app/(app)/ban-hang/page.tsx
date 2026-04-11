'use client'
import { MOMO_QR } from '@/lib/constants'
import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/apiFetch'
import {
  Search, Minus, Plus, Trash2, ShoppingCart,
  X, ChevronUp, CreditCard, Clock, Banknote, QrCode, Tag, Percent, ChevronDown, Check, Mic, MicOff
} from 'lucide-react'

interface Product {
  id: number; name: string; price: number; category_name: string; image_url: string
}
interface CartItem { product: Product; quantity: number; itemNote: string }
interface Discount { id: number; name: string; type: 'percent'|'fixed'; value: number; min_order: number; is_active: boolean }

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000, 200000, 500000]
const TABLE_NUMBERS = ['1','2','3','4','5','6','7','8','9','10','11','12']
type PayMethod = 'cash' | 'transfer'
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'

// Cloudinary HEIC URLs are not browser-compatible — force .jpg conversion
function fixImgUrl(url: string) {
  if (!url) return FALLBACK_IMG
  return url.replace(/\.heic($|\?)/i, '.jpg$1')
}

// ── Discount Selector ────────────────────────────────────────
interface DiscountSelectorProps {
  total: number
  discounts: Discount[]
  selectedDiscount: Discount | null
  setSelectedDiscount: (d: Discount | null) => void
  manualDiscount: string
  setManualDiscount: (v: string) => void
  manualType: 'percent' | 'fixed'
  setManualType: (v: 'percent' | 'fixed') => void
}

function DiscountSelector({ total, discounts, selectedDiscount, setSelectedDiscount, manualDiscount, setManualDiscount, manualType, setManualType }: DiscountSelectorProps) {
  const [open, setOpen] = useState(false)
  const eligible = discounts.filter(d => d.is_active && Number(d.min_order) <= total)

  // Compute preview for manual entry
  const manualAmt = manualDiscount
    ? (manualType === 'percent'
        ? Math.round(total * Math.min(100, Number(manualDiscount)) / 100)
        : Math.min(Number(manualDiscount), total))
    : 0

  const label = selectedDiscount
    ? selectedDiscount.name
    : manualDiscount
      ? (manualType === 'percent' ? `Giảm ${manualDiscount}%` : `Giảm ${Number(manualDiscount).toLocaleString('vi-VN')}đ`)
      : 'Chọn hoặc nhập giảm giá'

  const hasDiscount = selectedDiscount || Number(manualDiscount) > 0

  return (
    <div>
      {/* Toggle row */}
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-sm ${
          hasDiscount ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-200'
        }`}>
        <div className="flex items-center gap-2">
          <Tag size={14} className={hasDiscount ? 'text-orange-500' : 'text-gray-400'} />
          <span className={`font-medium ${hasDiscount ? 'text-orange-700' : 'text-gray-500'}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {hasDiscount && <span className="text-xs text-green-600 font-bold">-{(selectedDiscount
            ? (selectedDiscount.type === 'percent' ? Math.round(total * selectedDiscount.value / 100) : Math.min(Number(selectedDiscount.value), total))
            : manualAmt).toLocaleString('vi-VN')}đ</span>}
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="mt-2 border border-gray-100 rounded-xl bg-white shadow-sm overflow-hidden">
          {/* Preset combos */}
          {eligible.length > 0 && (
            <div className="p-3 border-b border-gray-100">
              <p className="text-[11px] text-gray-400 font-semibold uppercase mb-2">Chương trình khuyến mãi</p>
              <div className="space-y-1.5">
                {eligible.map(d => {
                  const saving = d.type === 'percent' ? Math.round(total * d.value / 100) : Math.min(Number(d.value), total)
                  const active = selectedDiscount?.id === d.id
                  return (
                    <button key={d.id}
                      onClick={() => { setSelectedDiscount(active ? null : d); setManualDiscount(''); if (!active) setOpen(false) }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                        active ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-50 text-gray-700'
                      }`}>
                      <div className="text-left">
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-xs text-green-600">
                          {d.type === 'percent' ? `Giảm ${d.value}%` : `Giảm ${Number(d.value).toLocaleString('vi-VN')}đ`}
                          {' '}→ tiết kiệm {saving.toLocaleString('vi-VN')}đ
                        </p>
                      </div>
                      {active && <Check size={14} className="text-orange-500 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Manual entry */}
          <div className="p-3">
            <p className="text-[11px] text-gray-400 font-semibold uppercase mb-2">Nhập thủ công</p>
            <div className="flex gap-2 items-center">
              <div className="flex border border-gray-200 rounded-lg overflow-hidden shrink-0">
                <button onClick={() => { setManualType('percent'); setSelectedDiscount(null) }}
                  className={`px-2.5 py-1.5 text-xs font-bold transition-all ${manualType === 'percent' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  %
                </button>
                <button onClick={() => { setManualType('fixed'); setSelectedDiscount(null) }}
                  className={`px-2.5 py-1.5 text-xs font-bold transition-all ${manualType === 'fixed' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  đ
                </button>
              </div>
              <input
                type="number"
                value={manualDiscount}
                onChange={e => { setManualDiscount(e.target.value); setSelectedDiscount(null) }}
                placeholder={manualType === 'percent' ? 'VD: 10' : 'VD: 20000'}
                className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-300"
              />
              {manualDiscount && (
                <button onClick={() => { setManualDiscount(''); setOpen(false) }}
                  className="text-xs text-orange-600 font-semibold shrink-0 px-2 py-1.5 bg-orange-50 rounded-lg">
                  Áp dụng
                </button>
              )}
            </div>
            {manualDiscount && Number(manualDiscount) > 0 && (
              <p className="text-xs text-green-600 mt-1.5 pl-1">
                → Tiết kiệm {manualAmt.toLocaleString('vi-VN')}đ
              </p>
            )}
          </div>

          {/* Clear */}
          {hasDiscount && (
            <button onClick={() => { setSelectedDiscount(null); setManualDiscount(''); setOpen(false) }}
              className="w-full py-2 text-xs text-red-500 hover:bg-red-50 transition-all border-t border-gray-100">
              ✕ Bỏ giảm giá
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Cart Panel — standalone component with explicit props ─────
interface CartPanelProps {
  cart: CartItem[]
  total: number
  tableNumber: string
  setTableNumber: (v: string) => void
  payNow: boolean
  setPayNow: (v: boolean) => void
  payMethod: PayMethod
  setPayMethod: (v: PayMethod) => void
  customerPaid: number
  setCustomerPaid: (v: number) => void
  note: string
  setNote: (v: string) => void
  success: string
  loading: boolean
  discounts: Discount[]
  selectedDiscount: Discount | null
  setSelectedDiscount: (d: Discount | null) => void
  manualDiscount: string
  setManualDiscount: (v: string) => void
  manualType: 'percent' | 'fixed'
  setManualType: (v: 'percent' | 'fixed') => void
  discountAmount: number
  finalTotal: number
  updateQty: (id: number, delta: number) => void
  updateItemNote: (id: number, note: string) => void
  removeFromCart: (id: number) => void
  clearCart: () => void
  handleSubmit: () => void
}

function CartPanel({
  cart, total, tableNumber, setTableNumber,
  payNow, setPayNow, payMethod, setPayMethod,
  customerPaid, setCustomerPaid, note, setNote,
  discounts, selectedDiscount, setSelectedDiscount, manualDiscount, setManualDiscount, manualType, setManualType, discountAmount, finalTotal,
  success, loading, updateQty, updateItemNote, removeFromCart, clearCart, handleSubmit
}: CartPanelProps) {
  const change = customerPaid - finalTotal

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
      {/* Items */}
      <div className="p-4 space-y-3">
        {cart.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <ShoppingCart size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Chọn món để thêm vào đơn</p>
          </div>
        )}
        {cart.map(({ product, quantity, itemNote }) => (
          <div key={product.id} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-800 truncate">{product.name}</p>
                <p className="text-orange-500 text-xs">{Number(product.price).toLocaleString('vi-VN')}đ</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => updateQty(product.id, -1)}
                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors">
                  <Minus size={12} />
                </button>
                <span className="w-7 text-center text-sm font-bold">{quantity}</span>
                <button onClick={() => updateQty(product.id, 1)}
                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors">
                  <Plus size={12} />
                </button>
              </div>
              <div className="text-right min-w-[64px]">
                <p className="text-sm font-bold">{(Number(product.price) * quantity).toLocaleString('vi-VN')}đ</p>
                <button onClick={() => removeFromCart(product.id)}
                  className="text-xs text-gray-400 hover:text-red-500 active:text-red-600">Xóa</button>
              </div>
            </div>
            {/* Per-item note: quick tags + free text */}
            <div className="pl-0">
              <div className="flex flex-wrap gap-1 mb-1">
                {['Ít đá','Không đá','Ít ngọt','Không ngọt','Thêm trân châu','Thêm thạch'].map(tag => {
                  const active = itemNote.includes(tag)
                  return (
                    <button key={tag} type="button"
                      onClick={() => {
                        const tags = itemNote ? itemNote.split(', ').filter(Boolean) : []
                        const next = active ? tags.filter(t => t !== tag) : [...tags, tag]
                        updateItemNote(product.id, next.join(', '))
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                        active ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-500 hover:border-orange-300'
                      }`}>
                      {tag}
                    </button>
                  )
                })}
              </div>
              <input
                type="text"
                value={itemNote}
                onChange={e => updateItemNote(product.id, e.target.value)}
                placeholder="Ghi chú thêm..."
                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-300 placeholder-gray-300 bg-gray-50"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="border-t border-gray-100 px-4 pt-4 pb-8 space-y-4">

        {/* Table number */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Số bàn <span className="font-normal text-gray-400 text-xs">(tùy chọn)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setTableNumber('')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                !tableNumber ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-500'
              }`}>
              🛍 Mang đi
            </button>
            {TABLE_NUMBERS.map(n => (
              <button key={n} onClick={() => setTableNumber(tableNumber === n ? '' : n)}
                className={`w-9 h-9 rounded-full text-sm font-bold border transition-all ${
                  tableNumber === n
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:border-orange-300'
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Pay timing */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Thời điểm thanh toán</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPayNow(true)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                payNow ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'
              }`}>
              <CreditCard size={15} /> Trả ngay
            </button>
            <button onClick={() => setPayNow(false)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                !payNow ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'
              }`}>
              <Clock size={15} /> Trả sau
            </button>
          </div>
        </div>

        {/* Pay method */}
        {payNow && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Phương thức</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPayMethod('cash')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  payMethod === 'cash' ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'
                }`}>
                <Banknote size={15} /> Tiền mặt
              </button>
              <button onClick={() => setPayMethod('transfer')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  payMethod === 'transfer' ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-500'
                }`}>
                <QrCode size={15} /> Chuyển khoản
              </button>
            </div>
          </div>
        )}

        {/* Cash amount */}
        {payNow && payMethod === 'cash' && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Khách đưa</p>
            <input
              type="number"
              value={customerPaid || ''}
              onChange={e => setCustomerPaid(Number(e.target.value))}
              placeholder="0"
              className="input text-right text-base font-bold"
            />
            <div className="grid grid-cols-6 gap-1">
              {QUICK_AMOUNTS.map(amt => (
                <button key={amt} onClick={() => setCustomerPaid(amt)}
                  className={`py-1.5 text-[11px] font-medium border rounded-lg transition-all ${
                    customerPaid === amt
                      ? 'bg-orange-50 border-orange-400 text-orange-600 font-bold'
                      : 'border-gray-200 text-gray-500 hover:border-orange-300'
                  }`}>
                  {amt >= 1000 ? `${amt/1000}k` : amt}
                </button>
              ))}
            </div>
            {customerPaid > 0 && (
              <div className="flex justify-between py-2 bg-gray-50 rounded-xl px-3">
                <span className="text-sm text-gray-500">Tiền thối</span>
                <span className={`text-sm font-bold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {change.toLocaleString('vi-VN')}đ
                </span>
              </div>
            )}
          </div>
        )}

        {/* QR transfer */}
        {payNow && payMethod === 'transfer' && (
          <div className="rounded-2xl bg-pink-50 border border-pink-100 p-4 text-center">
            <p className="text-xs font-semibold text-pink-600 mb-3">
              Quét mã chuyển <strong>{finalTotal.toLocaleString('vi-VN')}đ</strong>
            </p>
            <img src={MOMO_QR} alt="QR chuyển khoản"
              className="w-40 h-auto rounded-xl shadow mx-auto" />
            <p className="text-[11px] text-pink-400 mt-2">MoMo · VietQR · Napas 247</p>
          </div>
        )}

        {/* Note */}
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Ghi chú đơn hàng..."
          rows={1}
          className="input resize-none text-sm w-full"
        />

        {/* Discount selector — always visible */}
        <DiscountSelector
          total={total}
          discounts={discounts}
          selectedDiscount={selectedDiscount}
          setSelectedDiscount={setSelectedDiscount}
          manualDiscount={manualDiscount}
          setManualDiscount={setManualDiscount}
          manualType={manualType}
          setManualType={setManualType}
        />

        {/* Total */}
        <div className="bg-orange-50 rounded-xl px-4 py-3 space-y-1">
          {discountAmount > 0 ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tạm tính</span>
                <span className="text-gray-600">{total.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Giảm giá {selectedDiscount ? `(${selectedDiscount.name})` : ''}</span>
                <span>-{discountAmount.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="border-t border-orange-200 pt-1 flex justify-between items-center">
                <span className="font-bold text-gray-800">Tổng cộng</span>
                <span className="font-bold text-orange-500 text-xl">{finalTotal.toLocaleString('vi-VN')}đ</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-800">Tổng cộng</span>
              <span className="font-bold text-orange-500 text-xl">{total.toLocaleString('vi-VN')}đ</span>
            </div>
          )}
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-xl text-sm text-center font-medium">
            {success}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={cart.length === 0 || loading}
          className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400 text-white text-base ${
            !payNow ? 'bg-blue-500 hover:bg-blue-600'
            : payMethod === 'transfer' ? 'bg-pink-500 hover:bg-pink-600'
            : 'bg-green-500 hover:bg-green-600'
          }`}>
          {!payNow ? <Clock size={20} />
            : payMethod === 'transfer' ? <QrCode size={20} />
            : <Banknote size={20} />}
          {loading ? 'Đang xử lý...'
            : !payNow ? 'TẠO ĐƠN (TRẢ SAU)'
            : payMethod === 'transfer' ? 'XÁC NHẬN CHUYỂN KHOẢN'
            : 'THANH TOÁN TIỀN MẶT'}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function BanHangPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string; slug: string }[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [customerPaid, setCustomerPaid] = useState(0)
  const [note, setNote] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [payNow, setPayNow] = useState(true)
  const [payMethod, setPayMethod] = useState<PayMethod>('cash')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null)
  const [manualDiscount, setManualDiscount] = useState('')
  const [manualType, setManualType] = useState<'percent'|'fixed'>('percent')
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'match' | 'nomatch'>('idle')
  const [voiceMsg, setVoiceMsg] = useState('')

  const fetchProducts = useCallback(async () => {
    const res = await fetch(`/api/products?t=${Date.now()}`, { cache: 'no-store' })
    const data = await res.json()
    setProducts(data.products || [])
    setCategories(data.categories || [])
  }, [])

  const fetchDiscounts = useCallback(async () => {
    const res = await fetch('/api/discounts', { cache: 'no-store' })
    const data = await res.json()
    setDiscounts(data.discounts || [])
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchDiscounts()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchProducts() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchProducts, fetchDiscounts])

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'all' || p.category_name === activeCategory
    return matchSearch && matchCat
  })

  const total = cart.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0)
  const discountAmount = selectedDiscount
    ? (selectedDiscount.type === 'percent'
        ? Math.round(total * selectedDiscount.value / 100)
        : Math.min(Number(selectedDiscount.value), total))
    : manualDiscount && Number(manualDiscount) > 0
      ? (manualType === 'percent'
          ? Math.round(total * Math.min(100, Number(manualDiscount)) / 100)
          : Math.min(Number(manualDiscount), total))
      : 0
  const finalTotal = Math.max(0, total - discountAmount)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  function addToCart(product: Product) {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id)
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1, itemNote: '' }]
    })
  }

  function updateQty(id: number, delta: number) {
    setCart(prev =>
      prev.map(i => i.product.id === id ? { ...i, quantity: i.quantity + delta } : i)
          .filter(i => i.quantity > 0)
    )
  }

  function removeFromCart(id: number) {
    setCart(prev => prev.filter(i => i.product.id !== id))
  }

  // Chuẩn hóa chuỗi để so sánh giọng nói (bỏ dấu, lowercase)
  function normalize(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim()
  }

  function startVoice() {
    const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition
      || (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceMsg('Trình duyệt không hỗ trợ nhận giọng nói')
      setVoiceState('nomatch')
      setTimeout(() => setVoiceState('idle'), 2000)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new (SpeechRecognition as any)() as any
    rec.lang = 'vi-VN'
    rec.interimResults = false
    rec.maxAlternatives = 5

    let didGetResult = false
    setVoiceState('listening')
    setVoiceMsg('Đang nghe...')
    rec.start()

    // Tự động dừng sau 8 giây nếu không có kết quả
    setTimeout(() => {
      if (!didGetResult) {
        try { rec.stop() } catch { /* ignore */ }
      }
    }, 8000)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      didGetResult = true
      const transcripts: string[] = []
      for (let ri = 0; ri < e.results.length; ri++)
        for (let ai = 0; ai < e.results[ri].length; ai++)
          transcripts.push(e.results[ri][ai].transcript)

      const NUM_WORDS: Record<string, number> = {
        'mot': 1, 'hai': 2, 'ba': 3, 'bon': 4, 'nam': 5,
        'sau': 6, 'bay': 7, 'tam': 8, 'chin': 9, 'muoi': 10,
      }

      // Tìm product khớp tốt nhất trong 1 đoạn text
      function findProduct(text: string): Product | null {
        let best: Product | null = null; let bestScore = 0
        for (const p of products) {
          const normName = normalize(p.name)
          if (text === normName || text.includes(normName)) {
            if (normName.length > bestScore) { bestScore = normName.length; best = p }
            continue
          }
          const words = normName.split(/\s+/)
          const hit = words.filter(w => w.length > 1 && text.includes(w))
          const score = hit.length / words.length
          if (score >= 0.6 && normName.length * score > bestScore) {
            bestScore = normName.length * score; best = p
          }
        }
        return best
      }

      // Parse số lượng ở đầu đoạn: "2 ...", "hai ..."
      function parseQty(text: string): { qty: number; rest: string } {
        const digit = text.match(/^(\d+)\s+(.*)/)
        if (digit) return { qty: Math.min(20, parseInt(digit[1])), rest: digit[2] }
        for (const [word, val] of Object.entries(NUM_WORDS)) {
          if (text.startsWith(word + ' ')) return { qty: val, rest: text.slice(word.length + 1) }
        }
        return { qty: 1, rest: text }
      }

      // Tách nhiều món: dùng dấu phân cách "," | "và" | "với" | "thêm"
      const raw = normalize(transcripts[0] || '')
      const segments = raw.split(/,|va\b|voi\b|them\b/).map(s => s.trim()).filter(Boolean)

      const found: { product: Product; qty: number }[] = []
      for (const seg of segments) {
        const { qty, rest } = parseQty(seg)
        // Thử toàn đoạn trước, nếu không được thử bỏ phần số
        const p = findProduct(seg) || findProduct(rest)
        if (p) {
          const ex = found.find(f => f.product.id === p.id)
          if (ex) ex.qty += qty
          else found.push({ product: p, qty })
        }
      }

      if (found.length > 0) {
        setCart(prev => {
          let next = [...prev]
          for (const { product: p, qty } of found) {
            const ex = next.find(i => i.product.id === p.id)
            if (ex) next = next.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + qty } : i)
            else next = [...next, { product: p, quantity: qty, itemNote: '' }]
          }
          return next
        })
        const msg = found.map(f => `${f.qty > 1 ? f.qty + 'x ' : ''}${f.product.name}`).join(', ')
        setVoiceMsg(`✓ ${msg}`)
        setVoiceState('match')
      } else {
        setVoiceMsg(`"${transcripts[0]}" — Không tìm thấy`)
        setVoiceState('nomatch')
      }
      setTimeout(() => { setVoiceState('idle'); setVoiceMsg('') }, 3000)
    }

    rec.onerror = () => {
      setVoiceMsg('Không nhận được giọng nói')
      setVoiceState('nomatch')
      setTimeout(() => { setVoiceState('idle'); setVoiceMsg('') }, 2000)
    }

    rec.onend = () => {
      if (!didGetResult) {
        setVoiceState('nomatch')
        setVoiceMsg('Không nghe thấy — thử lại')
        setTimeout(() => { setVoiceState('idle'); setVoiceMsg('') }, 2000)
      }
    }
  }

  function updateItemNote(id: number, note: string) {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, itemNote: note } : i))
  }

  function clearCart() {
    setCart([])
    setCustomerPaid(0)
    setNote('')
    setTableNumber('')
    setSelectedDiscount(null)
    setManualDiscount('')
  }

  async function handleSubmit() {
    if (cart.length === 0) return
    setLoading(true)
    try {
      const body = {
        items: cart.map(i => ({
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.product.price,
          item_note: i.itemNote || '',
        })),
        total_amount: finalTotal,
        discount_amount: discountAmount,
        discount_name: selectedDiscount?.name || (manualDiscount ? `Giảm thủ công (${manualType === 'percent' ? manualDiscount + '%' : Number(manualDiscount).toLocaleString('vi-VN') + 'đ'})` : ''),
        customer_paid: payNow ? (payMethod === 'transfer' ? finalTotal : customerPaid) : 0,
        change_amount: payNow ? (payMethod === 'transfer' ? 0 : Math.max(0, customerPaid - finalTotal)) : 0,
        note: note || '',
        table_number: tableNumber || null,
        status: 'pending',
        is_paid: payNow,
        pay_method: payNow ? payMethod : null,
      }


      const res = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        const msg = payNow
          ? (payMethod === 'transfer' ? '✅ Đã tạo đơn & chuyển khoản!' : '✅ Đã tạo đơn & thanh toán!')
          : '📋 Đã tạo đơn, thanh toán sau!'
        setSuccess(msg)
        clearCart()
        setCartOpen(false)
        setTimeout(() => setSuccess(''), 4000)
      } else {
        setSuccess(`❌ Lỗi: ${data.error || 'Không tạo được đơn'}`)
        setTimeout(() => setSuccess(''), 5000)
      }
    } catch (err) {
      console.error('Submit error:', err)
      setSuccess('❌ Lỗi kết nối server')
      setTimeout(() => setSuccess(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  // Shared props for CartPanel
  const cartPanelProps: CartPanelProps = {
    cart, total, tableNumber, setTableNumber,
    payNow, setPayNow, payMethod, setPayMethod,
    customerPaid, setCustomerPaid,
    note, setNote, success, loading,
    discounts, selectedDiscount, setSelectedDiscount,
    manualDiscount, setManualDiscount, manualType, setManualType,
    discountAmount, finalTotal,
    updateQty, updateItemNote, removeFromCart, clearCart, handleSubmit,
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Products panel ───────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search + filter */}
        <div className="px-3 md:px-5 pt-3 pb-2 shrink-0 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm kiếm món..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
              />
            </div>
            <button
              onClick={startVoice}
              disabled={voiceState === 'listening'}
              title="Thêm bằng giọng nói"
              className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                voiceState === 'listening' ? 'bg-red-500 text-white animate-pulse' :
                voiceState === 'match'    ? 'bg-green-500 text-white' :
                voiceState === 'nomatch'  ? 'bg-orange-400 text-white' :
                'bg-white border border-gray-200 text-gray-500 hover:border-orange-400 hover:text-orange-500'
              }`}>
              {voiceState === 'listening' ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          </div>
          {voiceMsg && (
            <div className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
              voiceState === 'match' ? 'bg-green-50 text-green-700' :
              voiceState === 'nomatch' ? 'bg-red-50 text-red-600' :
              'bg-orange-50 text-orange-600'
            }`}>
              {voiceMsg}
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                activeCategory === 'all' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'
              }`}>
              Tất cả
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                  activeCategory === cat.name ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-3 md:px-5">
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 pb-24 md:pb-4">
            {filtered.map(product => (
              <button key={product.id} onClick={() => addToCart(product)}
                className="bg-white rounded-xl p-2 md:p-3 text-left shadow-sm hover:shadow-md active:scale-95 hover:ring-2 hover:ring-orange-300 transition-all group">
                <div className="aspect-square rounded-lg overflow-hidden mb-1.5 bg-gray-100">
                  <img
                    src={fixImgUrl(product.image_url)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG }}
                  />
                </div>
                <p className="font-semibold text-gray-800 text-xs leading-tight line-clamp-2">{product.name}</p>
                <p className="text-orange-500 font-bold text-xs mt-0.5">{Number(product.price).toLocaleString('vi-VN')}đ</p>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center text-gray-400 py-12">
                <p className="text-sm">Không có sản phẩm nào</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Desktop cart sidebar ─────────────────── */}
      <div className="hidden md:flex w-80 bg-white border-l border-gray-100 flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-orange-500" />
            <span className="font-bold text-gray-800">Đơn Hàng</span>
            {cartCount > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 size={18} />
            </button>
          )}
        </div>
        <CartPanel {...cartPanelProps} />
      </div>

      {/* ── Mobile: sticky cart button ───────────── */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-[45] px-3 pb-2">
        <button
          onClick={() => setCartOpen(true)}
          className={`w-full font-bold py-3.5 rounded-2xl flex items-center justify-between px-5 shadow-xl transition-all active:scale-[0.98] ${
            cartCount > 0 ? 'bg-orange-500 text-white' : 'bg-white text-gray-400 border border-gray-200'
          }`}>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-white text-orange-500 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-sm">
              {cartCount > 0 ? `${cartCount} món đã chọn` : 'Chưa có món nào'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {total > 0 && <span className="font-bold">{total.toLocaleString('vi-VN')}đ</span>}
            <ChevronUp size={18} />
          </div>
        </button>
      </div>

      {/* ── Mobile cart bottom sheet ─────────────── */}
      {cartOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-3xl flex flex-col shadow-2xl" style={{ maxHeight: '92vh' }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} className="text-orange-500" />
                <span className="font-bold text-gray-800 text-lg">Đơn Hàng</span>
                {cartCount > 0 && (
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartCount} món
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {cart.length > 0 && (
                  <button onClick={clearCart}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 size={18} />
                  </button>
                )}
                <button onClick={() => setCartOpen(false)}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>
            {/* Cart content */}
            <CartPanel {...cartPanelProps} />
          </div>
        </div>
      )}
    </div>
  )
}
