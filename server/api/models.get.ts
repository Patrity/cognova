import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const db = getDb()

  const results = await db.select({
    id: schema.models.id,
    modelId: schema.models.modelId,
    displayName: schema.models.displayName,
    tags: schema.models.tags,
    providerName: schema.providers.name,
    providerId: schema.providers.id
  })
    .from(schema.models)
    .innerJoin(schema.providers, eq(schema.models.providerId, schema.providers.id))
    .where(eq(schema.providers.userId, userId))
    .orderBy(schema.providers.name, schema.models.displayName)

  return { data: results }
})
