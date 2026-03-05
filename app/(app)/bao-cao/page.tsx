'use client'
import { useState, useEffect, useCallback } from 'react'
import { DollarSign, ShoppingCart, Users, TrendingUp, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface ReportData {
  total_revenue: number
  order_count: number
  avg_order: number
  estimated_profit: number
  recent_orders: {
    order_code: string
    created_at: string
    username: string
    total_amount: number
    status: string
  }[]
  hourly: { hour: number; revenue: number; count: number }[]
}

export default function BaoCaoPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const fetchReport = useCallback(async () => {
    const res = await fetch(`/api/reports?date=${date}`)
    const d = await res.json()
    setData(d)
  }, [date])

  useEffect(() => { fetchReport() }, [fetchReport])

  const chartData = data?.hourly?.map(h => ({
    hour: `${h.hour}h`,
    'Doanh Thu': h.revenue,
  })) || []

  const STATS = [
    { label: 'Doanh Thu POS', value: data ? `${data.total_revenue.toLocaleString('vi-VN')}đ` : '-', icon: DollarSign, bg: 'bg-yellow-50', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600' },
    { label: 'Số Đơn Hàng', value: data?.order_count ?? '-', icon: ShoppingCart, bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Trung Bình/Đơn', value: data ? `${data.avg_order.toLocaleString('vi-VN')}đ` : '-', icon: Users, bg: 'bg-purple-50', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    { label: 'Lợi Nhuận', value: data ? `${data.estimated_profit.toLocaleString('vi-VN')}đ` : '-', icon: TrendingUp, bg: 'bg-green-50', iconBg: 'bg-green-100', iconColor: 'text-green-600', sub: 'Bao gồm thu chi ngoài' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Báo Cáo Ngày</h1>
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
          <Calendar size={15} className="text-orange-500 shrink-0" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="text-xs md:text-sm font-medium text-orange-700 bg-transparent focus:outline-none w-28 md:w-auto" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-5">
        {STATS.map(({ label, value, icon: Icon, bg, iconBg, iconColor, sub }) => (
          <div key={label} className={`${bg} rounded-xl p-3 md:p-5`}>
            <div className="flex items-start gap-3">
              <div className={`${iconBg} w-9 h-9 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0`}>
                <Icon size={18} className={iconColor} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 leading-tight">{label}</p>
                <p className="text-base md:text-2xl font-bold text-gray-800 mt-0.5 truncate">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5 hidden md:block">{sub}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card p-4 md:p-5 mb-5">
          <h2 className="font-bold text-gray-800 mb-4 text-sm md:text-base">Doanh thu theo giờ</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : String(v)} width={40} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString('vi-VN')}đ`} />
              <Bar dataKey="Doanh Thu" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent orders */}
      <div className="card p-4 md:p-5">
        <h2 className="font-bold text-gray-800 mb-4 text-sm md:text-base">Đơn Hàng Gần Đây</h2>

        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-5 gap-4 text-sm font-semibold text-gray-500 mb-3 border-b border-gray-100 pb-3">
          <span>Mã Đơn</span><span>Thời Gian</span><span>Nhân Viên</span><span>Tổng Tiền</span><span>Trạng Thái</span>
        </div>

        {(!data?.recent_orders?.length) && (
          <p className="text-gray-400 text-center py-6 text-sm">Chưa có đơn hàng</p>
        )}

        {data?.recent_orders?.map(order => (
          <div key={order.order_code} className="border-b border-gray-50 last:border-0 py-3">
            {/* Mobile */}
            <div className="md:hidden flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800 text-sm">#{order.order_code}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {order.username}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-orange-600 text-sm">{order.total_amount.toLocaleString('vi-VN')}đ</p>
                <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">Hoàn thành</span>
              </div>
            </div>
            {/* Desktop */}
            <div className="hidden md:grid grid-cols-5 gap-4 text-sm">
              <span className="font-medium text-gray-700">#{order.order_code}</span>
              <span className="text-gray-500">{new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-gray-600">{order.username}</span>
              <span className="font-bold text-orange-600">{order.total_amount.toLocaleString('vi-VN')}đ</span>
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full w-fit">Hoàn thành</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
