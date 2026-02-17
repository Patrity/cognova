import { getDb } from '~~/server/db'
import { secrets } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { notifyResourceChange } from '~~/server/utils/notify-resource'

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key')

  if (!key) {
    throw createError({
      statusCode: 400,
      message: 'Key is required'
    })
  }

  const db = getDb()

  const existing = await db.query.secrets.findFirst({
    where: (s, { eq }) => eq(s.key, key)
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: `Secret with key "${key}" not found`
    })
  }

  await db.delete(secrets).where(eq(secrets.key, key))

  notifyResourceChange({ resource: 'secret', action: 'delete', resourceName: key })

  return { data: { deleted: true } }
})
