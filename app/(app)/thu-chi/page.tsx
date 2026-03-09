'use client'
import { apiFetch } from '@/lib/apiFetch'
import { useState, useEffect, useCallback } from 'react'
import { Plus, TrendingUp, TrendingDown, Calendar, X, Trash2 } from 'lucide-react'

interface Transaction {
  id: number
  type: 'thu' | 'chi'
  amount: number
  description: string
  note: string
  transaction_date: string
  created_at: string
  username: string
}

function fmt(n: number | string) {
  return Number(n).toLocaleString('vi-VN')
}

export default function ThuChiPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [date, setDate] = useState(new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'chi', amount: '', description: '', note: '' })
  const [loading, setLoading] = useState(false)

  const fetchTransactions = useCallback(async () => {
    const res = await fetch(`/api/transactions?date=${date}`)
    const data = await res.json()
    setTransactions(data.transactions || [])
  }, [date])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  // Always coerce to Number — PostgreSQL DECIMAL comes back as string in JSON
  const totalThu = transactions.filter(t => t.type === 'thu').reduce((s, t) => s + Number(t.amount), 0)
  const totalChi = transactions.filter(t => t.type === 'chi').reduce((s, t) => s + Number(t.amount), 0)
  const chenh = totalThu - totalChi

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) return
    setLoading(true)
    try {
      const res = await apiFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount), transaction_date: date }),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ type: 'chi', amount: '', description: '', note: '' })
        fetchTransactions()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Xóa giao dịch này?')) return
    await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' })
    fetchTransactions()
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Thu Chi</h1>
          <p className="text-gray-400 text-xs mt-0.5">Theo dõi dòng tiền hàng ngày</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shrink-0">
          <Calendar size={14} className="text-gray-400 shrink-0" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="text-xs font-medium text-gray-700 focus:outline-none w-28" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-5">
        {/* Tổng Thu */}
        <div className="bg-green-50 rounded-2xl p-3 md:p-4 border border-green-100">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <TrendingUp size={14} className="text-green-600" />
            </div>
            <span className="text-xs font-semibold text-green-700">Tổng Thu</span>
          </div>
          <p className="font-bold text-green-700 tabular-nums text-sm md:text-xl leading-tight">
            {fmt(totalThu)}<span className="text-xs md:text-sm">đ</span>
          </p>
          <p className="text-[10px] text-green-500 mt-1 hidden md:block">
            {transactions.filter(t => t.type === 'thu').length} giao dịch
          </p>
        </div>

        {/* Tổng Chi */}
        <div className="bg-red-50 rounded-2xl p-3 md:p-4 border border-red-100">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <TrendingDown size={14} className="text-red-600" />
            </div>
            <span className="text-xs font-semibold text-red-700">Tổng Chi</span>
          </div>
          <p className="font-bold text-red-700 tabular-nums text-sm md:text-xl leading-tight">
            {fmt(totalChi)}<span className="text-xs md:text-sm">đ</span>
          </p>
          <p className="text-[10px] text-red-400 mt-1 hidden md:block">
            {transactions.filter(t => t.type === 'chi').length} giao dịch
          </p>
        </div>

        {/* Chênh lệch */}
        <div className={`rounded-2xl p-3 md:p-4 border ${chenh >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 ${chenh >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              {chenh >= 0
                ? <TrendingUp size={14} className="text-blue-600" />
                : <TrendingDown size={14} className="text-orange-600" />}
            </div>
            <span className={`text-xs font-semibold ${chenh >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Chênh lệch</span>
          </div>
          <p className={`font-bold tabular-nums text-sm md:text-xl leading-tight ${chenh >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {chenh > 0 ? '+' : ''}{fmt(chenh)}<span className="text-xs md:text-sm">đ</span>
          </p>
          <p className={`text-[10px] mt-1 hidden md:block ${chenh >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
            {chenh >= 0 ? 'Có lãi' : 'Cần chú ý'}
          </p>
        </div>
      </div>

      {/* Transaction list */}
      <div className="card p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800 text-sm md:text-base">Danh sách giao dịch</h2>
          <button onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl">
            <Plus size={14} /> Thêm
          </button>
        </div>

        {transactions.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">Chưa có giao dịch nào trong ngày này</p>
        )}

        <div className="space-y-2">
          {transactions.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.type === 'thu' ? 'bg-green-100' : 'bg-red-100'}`}>
                {t.type === 'thu'
                  ? <TrendingUp size={15} className="text-green-600" />
                  : <TrendingDown size={15} className="text-red-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{t.description}</p>
                <p className="text-xs text-gray-400 truncate">
                  {t.note ? `${t.note} · ` : ''}{t.username} · {new Date(t.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className={`font-bold text-sm tabular-nums ${t.type === 'thu' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'chi' ? '-' : '+'}{fmt(t.amount)}đ
                </p>
                <button onClick={() => handleDelete(t.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Thêm giao dịch</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2">
                {(['thu', 'chi'] as const).map(type => (
                  <button key={type} type="button" onClick={() => setForm(f => ({ ...f, type }))}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      form.type === type
                        ? type === 'thu' ? 'bg-green-500 text-white shadow-sm' : 'bg-red-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                    {type === 'thu' ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                    {type === 'thu' ? 'Thu' : 'Chi'}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Số tiền</label>
                <input type="number" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0" className="input text-lg font-semibold" required min="1" />
                {form.amount && Number(form.amount) > 0 && (
                  <p className="text-xs text-gray-400 mt-1 pl-1">{fmt(Number(form.amount))} đồng</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Mô tả</label>
                <input type="text" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={form.type === 'thu' ? 'VD: Bán hàng buổi sáng...' : 'VD: Nhập nguyên liệu...'}
                  className="input" required />
              </div>

              {/* Note */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Ghi chú <span className="text-gray-400 font-normal">(tùy chọn)</span></label>
                <input type="text" value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Ghi chú thêm..." className="input" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-secondary rounded-xl">Hủy</button>
                <button onClick={handleSubmit} disabled={loading || !form.amount || !form.description}
                  className={`flex-1 font-semibold py-2 px-4 rounded-xl text-white transition-all disabled:opacity-50 ${
                    form.type === 'thu' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                  }`}>
                  {loading ? 'Đang lưu...' : `Lưu ${form.type === 'thu' ? 'Thu' : 'Chi'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
