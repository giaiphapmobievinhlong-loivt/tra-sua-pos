'use client'
import { apiFetch } from '@/lib/apiFetch'
import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, MapPin, Phone, User, Clock, ChefHat, Bike, CheckCircle, XCircle, AlertCircle, CreditCard } from 'lucide-react'

interface OrderItem { id: number; product_name: string; quantity: number; subtotal: number; item_note?: string }
interface DeliveryOrder {
  id: number; order_code: string; total_amount: number; delivery_fee: number
  customer_name: string; customer_phone: string; delivery_address: string
  note: string; status: string; is_paid: boolean; pay_method: string | null
  created_at: string; items: OrderItem[]
}

const fmt = (n: number) => Number(n).toLocaleString('vi-VN')

const DELIVERY_STATUSES = [
  { key: 'pending',          icon: '⏰', label: 'Chờ xác nhận',  color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { key: 'awaiting_confirm', icon: '💳', label: 'Chờ duyệt TT',  color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { key: 'brewing',          icon: '☕', label: 'Đang pha chế',  color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { key: 'delivering',       icon: '🛵', label: 'Đang giao',     color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { key: 'completed',        icon: '✅', label: 'Đã giao',       color: 'text-green-600 bg-green-50 border-green-200' },
  { key: 'cancelled',        icon: '✖',  label: 'Đã hủy',       color: 'text-red-500 bg-red-50 border-red-200' },
]

const NEXT_STATUS: Record<string, string> = {
  pending: 'brewing',
  awaiting_confirm: 'brewing',
  brewing: 'delivering',
  delivering: 'completed',
}
const NEXT_LABEL: Record<string, string> = {
  pending: '☕ Bắt đầu pha',
  awaiting_confirm: '✓ Duyệt & Pha',
  brewing: '🛵 Bắt đầu giao',
  delivering: '✅ Giao xong',
}

function getTodayVN() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function StatusBadge({ status }: { status: string }) {
  const s = DELIVERY_STATUSES.find(x => x.key === status)
  if (!s) return null
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${s.color}`}>
      {s.icon} {s.label}
    </span>
  )
}

function DeliveryCard({ order, onStatusChange, onCancel, onApprovePay }: {
  order: DeliveryOrder
  onStatusChange: (id: number, status: string) => void
  onCancel: (id: number) => void
  onApprovePay: (id: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const nextStatus = NEXT_STATUS[order.status]
  const isFinal = order.status === 'completed' || order.status === 'cancelled'
  const subtotal = Number(order.total_amount) - Number(order.delivery_fee || 0)

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
      order.status === 'awaiting_confirm' ? 'border-purple-300' :
      order.status === 'delivering' ? 'border-blue-300' :
      order.status === 'pending' ? 'border-yellow-300' : 'border-gray-100'
    }`}>
      {/* Card header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left px-4 pt-3.5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-gray-800 text-sm">#{order.order_code}</span>
              <StatusBadge status={order.status} />
              {!order.is_paid && <span className="text-[10px] bg-yellow-100 text-yellow-700 font-bold px-1.5 py-0.5 rounded-full">Chưa TT</span>}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold mb-0.5">
              <User size={11} className="shrink-0" />
              <span>{order.customer_name || 'Khách'}</span>
              {order.customer_phone && <><span className="text-gray-300">·</span><Phone size={11} /><span>{order.customer_phone}</span></>}
            </div>
            <div className="flex items-start gap-1.5 text-xs text-gray-500">
              <MapPin size={11} className="shrink-0 mt-0.5 text-orange-400" />
              <span className="line-clamp-1">{order.delivery_address}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-extrabold text-orange-500 text-sm">{fmt(Number(order.total_amount))}đ</p>
            <p className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-50 pt-3 space-y-2">
          {/* Address full */}
          <div className="bg-blue-50 rounded-xl px-3 py-2.5 flex gap-2">
            <MapPin size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-700">Địa chỉ giao hàng</p>
              <p className="text-xs text-blue-800 mt-0.5">{order.delivery_address}</p>
            </div>
          </div>
          {/* Contact */}
          <a href={`tel:${order.customer_phone}`}
            className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2 text-green-700 text-xs font-bold">
            <Phone size={13} /> Gọi {order.customer_name}: {order.customer_phone}
          </a>
          {/* Items */}
          <div className="space-y-1">
            {order.items.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs text-gray-700">
                  <span>🧋 {item.product_name} <span className="text-gray-400">×{item.quantity}</span></span>
                  <span className="font-semibold">{fmt(Number(item.subtotal))}đ</span>
                </div>
                {item.item_note && <p className="text-[10px] text-orange-400 italic ml-4">✏️ {item.item_note}</p>}
              </div>
            ))}
          </div>
          {/* Fee breakdown */}
          <div className="bg-gray-50 rounded-xl px-3 py-2 space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Tiền món</span><span>{fmt(subtotal)}đ</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>🛵 Phí ship</span><span>{fmt(Number(order.delivery_fee))}đ</span>
            </div>
            <div className="flex justify-between text-xs font-bold border-t border-gray-200 pt-1 mt-1">
              <span>Tổng</span><span className="text-orange-500">{fmt(Number(order.total_amount))}đ</span>
            </div>
          </div>
          {order.note && (
            <p className="text-xs text-gray-500 italic bg-gray-50 rounded-xl px-3 py-2">📝 {order.note}</p>
          )}
        </div>
      )}

      {/* Actions */}
      {!isFinal && (
        <div className="px-4 pb-3.5 flex gap-2 flex-wrap">
          <button onClick={() => onCancel(order.id)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-500 border border-red-100 active:scale-95">
            Hủy
          </button>
          {order.status === 'awaiting_confirm' && (
            <button onClick={() => onApprovePay(order.id)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500 text-white active:scale-95 flex items-center gap-1">
              <CreditCard size={11} /> Duyệt TT
            </button>
          )}
          {nextStatus && nextStatus !== 'brewing' || order.status === 'awaiting_confirm' ? null :
            nextStatus && (
              <button onClick={() => onStatusChange(order.id, nextStatus)}
                className="flex-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500 text-white active:scale-95 text-center">
                {NEXT_LABEL[order.status]}
              </button>
            )
          }
          {nextStatus && order.status !== 'awaiting_confirm' && (
            <button onClick={() => onStatusChange(order.id, nextStatus)}
              className="flex-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500 text-white active:scale-95 text-center">
              {NEXT_LABEL[order.status]}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function GiaoHangPage() {
  const [orders, setOrders]       = useState<DeliveryOrder[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [date, setDate]           = useState(getTodayVN)
  const [filter, setFilter]       = useState('active') // active | all
  const [newCount, setNewCount]   = useState(0)
  const seenIds                   = useRef<Set<number>>(new Set())
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      setError('')
      const res = await fetch(`/api/orders?date=${date}&type=delivery`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Lỗi'); return }
      const fetched: DeliveryOrder[] = (data.orders || []).filter((o: DeliveryOrder & { order_type?: string }) =>
        o.order_type === 'delivery'
      )
      setOrders(fetched)
      // notify new
      const newOnes = fetched.filter(o => o.status === 'pending' && !seenIds.current.has(o.id))
      if (newOnes.length > 0) {
        newOnes.forEach(o => seenIds.current.add(o.id))
        setNewCount(p => p + newOnes.length)
      }
    } catch (e) { setError(`Lỗi: ${e}`) }
    finally { setLoading(false) }
  }, [date])

  useEffect(() => {
    setLoading(true); fetchOrders()
    intervalRef.current = setInterval(fetchOrders, 15000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchOrders])

  async function handleStatusChange(id: number, status: string) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    await apiFetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    fetchOrders()
  }
  async function handleCancel(id: number) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o))
    await apiFetch(`/api/orders/${id}`, { method: 'DELETE' })
    fetchOrders()
  }
  async function handleApprovePay(id: number) {
    await apiFetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_paid: true, pay_method: 'transfer', status: 'brewing' }) })
    fetchOrders()
  }

  const FILTER_STATUSES = ['pending', 'awaiting_confirm', 'brewing', 'delivering']
  const displayed = filter === 'active'
    ? orders.filter(o => FILTER_STATUSES.includes(o.status))
    : orders

  const counts: Record<string, number> = {}
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1 })
  const activeCount = orders.filter(o => FILTER_STATUSES.includes(o.status)).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800">Giao Hàng</h1>
            {activeCount > 0 && (
              <span className="bg-blue-500 text-white text-xs font-black px-2 py-0.5 rounded-full">{activeCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300" />
            <button onClick={() => { setLoading(true); fetchOrders() }}
              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all">
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* New order notification */}
        {newCount > 0 && (
          <div className="mb-3 bg-blue-50 border border-blue-300 text-blue-700 px-4 py-2.5 rounded-xl flex items-center justify-between text-sm">
            <span className="font-bold flex items-center gap-2">🛵 {newCount} đơn giao mới!</span>
            <button onClick={() => setNewCount(0)} className="text-blue-400 font-bold">✕</button>
          </div>
        )}

        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { key: 'pending',    icon: '⏰', label: 'Chờ',     color: 'text-yellow-600' },
            { key: 'brewing',    icon: '☕', label: 'Đang pha', color: 'text-orange-600' },
            { key: 'delivering', icon: '🛵', label: 'Đang giao',color: 'text-blue-600' },
            { key: 'completed',  icon: '✅', label: 'Xong',     color: 'text-green-600' },
          ].map(s => (
            <div key={s.key} className="bg-white rounded-xl p-2 text-center border border-gray-100">
              <p className="text-lg">{s.icon}</p>
              <p className={`text-base font-black ${s.color}`}>{counts[s.key] || 0}</p>
              <p className="text-[10px] text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter toggle */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setFilter('active')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'active' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
            Đang xử lý ({activeCount})
          </button>
          <button onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
            Tất cả ({orders.length})
          </button>
        </div>
      </div>

      {/* Order list */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6 space-y-3">
        {loading && <div className="text-center py-12 text-gray-400 text-sm">Đang tải...</div>}
        {!loading && displayed.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">🛵</p>
            <p className="text-gray-400 text-sm font-semibold">
              {filter === 'active' ? 'Không có đơn giao đang xử lý' : 'Chưa có đơn giao hàng hôm nay'}
            </p>
          </div>
        )}
        {displayed.map(order => (
          <DeliveryCard
            key={order.id}
            order={order}
            onStatusChange={handleStatusChange}
            onCancel={handleCancel}
            onApprovePay={handleApprovePay}
          />
        ))}
      </div>
    </div>
  )
}
