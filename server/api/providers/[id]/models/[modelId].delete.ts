import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const providerId = getRouterParam(event, 'id')
  const modelId = getRouterParam(event, 'modelId')

  if (!providerId || !modelId)
    throw createError({ statusCode: 400, message: 'Provider ID and model ID are required' })

  const db = getDb()

  const [provider] = await db.select()
    .from(schema.providers)
    .where(and(eq(schema.providers.id, providerId), eq(schema.providers.userId, userId)))
    .limit(1)

  if (!provider)
    throw createError({ statusCode: 404, message: 'Provider not found' })

  const [model] = await db.select()
    .from(schema.models)
    .where(and(eq(schema.models.id, modelId), eq(schema.models.providerId, providerId)))
    .limit(1)

  if (!model)
    throw createError({ statusCode: 404, message: 'Model not found' })

  await db.delete(schema.models).where(eq(schema.models.id, modelId))

  return { data: { success: true } }
})
