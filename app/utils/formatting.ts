/** Format a date to a relative time string (e.g. "5m ago", "3h ago") */
export function formatRelativeTime(date?: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

/** Format a currency value (e.g. "$0.0012" or "<$0.0001") */
export function formatCost(value?: number | null): string {
  if (!value) return '$0.00'
  if (value < 0.0001) return '<$0.0001'
  if (value < 0.01) return `$${value.toFixed(4)}`
  return `$${value.toFixed(2)}`
}
