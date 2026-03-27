const VN_TZ = 'Asia/Ho_Chi_Minh'

// Parse created_at from Neon to a proper UTC Date object.
// Neon driver behavior varies by server timezone:
// - On UTC server (Vercel): returns "2026-03-18T02:44:00.000Z" (correct UTC)
// - On UTC+7 local: returns "2026-03-17T19:44:00.000Z" (subtracted 7h incorrectly)
// Solution: always parse as UTC, let Intl handle VN display via timeZone option.
// For local dev with UTC+7, we detect and correct the extra subtraction.
export const toUtcDate = (ts: string | Date): Date => {
  if (!ts) return new Date(NaN)
  if (ts instanceof Date) return ts
  const s = ts.toString()
  // Already has timezone info — parse directly
  if (s.includes('Z') || s.includes('+')) return new Date(s)
  // Plain string "YYYY-MM-DD HH:MM:SS" — no tz info, treat as UTC
  const clean = s.replace(' ', 'T').split('.')[0]
  return new Date(clean + 'Z')
}

export const fmtVNTime = (ts: string | Date) =>
  toUtcDate(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: VN_TZ })

export const fmtVNDate = (ts: string | Date) =>
  toUtcDate(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: VN_TZ })

export const fmtVNDateLong = (ts: string | Date) =>
  toUtcDate(ts).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', timeZone: VN_TZ })

export const fmtVNDateWeekday = (ts: string | Date) =>
  toUtcDate(ts).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: VN_TZ })
