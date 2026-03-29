'use client'
import { fmt } from '@/lib/utils'
import { MOMO_QR } from '@/lib/constants'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'


function PayContent() {
  const params = useSearchParams()
  const router = useRouter()
  const code  = params.get('code') || ''
  const total = Number(params.get('total') || 0)
  const [copied, setCopied]         = useState(false)
  const [copiedNote, setCopiedNote] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed]   = useState(false)
  const [error, setError]           = useState('')

  function copy(text: string, which: 'code' | 'note') {
    navigator.clipboard.writeText(text)
    if (which === 'code') { setCopied(true); setTimeout(() => setCopied(false), 2000) }
    else                  { setCopiedNote(true); setTimeout(() => setCopiedNote(false), 2000) }
  }

  async function handleConfirmPaid() {
    setConfirming(true)
    setError('')
    try {
      const res = await fetch('/api/public/orders/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_code: code }),
      })
      const data = await res.json()
      if (data.success) {
        setConfirmed(true)
        setTimeout(() => router.push(`/order/track?code=${code}`), 1800)
      } else {
        setError(data.error || 'Có lỗi xảy ra, vui lòng thử lại')
      }
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center px-4 py-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-5xl">🧋</span>
        <h1 style={{ fontFamily: "'Baloo 2', cursive" }} className="text-2xl font-extrabold text-orange-600 mt-2">Thanh toán</h1>
        <p className="text-gray-500 text-sm mt-1">Quét mã → Chuyển khoản → Xác nhận bên dưới</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6 w-full max-w-sm">
        {['Quét QR', 'Chuyển khoản', 'Xác nhận'].map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0
              ${confirmed && i <= 2 ? 'bg-green-500 text-white' : i === 0 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {confirmed ? '✓' : i + 1}
            </div>
            <span className="text-xs text-gray-500 font-semibold truncate">{s}</span>
            {i < 2 && <div className="h-px bg-gray-200 flex-1" />}
          </div>
        ))}
      </div>

      {/* Order code */}
      <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-orange-100 mb-4 w-full max-w-sm text-center">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Mã đơn hàng</p>
        <div className="flex items-center justify-center gap-3 mt-1">
          <p className="text-3xl font-black text-gray-800 tracking-widest">#{code}</p>
          <button onClick={() => copy(code, 'code')}
            className="text-xs bg-orange-50 text-orange-600 font-bold px-3 py-1.5 rounded-lg border border-orange-100 active:bg-orange-100 transition-all">
            {copied ? '✓ Sao rồi' : 'Sao chép'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Lưu mã để theo dõi đơn sau</p>
      </div>

      {/* Amount */}
      <div className="bg-orange-500 text-white rounded-2xl px-6 py-4 mb-4 w-full max-w-sm text-center shadow-lg">
        <p className="text-sm font-semibold opacity-80">Số tiền cần chuyển</p>
        <p style={{ fontFamily: "'Baloo 2', cursive" }} className="text-4xl font-extrabold mt-1">{fmt(total)}đ</p>
      </div>

      {/* QR */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-orange-100 mb-4 w-full max-w-sm">
        <p className="text-center text-sm font-bold text-gray-700 mb-3">📱 Quét mã chuyển khoản</p>
        <img src={MOMO_QR} alt="QR" className="w-48 h-auto rounded-2xl mx-auto shadow-sm" />
        <p className="text-center text-xs text-gray-400 mt-3">MoMo · VietQR · Napas 247</p>
      </div>

      {/* Transfer note */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5 w-full max-w-sm">
        <p className="text-xs text-amber-700 font-semibold mb-1">📝 Nội dung chuyển khoản</p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-amber-900 tracking-wide">TRA SUA {code}</p>
          <button onClick={() => copy(`TRA SUA ${code}`, 'note')}
            className="text-xs bg-amber-200 text-amber-800 font-bold px-2.5 py-1 rounded-lg active:bg-amber-300 transition-all">
            {copiedNote ? '✓ Đã sao' : 'Sao chép'}
          </button>
        </div>
      </div>

      {/* ── CTA: Confirm paid ─────────────────── */}
      {!confirmed ? (
        <div className="w-full max-w-sm space-y-2 mb-4">
          <button
            onClick={handleConfirmPaid}
            disabled={confirming}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-extrabold py-4 rounded-2xl text-base shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            {confirming
              ? <><span className="animate-spin inline-block">⏳</span> Đang xử lý...</>
              : <>✅ Tôi đã chuyển khoản xong</>}
          </button>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs text-center px-4 py-2 rounded-xl">
              {error}
            </div>
          )}
          <p className="text-xs text-gray-400 text-center px-4">
            Bấm sau khi chuyển khoản xong. Nhân viên sẽ xác nhận rồi bắt đầu pha chế nhé 🐱
          </p>
        </div>
      ) : (
        <div className="w-full max-w-sm bg-green-50 border-2 border-green-300 rounded-2xl px-5 py-5 mb-4 text-center">
          <p className="text-4xl mb-2">🎉</p>
          <p className="font-extrabold text-green-700 text-lg">Đã ghi nhận thanh toán!</p>
          <p className="text-xs text-green-600 mt-1">Nhân viên sẽ xác nhận ngay. Đang chuyển trang...</p>
        </div>
      )}

      <button onClick={() => router.push(`/order/track?code=${code}`)}
        className="w-full max-w-sm bg-gray-800 text-white font-bold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-transform mb-2">
        🔍 Theo dõi đơn hàng
      </button>
      <button onClick={() => router.push('/order')}
        className="w-full max-w-sm text-gray-400 font-semibold py-2 text-sm">
        ← Quay lại menu
      </button>
    </div>
  )
}

export default function PayPage() {
  return <Suspense><PayContent /></Suspense>
}
