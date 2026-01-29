import { eq, and, gte } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { StatsPeriod, AgentDetailStats, DailyRunData } from '~~/shared/types'

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

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Agent ID is required' })
  }

  const query = getQuery(event)
  const period = (query.period as StatsPeriod) || '7d'
  const periodStart = getPeriodInterval(period)

  const db = getDb()

  // Get all runs for this agent in period
  const runs = await db.query.cronAgentRuns.findMany({
    where: and(
      eq(schema.cronAgentRuns.agentId, id),
      gte(schema.cronAgentRuns.startedAt, periodStart)
    )
  })

  const totalRuns = runs.length
  const successfulRuns = runs.filter(r => r.status === 'success').length
  const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0
  const totalCostUsd = runs.reduce((sum, r) => sum + (r.costUsd || 0), 0)

  // Calculate average duration (only completed runs)
  const completedRuns = runs.filter(r => r.durationMs != null)
  const avgDurationMs = completedRuns.length > 0
    ? Math.round(completedRuns.reduce((sum, r) => sum + (r.durationMs || 0), 0) / completedRuns.length)
    : 0

  // Get last run time
  const lastRun = runs.length > 0
    ? runs.reduce((latest, r) => r.startedAt > latest.startedAt ? r : latest)
    : null
  const lastRunAt = lastRun?.startedAt.toISOString() || null

  // Get daily breakdown for chart
  const dailyRunsMap = new Map<string, DailyRunData>()

  for (const run of runs) {
    const date = run.startedAt.toISOString().split('T')[0]!
    const existing = dailyRunsMap.get(date) || {
      date,
      success: 0,
      error: 0,
      total: 0,
      costUsd: 0
    }

    existing.total++
    if (run.status === 'success') {
      existing.success++
    } else if (run.status === 'error' || run.status === 'budget_exceeded' || run.status === 'cancelled') {
      existing.error++
    }
    existing.costUsd += run.costUsd || 0

    dailyRunsMap.set(date, existing)
  }

  // Sort by date
  const dailyRuns = Array.from(dailyRunsMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  const stats: AgentDetailStats = {
    totalRuns,
    successRate,
    avgDurationMs,
    totalCostUsd,
    lastRunAt,
    dailyRuns
  }

  return { data: stats }
})
