// Local-calendar date helpers. Dates travel as "YYYY-MM-DD" strings (the
// same format <input type="date"> used) to avoid UTC off-by-one shifts.

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3))

const pad = (n: number) => String(n).padStart(2, '0')
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = (s: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null
}
export const formatISO = (s: string) => {
  const d = fromISO(s)
  return d ? `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}` : ''
}
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** Same day `months` from today, clamped to the month's last day. */
export function monthsFromToday(months: number): string {
  const t = new Date()
  const target = new Date(t.getFullYear(), t.getMonth() + months, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(t.getDate(), last))
  return toISO(target)
}

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", else "12 Nov 2026". */
export function timeAgo(d: Date | null, now = new Date()): string {
  if (!d) return ''
  const sec = Math.round((now.getTime() - d.getTime()) / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h ago`
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** Full local timestamp for tooltips, e.g. "12 Nov 2026, 19:42". */
export function formatDateTime(d: Date | null): string {
  if (!d) return ''
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
