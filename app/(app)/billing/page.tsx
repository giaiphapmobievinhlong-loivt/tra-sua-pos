'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { CreditCard, Zap, CheckCircle, Clock, AlertCircle, Loader2, Copy, X } from 'lucide-react'

interface QuotaInfo {
  plan: string
  daily_limit: number
  orders_used_today: number
  orders_remaining: number
  reset_date: string
  expires_at: string | null
  payments: Payment[]
}

interface Payment {
  id: number
  amount: number
  package_type: string
  package_days: number
  new_daily_limit: number
  status: string
  created_at: string
  expires_at: string | null
}

interface PaymentInfo {
  payment_id: number
  transfer_code: string
  amount: number
  bank_code: string
  account_number: string
  account_name: string
  qr_url: string
}

const PACKAGES = [
  { key: 'daily_100',   label: 'Gói Ngày',    price: 29000,  daily_limit: 100, days: 1,  description: '100 đơn/ngày · 1 ngày',   highlight: false },
  { key: 'monthly_200', label: 'Cơ Bản',       price: 199000, daily_limit: 200, days: 30, description: '200 đơn/ngày · 30 ngày',  highlight: true  },
  { key: 'monthly_500', label: 'Tiêu Chuẩn',   price: 399000, daily_limit: 500, days: 30, description: '500 đơn/ngày · 30 ngày',  highlight: false },
]

function formatMoney(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="ml-2 text-orange-500 hover:text-orange-700 transition-colors">
      {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
    </button>
  )
}

function PaymentModal({ info, onClose, onSuccess }: {
  info: PaymentInfo
  onClose: () => void
  onSuccess: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const attemptsRef = useRef(0)
  const MAX_ATTEMPTS = 120 // 10 phút (5s × 120)

  const checkPayment = useCallback(async () => {
    attemptsRef.current++
    if (attemptsRef.current > MAX_ATTEMPTS) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    try {
      const res = await fetch('/api/quota')
      const data = await res.json()
      // Tìm payment vừa tạo trong danh sách
      const found = data.payments?.find((p: Payment) => p.id === info.payment_id && p.status === 'completed')
      if (found) {
        if (pollRef.current) clearInterval(pollRef.current)
        setConfirmed(true)
        setTimeout(onSuccess, 1500)
      }
    } catch { /* bỏ qua lỗi mạng */ }
  }, [info.payment_id, onSuccess])

  useEffect(() => {
    pollRef.current = setInterval(checkPayment, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [checkPayment])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Thanh toán chuyển khoản</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {confirmed ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle size={48} className="text-green-500" />
              <p className="font-semibold text-green-700 text-lg">Thanh toán thành công!</p>
              <p className="text-sm text-gray-500">Gói đã được kích hoạt tự động.</p>
            </div>
          ) : (
            <>
              {/* QR Code */}
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={info.qr_url}
                  alt="QR thanh toán"
                  className="w-48 h-48 rounded-xl border border-gray-200"
                />
              </div>

              {/* Thông tin tài khoản */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ngân hàng</span>
                  <span className="font-semibold text-gray-800">{info.bank_code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Số tài khoản</span>
                  <span className="font-semibold text-gray-800 flex items-center">
                    {info.account_number}
                    <CopyButton text={info.account_number} />
                  </span>
                </div>
                {info.account_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Chủ tài khoản</span>
                    <span className="font-semibold text-gray-800">{info.account_name}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Số tiền</span>
                  <span className="font-bold text-orange-600 flex items-center">
                    {formatMoney(info.amount)}
                    <CopyButton text={String(info.amount)} />
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                  <span className="text-gray-500">Nội dung CK</span>
                  <span className="font-bold text-orange-600 tracking-wide flex items-center">
                    {info.transfer_code}
                    <CopyButton text={info.transfer_code} />
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                Nhập <strong>đúng nội dung chuyển khoản</strong> để hệ thống tự động kích hoạt gói.
              </div>

              {/* Trạng thái chờ */}
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 pt-1">
                <Loader2 size={16} className="animate-spin text-orange-400" />
                Đang chờ xác nhận thanh toán...
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [buyingKey, setBuyingKey] = useState<string | null>(null)
  const [buyError, setBuyError] = useState('')
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)

  const fetchQuota = useCallback(() => {
    fetch('/api/quota')
      .then(r => r.json())
      .then(d => setQuota(d))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchQuota() }, [fetchQuota])

  async function handleBuy(packageKey: string) {
    setBuyingKey(packageKey)
    setBuyError('')
    try {
      const res = await fetch('/api/payments/sepay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_key: packageKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        setBuyError(data.error || 'Không thể tạo thanh toán')
        return
      }
      setPaymentInfo(data)
    } catch {
      setBuyError('Lỗi kết nối, vui lòng thử lại')
    } finally {
      setBuyingKey(null)
    }
  }

  function handlePaymentSuccess() {
    setPaymentInfo(null)
    setLoading(true)
    fetchQuota()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!quota) return null

  const usedPct = Math.min(100, Math.round((quota.orders_used_today / quota.daily_limit) * 100))
  const isOwner = quota.plan === 'owner'

  return (
    <>
      {paymentInfo && (
        <PaymentModal
          info={paymentInfo}
          onClose={() => setPaymentInfo(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Gói dùng & Thanh toán</h1>

        {/* Trạng thái hôm nay */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Gói hiện tại</p>
              <p className="text-xl font-bold text-orange-600 capitalize">
                {isOwner ? 'Chủ hệ thống (Không giới hạn)' : quota.plan === 'free' ? 'Miễn phí' : 'Trả phí'}
              </p>
            </div>
            {quota.expires_at && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Hết hạn</p>
                <p className="text-sm font-semibold text-gray-700">{formatDate(quota.expires_at)}</p>
              </div>
            )}
          </div>

          {!isOwner && (
            <>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Đơn hôm nay</span>
                  <span className="font-semibold">
                    {quota.orders_used_today} / {quota.daily_limit}
                    <span className="text-gray-400 font-normal ml-1">(còn {quota.orders_remaining})</span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${usedPct >= 90 ? 'bg-red-500' : usedPct >= 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
              </div>

              {quota.orders_remaining === 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  <AlertCircle size={16} />
                  Đã hết hạn mức hôm nay. Nâng cấp để tạo thêm đơn.
                </div>
              )}
            </>
          )}
        </div>

        {/* Gói nâng cấp */}
        {!isOwner && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Zap size={18} className="text-orange-500" /> Nâng cấp gói
            </h2>

            {buyError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                <AlertCircle size={16} />
                {buyError}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              {PACKAGES.map(pkg => {
                const isBuying = buyingKey === pkg.key
                return (
                  <div
                    key={pkg.key}
                    className={`card p-4 flex flex-col gap-3 relative ${pkg.highlight ? 'ring-2 ring-orange-400' : ''}`}
                  >
                    {pkg.highlight && (
                      <span className="absolute -top-2.5 left-4 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        Phổ biến
                      </span>
                    )}
                    <div>
                      <p className="font-bold text-gray-800">{pkg.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{pkg.description}</p>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{formatMoney(pkg.price)}</p>
                    <button
                      onClick={() => handleBuy(pkg.key)}
                      disabled={!!buyingKey}
                      className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${
                        pkg.highlight
                          ? 'bg-orange-500 hover:bg-orange-600 text-white'
                          : 'border border-orange-400 text-orange-600 hover:bg-orange-50'
                      }`}
                    >
                      {isBuying ? (
                        <><Loader2 size={14} className="animate-spin" /> Đang xử lý...</>
                      ) : 'Mua ngay'}
                    </button>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-gray-400 text-center">
              Chuyển khoản ngân hàng · Kích hoạt tự động sau khi thanh toán thành công
            </p>
          </div>
        )}

        {/* Lịch sử thanh toán */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <CreditCard size={18} className="text-gray-500" /> Lịch sử thanh toán
          </h2>

          {quota.payments.length === 0 ? (
            <div className="card p-6 text-center text-gray-400 text-sm">Chưa có giao dịch nào</div>
          ) : (
            <div className="card divide-y divide-gray-50">
              {quota.payments.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.status === 'completed'
                      ? <CheckCircle size={18} className="text-green-500 shrink-0" />
                      : p.status === 'pending'
                      ? <Clock size={18} className="text-orange-400 shrink-0" />
                      : <AlertCircle size={18} className="text-red-400 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {p.package_type === 'daily' ? `Gói ngày · ${p.package_days} ngày` : `Gói tháng · ${p.package_days} ngày`}
                        {' · '}{p.new_daily_limit} đơn/ngày
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{formatMoney(p.amount)}</p>
                    <p className={`text-xs ${p.status === 'completed' ? 'text-green-600' : p.status === 'pending' ? 'text-orange-500' : 'text-red-500'}`}>
                      {p.status === 'completed' ? 'Thành công' : p.status === 'pending' ? 'Đang xử lý' : 'Thất bại'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
