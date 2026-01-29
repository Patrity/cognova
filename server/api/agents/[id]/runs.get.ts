import { eq, desc, and, gte } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { StatsPeriod } from '~~/shared/types'

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
  const limit = parseInt(query.limit as string) || 100
  const period = query.period as StatsPeriod | undefined

  const db = getDb()

  // Build where clause
  const whereConditions = [eq(schema.cronAgentRuns.agentId, id)]
  if (period) {
    whereConditions.push(gte(schema.cronAgentRuns.startedAt, getPeriodInterval(period)))
  }

  const runs = await db.query.cronAgentRuns.findMany({
    where: and(...whereConditions),
    orderBy: [desc(schema.cronAgentRuns.startedAt)],
    limit
  })

  return { data: runs }
})
