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

  const [year, month, day] = date.split('-')
  const displayDate = `ngày ${parseInt(day)} tháng ${parseInt(month)} năm ${year}`

  const chartData = data?.hourly?.map(h => ({
    hour: `${h.hour}h`,
    'Doanh Thu': h.revenue,
    'Đơn': h.count,
  })) || []

  const STAT_CARDS = [
    { label: 'Doanh Thu POS', value: data ? `${data.total_revenue.toLocaleString('vi-VN')}đ` : '-', icon: DollarSign, color: 'bg-yellow-50', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600' },
    { label: 'Số Đơn Hàng', value: data?.order_count ?? '-', icon: ShoppingCart, color: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Trung Bình/Đơn', value: data ? `${data.avg_order.toLocaleString('vi-VN')}đ` : '-', icon: Users, color: 'bg-purple-50', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    { label: 'Lợi Nhuận Ước Tính', value: data ? `${data.estimated_profit.toLocaleString('vi-VN')}đ` : '-', icon: TrendingUp, color: 'bg-green-50', iconBg: 'bg-green-100', iconColor: 'text-green-600', sub: 'Bao gồm thu chi ngoài' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Báo Cáo Ngày</h1>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2">
          <Calendar size={16} className="text-orange-500" />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="text-sm font-medium text-orange-700 bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, iconBg, iconColor, sub }) => (
          <div key={label} className={`${color} rounded-xl p-5`}>
            <div className="flex items-start gap-4">
              <div className={`${iconBg} w-12 h-12 rounded-xl flex items-center justify-center shrink-0`}>
                <Icon size={22} className={iconColor} />
              </div>
              <div>
                <p className="text-sm text-gray-600">{label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
                {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Doanh thu theo giờ</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString('vi-VN')}đ`} />
              <Bar dataKey="Doanh Thu" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent orders */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-800 mb-4">Đơn Hàng Gần Đây</h2>
        <div className="grid grid-cols-5 gap-4 text-sm font-semibold text-gray-500 mb-3 border-b border-gray-100 pb-3">
          <span>Mã Đơn</span>
          <span>Thời Gian</span>
          <span>Nhân Viên</span>
          <span>Tổng Tiền</span>
          <span>Trạng Thái</span>
        </div>
        {(!data?.recent_orders?.length) && (
          <p className="text-gray-400 text-center py-6">Chưa có đơn hàng</p>
        )}
        {data?.recent_orders?.map(order => (
          <div key={order.order_code} className="grid grid-cols-5 gap-4 py-3 border-b border-gray-50 last:border-0 text-sm">
            <span className="font-medium text-gray-700">#{order.order_code}</span>
            <span className="text-gray-500">
              {new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-gray-600">{order.username}</span>
            <span className="font-bold text-orange-600">{order.total_amount.toLocaleString('vi-VN')}đ</span>
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full w-fit">Hoàn thành</span>
          </div>
        ))}
      </div>
    </div>
  )
}
