'use client'
import { useState, useEffect, useCallback } from 'react'
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react'

interface OrderItem {
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface Order {
  id: number
  order_code: string
  total_amount: number
  customer_paid: number
  change_amount: number
  note: string
  status: string
  created_at: string
  username: string
  items: OrderItem[]
}

export default function DonHangPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [expanded, setExpanded] = useState<number | null>(null)

  const fetchOrders = useCallback(async () => {
    const res = await fetch(`/api/orders?date=${date}`)
    const data = await res.json()
    setOrders(data.orders || [])
  }, [date])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Đơn Hàng</h1>
          <p className="text-gray-500 text-sm mt-1">Lịch sử các đơn đã bán</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
          <Calendar size={16} className="text-gray-400" />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="text-sm font-medium text-gray-700 focus:outline-none"
          />
        </div>
      </div>

      <div className="card">
        <div className="grid grid-cols-5 gap-4 px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-500">
          <span>Mã Đơn</span>
          <span>Thời Gian</span>
          <span>Nhân Viên</span>
          <span>Tổng Tiền</span>
          <span>Trạng Thái</span>
        </div>

        {orders.length === 0 && (
          <p className="text-center text-gray-400 py-10">Chưa có đơn hàng nào</p>
        )}

        {orders.map(order => (
          <div key={order.id} className="border-b border-gray-50 last:border-0">
            <button
              onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              className="grid grid-cols-5 gap-4 px-5 py-4 w-full text-left hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium text-gray-700">#{order.order_code}</span>
              <span className="text-gray-600 text-sm">
                {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-gray-600 text-sm">{order.username}</span>
              <span className="font-bold text-orange-600">{order.total_amount.toLocaleString('vi-VN')}đ</span>
              <div className="flex items-center justify-between">
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  Hoàn thành
                </span>
                {expanded === order.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </button>
            {expanded === order.id && (
              <div className="px-5 pb-4 bg-gray-50">
                <div className="space-y-2">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.product_name} × {item.quantity}</span>
                      <span className="font-medium">{item.subtotal.toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Khách đưa:</span>
                    <span>{order.customer_paid.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tiền thối:</span>
                    <span className="text-green-600">{order.change_amount.toLocaleString('vi-VN')}đ</span>
                  </div>
                  {order.note && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Ghi chú:</span>
                      <span className="text-gray-700">{order.note}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
