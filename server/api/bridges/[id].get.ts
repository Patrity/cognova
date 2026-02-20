import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Bridge ID is required' })
  }

  const db = getDb()

  const bridge = await db.query.bridges.findFirst({
    where: eq(schema.bridges.id, id),
    with: { creator: true }
  })

  if (!bridge) {
    throw createError({ statusCode: 404, message: 'Bridge not found' })
  }

  return { data: bridge }
})
