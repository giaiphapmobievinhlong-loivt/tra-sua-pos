const VN_TZ = 'Asia/Ho_Chi_Minh'

// Neon driver serializes TIMESTAMP (without tz) columns by subtracting the server's
// local timezone offset, producing strings like "2026-03-17T19:44:42.793Z"
// when the DB actually stores "2026-03-18 02:44:42" (UTC = 02:44, VN = 09:44).
// Fix: when string ends with Z, add 7h back to correct for Neon's shift.
export const toUtcDate = (ts: string | Date): Date => {
  if (!ts) return new Date(NaN)
  if (ts instanceof Date) return ts
  const s = ts.toString()
  if (s.endsWith('Z')) {
    return new Date(new Date(s).getTime() + 7 * 60 * 60 * 1000)
  }
  if (s.includes('+')) return new Date(s)
  const clean = s.replace(' ', 'T').split('.')[0]
  return new Date(clean + '+07:00')
}

export const fmtVNTime = (ts: string | Date) =>
  toUtcDate(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: VN_TZ })

export const fmtVNDate = (ts: string | Date) =>
  toUtcDate(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: VN_TZ })

export const fmtVNDateLong = (ts: string | Date) =>
  toUtcDate(ts).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', timeZone: VN_TZ })

export const fmtVNDateWeekday = (ts: string | Date) =>
  toUtcDate(ts).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: VN_TZ })
