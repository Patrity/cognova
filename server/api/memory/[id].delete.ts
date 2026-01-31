import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Memory ID required' })

  const db = getDb()

  // Verify memory exists
  const existing = await db.select({ id: schema.memoryChunks.id })
    .from(schema.memoryChunks)
    .where(eq(schema.memoryChunks.id, id))
    .limit(1)

  if (existing.length === 0)
    throw createError({ statusCode: 404, message: 'Memory not found' })

  await db.delete(schema.memoryChunks).where(eq(schema.memoryChunks.id, id))

  return { data: { success: true } }
})
