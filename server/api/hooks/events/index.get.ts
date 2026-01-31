import { eq, gte, inArray, and, desc } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { HookEventFilters, HookEventType } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const query = getQuery(event) as HookEventFilters
  const limit = Math.min(Number(query.limit) || 100, 500)

  const db = getDb()
  const conditions = []

  // Event type filter
  if (query.eventType) {
    const types = Array.isArray(query.eventType) ? query.eventType : [query.eventType]
    conditions.push(inArray(schema.hookEvents.eventType, types as HookEventType[]))
  }

  // Session filter
  if (query.sessionId)
    conditions.push(eq(schema.hookEvents.sessionId, query.sessionId))

  // Tool filter
  if (query.toolName)
    conditions.push(eq(schema.hookEvents.toolName, query.toolName))

  // Blocked filter
  if (query.blocked !== undefined) {
    const blocked = query.blocked === true || query.blocked === 'true'
    conditions.push(eq(schema.hookEvents.blocked, blocked))
  }

  // Since filter
  if (query.since)
    conditions.push(gte(schema.hookEvents.createdAt, new Date(query.since)))

  let dbQuery = db.select()
    .from(schema.hookEvents)

  if (conditions.length > 0)
    dbQuery = dbQuery.where(and(...conditions)) as typeof dbQuery

  const events = await dbQuery
    .orderBy(desc(schema.hookEvents.createdAt))
    .limit(limit)

  // Parse eventData JSON
  const parsedEvents = events.map(e => ({
    ...e,
    eventData: e.eventData ? JSON.parse(e.eventData) : undefined
  }))

  return { data: parsedEvents }
})
