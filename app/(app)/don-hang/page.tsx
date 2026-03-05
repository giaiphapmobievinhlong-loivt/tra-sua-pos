'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Calendar, Filter, Clock, ChefHat, CheckCircle, XCircle, Package, CreditCard, RefreshCw } from 'lucide-react'

interface OrderItem {
  id: number; product_name: string; quantity: number; unit_price: number; subtotal: number
}

interface Order {
  id: number; order_code: string; total_amount: number; customer_paid: number; change_amount: number
  note: string; status: string; is_paid: boolean; table_number: string | null
  created_at: string; username: string; items: OrderItem[]
}

const STATUSES = [
  { key: 'all',       label: 'Tất cả',     icon: Filter,       color: '' },
  { key: 'pending',   label: 'Chờ xử lý',  icon: Clock,        color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { key: 'brewing',   label: 'Đang pha',   icon: ChefHat,      color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { key: 'ready',     label: 'Sẵn sàng',   icon: Package,      color: 'text-green-600 bg-green-50 border-green-200' },
  { key: 'completed', label: 'Hoàn thành', icon: CheckCircle,  color: 'text-gray-600 bg-gray-50 border-gray-200' },
  { key: 'cancelled', label: 'Đã hủy',     icon: XCircle,      color: 'text-red-500 bg-red-50 border-red-200' },
]

const NEXT_STATUS: Record<string, string> = {
  pending: 'brewing', brewing: 'ready', ready: 'completed',
}

const NEXT_LABEL: Record<string, string> = {
  pending: 'Đang pha', brewing: 'Sẵn sàng', ready: 'Hoàn thành',
}

const STATUS_EMOJI: Record<string, string> = {
  pending: '⏰', brewing: '☕', ready: '✅', completed: '✔', cancelled: '✖',
}

// Pay modal
function PayModal({ order, onClose, onPaid }: { order: Order; onClose: () => void; onPaid: (paid: number) => void }) {
  const [amount, setAmount] = useState(order.total_amount)
  const QUICK = [10000, 20000, 50000, 100000, 200000, 500000]
  const change = amount - order.total_amount

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-sm p-5 shadow-2xl">
        <h3 className="font-bold text-gray-800 text-lg mb-1">Thanh toán đơn #{order.order_code}</h3>
        {order.table_number && <p className="text-sm text-gray-500 mb-4">Bàn {order.table_number}</p>}
        <div className="flex justify-between mb-4">
          <span className="text-gray-600">Tổng tiền</span>
          <span className="font-bold text-orange-500 text-lg">{order.total_amount.toLocaleString('vi-VN')}đ</span>
        </div>
        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700 block mb-1">Khách đưa</label>
          <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))}
            className="input text-right text-lg font-bold" />
          <div className="flex gap-1 mt-2">
            {QUICK.map(a => (
              <button key={a} onClick={() => setAmount(a)}
                className={`flex-1 py-1 text-[10px] border rounded-lg transition-all ${amount === a ? 'bg-orange-50 border-orange-400 text-orange-600 font-bold' : 'border-gray-200 text-gray-500'}`}>
                {a >= 1000 ? `${a/1000}k` : a}
              </button>
            ))}
          </div>
        </div>
        {amount > 0 && (
          <div className="flex justify-between mb-4 py-2 border-t border-gray-100">
            <span className="text-gray-600 text-sm">Tiền thối</span>
            <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>{change.toLocaleString('vi-VN')}đ</span>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Hủy</button>
          <button onClick={() => onPaid(amount)}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2">
            <CreditCard size={16} /> Xác nhận
          </button>
        </div>
      </div>
    </div>
  )
}

// Order card
function OrderCard({ order, onStatusChange, onPay, onCancel }: {
  order: Order
  onStatusChange: (id: number, status: string) => void
  onPay: (order: Order) => void
  onCancel: (id: number) => void
}) {
  const statusInfo = STATUSES.find(s => s.key === order.status) || STATUSES[0]
  const nextStatus = NEXT_STATUS[order.status]
  const isCancelled = order.status === 'cancelled'
  const isCompleted = order.status === 'completed'

  const timeStr = new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all ${isCancelled ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-800 text-sm">#{order.order_code}</span>
          {order.table_number
            ? <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">Bàn {order.table_number}</span>
            : <span className="text-xs bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full">Mang đi</span>
          }
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
            {STATUS_EMOJI[order.status]} {statusInfo.label}
          </span>
          {!order.is_paid && !isCancelled && (
            <span className="text-xs bg-red-50 text-red-500 font-medium px-2 py-0.5 rounded-full border border-red-100">Chưa TT</span>
          )}
          {order.is_paid && (
            <span className="text-xs bg-green-50 text-green-600 font-medium px-2 py-0.5 rounded-full border border-green-100">Đã TT</span>
          )}
        </div>
        <span className="text-xs text-gray-400 shrink-0 ml-2">{timeStr}</span>
      </div>

      {/* Items */}
      <div className="px-4 pb-3 space-y-1 border-b border-gray-50">
        {order.items.map(item => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-700">🧋 {item.product_name} <span className="text-gray-400">×{item.quantity}</span></span>
            <span className="font-medium text-gray-800">{item.subtotal.toLocaleString('vi-VN')} đ</span>
          </div>
        ))}
        {order.note && <p className="text-xs text-gray-400 italic mt-1">📝 {order.note}</p>}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <span className="font-bold text-gray-800">{order.total_amount.toLocaleString('vi-VN')} <span className="text-orange-500">đ</span></span>
        {!isCancelled && (
          <div className="flex items-center gap-2">
            {/* Cancel */}
            {!isCompleted && (
              <button onClick={() => onCancel(order.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 transition-all active:scale-95">
                Hủy
              </button>
            )}
            {/* Pay */}
            {!order.is_paid && (
              <button onClick={() => onPay(order)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition-all active:scale-95 flex items-center gap-1">
                <CreditCard size={12} /> Thanh toán
              </button>
            )}
            {/* Next status */}
            {nextStatus && (
              <button onClick={() => onStatusChange(order.id, nextStatus)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all active:scale-95">
                {NEXT_LABEL[order.status]}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DonHangPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [activeFilter, setActiveFilter] = useState('all')
  const [payingOrder, setPayingOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchOrders = useCallback(async () => {
    const res = await fetch(`/api/orders?date=${date}`)
    const data = await res.json()
    setOrders(data.orders || [])
  }, [date])

  useEffect(() => {
    fetchOrders()
    // Auto-refresh every 20s
    intervalRef.current = setInterval(fetchOrders, 20000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchOrders])

  async function handleStatusChange(id: number, status: string) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    fetchOrders()
  }

  async function handleCancel(id: number) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o))
    await fetch(`/api/orders/${id}`, { method: 'DELETE' })
    fetchOrders()
  }

  async function handlePay(paid: number) {
    if (!payingOrder) return
    setLoading(true)
    try {
      await fetch(`/api/orders/${payingOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_paid: true, customer_paid: paid, change_amount: Math.max(0, paid - payingOrder.total_amount) }),
      })
      setPayingOrder(null)
      fetchOrders()
    } finally {
      setLoading(false)
    }
  }

  const filtered = activeFilter === 'all' ? orders : orders.filter(o => o.status === activeFilter)

  const counts: Record<string, number> = { all: orders.length }
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1 })

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Đơn Hàng</h1>
          <div className="flex items-center gap-2">
            <button onClick={fetchOrders} className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all active:rotate-180" title="Làm mới">
              <RefreshCw size={18} />
            </button>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
              <Calendar size={15} className="text-gray-400 shrink-0" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="text-xs font-medium text-gray-700 focus:outline-none w-28" />
            </div>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUSES.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                activeFilter === key ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}>
              <Icon size={13} />
              {label}
              {counts[key] > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeFilter === key ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4">
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 mt-16">
            <ShoppingCartIcon />
            <p className="text-sm mt-2">Không có đơn hàng nào</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(order => (
            <OrderCard key={order.id} order={order}
              onStatusChange={handleStatusChange}
              onPay={setPayingOrder}
              onCancel={handleCancel}
            />
          ))}
        </div>
      </div>

      {/* Pay modal */}
      {payingOrder && (
        <PayModal order={payingOrder} onClose={() => setPayingOrder(null)} onPaid={handlePay} />
      )}
    </div>
  )
}

function ShoppingCartIcon() {
  return (
    <svg className="mx-auto w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}
