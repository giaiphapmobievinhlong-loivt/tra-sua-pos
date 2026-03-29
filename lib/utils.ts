// ── Money formatting ─────────────────────────────────────
export const fmt = (n: number | undefined | null) =>
  Number(n ?? 0).toLocaleString('vi-VN')

export const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000 ? `${Math.round(n / 1_000)}k` : String(n)

// ── Date utilities ────────────────────────────────────────
export const todayVN = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
