import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { MODEL_CATALOG, TAG_SUGGESTIONS } from '~~/server/ai/model-catalog'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Provider ID is required' })

  const db = getDb()

  const [row] = await db.select()
    .from(schema.providers)
    .innerJoin(schema.providerTypes, eq(schema.providers.typeId, schema.providerTypes.id))
    .where(and(eq(schema.providers.id, id), eq(schema.providers.userId, userId)))
    .limit(1)

  if (!row)
    throw createError({ statusCode: 404, message: 'Provider not found' })

  const suggestions = MODEL_CATALOG[row.provider_types.id] || []

  return { data: { suggestions, tagSuggestions: TAG_SUGGESTIONS } }
})
