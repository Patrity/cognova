import { gte } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { StatsPeriod, HookEventStats, HookDailyData, HookToolBreakdown, HookEventType } from '~~/shared/types'

function getPeriodInterval(period: StatsPeriod): Date {
  const now = new Date()
  switch (period) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
}

export default defineEventHandler(async (event) => {
  requireDb(event)

  const query = getQuery(event)
  const period = (query.period as StatsPeriod) || '7d'
  const periodStart = getPeriodInterval(period)

  const db = getDb()

  // Get all events in period
  const events = await db.select()
    .from(schema.hookEvents)
    .where(gte(schema.hookEvents.createdAt, periodStart))

  const totalEvents = events.length
  const blockedEvents = events.filter(e => e.blocked).length
  const blockRate = totalEvents > 0 ? Math.round((blockedEvents / totalEvents) * 100) : 0

  // Average duration
  const withDuration = events.filter(e => e.durationMs !== null)
  const avgDurationMs = withDuration.length > 0
    ? Math.round(withDuration.reduce((sum, e) => sum + (e.durationMs || 0), 0) / withDuration.length)
    : 0

  // Events by type
  const eventsByType: Partial<Record<HookEventType, number>> = {}
  for (const e of events)
    eventsByType[e.eventType as HookEventType] = (eventsByType[e.eventType as HookEventType] || 0) + 1

  // Tool breakdown
  const toolMap = new Map<string, { total: number, blocked: number, totalDuration: number, count: number }>()
  for (const e of events) {
    if (!e.toolName) continue
    const existing = toolMap.get(e.toolName) || { total: 0, blocked: 0, totalDuration: 0, count: 0 }
    existing.total++
    if (e.blocked) existing.blocked++
    if (e.durationMs) {
      existing.totalDuration += e.durationMs
      existing.count++
    }
    toolMap.set(e.toolName, existing)
  }

  const toolBreakdown: HookToolBreakdown[] = Array.from(toolMap.entries())
    .map(([toolName, data]) => ({
      toolName,
      total: data.total,
      blocked: data.blocked,
      avgDurationMs: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0
    }))
    .sort((a, b) => b.total - a.total)

  // Daily activity
  const dailyMap = new Map<string, HookDailyData>()
  for (const e of events) {
    const date = e.createdAt.toISOString().split('T')[0]!
    const existing = dailyMap.get(date) || { date, total: 0, blocked: 0, allowed: 0, avgDurationMs: 0 }
    existing.total++
    if (e.blocked) existing.blocked++
    else existing.allowed++
    dailyMap.set(date, existing)
  }

  const dailyActivity = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  // Recent sessions (unique, last 10)
  const recentSessions = [...new Set(events.filter(e => e.sessionId).map(e => e.sessionId!))]
    .slice(0, 10)

  const stats: HookEventStats = {
    totalEvents,
    blockedEvents,
    blockRate,
    avgDurationMs,
    eventsByType,
    toolBreakdown,
    dailyActivity,
    recentSessions
  }

  return { data: stats }
})
