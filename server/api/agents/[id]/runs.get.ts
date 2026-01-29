import { eq, desc } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Agent ID is required' })
  }

  const query = getQuery(event)
  const limit = parseInt(query.limit as string) || 20

  const db = getDb()

  const runs = await db.query.cronAgentRuns.findMany({
    where: eq(schema.cronAgentRuns.agentId, id),
    orderBy: [desc(schema.cronAgentRuns.startedAt)],
    limit
  })

  return { data: runs }
})
