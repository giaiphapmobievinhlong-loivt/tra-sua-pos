'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Calendar, Filter, Clock, ChefHat, CheckCircle, XCircle, Package, CreditCard, RefreshCw, Banknote, QrCode, AlertCircle } from 'lucide-react'

interface OrderItem {
  id: number; product_name: string; quantity: number; unit_price: number; subtotal: number
}
interface Order {
  id: number; order_code: string; total_amount: number; customer_paid: number; change_amount: number
  note: string; status: string; is_paid: boolean; table_number: string | null; pay_method: string | null
  created_at: string; username: string; items: OrderItem[]
}

const STATUSES = [
  { key: 'all',       label: 'Tất cả',   icon: Filter,      color: '' },
  { key: 'pending',   label: 'Chờ',      icon: Clock,       color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { key: 'brewing',   label: 'Đang pha', icon: ChefHat,     color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { key: 'ready',     label: 'Sẵn sàng', icon: Package,     color: 'text-green-600 bg-green-50 border-green-200' },
  { key: 'completed', label: 'Xong',     icon: CheckCircle, color: 'text-gray-600 bg-gray-50 border-gray-200' },
  { key: 'cancelled', label: 'Đã hủy',  icon: XCircle,     color: 'text-red-500 bg-red-50 border-red-200' },
]
const NEXT_STATUS: Record<string, string> = { pending: 'brewing', brewing: 'ready', ready: 'completed' }
const NEXT_LABEL: Record<string, string>  = { pending: 'Đang pha', brewing: 'Sẵn sàng', ready: 'Hoàn thành' }
const STATUS_EMOJI: Record<string, string> = { pending: '⏰', brewing: '☕', ready: '📦', completed: '✔', cancelled: '✖' }
const MOMO_QR = 'https://res.cloudinary.com/loivo/image/upload/v1772727855/thanhtoanmomo_iyoxds.jpg'
const QUICK = [10000, 20000, 50000, 100000, 200000, 500000]
type PayMethod = 'cash' | 'transfer'

function getTodayVN() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0]
}

// ── Pay Modal ────────────────────────────────────────────────
function PayModal({ order, onClose, onPaid }: {
  order: Order
  onClose: () => void
  onPaid: (paid: number, method: PayMethod) => void
}) {
  const [method, setMethod] = useState<PayMethod>('cash')
  const [amount, setAmount] = useState(order.total_amount)
  const change = amount - order.total_amount
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h3 className="font-bold text-gray-800 text-lg">Thanh toán #{order.order_code}</h3>
          <div className="flex items-center gap-2 mt-1">
            {order.table_number
              ? <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">Bàn {order.table_number}</span>
              : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Mang đi</span>}
            <span className="text-sm text-gray-500">· <strong className="text-orange-500">{order.total_amount.toLocaleString('vi-VN')}đ</strong></span>
          </div>
        </div>
        <div className="px-5 pb-3">
          <div className="flex gap-2">
            <button onClick={() => setMethod('cash')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${method === 'cash' ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
              <Banknote size={16} /> Tiền mặt
            </button>
            <button onClick={() => setMethod('transfer')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${method === 'transfer' ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-500'}`}>
              <QrCode size={16} /> Chuyển khoản
            </button>
          </div>
        </div>
        {method === 'cash' && (
          <div className="px-5 pb-4 space-y-3">
            <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className="input text-right text-lg font-bold" />
            <div className="flex gap-1">
              {QUICK.map(a => (
                <button key={a} onClick={() => setAmount(a)} className={`flex-1 py-1 text-[10px] border rounded-lg ${amount === a ? 'bg-green-50 border-green-400 text-green-700 font-bold' : 'border-gray-200 text-gray-500'}`}>
                  {a >= 1000 ? `${a / 1000}k` : a}
                </button>
              ))}
            </div>
            {amount > 0 && (
              <div className="flex justify-between py-2 border-t border-gray-100">
                <span className="text-sm text-gray-500">Tiền thối</span>
                <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>{change.toLocaleString('vi-VN')}đ</span>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 btn-secondary">Hủy</button>
              <button onClick={() => onPaid(amount, 'cash')} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2">
                <Banknote size={16} /> Xác nhận
              </button>
            </div>
          </div>
        )}
        {method === 'transfer' && (
          <div className="px-5 pb-5 space-y-3">
            <div className="rounded-2xl bg-pink-50 border border-pink-100 p-4 text-center">
              <p className="text-xs font-semibold text-pink-600 mb-3">Quét mã chuyển <strong>{order.total_amount.toLocaleString('vi-VN')}đ</strong></p>
              <img src={MOMO_QR} alt="QR" className="w-56 h-auto rounded-xl shadow mx-auto" />
              <p className="text-xs text-pink-400 mt-2">MoMo · VietQR · Napas 247</p>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 btn-secondary">Hủy</button>
              <button onClick={() => onPaid(order.total_amount, 'transfer')} className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2">
                <CheckCircle size={16} /> Đã nhận tiền
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Order Card ───────────────────────────────────────────────
function OrderCard({ order, onStatusChange, onPay, onCancel }: {
  order: Order
  onStatusChange: (id: number, status: string) => void
  onPay: (order: Order) => void
  onCancel: (id: number) => void
}) {
  const statusInfo = STATUSES.find(s => s.key === order.status) || STATUSES[1]
  const nextStatus = NEXT_STATUS[order.status]
  const isCancelled = order.status === 'cancelled'
  const timeStr = new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${isCancelled ? 'opacity-55' : ''}`}>
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-gray-800 text-sm">#{order.order_code}</span>
          {order.table_number
            ? <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">Bàn {order.table_number}</span>
            : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Mang đi</span>}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
            {STATUS_EMOJI[order.status]} {statusInfo.label}
          </span>
        </div>
        <span className="text-xs text-gray-400 shrink-0">{timeStr}</span>
      </div>
      <div className="px-4 pb-2 flex items-center gap-1.5">
        {order.is_paid
          ? <span className="text-[10px] bg-green-50 text-green-600 border border-green-100 font-semibold px-2 py-0.5 rounded-full">✓ Đã TT</span>
          : <span className="text-[10px] bg-red-50 text-red-500 border border-red-100 font-semibold px-2 py-0.5 rounded-full">Chưa TT</span>}
        {order.pay_method === 'cash' && <span className="text-[10px] bg-green-50 text-green-600 border border-green-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Banknote size={9} /> Tiền mặt</span>}
        {order.pay_method === 'transfer' && <span className="text-[10px] bg-pink-50 text-pink-600 border border-pink-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><QrCode size={9} /> CK</span>}
      </div>
      <div className="px-4 pb-3 space-y-1 border-b border-gray-50">
        {order.items.map(item => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-700">🧋 {item.product_name} <span className="text-gray-400 text-xs">×{item.quantity}</span></span>
            <span className="font-medium">{item.subtotal.toLocaleString('vi-VN')}đ</span>
          </div>
        ))}
        {order.note && <p className="text-xs text-gray-400 italic mt-1">📝 {order.note}</p>}
      </div>
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <span className="font-bold text-gray-800 text-sm">{order.total_amount.toLocaleString('vi-VN')} <span className="text-orange-500">đ</span></span>
        {!isCancelled && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {order.status !== 'completed' && (
              <button onClick={() => onCancel(order.id)} className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 active:scale-95">Hủy</button>
            )}
            {!order.is_paid && (
              <button onClick={() => onPay(order)} className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 active:scale-95 flex items-center gap-1">
                <CreditCard size={11} /> Thanh toán
              </button>
            )}
            {nextStatus && (
              <button onClick={() => onStatusChange(order.id, nextStatus)} className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 active:scale-95">
                {NEXT_LABEL[order.status]}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function DonHangPage() {
  const [orders, setOrders]             = useState<Order[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [date, setDate]                 = useState(getTodayVN)
  const [activeFilter, setActiveFilter] = useState('all')
  const [payingOrder, setPayingOrder]   = useState<Order | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      setError('')
      const res = await fetch(`/api/orders?date=${date}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Lỗi HTTP ${res.status}`)
        return
      }
      setOrders(data.orders || [])
    } catch (e) {
      setError(`Lỗi kết nối: ${e}`)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    setLoading(true)
    fetchOrders()
    intervalRef.current = setInterval(fetchOrders, 15000)
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
  async function handlePay(paid: number, method: PayMethod) {
    if (!payingOrder) return
    await fetch(`/api/orders/${payingOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_paid: true, customer_paid: paid, change_amount: Math.max(0, paid - payingOrder.total_amount), pay_method: method }),
    })
    setPayingOrder(null)
    fetchOrders()
  }

  const filtered = activeFilter === 'all' ? orders : orders.filter(o => o.status === activeFilter)
  const counts: Record<string, number> = { all: orders.length }
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1 })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-800">Đơn Hàng</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => { setLoading(true); fetchOrders() }}
              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all">
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
              <Calendar size={14} className="text-gray-400 shrink-0" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="text-xs font-medium text-gray-700 focus:outline-none w-28" />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUSES.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveFilter(key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                activeFilter === key ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}>
              <Icon size={12} /> {label}
              {(counts[key] || 0) > 0 && (
                <span className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeFilter === key ? 'bg-white/30' : 'bg-gray-100 text-gray-500'}`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4">
        {loading && (
          <div className="text-center text-gray-400 py-12">
            <RefreshCw size={24} className="mx-auto mb-2 animate-spin opacity-40" />
            <p className="text-sm">Đang tải...</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center mt-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Package size={28} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Không có đơn hàng</p>
            <p className="text-xs text-gray-300 mt-1">Ngày {date}</p>
            <button onClick={() => { setLoading(true); fetchOrders() }}
              className="mt-4 text-xs text-orange-500 font-semibold border border-orange-200 bg-orange-50 px-4 py-2 rounded-xl hover:bg-orange-100 transition-all">
              Tải lại
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {!loading && filtered.map(order => (
            <OrderCard key={order.id} order={order}
              onStatusChange={handleStatusChange} onPay={setPayingOrder} onCancel={handleCancel} />
          ))}
        </div>
      </div>

      {payingOrder && (
        <PayModal order={payingOrder} onClose={() => setPayingOrder(null)} onPaid={handlePay} />
      )}
    </div>
  )
}
