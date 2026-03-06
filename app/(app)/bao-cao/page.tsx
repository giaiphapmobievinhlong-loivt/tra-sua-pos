'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, ShoppingCart, TrendingUp, BarChart2,
  Calendar, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

// ── helpers ──────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('vi-VN')
const fmtShort = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n/1000)}k` : String(n)

const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']
const MONTH_FULL = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                    'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']

// ── interfaces ───────────────────────────────────────────────
interface DailyData {
  total_revenue: number; order_count: number; avg_order: number; estimated_profit: number
  recent_orders: { order_code: string; created_at: string; username: string; total_amount: number; status: string }[]
  hourly: { hour: number; revenue: number; count: number }[]
}

interface MonthlyData {
  year: number; month: number
  total_revenue: number; order_count: number; avg_order: number
  total_thu: number; total_chi: number; estimated_profit: number
  daily: { day: string; revenue: number; order_count: number }[]
  top_products: { product_name: string; total_qty: number; total_revenue: number }[]
  trend: { month_key: string; revenue: number; order_count: number }[]
}

// ── stat card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string; sub?: string; icon: React.ElementType
  color: string; trend?: { value: number; label: string }
}) {
  return (
    <div className={`rounded-2xl p-4 md:p-5 ${color}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 bg-white/60 rounded-xl flex items-center justify-center">
          <Icon size={18} className="text-gray-700" />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${trend.value >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {trend.value >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-lg md:text-2xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// DAILY REPORT TAB
// ══════════════════════════════════════════════════════════════
function DailyReport() {
  const [data, setData] = useState<DailyData | null>(null)
  const [date, setDate] = useState(new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?date=${date}`)
      setData(await res.json())
    } finally { setLoading(false) }
  }, [date])

  useEffect(() => { fetch_() }, [fetch_])

  const hourlyChart = (data?.hourly || []).map(h => ({ name: `${h.hour}h`, revenue: h.revenue, count: h.count }))

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="flex items-center gap-2">
        <button onClick={() => {
          const d = new Date(date); d.setDate(d.getDate() - 1)
          setDate(d.toISOString().split('T')[0])
        }} className="p-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all">
          <ChevronLeft size={16} className="text-gray-600" />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <Calendar size={15} className="text-orange-500 shrink-0" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="flex-1 text-sm font-semibold text-gray-800 bg-transparent focus:outline-none" />
        </div>
        <button onClick={() => {
          const d = new Date(date); d.setDate(d.getDate() + 1)
          setDate(d.toISOString().split('T')[0])
        }} className="p-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all">
          <ChevronRight size={16} className="text-gray-600" />
        </button>
      </div>

      {loading && <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>}

      {data && !loading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Doanh thu" value={`${fmt(data.total_revenue)}đ`} icon={DollarSign} color="bg-orange-50" />
            <StatCard label="Số đơn" value={String(data.order_count)} sub="đơn hàng" icon={ShoppingCart} color="bg-blue-50" />
            <StatCard label="Trung bình/đơn" value={`${fmt(data.avg_order)}đ`} icon={BarChart2} color="bg-purple-50" />
            <StatCard label="Lợi nhuận" value={`${fmt(data.estimated_profit)}đ`} sub="Gồm thu chi ngoài" icon={TrendingUp} color="bg-green-50" />
          </div>

          {/* Hourly chart */}
          {hourlyChart.length > 0 && (
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 text-sm">📊 Doanh thu theo giờ</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourlyChart} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} width={42} />
                  <Tooltip formatter={(v: number) => [`${fmt(v)}đ`, 'Doanh thu']} labelFormatter={l => `Lúc ${l}`} />
                  <Bar dataKey="revenue" fill="#f97316" radius={[4,4,0,0]} name="Doanh thu" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent orders */}
          <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3 text-sm">🧾 Đơn hàng gần đây</h3>
            {!data.recent_orders?.length && <p className="text-gray-400 text-sm text-center py-4">Chưa có đơn hàng</p>}
            <div className="space-y-2">
              {data.recent_orders?.map(o => (
                <div key={o.order_code} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">#{o.order_code}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(o.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {o.username}
                    </p>
                  </div>
                  <p className="font-bold text-orange-600 text-sm">{fmt(o.total_amount)}đ</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MONTHLY REPORT TAB
// ══════════════════════════════════════════════════════════════
function MonthlyReport() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData]   = useState<MonthlyData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/monthly?year=${year}&month=${month}`)
      setData(await res.json())
    } finally { setLoading(false) }
  }, [year, month])

  useEffect(() => { fetch_() }, [fetch_])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Fill all days of month for chart
  const daysInMonth = new Date(year, month, 0).getDate()
  const dailyMap: Record<string, { revenue: number; order_count: number }> = {}
  data?.daily.forEach(d => { dailyMap[d.day] = d })

  const dailyChart = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return { name: String(d), revenue: dailyMap[key]?.revenue || 0, orders: dailyMap[key]?.order_count || 0 }
  })

  const trendChart = (data?.trend || []).map(t => ({
    name: MONTHS[Number(t.month_key.split('-')[1]) - 1] + ' ' + t.month_key.split('-')[0].slice(2),
    revenue: t.revenue, orders: t.order_count
  }))

  // Max revenue day
  const maxDay = data?.daily.reduce((best, d) => d.revenue > (best?.revenue || 0) ? d : best, data.daily[0])

  return (
    <div className="space-y-4">
      {/* Month navigator */}
      <div className="flex items-center gap-2">
        <button onClick={prevMonth} className="p-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all">
          <ChevronLeft size={16} className="text-gray-600" />
        </button>
        <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-center">
          <p className="font-bold text-gray-800 text-sm">{MONTH_FULL[month - 1]} {year}</p>
        </div>
        <button onClick={nextMonth} className="p-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all">
          <ChevronRight size={16} className="text-gray-600" />
        </button>
      </div>

      {/* Quick month buttons */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {MONTHS.map((m, i) => (
          <button key={m} onClick={() => setMonth(i + 1)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
              month === i + 1 ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
            }`}>
            {m}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>}

      {data && !loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Doanh thu tháng" value={`${fmt(data.total_revenue)}đ`} icon={DollarSign} color="bg-orange-50" />
            <StatCard label="Tổng đơn" value={String(data.order_count)} sub="đơn hàng" icon={ShoppingCart} color="bg-blue-50" />
            <StatCard label="Trung bình/đơn" value={`${fmt(data.avg_order)}đ`} icon={BarChart2} color="bg-purple-50" />
            <StatCard label="Lợi nhuận" value={`${fmt(data.estimated_profit)}đ`} sub="Gồm thu chi ngoài" icon={TrendingUp} color="bg-green-50" />
          </div>

          {/* Thu / Chi summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3 text-sm">💰 Thu Chi tháng</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-green-600 font-medium mb-1">Tổng Thu</p>
                <p className="font-bold text-green-700 text-sm">{fmt(data.total_thu)}đ</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xs text-red-600 font-medium mb-1">Tổng Chi</p>
                <p className="font-bold text-red-700 text-sm">{fmt(data.total_chi)}đ</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Chênh lệch</p>
                <p className={`font-bold text-sm ${data.total_thu - data.total_chi >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                  {fmt(data.total_thu - data.total_chi)}đ
                </p>
              </div>
            </div>
          </div>

          {/* Highlight: best day */}
          {maxDay && maxDay.revenue > 0 && (
            <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-4 text-white">
              <p className="text-orange-100 text-xs font-medium mb-1">🏆 Ngày doanh thu cao nhất</p>
              <p className="font-bold text-xl">
                {new Date(maxDay.day).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' })}
              </p>
              <p className="text-orange-100 text-sm mt-1">{fmt(maxDay.revenue)}đ · {maxDay.order_count} đơn</p>
            </div>
          )}

          {/* Daily revenue bar chart */}
          <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-1 text-sm">📅 Doanh thu theo ngày</h3>
            <p className="text-xs text-gray-400 mb-4">{MONTH_FULL[month-1]} {year}</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyChart} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtShort} width={42} />
                <Tooltip
                  formatter={(v: number) => [`${fmt(v)}đ`, 'Doanh thu']}
                  labelFormatter={l => `Ngày ${l}`}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 6-month trend line chart */}
          {trendChart.length > 1 && (
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-1 text-sm">📈 Xu hướng 6 tháng gần đây</h3>
              <p className="text-xs text-gray-400 mb-4">Doanh thu theo tháng</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendChart} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} width={42} />
                  <Tooltip formatter={(v: number) => [`${fmt(v)}đ`, 'Doanh thu']} />
                  <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5}
                    dot={{ fill: '#f97316', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top products */}
          {data.top_products.length > 0 && (
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 text-sm">🏅 Top sản phẩm bán chạy</h3>
              <div className="space-y-3">
                {data.top_products.map((p, i) => {
                  const maxQty = data.top_products[0].total_qty
                  const pct = Math.round((p.total_qty / maxQty) * 100)
                  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣']
                  return (
                    <div key={p.product_name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{medals[i]}</span>
                          <p className="text-sm font-medium text-gray-800 truncate">{p.product_name}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-xs font-bold text-orange-600">{p.total_qty} ly</p>
                          <p className="text-xs text-gray-400">{fmt(p.total_revenue)}đ</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Daily breakdown table */}
          {data.daily.length > 0 && (
            <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 text-sm">📋 Chi tiết từng ngày</h3>
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-3 text-xs font-semibold text-gray-400 pb-2 border-b border-gray-100">
                  <span>Ngày</span><span className="text-right">Doanh thu</span><span className="text-right">Số đơn</span>
                </div>
                {data.daily.map(d => (
                  <div key={d.day} className="grid grid-cols-3 text-sm py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-1">
                    <span className="text-gray-600 font-medium">
                      {new Date(d.day).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                    </span>
                    <span className="text-right font-bold text-orange-600">{fmt(d.revenue)}đ</span>
                    <span className="text-right text-gray-500">{d.order_count} đơn</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function BaoCaoPage() {
  const [tab, setTab] = useState<'daily' | 'monthly'>('daily')

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-4 pb-8">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Báo Cáo</h1>
          <p className="text-gray-400 text-xs mt-0.5">Phân tích doanh thu chi tiết</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-5 bg-gray-100 p-1 rounded-2xl">
          <button onClick={() => setTab('daily')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'daily' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            📅 Theo Ngày
          </button>
          <button onClick={() => setTab('monthly')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === 'monthly' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            📆 Theo Tháng
          </button>
        </div>

        {tab === 'daily'   && <DailyReport />}
        {tab === 'monthly' && <MonthlyReport />}
      </div>
    </div>
  )
}
