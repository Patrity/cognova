import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { unscheduleAgent } from '~~/server/services/cron-scheduler'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Agent ID is required' })
  }

  const db = getDb()

  // Unschedule before deleting
  unscheduleAgent(id)

  // Delete agent (runs will cascade delete)
  const [deleted] = await db.delete(schema.cronAgents)
    .where(eq(schema.cronAgents.id, id))
    .returning()

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Agent not found' })
  }

  return { data: deleted }
})
