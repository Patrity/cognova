import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Agent ID is required' })
  }

  const db = getDb()

  const agent = await db.query.cronAgents.findFirst({
    where: eq(schema.cronAgents.id, id),
    with: { creator: true }
  })

  if (!agent) {
    throw createError({ statusCode: 404, message: 'Agent not found' })
  }

  return { data: agent }
})
