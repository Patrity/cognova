import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { encryptProviderConfig } from '~~/server/utils/provider-config'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Provider ID is required' })

  const body = await readBody(event)
  const db = getDb()

  const [existing] = await db.select()
    .from(schema.providers)
    .where(and(eq(schema.providers.id, id), eq(schema.providers.userId, userId)))
    .limit(1)

  if (!existing)
    throw createError({ statusCode: 404, message: 'Provider not found' })

  const updates: Record<string, unknown> = { updatedAt: new Date() }

  if (body.name)
    updates.name = body.name

  if (body.configJson && typeof body.configJson === 'object')
    updates.configJson = encryptProviderConfig(body.configJson)

  const [updated] = await db.update(schema.providers)
    .set(updates)
    .where(eq(schema.providers.id, id))
    .returning()

  return { data: updated }
})
