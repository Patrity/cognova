import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { encryptProviderConfig, decryptProviderConfig } from '~~/server/utils/provider-config'

const MASK = '••••••••'

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

  if (body.configJson && typeof body.configJson === 'object') {
    // Merge with existing config to preserve masked password fields
    const existingConfig = decryptProviderConfig(existing.configJson)
    const newConfig = body.configJson as Record<string, unknown>

    const merged = { ...newConfig }
    for (const [key, value] of Object.entries(merged)) {
      if (value === MASK)
        merged[key] = existingConfig[key]
    }

    updates.configJson = encryptProviderConfig(merged)
  }

  const [updated] = await db.update(schema.providers)
    .set(updates)
    .where(eq(schema.providers.id, id))
    .returning()

  return { data: updated }
})
