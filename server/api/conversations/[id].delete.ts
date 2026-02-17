import { eq } from 'drizzle-orm'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { requireDb } from '~~/server/utils/db-guard'
import { notifyResourceChange } from '~~/server/utils/notify-resource'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')!
  const db = getDb()

  await db.delete(schema.conversations)
    .where(eq(schema.conversations.id, id))

  notifyResourceChange({ resource: 'conversation', action: 'delete', resourceId: id })

  return { data: { success: true } }
})
