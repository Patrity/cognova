import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Provider ID is required' })

  const db = getDb()

  const [existing] = await db.select()
    .from(schema.providers)
    .where(and(eq(schema.providers.id, id), eq(schema.providers.userId, userId)))
    .limit(1)

  if (!existing)
    throw createError({ statusCode: 404, message: 'Provider not found' })

  await db.delete(schema.providers).where(eq(schema.providers.id, id))

  return { data: { success: true } }
})
