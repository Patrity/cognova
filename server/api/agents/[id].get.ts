import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Agent ID is required' })

  const db = getDb()
  const [agent] = await db.select()
    .from(schema.installedAgents)
    .where(eq(schema.installedAgents.id, id))
    .limit(1)

  if (!agent)
    throw createError({ statusCode: 404, message: 'Agent not found' })

  return { data: agent }
})
