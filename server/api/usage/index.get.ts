import { and, gte, eq, ilike, desc } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { StatsPeriod, TokenUsageSource } from '~~/shared/types'

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

const VALID_SOURCES: TokenUsageSource[] = ['chat', 'agent', 'memory_extraction']

export default defineEventHandler(async (event) => {
  requireDb(event)

  const query = getQuery(event)
  const period = (query.period as StatsPeriod) || '7d'
  const source = query.source as TokenUsageSource | undefined
  const search = query.search as string | undefined
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const offset = (page - 1) * limit

  const periodStart = getPeriodInterval(period)
  const db = getDb()

  // Build conditions
  const conditions = [gte(schema.tokenUsage.createdAt, periodStart)]

  if (source && VALID_SOURCES.includes(source))
    conditions.push(eq(schema.tokenUsage.source, source))

  if (search && search.trim())
    conditions.push(ilike(schema.tokenUsage.sourceName, `%${search.trim()}%`))

  const where = and(...conditions)

  // Get total count
  const allMatching = await db.select({ id: schema.tokenUsage.id })
    .from(schema.tokenUsage)
    .where(where)

  const total = allMatching.length

  // Get paginated records
  const records = await db.select()
    .from(schema.tokenUsage)
    .where(where)
    .orderBy(desc(schema.tokenUsage.createdAt))
    .limit(limit)
    .offset(offset)

  return {
    data: records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
})
