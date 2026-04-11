const VN_TZ = 'Asia/Ho_Chi_Minh'

// Two types of timestamps in this app:
// 1. created_at from Neon: "2026-03-18T02:44:00.000Z" (UTC, has Z) → parse as UTC, Intl adds +7h
// 2. vn_created_at from SQL (created_at + interval '7 hours'): "2026-03-18 09:44:00" (VN time, no Z) → parse as +07:00
export const toUtcDate = (ts: string | Date): Date => {
  if (!ts) return new Date(NaN)
  if (ts instanceof Date) return ts
  const s = ts.toString()
  // Has explicit timezone info — parse directly
  if (s.includes('Z') || s.includes('+')) return new Date(s)
  // Plain date only "YYYY-MM-DD" (no time component)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00+07:00')
  // Plain datetime without tz = VN time from SQL (already +7h) → parse as +07:00
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
