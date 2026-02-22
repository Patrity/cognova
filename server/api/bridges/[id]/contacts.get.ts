import { and, count, desc, eq, isNotNull, max, or, sql } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Bridge ID is required' })

  const db = getDb()
  const bridge = await db.query.bridges.findFirst({
    where: eq(schema.bridges.id, id)
  })

  if (!bridge)
    throw createError({ statusCode: 404, message: 'Bridge not found' })

  const query = getQuery(event)
  const q = (query.q as string)?.trim()
  const limit = Math.min(parseInt(query.limit as string) || 50, 200)

  const conditions = [
    eq(schema.bridgeMessages.bridgeId, id),
    eq(schema.bridgeMessages.direction, 'inbound'),
    isNotNull(schema.bridgeMessages.sender)
  ]

  if (q) {
    conditions.push(
      or(
        sql`${schema.bridgeMessages.sender} ILIKE ${`%${q}%`}`,
        sql`${schema.bridgeMessages.senderName} ILIKE ${`%${q}%`}`
      )!
    )
  }

  const contacts = await db.select({
    sender: schema.bridgeMessages.sender,
    senderName: schema.bridgeMessages.senderName,
    platform: schema.bridgeMessages.platform,
    messageCount: count(),
    lastMessageAt: max(schema.bridgeMessages.createdAt)
  })
    .from(schema.bridgeMessages)
    .where(and(...conditions))
    .groupBy(
      schema.bridgeMessages.sender,
      schema.bridgeMessages.senderName,
      schema.bridgeMessages.platform
    )
    .orderBy(desc(max(schema.bridgeMessages.createdAt)))
    .limit(limit)

  return { data: contacts }
})
