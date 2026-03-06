'use client'
import { useState } from 'react'

export default function DebugPage() {
  const [log, setLog] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  function addLog(msg: string) {
    setLog(prev => [`[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`, ...prev])
  }

  async function testGetOrders() {
    addLog('--- TEST GET ORDERS ---')
    const todayUTC = new Date().toISOString().split('T')[0]
    const todayVN  = new Date(Date.now() + 7*60*60*1000).toISOString().split('T')[0]
    addLog(`Date UTC: ${todayUTC}`)
    addLog(`Date VN:  ${todayVN}`)

    try {
      const res = await fetch(`/api/orders?date=${todayVN}`)
      const data = await res.json()
      addLog(`HTTP status: ${res.status}`)
      if (data.error) { addLog(`❌ Error: ${data.error}`); return }
      addLog(`✅ Orders found: ${data.orders?.length ?? 0}`)
      data.orders?.slice(0,3).forEach((o: Record<string,unknown>) => {
        addLog(`  → #${o.order_code} | ${o.status} | ${o.total_amount}đ | created: ${o.created_at}`)
      })
    } catch(e) { addLog(`❌ Fetch error: ${e}`) }
  }

  async function testDebugEndpoint() {
    addLog('--- DB DEBUG ---')
    try {
      const res = await fetch('/api/debug')
      const data = await res.json()
      if (data.error) { addLog(`❌ ${data.error}`); return }
      addLog(`Server UTC: ${data.debug?.server_utc}`)
      addLog(`Server VN:  ${data.debug?.server_vn}`)
      addLog(`VN today:   ${data.debug?.vn_date_today}`)
      addLog(`Orders in DB: ${data.orders_count}`)
      addLog(`Columns: ${data.order_columns?.join(', ')}`)
      data.orders_in_db?.slice(0,5).forEach((o: Record<string,unknown>) => {
        addLog(`  → #${o.order_code} | utc_date:${o.utc_date} | vn_date:${o.vn_date} | vn_time:${o.vn_time}`)
      })
    } catch(e) { addLog(`❌ ${e}`) }
  }

  async function testCreateOrder() {
    addLog('--- TEST CREATE ORDER ---')
    setLoading(true)
    try {
      // First get a product
      const pRes = await fetch('/api/products')
      const pData = await pRes.json()
      const product = pData.products?.[0]
      if (!product) { addLog('❌ No products found'); return }
      addLog(`Using product: ${product.name} (id:${product.id}, price:${product.price})`)

      const body = {
        items: [{ product_id: product.id, quantity: 1, unit_price: product.price }],
        total_amount: product.price,
        customer_paid: product.price,
        change_amount: 0,
        note: 'DEBUG TEST ORDER',
        table_number: null,
        status: 'pending',
        is_paid: true,
        pay_method: 'cash',
      }
      addLog(`Sending: ${JSON.stringify(body)}`)

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      addLog(`HTTP: ${res.status}`)
      if (data.error) { addLog(`❌ Error: ${data.error}`); return }
      addLog(`✅ Created order: #${data.order?.order_code}`)
      addLog(`   status=${data.order?.status}, created_at=${data.order?.created_at}`)

      // Now immediately fetch orders
      addLog('Fetching orders after create...')
      const todayVN = new Date(Date.now() + 7*60*60*1000).toISOString().split('T')[0]
      const res2 = await fetch(`/api/orders?date=${todayVN}`)
      const data2 = await res2.json()
      addLog(`Orders found after create: ${data2.orders?.length ?? 0}`)
      if (data2.error) addLog(`❌ Get error: ${data2.error}`)
    } catch(e) { addLog(`❌ ${e}`) }
    finally { setLoading(false) }
  }

  async function testAuth() {
    addLog('--- TEST AUTH ---')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [], total_amount: 0 }),
      })
      const data = await res.json()
      addLog(`HTTP: ${res.status}`)
      if (res.status === 401) addLog('❌ NOT AUTHENTICATED - need to login first')
      else addLog(`Response: ${JSON.stringify(data)}`)
    } catch(e) { addLog(`❌ ${e}`) }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto h-full overflow-y-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">🔧 Debug Panel</h1>
        <p className="text-xs text-gray-400 mt-1">Chạy từng test để tìm nguyên nhân</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={testDebugEndpoint}
          className="bg-blue-500 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:bg-blue-600 active:scale-95 transition-all">
          1. Kiểm tra DB
        </button>
        <button onClick={testAuth}
          className="bg-purple-500 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:bg-purple-600 active:scale-95 transition-all">
          2. Kiểm tra Auth
        </button>
        <button onClick={testGetOrders}
          className="bg-orange-500 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:bg-orange-600 active:scale-95 transition-all">
          3. GET Đơn hàng
        </button>
        <button onClick={testCreateOrder} disabled={loading}
          className="bg-green-500 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:bg-green-600 active:scale-95 transition-all disabled:opacity-50">
          {loading ? '⏳ Đang test...' : '4. Tạo đơn test'}
        </button>
        <button onClick={() => setLog([])}
          className="col-span-2 bg-gray-100 text-gray-600 py-2 px-4 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all">
          🗑 Xóa log
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4 min-h-48 font-mono text-xs">
        {log.length === 0
          ? <p className="text-gray-500">Nhấn các nút trên để bắt đầu debug...</p>
          : log.map((line, i) => (
            <p key={i} className={`leading-relaxed ${
              line.includes('❌') ? 'text-red-400' :
              line.includes('✅') ? 'text-green-400' :
              line.includes('---') ? 'text-yellow-400 font-bold mt-2' :
              'text-gray-300'
            }`}>{line}</p>
          ))
        }
      </div>
    </div>
  )
}
