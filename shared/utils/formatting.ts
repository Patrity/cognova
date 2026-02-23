/**
 * Shared formatting utilities used across pages and components.
 * Eliminates duplication of common date, duration, and status formatting.
 */

/** Format a cron expression to a human-readable string */
export function formatSchedule(schedule: string): string {
  const parts = schedule.split(' ')
  if (parts.length !== 5) return schedule

  const min = parts[0]!
  const hour = parts[1]!
  const dayOfMonth = parts[2]!
  const month = parts[3]!
  const dayOfWeek = parts[4]!

  if (min === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*')
    return 'Every hour'
  if (min === '*/5' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*')
    return 'Every 5 minutes'
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*' && hour !== '*')
    return `Daily at ${hour}:${min.padStart(2, '0')}`
  if (dayOfWeek === '0' && dayOfMonth === '*' && month === '*')
    return `Weekly on Sunday at ${hour}:${min.padStart(2, '0')}`

  return schedule
}

/** Format a date to a relative time string (e.g. "5m ago", "3h ago") */
export function formatRelativeTime(date?: Date | string | null): string {
  if (!date) return 'Never'
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

/** Format milliseconds to a human-readable duration (e.g. "1.2s", "3.5m") */
export function formatDuration(ms?: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

/** Format a date to a locale string (e.g. "Feb 23, 2026, 10:30:00 AM") */
export function formatDateTime(date?: Date | string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleString()
}

/** Format a date as short date (e.g. "Feb 23, 2026") */
export function formatDate(date?: Date | string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/** Format a date as short (no year) for compact displays (e.g. "Feb 23") */
export function formatDateShort(date?: Date | string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

/** Format a date with weekday for detail views (e.g. "Sun, Feb 23, 2026") */
export function formatDateLong(date?: Date | string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/** Format a currency value (e.g. "$1.23" or "<$0.01") */
export function formatCurrency(value: number): string {
  if (value < 0.01) return '<$0.01'
  return `$${value.toFixed(2)}`
}

/** Map agent/run status to a UI badge color */
export function getStatusColor(status?: string): 'success' | 'error' | 'warning' | 'info' | 'neutral' {
  switch (status) {
    case 'success': return 'success'
    case 'error': return 'error'
    case 'budget_exceeded': return 'warning'
    case 'running': return 'info'
    case 'cancelled': return 'neutral'
    default: return 'neutral'
  }
}
