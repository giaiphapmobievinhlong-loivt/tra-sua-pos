'use client'
import { fmt } from '@/lib/utils'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const STATUS_STEPS_NORMAL = [
  { key: 'pending',           icon: '📋', label: 'Đã nhận đơn',    desc: 'Đơn hàng đang chờ xác nhận' },
  { key: 'awaiting_confirm',  icon: '💳', label: 'Chờ duyệt TT',   desc: 'Đang chờ nhân viên xác nhận thanh toán...' },
  { key: 'brewing',           icon: '☕', label: 'Đang pha chế',   desc: 'Nhân viên đang làm đồ uống cho bạn 🐱' },
  { key: 'ready',             icon: '✅', label: 'Sẵn sàng',       desc: 'Đồ uống đã xong, vui lòng nhận tại quầy!' },
  { key: 'completed',         icon: '🎉', label: 'Hoàn thành',     desc: 'Cảm ơn bạn đã đến Trà Sữa Nhà Mèo!' },
]
const STATUS_ORDER_NORMAL = ['pending','awaiting_confirm','brewing','ready','completed']

const STATUS_STEPS_DELIVERY = [
  { key: 'pending',           icon: '📋', label: 'Đã nhận đơn',    desc: 'Đơn hàng đang chờ xác nhận' },
  { key: 'awaiting_confirm',  icon: '💳', label: 'Chờ duyệt TT',   desc: 'Đang chờ nhân viên xác nhận thanh toán...' },
  { key: 'brewing',           icon: '☕', label: 'Đang pha chế',   desc: 'Đang chuẩn bị đồ uống cho bạn 🐱' },
  { key: 'delivering',        icon: '🛵', label: 'Đang giao hàng', desc: 'Shipper đang trên đường đến bạn!' },
  { key: 'completed',         icon: '🎉', label: 'Đã giao xong',   desc: 'Cảm ơn bạn đã đặt hàng tại Nhà Mèo!' },
]
const STATUS_ORDER_DELIVERY = ['pending','awaiting_confirm','brewing','delivering','completed']

interface OrderItem {
  id: number
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  item_note?: string
}
interface Order {
  id: number
  order_code: string
  status: string
  total_amount: number
  table_number: string | null
  customer_name: string
  customer_phone?: string
  items: OrderItem[]
  is_paid: boolean
  created_at: string
  order_type?: string
  delivery_address?: string
  delivery_fee?: number
}

function orderTypeBadge(order: Order) {
  if (order.order_type === 'delivery') {
    return <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full">🛵 Giao hàng</span>
  }
  if (order.order_type === 'takeaway') {
    return <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2.5 py-1 rounded-full">🛍 Mang về</span>
  }
  // dine_in (or legacy orders without order_type)
  return order.table_number
    ? <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2.5 py-1 rounded-full">🪑 Bàn {order.table_number}</span>
    : <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2.5 py-1 rounded-full">🪑 Tại quán</span>
}

function TrackContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [code, setCode] = useState(params.get('code') || '')
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Edit state — keyed by item id → new quantity
  const [editQtys, setEditQtys] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const prevOrderId = useRef<number | null>(null)

  async function fetchOrder(c: string) {
    if (!c) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/public/orders?code=${c}`)
      const data = await res.json()
      if (data.order) {
        setOrder(data.order)
        setLastUpdated(new Date())
        // Only reset edit state when a different order is loaded
        if (prevOrderId.current !== data.order.id) {
          prevOrderId.current = data.order.id
          setEditQtys(Object.fromEntries(data.order.items.map((i: OrderItem) => [i.id, i.quantity])))
        }
      } else {
        setError(data.error || 'Không tìm thấy đơn')
      }
    } catch { setError('Lỗi kết nối') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (code) fetchOrder(code)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!order || order.status === 'completed' || order.status === 'cancelled') return
    const iv = setInterval(() => fetchOrder(order.order_code), 10000)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order])

  const hasEdits = order?.items.some(i => (editQtys[i.id] ?? i.quantity) !== i.quantity) ?? false

  async function handleSaveItems() {
    if (!order || !hasEdits) return
    setSaving(true)
    setSaveMsg('')
    try {
      const updates = order.items
        .map(i => ({ id: i.id, quantity: editQtys[i.id] ?? i.quantity }))
        .filter(u => u.quantity !== order.items.find(i => i.id === u.id)?.quantity)

      const res = await fetch('/api/public/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: order.order_code, updates }),
      })
      const data = await res.json()
      if (data.order) {
        setOrder(data.order)
        setEditQtys(Object.fromEntries(data.order.items.map((i: OrderItem) => [i.id, i.quantity])))
        setSaveMsg('✅ Đã cập nhật đơn hàng!')
        setTimeout(() => setSaveMsg(''), 3000)
      } else {
        setSaveMsg(`❌ ${data.error || 'Có lỗi xảy ra'}`)
      }
    } catch {
      setSaveMsg('❌ Lỗi kết nối')
    } finally {
      setSaving(false)
    }
  }

  function setItemQty(itemId: number, qty: number) {
    setEditQtys(prev => ({ ...prev, [itemId]: Math.max(0, qty) }))
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@700;800&display=swap" rel="stylesheet" />

      <header className="bg-white border-b border-orange-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 text-xl">←</button>
        <span className="text-2xl">🧋</span>
        <span style={{ fontFamily: "'Baloo 2', cursive" }} className="font-bold text-orange-600">Theo dõi đơn</span>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Search */}
        <div className="flex gap-2 mb-6">
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Nhập mã đơn hàng..."
            className="flex-1 text-sm px-4 py-3 border border-orange-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-300 font-bold tracking-wider bg-white" />
          <button onClick={() => fetchOrder(code)} disabled={loading}
            className="bg-orange-500 text-white px-5 py-3 rounded-2xl font-bold text-sm active:bg-orange-600 disabled:bg-gray-300 transition-all">
            {loading ? '⏳' : '🔍'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm mb-4">{error}</div>
        )}

        {order && (
          <div className="space-y-4">
            {/* Order header */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-orange-100">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-gray-400 font-semibold">MÃ ĐƠN</p>
                  <p className="text-2xl font-black text-gray-800 tracking-wider">#{order.order_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Tổng tiền</p>
                  <p className="text-lg font-extrabold text-orange-500">{fmt(order.total_amount)}đ</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {orderTypeBadge(order)}
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${order.is_paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {order.is_paid ? '✓ Đã TT' : '⏳ Chờ TT'}
                </span>
              </div>
            </div>

            {/* Status timeline */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-orange-100">
              <p className="font-bold text-gray-800 mb-4 text-sm">Trạng thái đơn hàng</p>
              {order.status === 'cancelled' ? (
                <div className="text-center py-4">
                  <p className="text-4xl mb-2">😢</p>
                  <p className="font-bold text-red-500">Đơn hàng đã bị hủy</p>
                  <p className="text-xs text-gray-400 mt-1">Vui lòng liên hệ nhân viên nếu có thắc mắc</p>
                </div>
              ) : (() => {
                const isDelivery = order.order_type === 'delivery'
                const steps = isDelivery ? STATUS_STEPS_DELIVERY : STATUS_STEPS_NORMAL
                const stepOrder = isDelivery ? STATUS_ORDER_DELIVERY : STATUS_ORDER_NORMAL
                const curStep = stepOrder.indexOf(order.status)
                return (
                  <div className="space-y-0">
                    {steps.map((step, idx) => {
                      const done = idx <= curStep
                      const current = idx === curStep
                      return (
                        <div key={step.key} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                              done ? 'bg-orange-500 border-orange-500' : 'bg-gray-50 border-gray-200'
                            } ${current ? 'ring-4 ring-orange-200 scale-110' : ''}`}>
                              {done ? step.icon : <span className="text-gray-300 text-sm">○</span>}
                            </div>
                            {idx < steps.length - 1 && (
                              <div className={`w-0.5 h-8 mt-1 ${idx < curStep ? 'bg-orange-400' : 'bg-gray-200'}`} />
                            )}
                          </div>
                          <div className={`pt-2 pb-6 ${idx === steps.length - 1 ? 'pb-0' : ''}`}>
                            <p className={`text-sm font-bold ${done ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</p>
                            {current && <p className="text-xs text-orange-500 mt-0.5">{step.desc}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            {/* Items — editable when pending, read-only otherwise */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-orange-100">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-gray-800 text-sm">Chi tiết đơn</p>
                {order.status === 'pending' && (
                  <span className="text-[10px] bg-orange-50 text-orange-500 border border-orange-100 font-semibold px-2 py-0.5 rounded-full">
                    ✏️ Có thể chỉnh số lượng
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {order.items.map(item => {
                  const qty = editQtys[item.id] ?? item.quantity
                  const isDeleted = qty === 0
                  const canEdit = order.status === 'pending'

                  return (
                    <div key={item.id} className={`transition-all ${isDeleted ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-gray-700">
                              🧋 <span className={isDeleted ? 'line-through text-gray-400' : ''}>{item.product_name}</span>
                            </span>
                          </div>
                          {item.item_note && <p className="text-xs text-orange-400 italic ml-5">✏️ {item.item_note}</p>}
                        </div>

                        {canEdit ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setItemQty(item.id, qty - 1)}
                              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 active:scale-90 transition-transform text-base leading-none">
                              {qty === 1 ? '🗑' : '−'}
                            </button>
                            <span className={`w-6 text-center font-bold text-sm ${qty !== item.quantity ? 'text-orange-500' : 'text-gray-800'}`}>
                              {isDeleted ? <span className="text-red-400 text-xs">xóa</span> : qty}
                            </span>
                            <button
                              onClick={() => setItemQty(item.id, qty + 1)}
                              disabled={isDeleted}
                              className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold active:scale-90 transition-transform disabled:opacity-40">
                              +
                            </button>
                            {isDeleted && (
                              <button onClick={() => setItemQty(item.id, item.quantity)}
                                className="text-[10px] text-orange-500 font-semibold underline ml-1">
                                Hoàn tác
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs shrink-0">×{item.quantity}</span>
                        )}

                        <span className="font-bold tabular-nums text-sm shrink-0 w-16 text-right">
                          {fmt(Number(item.unit_price) * Math.max(0, qty))}đ
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
                <span className="font-bold text-gray-700">Tổng</span>
                <span className="font-extrabold text-orange-500">{fmt(Number(order.total_amount))}đ</span>
              </div>

              {/* Save button — only when pending and has changes */}
              {order.status === 'pending' && (
                <div className="mt-4 space-y-2">
                  {saveMsg && (
                    <p className={`text-xs text-center font-semibold ${saveMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
                      {saveMsg}
                    </p>
                  )}
                  <button
                    onClick={handleSaveItems}
                    disabled={!hasEdits || saving}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-2xl text-sm transition-all active:scale-[0.98]">
                    {saving ? '⏳ Đang lưu...' : hasEdits ? '💾 Lưu thay đổi' : 'Chưa có thay đổi'}
                  </button>
                </div>
              )}
            </div>

            {lastUpdated && (
              <p className="text-center text-xs text-gray-400">
                Cập nhật lần cuối: {lastUpdated.toLocaleTimeString('vi-VN')}
                {order.status !== 'completed' && order.status !== 'cancelled' && ' · Tự động làm mới mỗi 10 giây'}
              </p>
            )}
          </div>
        )}

        {!order && !error && !loading && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">🔍</p>
            <p className="font-bold">Nhập mã đơn để theo dõi</p>
            <p className="text-xs mt-1">Mã đơn được cung cấp sau khi đặt hàng</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TrackPage() {
  return <Suspense><TrackContent /></Suspense>
}
