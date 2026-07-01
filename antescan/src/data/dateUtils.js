// Minimal date helpers
export function subDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() - n)
  return d
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function format(date, fmt) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return fmt
    .replace('YYYY', d.getFullYear())
    .replace('MMMM', MONTHS_LONG[d.getMonth()])
    .replace('MMM', MONTHS_SHORT[d.getMonth()])
    .replace('MM', pad(d.getMonth() + 1))
    .replace('dd', pad(d.getDate()))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
}

export function timeAgo(date) {
  if (!date) return '—'
  const d = new Date(date)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago'
  return format(d, 'MMM dd')
}
