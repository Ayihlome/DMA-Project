/** Rand amount, e.g. R1,420.00 (or R1,420 with `whole`). */
export function rand(n: number, opts: { whole?: boolean } = {}) {
  const digits = opts.whole ? 0 : 2
  return `R${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

/** "just now", "5 min ago", "3 h ago", "2 days ago". */
export function relativeTime(ts: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

export function shortDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function longDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Formats quantities without trailing float noise (0.25 → "0.25", 3 → "3"). */
export function qty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}
