'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, TrendingUp, TrendingDown, Calendar, X } from 'lucide-react'

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

  const totalThu = transactions.filter(t => t.type === 'thu').reduce((s, t) => s + t.amount, 0)
  const totalChi = transactions.filter(t => t.type === 'chi').reduce((s, t) => s + t.amount, 0)
  const chenh = totalThu - totalChi

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/transactions', {
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

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Quản Lý Thu Chi</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">Theo dõi dòng tiền hàng ngày</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <Calendar size={15} className="text-gray-400 shrink-0" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="text-xs md:text-sm font-medium text-gray-700 focus:outline-none w-28 md:w-auto" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-5">
        <div className="bg-green-50 rounded-xl p-3 md:p-5 border border-green-100">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp size={15} className="text-green-600 shrink-0" />
            <span className="text-xs font-medium text-green-700">Tổng Thu</span>
          </div>
          <p className="text-base md:text-2xl font-bold text-green-700">{totalThu.toLocaleString('vi-VN')}đ</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 md:p-5 border border-red-100">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingDown size={15} className="text-red-600 shrink-0" />
            <span className="text-xs font-medium text-red-700">Tổng Chi</span>
          </div>
          <p className="text-base md:text-2xl font-bold text-red-700">{totalChi.toLocaleString('vi-VN')}đ</p>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-5 border border-gray-100">
          <p className="text-xs font-medium text-gray-600 mb-1.5">Chênh lệch</p>
          <p className={`text-base md:text-2xl font-bold ${chenh >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
            {chenh < 0 ? '-' : ''}{Math.abs(chenh).toLocaleString('vi-VN')}đ
          </p>
        </div>
      </div>

      {/* Transaction list */}
      <div className="card p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800 text-sm md:text-base">Danh sách giao dịch</h2>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1.5 text-xs md:text-sm py-2 px-3 md:px-4">
            <Plus size={15} /> Thêm
          </button>
        </div>

        {transactions.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">Chưa có giao dịch nào trong ngày này</p>
        )}

        <div className="space-y-3">
          {transactions.map(t => (
            <div key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.type === 'thu' ? 'bg-green-100' : 'bg-red-100'}`}>
                {t.type === 'thu'
                  ? <TrendingUp size={16} className="text-green-600" />
                  : <TrendingDown size={16} className="text-red-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{t.description}</p>
                <p className="text-xs text-gray-400">{t.note || (t.type === 'thu' ? 'thu' : 'chi')} • {t.username}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-bold text-sm ${t.type === 'thu' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'chi' ? '-' : '+'}{t.amount.toLocaleString('vi-VN')}đ
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(t.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Thêm giao dịch</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                {(['thu', 'chi'] as const).map(type => (
                  <button key={type} type="button" onClick={() => setForm(f => ({ ...f, type }))}
                    className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${form.type === type ? (type === 'thu' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-100 text-gray-600'}`}>
                    {type === 'thu' ? '↑ Thu' : '↓ Chi'}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Số tiền</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0" className="input" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Mô tả</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ví dụ: Nhập nguyên liệu..." className="input" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Ghi chú (tùy chọn)</label>
                <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Ghi chú thêm..." className="input" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-secondary">Hủy</button>
                <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-60">
                  {loading ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
