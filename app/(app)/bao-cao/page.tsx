'use client'
import { fmt, fmtShort, todayVN } from '@/lib/utils'
import { toUtcDate, fmtVNTime, fmtVNDate, fmtVNDateLong, fmtVNDateWeekday } from '@/lib/vntime'
import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, ShoppingCart, TrendingUp, BarChart2,
  Calendar, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,
  Search, ClipboardList, Banknote, QrCode, CheckCircle, Clock, ChefHat, Package, XCircle
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

// ── helpers ──────────────────────────────────────────────────

const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']
const MONTH_FULL = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                    'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']

// ── interfaces ───────────────────────────────────────────────
interface DailyData {
  total_revenue: number; order_count: number; avg_order: number; estimated_profit: number; total_cups?: number
  top_products?: { product_name: string; total_qty: number; total_revenue: number }[]
  recent_orders: { order_code: string; created_at: string; vn_created_at?: string; username: string; total_amount: number; status: string }[]
  hourly: { hour: number; revenue: number; count: number }[]
}

interface MonthlyTransaction {
  id: number; type: 'thu' | 'chi'; amount: number
  description: string; note: string; transaction_date: string; username: string
}

interface MonthlyData {
  year: number; month: number
  total_revenue: number; order_count: number; avg_order: number; total_cups?: number
  total_thu: number; total_chi: number; estimated_profit: number
  daily: { day: string; revenue: number; order_count: number }[]
  top_products: { product_name: string; total_qty: number; total_revenue: number }[]
  trend: { month_key: string; revenue: number; order_count: number }[]
  transactions: MonthlyTransaction[]
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
  const [date, setDate] = useState(todayVN())
  const [loading, setLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?date=${date}&t=${Date.now()}`, { cache: 'no-store' })
      setData(await res.json())
    } finally { setLoading(false) }
  }, [date])

  useEffect(() => {
    fetch_()
    // Auto-refresh 30s khi đang xem hôm nay
    const isToday = date === todayVN()
    if (!isToday) return
    const iv = setInterval(fetch_, 30000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetch_() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVisible) }
  }, [fetch_, date])

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
            <StatCard label="Tổng ly bán" value={`${data.total_cups ?? 0}`} sub="ly" icon={ShoppingCart} color="bg-yellow-50" />
          </div>

          {/* Top products */}
          {(data.top_products ?? []).length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 text-sm">🧋 Số lượng theo sản phẩm</h3>
              <div className="space-y-2">
                {(data.top_products ?? []).map((p, i) => {
                  const maxQty = (data.top_products ?? [])[0]?.total_qty || 1
                  const pct = Math.round((p.total_qty / maxQty) * 100)
                  return (
                    <div key={p.product_name}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-4">{i+1}</span>
                          <p className="text-sm font-medium text-gray-800 truncate">{p.product_name}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="text-xs font-bold text-orange-600">{p.total_qty} ly</p>
                          <p className="text-xs text-gray-400">{fmt(p.total_revenue)}đ</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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
                      {fmtVNTime(o.vn_created_at || o.created_at)} · {o.username}
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
  const today = todayVN()
  const [year, setYear]   = useState(Number(today.split('-')[0]))
  const [month, setMonth] = useState(Number(today.split('-')[1]))
  const [data, setData]   = useState<MonthlyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [txFilter, setTxFilter] = useState<'all' | 'thu' | 'chi'>('all')

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/monthly?year=${year}&month=${month}&t=${Date.now()}`, { cache: 'no-store' })
      const json = await res.json()
      if (!json.error) setData(json)
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
  ;(Array.isArray(data?.daily) ? data.daily : []).forEach(d => { dailyMap[d.day] = d })

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
            <StatCard label="Tổng ly bán" value={`${data.total_cups ?? 0}`} sub="ly" icon={ShoppingCart} color="bg-yellow-50" />
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

          {/* Thu / Chi detail */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-sm">📋 Chi tiết Thu Chi</h3>
              <span className="text-xs text-gray-400">{(data.transactions || []).length} giao dịch</span>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 mb-3">
              {(['all', 'thu', 'chi'] as const).map(f => {
                const labels = { all: 'Tất cả', thu: 'Thu', chi: 'Chi' }
                const counts = {
                  all: (data.transactions || []).length,
                  thu: (data.transactions || []).filter(t => t.type === 'thu').length,
                  chi: (data.transactions || []).filter(t => t.type === 'chi').length,
                }
                const active = {
                  all: 'bg-gray-800 text-white',
                  thu: 'bg-green-500 text-white',
                  chi: 'bg-red-500 text-white',
                }
                return (
                  <button key={f} onClick={() => setTxFilter(f)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      txFilter === f ? active[f] + ' border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}>
                    {labels[f]}
                    <span className={`text-xs ${txFilter === f ? 'opacity-70' : 'text-gray-400'}`}>({counts[f]})</span>
                  </button>
                )
              })}
            </div>

            {/* Filtered totals */}
            {txFilter !== 'all' && (
              <div className={`rounded-xl px-3 py-2 mb-3 text-sm font-bold ${txFilter === 'thu' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                Tổng {txFilter === 'thu' ? 'thu' : 'chi'}: {fmt(
                  (data.transactions || []).filter(t => t.type === txFilter).reduce((s, t) => s + t.amount, 0)
                )}đ
              </div>
            )}

            {/* List */}
            {(data.transactions || []).filter(t => txFilter === 'all' || t.type === txFilter).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Chưa có giao dịch</p>
            ) : (
              <div className="space-y-0 max-h-72 overflow-y-auto -mx-1 px-1">
                {Object.entries(
                  (data.transactions || [])
                    .filter(t => txFilter === 'all' || t.type === txFilter)
                    .reduce<Record<string, MonthlyTransaction[]>>((acc, t) => {
                      ;(acc[t.transaction_date] ||= []).push(t)
                      return acc
                    }, {})
                ).map(([date, txs]) => (
                  <div key={date} className="mb-2">
                    <p className="text-xs font-semibold text-gray-400 py-1 sticky top-0 bg-white">
                      {date.slice(8, 10)}/{date.slice(5, 7)}/{date.slice(0, 4)}
                    </p>
                    {txs.map(t => (
                      <div key={t.id} className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
                        <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-xs font-bold ${
                          t.type === 'thu' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {t.type === 'thu' ? 'Thu' : 'Chi'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{t.description || '—'}</p>
                          {t.note && <p className="text-xs text-gray-400 truncate">{t.note}</p>}
                          {t.username && <p className="text-xs text-gray-300">{t.username}</p>}
                        </div>
                        <span className={`shrink-0 font-bold text-sm ${t.type === 'thu' ? 'text-green-600' : 'text-red-500'}`}>
                          {t.type === 'thu' ? '+' : '-'}{fmt(t.amount)}đ
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Highlight: best day */}
          {maxDay && maxDay.revenue > 0 && (
            <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-4 text-white">
              <p className="text-orange-100 text-xs font-medium mb-1">🏆 Ngày doanh thu cao nhất</p>
              <p className="font-bold text-xl">
                {fmtVNDateLong(maxDay.day + 'T00:00:00Z')}
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
                      {fmtVNDateWeekday(d.day + 'T00:00:00Z')}
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
// ══════════════════════════════════════════════════════════════
// RANGE REPORT TAB
// ══════════════════════════════════════════════════════════════
interface RangeData {
  from: string; to: string
  total_revenue: number; order_count: number; avg_order: number
  total_discount: number; total_cups: number
  total_thu: number; total_chi: number; estimated_profit: number
  daily?: { day: string; revenue: number; order_count: number; cups: number }[]
  top_products?: { product_name: string; total_qty: number; total_revenue: number }[]
  pay_breakdown?: { pay_method: string | null; order_count: number; revenue: number }[]
}

function RangeReport() {
  const today = todayVN()
  const firstOfMonth = today.slice(0, 8) + '01'
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo]     = useState(today)
  const [data, setData] = useState<RangeData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/range?from=${from}&to=${to}&t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      if (json.error) return
      setData(json)
    } finally { setLoading(false) }
  }, [from, to])

  useEffect(() => { fetch_() }, [fetch_])

  // Shortcuts
  function setRange(f: string, t: string) { setFrom(f); setTo(t) }
  function thisMonth() {
    const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0')
    setRange(`${y}-${m}-01`, today)
  }
  function lastMonth() {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1)
    const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0')
    const last = new Date(y, d.getMonth() + 1, 0)
    setRange(`${y}-${m}-01`, `${y}-${m}-${String(last.getDate()).padStart(2, '0')}`)
  }
  function last7() { const d = new Date(); d.setDate(d.getDate() - 6); setRange(d.toLocaleDateString('en-CA'), today) }
  function last30() { const d = new Date(); d.setDate(d.getDate() - 29); setRange(d.toLocaleDateString('en-CA'), today) }
  function thisYear() { setRange(`${today.slice(0, 4)}-01-01`, today) }

  const maxRevDay = Math.max(...(data?.daily || []).map(d => d.revenue), 1)

  return (
    <div className="space-y-4">
      {/* Date range picker */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 font-medium mb-1">Từ ngày</p>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full text-sm font-semibold text-gray-800 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-400" />
          </div>
          <div className="text-gray-300 mt-4">→</div>
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 font-medium mb-1">Đến ngày</p>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="w-full text-sm font-semibold text-gray-800 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-400" />
          </div>
          <button onClick={fetch_}
            className="mt-4 px-3 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 active:scale-95 transition-all">
            Xem
          </button>
        </div>
        {/* Quick shortcuts */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: '7 ngày', fn: last7 },
            { label: '30 ngày', fn: last30 },
            { label: 'Tháng này', fn: thisMonth },
            { label: 'Tháng trước', fn: lastMonth },
            { label: 'Năm này', fn: thisYear },
          ].map(s => (
            <button key={s.label} onClick={s.fn}
              className="px-3 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 hover:bg-orange-100 hover:text-orange-700 transition-all">
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center py-10 text-gray-400 text-sm">Đang tải...</div>}

      {data && !loading && (
        <>
          <p className="text-xs text-gray-400 text-center">
            {fmtVNDate(data.from)} — {fmtVNDate(data.to)}
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Doanh thu" value={`${fmt(data.total_revenue)}đ`} icon={DollarSign} color="bg-orange-50" />
            <StatCard label="Số đơn" value={String(data.order_count)} sub="đơn hoàn thành" icon={ShoppingCart} color="bg-blue-50" />
            <StatCard label="Trung bình/đơn" value={`${fmt(data.avg_order)}đ`} icon={BarChart2} color="bg-purple-50" />
            <StatCard label="Tổng ly bán" value={String(data.total_cups)} sub="ly" icon={ShoppingCart} color="bg-yellow-50" />
            <StatCard label="Thu ngoài" value={`${fmt(data.total_thu)}đ`} icon={TrendingUp} color="bg-green-50" />
            <StatCard label="Chi ngoài" value={`${fmt(data.total_chi)}đ`} icon={TrendingUp} color="bg-red-50" />
            <div className="col-span-2">
              <StatCard label="Lợi nhuận ước tính" value={`${fmt(data.estimated_profit)}đ`} sub="Doanh thu + Thu - Chi" icon={TrendingUp} color="bg-emerald-50" />
            </div>
          </div>

          {/* Phương thức thanh toán */}
          {(data.pay_breakdown?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 text-sm">💳 Phương thức thanh toán</h3>
              <div className="space-y-2">
                {(data.pay_breakdown ?? []).map(p => (
                  <div key={p.pay_method || 'other'} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{p.pay_method === 'cash' ? '💵 Tiền mặt' : p.pay_method === 'transfer' ? '📱 Chuyển khoản' : '—'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-800">{fmt(p.revenue)}đ</span>
                      <span className="text-xs text-gray-400 ml-2">({p.order_count} đơn)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Biểu đồ doanh thu theo ngày */}
          {(data.daily?.length ?? 0) > 1 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 text-sm">📊 Doanh thu theo ngày</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(data.daily ?? []).map(d => ({ name: d.day.slice(5), revenue: d.revenue, cups: d.cups }))} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtShort} width={42} />
                  <Tooltip formatter={(v: number, name: string) => [name === 'revenue' ? `${fmt(v)}đ` : `${v} ly`, name === 'revenue' ? 'Doanh thu' : 'Số ly']} />
                  <Bar dataKey="revenue" fill="#f97316" radius={[3,3,0,0]} name="revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bảng ngày chi tiết */}
          {(data.daily?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 text-sm">📋 Chi tiết theo ngày</h3>
              <div className="space-y-0">
                <div className="flex text-[10px] text-gray-400 font-semibold pb-2 border-b border-gray-100">
                  <span className="flex-1">Ngày</span>
                  <span className="w-16 text-right">Đơn</span>
                  <span className="w-16 text-right">Ly</span>
                  <span className="w-24 text-right">Doanh thu</span>
                </div>
                {(data.daily ?? []).map(d => (
                  <div key={d.day} className="flex items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="flex-1 text-xs font-medium text-gray-700">{fmtVNDate(d.day)}</span>
                    <span className="w-16 text-right text-xs text-gray-500">{d.order_count}</span>
                    <span className="w-16 text-right text-xs text-gray-500">{d.cups}</span>
                    <span className="w-24 text-right text-xs font-bold text-orange-600 tabular-nums">{fmt(d.revenue)}đ</span>
                  </div>
                ))}
                <div className="flex items-center pt-2 font-bold">
                  <span className="flex-1 text-xs text-gray-700">Tổng</span>
                  <span className="w-16 text-right text-xs text-blue-700">{data.order_count}</span>
                  <span className="w-16 text-right text-xs text-yellow-700">{data.total_cups}</span>
                  <span className="w-24 text-right text-xs text-orange-700 tabular-nums">{fmt(data.total_revenue)}đ</span>
                </div>
              </div>
            </div>
          )}

          {/* Top sản phẩm */}
          {(data.top_products?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 text-sm">🧋 Top sản phẩm</h3>
              <div className="space-y-2">
                {(data.top_products ?? []).map((p, i) => {
                  const maxQty = data.top_products?.[0]?.total_qty || 1
                  const pct = Math.round((p.total_qty / maxQty) * 100)
                  return (
                    <div key={p.product_name}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                          <p className="text-sm font-medium text-gray-800 truncate">{p.product_name}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="text-xs font-bold text-orange-600">{p.total_qty} ly</p>
                          <p className="text-xs text-gray-400">{fmt(p.total_revenue)}đ</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {data.order_count === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">Không có đơn hàng trong khoảng thời gian này</div>
          )}
        </>
      )}
    </div>
  )
}

// ORDER HISTORY TAB
// ══════════════════════════════════════════════════════════════
interface OrderItem { id: number; product_name: string; quantity: number; unit_price: number; subtotal: number; item_note?: string }
interface HistoryOrder {
  id: number; order_code: string; total_amount: number; status: string
  is_paid: boolean; pay_method: string | null; table_number: string | null
  created_at: string; vn_created_at?: string; username: string; note: string; items: OrderItem[]
  discount_amount?: number; discount_name?: string
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: 'Chờ',        color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: Clock },
  brewing:   { label: 'Đang pha',   color: 'text-orange-600 bg-orange-50 border-orange-200', icon: ChefHat },
  ready:     { label: 'Sẵn sàng',   color: 'text-green-600 bg-green-50 border-green-200',    icon: Package },
  completed: { label: 'Hoàn thành', color: 'text-gray-600 bg-gray-50 border-gray-200',       icon: CheckCircle },
  cancelled: { label: 'Đã hủy',    color: 'text-red-500 bg-red-50 border-red-200',           icon: XCircle },
}

function OrderHistory() {
  const today = todayVN()
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate]     = useState(today)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orders, setOrders]     = useState<HistoryOrder[]>([])
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const from = new Date(fromDate)
      const to   = new Date(toDate)
      const dates: string[] = []
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0])
      }
      const limited = dates.slice(0, 31)
      const results = await Promise.all(
        limited.map(date => fetch(`/api/orders?date=${date}`).then(r => r.json()))
      )
      const all: HistoryOrder[] = results.flatMap(r => r.orders || [])
      all.sort((a, b) => toUtcDate(b.created_at).getTime() - toUtcDate(a.created_at).getTime())
      setOrders(all)
    } finally { setLoading(false) }
  }, [fromDate, toDate])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        o.order_code.toLowerCase().includes(q) ||
        (o.username || '').toLowerCase().includes(q) ||
        (o.table_number || '').toLowerCase().includes(q) ||
        o.items.some(i => i.product_name.toLowerCase().includes(q))
      )
    }
    return true
  })

  const totalRevenue = filtered
    .filter(o => o.status !== 'cancelled' && o.is_paid)
    .reduce((s, o) => s + Number(o.total_amount), 0)
  const totalCups = filtered
    .filter(o => o.status !== 'cancelled' && o.is_paid)
    .reduce((s, o) => s + (o.items?.reduce((si, i) => si + i.quantity, 0) || 0), 0)

  return (
    <div className="space-y-4">
      {/* Date range */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={15} className="text-orange-500" />
          <span className="text-sm font-bold text-gray-700">Khoảng thời gian</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
          <span className="text-gray-400 text-sm font-medium shrink-0">→</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300" />
        </div>
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {[
            { label: 'Hôm nay',   fn: () => { setFromDate(todayVN); setToDate(todayVN) } },
            { label: 'Hôm qua',   fn: () => {
              const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); const y = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
              setFromDate(y); setToDate(y)
            }},
            { label: '7 ngày',    fn: () => {
              const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6); const w = weekAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
              setFromDate(w); setToDate(todayVN)
            }},
            { label: 'Tháng này', fn: () => {
              const now = new Date()
              const first = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
              setFromDate(first); setToDate(todayVN)
            }},
          ].map(p => (
            <button key={p.label} onClick={p.fn}
              className="px-3 py-1 text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-100 rounded-full hover:bg-orange-100 transition-all">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search + status filter */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm mã đơn, nhân viên, sản phẩm..."
            className="flex-1 text-sm focus:outline-none bg-transparent placeholder-gray-300" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="text-xs font-semibold px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-600">
          <option value="all">Tất cả</option>
          <option value="pending">Chờ</option>
          <option value="brewing">Đang pha</option>
          <option value="ready">Sẵn sàng</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>

      {/* Summary */}
      {!loading && orders.length > 0 && (
        <div className="space-y-2">
          {/* Row 1 — tổng quan */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-orange-50 rounded-xl p-3 border border-orange-100 text-center">
              <p className="text-xs text-orange-600 font-semibold">Tổng đơn</p>
              <p className="text-lg font-bold text-orange-700">{filtered.length}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 border border-green-100 text-center">
              <p className="text-xs text-green-600 font-semibold">Hoàn thành</p>
              <p className="text-lg font-bold text-green-700">{filtered.filter(o => o.status === 'completed').length}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
              <p className="text-xs text-blue-600 font-semibold">Doanh thu</p>
              <p className="text-sm font-bold text-blue-700 tabular-nums">{fmtShort(totalRevenue)}đ</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100 text-center">
              <p className="text-xs text-yellow-600 font-semibold">Tổng ly bán</p>
              <p className="text-lg font-bold text-yellow-700">{totalCups} ly</p>
            </div>
          </div>

          {/* Row 2 — hình thức thanh toán */}
          {(() => {
            const paid = filtered.filter(o => o.status !== 'cancelled' && o.is_paid)
            const cashOrders    = paid.filter(o => o.pay_method === 'cash')
            const transferOrders = paid.filter(o => o.pay_method === 'transfer')
            const unpaidOrders  = filtered.filter(o => o.status !== 'cancelled' && !o.is_paid)
            const cashRev     = cashOrders.reduce((s, o) => s + Number(o.total_amount), 0)
            const transferRev = transferOrders.reduce((s, o) => s + Number(o.total_amount), 0)
            const unpaidRev   = unpaidOrders.reduce((s, o) => s + Number(o.total_amount), 0)
            const total = cashRev + transferRev || 1
            return (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-500 mb-3">💳 Hình thức thanh toán</p>
                <div className="space-y-2.5">
                  {/* Cash */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Banknote size={13} className="text-green-600" />
                        <span className="text-xs font-semibold text-gray-700">Tiền mặt</span>
                        <span className="text-[10px] text-gray-400">{cashOrders.length} đơn</span>
                      </div>
                      <span className="text-xs font-bold text-green-700 tabular-nums">{fmt(cashRev)}đ</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round(cashRev / total * 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 text-right">{Math.round(cashRev / total * 100)}%</p>
                  </div>
                  {/* Transfer */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <QrCode size={13} className="text-pink-600" />
                        <span className="text-xs font-semibold text-gray-700">Chuyển khoản</span>
                        <span className="text-[10px] text-gray-400">{transferOrders.length} đơn</span>
                      </div>
                      <span className="text-xs font-bold text-pink-700 tabular-nums">{fmt(transferRev)}đ</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round(transferRev / total * 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 text-right">{Math.round(transferRev / total * 100)}%</p>
                  </div>
                  {/* Unpaid */}
                  {unpaidOrders.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px]">⏳</span>
                          <span className="text-xs font-semibold text-gray-700">Chưa thanh toán</span>
                          <span className="text-[10px] text-gray-400">{unpaidOrders.length} đơn</span>
                        </div>
                        <span className="text-xs font-bold text-gray-500 tabular-nums">{fmt(unpaidRev)}đ</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-300 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round(unpaidRev / total * 100)}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 text-right">{Math.round(unpaidRev / total * 100)}%</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {loading && <div className="text-center py-10 text-gray-400 text-sm">Đang tải...</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-10">
          <ClipboardList size={32} className="mx-auto text-gray-200 mb-2" />
          <p className="text-gray-400 text-sm">Không tìm thấy đơn hàng</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(order => {
          const si = STATUS_INFO[order.status] || STATUS_INFO.completed
          const StatusIcon = si.icon
          const isOpen = expanded === order.id
          const dateStr = fmtVNDate(order.vn_created_at || order.created_at)
          const timeStr = fmtVNTime(order.vn_created_at || order.created_at)
          return (
            <div key={order.id}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${order.status === 'cancelled' ? 'opacity-60' : ''}`}>
              <button onClick={() => setExpanded(isOpen ? null : order.id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3">
                <div className="shrink-0 text-center w-10">
                  <p className="text-[10px] text-gray-400 leading-none">{dateStr}</p>
                  <p className="text-xs font-bold text-gray-600 leading-none mt-0.5">{timeStr}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-gray-800 text-sm">#{order.order_code}</span>
                    {order.table_number
                      ? <span className="text-[10px] bg-orange-100 text-orange-700 font-semibold px-1.5 py-0.5 rounded-full">Bàn {order.table_number}</span>
                      : <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Mang đi</span>}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border inline-flex items-center gap-0.5 ${si.color}`}>
                      <StatusIcon size={9} />{si.label}
                    </span>
                    {order.pay_method === 'cash'     && <span className="text-[10px] bg-green-50 text-green-600 border border-green-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5"><Banknote size={9}/>TM</span>}
                    {order.pay_method === 'transfer' && <span className="text-[10px] bg-pink-50 text-pink-600 border border-pink-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5"><QrCode size={9}/>CK</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{order.username} · {order.items.length} món</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-orange-600 text-sm tabular-nums">{fmt(Number(order.total_amount))}đ</p>
                  <p className={`text-[10px] ${order.is_paid ? 'text-green-500' : 'text-red-400'}`}>
                    {order.is_paid ? '✓ Đã TT' : 'Chưa TT'}
                  </p>
                </div>
                <span className="text-gray-300 text-xs shrink-0">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-3 border-t border-gray-50">
                  <div className="space-y-1.5 mt-2">
                    {order.items.map(item => (
                      <div key={item.id} className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">🧋 {item.product_name} <span className="text-gray-400 text-xs">×{item.quantity}</span></span>
                          <span className="font-medium tabular-nums shrink-0 ml-2">{fmt(Number(item.subtotal))}đ</span>
                        </div>
                        {item.item_note && <p className="text-[11px] text-orange-500 italic ml-5">✏️ {item.item_note}</p>}
                      </div>
                    ))}
                  </div>
                  {order.discount_amount && Number(order.discount_amount) > 0 && (
                    <div className="flex justify-between text-sm text-green-600 mt-1">
                      <span>🏷️ {order.discount_name || 'Giảm giá'}</span>
                      <span>-{Number(order.discount_amount).toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  {order.note && <p className="text-xs text-gray-400 italic mt-2">📝 {order.note}</p>}
                  <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between text-sm">
                    <span className="text-gray-500">Tổng</span>
                    <span className="font-bold text-gray-800 tabular-nums">{fmt(Number(order.total_amount))}đ</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
// VN time helpers imported from lib/vntime

export default function BaoCaoPage() {
  const [tab, setTab] = useState<'daily' | 'monthly' | 'range' | 'history'>('daily')

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-4 pb-8">
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Báo Cáo</h1>
          <p className="text-gray-400 text-xs mt-0.5">Phân tích doanh thu chi tiết</p>
        </div>

        <div className="grid grid-cols-4 gap-1 mb-5 bg-gray-100 p-1 rounded-2xl">
          {([
            { key: 'daily',   label: '📅 Ngày' },
            { key: 'monthly', label: '📆 Tháng' },
            { key: 'range',   label: '📊 Tùy chọn' },
            { key: 'history', label: '🧾 Lịch sử' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                tab === t.key ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'daily'   && <DailyReport key="daily" />}
        {tab === 'monthly' && <MonthlyReport key="monthly" />}
        {tab === 'range'   && <RangeReport key="range" />}
        {tab === 'history' && <OrderHistory key="history" />}
      </div>
    </div>
  )
}
