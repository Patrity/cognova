import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const query = getQuery(event)
  const period = (query.period as string) || '7d'

  const db = getDb()

  const periodMap: Record<string, number> = {
    '24h': 1,
    '7d': 7,
    '30d': 30
  }
  const days = periodMap[period] || 7
  const since = new Date()
  since.setDate(since.getDate() - days)

  const rows = await db.select()
    .from(schema.tokenUsage)
    .where(
      eq(schema.tokenUsage.userId, userId)
    )

  const filtered = rows.filter(r => new Date(r.createdAt) >= since)

  const totalCost = filtered.reduce((sum, r) => sum + (r.cost || 0), 0)
  const totalInputTokens = filtered.reduce((sum, r) => sum + r.inputTokens, 0)
  const totalOutputTokens = filtered.reduce((sum, r) => sum + r.outputTokens, 0)
  const totalCalls = filtered.length

  // Group by date
  const dailyMap = new Map<string, { cost: number, inputTokens: number, outputTokens: number, calls: number }>()
  for (const row of filtered) {
    const date = new Date(row.createdAt).toISOString().split('T')[0]!
    const existing = dailyMap.get(date) || { cost: 0, inputTokens: 0, outputTokens: 0, calls: 0 }
    existing.cost += row.cost || 0
    existing.inputTokens += row.inputTokens
    existing.outputTokens += row.outputTokens
    existing.calls += 1
    dailyMap.set(date, existing)
  }

  const dailyBreakdown = Array.from(dailyMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    data: {
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      totalCalls,
      dailyBreakdown
    }
  }
})
