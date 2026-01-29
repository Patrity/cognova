import { gte } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { StatsPeriod, AgentGlobalStats, DailyRunData } from '~~/shared/types'

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

  // Get agent counts
  const agents = await db.query.cronAgents.findMany()
  const totalAgents = agents.length
  const activeAgents = agents.filter(a => a.enabled).length

  // Get runs in period with aggregations
  const runsInPeriod = await db.query.cronAgentRuns.findMany({
    where: gte(schema.cronAgentRuns.startedAt, periodStart)
  })

  const totalRuns = runsInPeriod.length
  const successfulRuns = runsInPeriod.filter(r => r.status === 'success').length
  const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0
  const totalCostUsd = runsInPeriod.reduce((sum, r) => sum + (r.costUsd || 0), 0)

  // Get running agent IDs
  const runningAgentIds = runsInPeriod
    .filter(r => r.status === 'running')
    .map(r => r.agentId)
    .filter((id, index, arr) => arr.indexOf(id) === index) // unique

  // Get daily breakdown for chart
  const dailyRunsMap = new Map<string, DailyRunData>()

  for (const run of runsInPeriod) {
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

  const stats: AgentGlobalStats = {
    totalAgents,
    activeAgents,
    runsInPeriod: totalRuns,
    successRate,
    totalCostUsd,
    runningAgentIds,
    dailyRuns
  }

  return { data: stats }
})
