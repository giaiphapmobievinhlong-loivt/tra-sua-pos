'use client'
import { MOMO_QR } from '@/lib/constants'
import { apiFetch } from '@/lib/apiFetch'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Calendar, Filter, Clock, ChefHat, CheckCircle, XCircle, Package, CreditCard, RefreshCw, Banknote, QrCode, AlertCircle, Globe, Truck, MapPin } from 'lucide-react'

interface OrderItem {
  id: number; product_name: string; quantity: number; unit_price: number; subtotal: number; item_note?: string
}
interface Order {
  id: number; order_code: string; total_amount: number; customer_paid: number; change_amount: number
  note: string; status: string; discount_amount?: number; discount_name?: string; is_paid: boolean; table_number: string | null; pay_method: string | null
  created_at: string; username: string; items: OrderItem[]
  source?: string; customer_name?: string; customer_phone?: string
  delivery_address?: string; delivery_fee?: number; order_type?: string
}

const fmt = (n: number) => Number(n).toLocaleString('vi-VN')

const STATUSES = [
  { key: 'all',               label: 'Tất cả',      icon: Filter,      color: '' },
  { key: 'pending',           label: 'Chờ',         icon: Clock,       color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { key: 'awaiting_confirm',  label: 'Chờ duyệt TT', icon: CreditCard,  color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { key: 'brewing',           label: 'Đang pha',    icon: ChefHat,     color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { key: 'delivering',        label: 'Đang giao',   icon: Truck,       color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { key: 'ready',             label: 'Sẵn sàng',   icon: Package,     color: 'text-green-600 bg-green-50 border-green-200' },
  { key: 'completed',         label: 'Xong',        icon: CheckCircle, color: 'text-gray-600 bg-gray-50 border-gray-200' },
  { key: 'cancelled',         label: 'Đã hủy',     icon: XCircle,     color: 'text-red-500 bg-red-50 border-red-200' },
]
const NEXT_STATUS: Record<string, string> = {
  pending: 'brewing', awaiting_confirm: 'brewing',
  brewing: 'delivering', // delivery orders go to delivering; normal orders skip this (handled in UI)
  ready: 'completed', delivering: 'completed'
}
const NEXT_LABEL: Record<string, string> = {
  pending: 'Đang pha', awaiting_confirm: '✓ Duyệt & Pha',
  brewing: 'Đang giao', ready: 'Hoàn thành', delivering: 'Đã giao xong'
}
const NEXT_STATUS_NORMAL: Record<string, string> = { pending: 'brewing', awaiting_confirm: 'brewing', brewing: 'ready', ready: 'completed' }
const NEXT_LABEL_NORMAL: Record<string, string> = { pending: 'Đang pha', awaiting_confirm: '✓ Duyệt & Pha', brewing: 'Sẵn sàng', ready: 'Hoàn thành' }
const STATUS_EMOJI: Record<string, string> = { pending: '⏰', awaiting_confirm: '💳', brewing: '☕', delivering: '🛵', ready: '📦', completed: '✔', cancelled: '✖' }
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
            <span className="text-sm text-gray-500">· <strong className="text-orange-500">{fmt(order.total_amount)}đ</strong></span>
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
                <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(change)}đ</span>
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
              <p className="text-xs font-semibold text-pink-600 mb-3">Quét mã chuyển <strong>{fmt(order.total_amount)}đ</strong></p>
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
  const isDelivery = order.order_type === 'delivery'
  const nextStatus = isDelivery ? NEXT_STATUS[order.status] : NEXT_STATUS_NORMAL[order.status]
  const nextLabel  = isDelivery ? NEXT_LABEL[order.status]  : NEXT_LABEL_NORMAL[order.status]
  const isCancelled = order.status === 'cancelled'
  const timeStr = new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${isCancelled ? 'opacity-55' : ''}`}>
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-gray-800 text-sm">#{order.order_code}</span>
          {order.order_type === 'delivery'
            ? <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"><Truck size={10}/>Giao hàng</span>
            : order.table_number
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
          : order.status === 'awaiting_confirm'
            ? <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-100 font-semibold px-2 py-0.5 rounded-full">💳 Chờ duyệt</span>
            : <span className="text-[10px] bg-red-50 text-red-500 border border-red-100 font-semibold px-2 py-0.5 rounded-full">Chưa TT</span>}
        {order.pay_method === 'cash' && <span className="text-[10px] bg-green-50 text-green-600 border border-green-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Banknote size={9} /> Tiền mặt</span>}
        {order.pay_method === 'transfer' && <span className="text-[10px] bg-pink-50 text-pink-600 border border-pink-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><QrCode size={9} /> CK</span>}
      </div>
      <div className="px-4 pb-3 space-y-1 border-b border-gray-50">
        {order.items.map(item => (
          <div key={item.id} className="text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">🧋 {item.product_name} <span className="text-gray-400 text-xs">×{item.quantity}</span></span>
              <span className="font-medium shrink-0 ml-2">{fmt(item.subtotal)}đ</span>
            </div>
            {item.item_note && <p className="text-[11px] text-orange-500 italic ml-5">✏️ {item.item_note}</p>}
          </div>
        ))}
        {order.note && <p className="text-xs text-gray-400 italic mt-1">📝 {order.note}</p>}
        {order.order_type === 'delivery' && order.delivery_address && (
          <div className="mt-2 bg-blue-50 rounded-xl px-3 py-2 space-y-0.5">
            <p className="text-xs font-bold text-blue-700 flex items-center gap-1"><MapPin size={10}/>Giao đến</p>
            <p className="text-xs text-blue-800">{order.delivery_address}</p>
            {order.customer_name && <p className="text-xs text-blue-600">👤 {order.customer_name}</p>}
            {order.customer_phone && <p className="text-xs text-blue-600">📞 {order.customer_phone}</p>}
            {order.delivery_fee && Number(order.delivery_fee) > 0 && (
              <p className="text-xs text-blue-600">🛵 Phí ship: {fmt(Number(order.delivery_fee))}đ</p>
            )}
          </div>
        )}
      </div>
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <span className="font-bold text-gray-800 text-sm"><span className="text-orange-500">{fmt(order.total_amount)}đ</span></span>
        {!isCancelled && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {order.status !== 'completed' && (
              <button onClick={() => onCancel(order.id)} className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 active:scale-95">Hủy</button>
            )}
            {!order.is_paid && order.source !== 'web' && (
              <button onClick={() => onPay(order)} className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 active:scale-95 flex items-center gap-1">
                <CreditCard size={11} /> Thanh toán
              </button>
            )}
            {nextStatus && !(order.source === 'web' && order.status === 'pending') && (
              <button onClick={() => onStatusChange(order.id, nextStatus)} className="flex-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 active:scale-95 text-center">
                ☕ {nextLabel}
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
  const [activeTab, setActiveTab]        = useState<'orders'|'delivery'>('orders')
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const seenIds            = useRef<Set<number>>(new Set())
  const seenConfirmIds     = useRef<Set<number>>(new Set())
  const [newWebOrders, setNewWebOrders]           = useState(0)
  const [awaitingConfirmOrders, setAwaitingConfirmOrders] = useState<Order[]>([])
  const audioRef           = useRef<HTMLAudioElement | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      setError('')
      const res = await fetch(`/api/orders?date=${date}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Lỗi HTTP ${res.status}`)
        return
      }
      const fetched: Order[] = data.orders || []
      setOrders(fetched)
      // Detect new web orders
      const newWeb = fetched.filter(o => o.source === 'web' && o.status === 'pending' && !seenIds.current.has(o.id))
      if (newWeb.length > 0) {
        newWeb.forEach(o => seenIds.current.add(o.id))
        setNewWebOrders(prev => prev + newWeb.length)
        try { audioRef.current?.play() } catch { /**/ }
      }
      // Detect awaiting_confirm orders (khách đã bấm "Đã chuyển khoản")
      const waiting = fetched.filter(o => o.status === 'awaiting_confirm')
      setAwaitingConfirmOrders(waiting)
      const newConfirm = waiting.filter(o => !seenConfirmIds.current.has(o.id))
      if (newConfirm.length > 0) {
        newConfirm.forEach(o => seenConfirmIds.current.add(o.id))
        try { audioRef.current?.play() } catch { /**/ }
      }
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
    await apiFetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    fetchOrders()
  }
  async function handleCancel(id: number) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o))
    await apiFetch(`/api/orders/${id}`, { method: 'DELETE' })
    fetchOrders()
  }
  async function handleApproveConfirm(id: number) {
    // Duyệt thanh toán: mark is_paid=true, status=brewing, pay_method=transfer
    await apiFetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'brewing', is_paid: true, pay_method: 'transfer' }),
    })
    setAwaitingConfirmOrders(prev => prev.filter(o => o.id !== id))
    fetchOrders()
  }

  async function handlePay(paid: number, method: PayMethod) {
    if (!payingOrder) return
    await apiFetch(`/api/orders/${payingOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_paid: true, customer_paid: paid, change_amount: Math.max(0, paid - payingOrder.total_amount), pay_method: method }),
    })
    setPayingOrder(null)
    fetchOrders()
  }

  const deliveryOrders = orders.filter(o => o.order_type === 'delivery')
  const nonDeliveryOrders = orders.filter(o => o.order_type !== 'delivery')
  const baseOrders = activeTab === 'delivery' ? deliveryOrders : nonDeliveryOrders
  const filtered = activeFilter === 'all' ? baseOrders : baseOrders.filter(o => o.status === activeFilter)
  const counts: Record<string, number> = { all: baseOrders.length }
  baseOrders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1 })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800">Đơn Hàng</h1>
            <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
              <button onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'orders' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>
                <Package size={13}/> Tại quán
                {nonDeliveryOrders.filter(o => o.status === 'pending' || o.status === 'awaiting_confirm').length > 0 && (
                  <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    {nonDeliveryOrders.filter(o => o.status === 'pending' || o.status === 'awaiting_confirm').length}
                  </span>
                )}
              </button>
              <button onClick={() => setActiveTab('delivery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'delivery' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>
                <Truck size={13}/> Giao hàng
                {deliveryOrders.filter(o => o.status === 'pending' || o.status === 'awaiting_confirm').length > 0 && (
                  <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    {deliveryOrders.filter(o => o.status === 'pending' || o.status === 'awaiting_confirm').length}
                  </span>
                )}
              </button>
            </div>
          </div>
          {/* hidden audio beep for web orders */}
          <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA..." preload="auto" style={{display:'none'}} />
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
        {newWebOrders > 0 && activeTab !== 'delivery' && (
          <div className="mb-3 bg-blue-50 border border-blue-300 text-blue-700 px-4 py-2.5 rounded-xl flex items-center justify-between text-sm animate-pulse">
            <span className="flex items-center gap-2 font-bold">
              <Globe size={15}/> {newWebOrders} đơn mới từ website!
            </span>
            <button onClick={() => setNewWebOrders(0)} className="text-blue-400 hover:text-blue-600 font-bold ml-2">✕</button>
          </div>
        )}
        {awaitingConfirmOrders.filter(o => activeTab === 'delivery' ? o.order_type === 'delivery' : o.order_type !== 'delivery').length > 0 && (
          <div className="mb-3 bg-purple-50 border border-purple-300 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold text-purple-700 text-sm">
                💳 {awaitingConfirmOrders.filter(o => activeTab === 'delivery' ? o.order_type === 'delivery' : o.order_type !== 'delivery').length} đơn chờ duyệt thanh toán
              </span>
            </div>
            <div className="px-3 pb-3 space-y-2">
              {awaitingConfirmOrders.filter(o => activeTab === 'delivery' ? o.order_type === 'delivery' : o.order_type !== 'delivery').map(o => (
                <div key={o.id} className="bg-white rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 border border-purple-100">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 text-sm">#{o.order_code}</p>
                    <p className="text-xs text-gray-400">
                      {o.order_type === 'delivery' ? '🛵 Giao hàng' : o.table_number ? `Bàn ${o.table_number}` : 'Mang về'} · <strong>{fmt(o.total_amount)}đ</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => handleApproveConfirm(o.id)}
                    className="shrink-0 bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all">
                    ✓ Duyệt & Pha
                  </button>
                </div>
              ))}
            </div>
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
                <span className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeFilter === key ? 'bg-white text-orange-500' : 'bg-orange-500 text-white'}`}>
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

// This file is complete - delivery tab is in a separate component
