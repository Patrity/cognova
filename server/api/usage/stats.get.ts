import { gte } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { StatsPeriod, UsageStats, DailyUsageData, TokenUsageSource } from '~~/shared/types'

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

/**
 * Get a bucket key for the given timestamp, adjusted to the client's timezone.
 * tzOffset is in minutes (same as Date.getTimezoneOffset(), positive = behind UTC).
 */
function getBucketKey(date: Date, granularity: string, tzOffsetMs: number): string {
  const local = new Date(date.getTime() - tzOffsetMs)
  const iso = local.toISOString()
  if (granularity === 'hourly')
    return iso.slice(0, 13) // "2026-02-18T05"
  return iso.slice(0, 10) // "2026-02-18"
}

export default defineEventHandler(async (event) => {
  requireDb(event)

  const query = getQuery(event)
  const period = (query.period as StatsPeriod) || '7d'
  const granularity = (query.granularity as string) === 'hourly' ? 'hourly' : 'daily'
  const tzOffset = Number(query.tzOffset) || 0 // minutes from UTC
  const tzOffsetMs = tzOffset * 60 * 1000
  const periodStart = getPeriodInterval(period)

  const db = getDb()

  // Get all usage records in period
  const records = await db.select()
    .from(schema.tokenUsage)
    .where(gte(schema.tokenUsage.createdAt, periodStart))

  // Aggregate totals
  let totalCostUsd = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  const totalCalls = records.length

  // Time-series breakdown
  const bucketMap = new Map<string, DailyUsageData>()

  // By source breakdown
  const sourceMap = new Map<TokenUsageSource, { cost: number, calls: number, tokens: number }>()

  // Top consumers
  const consumerMap = new Map<string, { name: string, source: TokenUsageSource, cost: number, calls: number, tokens: number }>()

  for (const r of records) {
    totalCostUsd += r.costUsd
    totalInputTokens += r.inputTokens
    totalOutputTokens += r.outputTokens

    // Time-series bucket (timezone-aware)
    const bucket = getBucketKey(r.createdAt, granularity, tzOffsetMs)
    const existing = bucketMap.get(bucket) || {
      date: bucket,
      chat: 0,
      agent: 0,
      memory: 0,
      bridge: 0,
      totalCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      calls: 0
    }
    existing.totalCost += r.costUsd
    existing.inputTokens += r.inputTokens
    existing.outputTokens += r.outputTokens
    existing.calls++
    if (r.source === 'chat') existing.chat += r.costUsd
    else if (r.source === 'agent') existing.agent += r.costUsd
    else if (r.source === 'memory_extraction') existing.memory += r.costUsd
    else if (r.source === 'bridge') existing.bridge += r.costUsd
    bucketMap.set(bucket, existing)

    // By source
    const source = r.source as TokenUsageSource
    const srcEntry = sourceMap.get(source) || { cost: 0, calls: 0, tokens: 0 }
    srcEntry.cost += r.costUsd
    srcEntry.calls++
    srcEntry.tokens += r.inputTokens + r.outputTokens
    sourceMap.set(source, srcEntry)

    // Top consumers (group by sourceName)
    const consumerKey = `${r.source}:${r.sourceName || 'Unknown'}`
    const consumer = consumerMap.get(consumerKey) || {
      name: r.sourceName || 'Unknown',
      source,
      cost: 0,
      calls: 0,
      tokens: 0
    }
    consumer.cost += r.costUsd
    consumer.calls++
    consumer.tokens += r.inputTokens + r.outputTokens
    consumerMap.set(consumerKey, consumer)
  }

  const dailyUsage = Array.from(bucketMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  const bySource = Array.from(sourceMap.entries()).map(([source, data]) => ({ source, ...data }))
  const topConsumers = Array.from(consumerMap.values())
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10)

  const stats: UsageStats = {
    totalCostUsd,
    totalInputTokens,
    totalOutputTokens,
    totalCalls,
    avgCostPerCall: totalCalls > 0 ? totalCostUsd / totalCalls : 0,
    dailyUsage,
    bySource,
    topConsumers
  }

  return { data: stats }
})
