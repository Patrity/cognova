import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Provider ID is required' })

  const body = await readBody(event)

  if (!body.modelId || typeof body.modelId !== 'string')
    throw createError({ statusCode: 400, message: 'modelId is required' })

  if (!body.displayName || typeof body.displayName !== 'string')
    throw createError({ statusCode: 400, message: 'displayName is required' })

  const db = getDb()

  const [provider] = await db.select()
    .from(schema.providers)
    .where(and(eq(schema.providers.id, id), eq(schema.providers.userId, userId)))
    .limit(1)

  if (!provider)
    throw createError({ statusCode: 404, message: 'Provider not found' })

  const tags = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === 'string') : []

  const [model] = await db.insert(schema.models)
    .values({
      providerId: id,
      modelId: body.modelId,
      displayName: body.displayName,
      tags
    })
    .returning()

  return { data: model }
})
