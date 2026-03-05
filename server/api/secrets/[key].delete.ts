import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const key = getRouterParam(event, 'key')
  if (!key)
    throw createError({ statusCode: 400, message: 'Secret key is required' })

  const db = getDb()

  const [existing] = await db.select()
    .from(schema.secrets)
    .where(and(eq(schema.secrets.key, key), eq(schema.secrets.userId, userId)))
    .limit(1)

  if (!existing)
    throw createError({ statusCode: 404, message: 'Secret not found' })

  await db.delete(schema.secrets).where(eq(schema.secrets.id, existing.id))

  return { data: { success: true } }
})
