import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Provider ID is required' })

  const db = getDb()

  const [provider] = await db.select()
    .from(schema.providers)
    .where(and(eq(schema.providers.id, id), eq(schema.providers.userId, userId)))
    .limit(1)

  if (!provider)
    throw createError({ statusCode: 404, message: 'Provider not found' })

  const models = await db.select()
    .from(schema.models)
    .where(eq(schema.models.providerId, id))
    .orderBy(schema.models.createdAt)

  return { data: models }
})
